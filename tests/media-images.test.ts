import assert from "node:assert/strict";
import { test } from "node:test";
import {
  avatarImageSources,
  communityCoverImageSources,
  mediaImageUrl,
} from "../src/lib/media-images";
import { imageVariant, storedImage } from "../src/server/media-images";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AttachmentImage } from "../src/components/app/attachment-image";
import { AttachmentPreviews } from "../src/lib/attachment-previews";

test("chat renders smaller images behind local previews while the viewer loads the original", () => {
  const attachmentPreviews = new AttachmentPreviews();
  const file = {
    id: "image",
    name: "photo.png",
    url: "/api/attachments/image",
    byteSize: 2000,
    contentType: "image/png",
  };
  const render = (viewer = false) =>
    renderToStaticMarkup(
      createElement(AttachmentImage, { file, attachmentPreviews, viewer }),
    );
  assert.match(render(), /Loading image…/);
  assert.match(render(), /srcSet="[^"]*variant=chat-840 2x"/);
  attachmentPreviews.add(file.id, "blob:local-preview");
  assert.match(render(), /src="blob:local-preview"/);
  assert.match(render(), /src="\/api\/attachments\/image\?variant=chat-420"/);
  const viewer = render(true);
  assert.match(viewer, /src="\/api\/attachments\/image"/);
  assert.doesNotMatch(viewer, /variant=chat-/);
});

test("image sources resize stored previews and leave local and external images alone", () => {
  for (const src of [
    "blob:http://localhost/local",
    "data:image/png;base64,abc",
    "https://example.test/avatar.png",
  ]) {
    assert.deepEqual(avatarImageSources(src), { src, srcSet: undefined });
    assert.equal(mediaImageUrl(src, "chat-420"), src);
  }
  assert.deepEqual(avatarImageSources("/api/avatars/id"), {
    src: "/api/avatars/id?variant=avatar-40",
    srcSet:
      "/api/avatars/id?variant=avatar-40 1x, /api/avatars/id?variant=avatar-80 2x",
  });
  assert.match(
    avatarImageSources("/api/avatars/id", true).srcSet!,
    /avatar-160 2x$/,
  );
  assert.equal(
    mediaImageUrl("/api/attachments/id?retry=1", "chat-840"),
    "/api/attachments/id?retry=1&variant=chat-840",
  );
  assert.deepEqual(communityCoverImageSources("/api/community-icons/id"), {
    src: "/api/community-icons/id?variant=community-cover-960",
    srcSet:
      "/api/community-icons/id?variant=community-cover-960 1x, /api/community-icons/id?variant=community-cover-1920 2x",
  });
  assert.equal(
    mediaImageUrl("/api/avatars/id", "community-cover-960"),
    "/api/avatars/id",
  );
  assert.equal(mediaImageUrl("/api/avatars/id", "chat-420"), "/api/avatars/id");
});

test("delivery accepts only the bounded variants for each endpoint", () => {
  const request = (query: string) =>
    new Request(`http://localhost/api/avatars/id${query}`);
  assert.equal(imageVariant(request(""), "avatar"), undefined);
  assert.equal(
    imageVariant(request("?variant=avatar-80"), "avatar"),
    "avatar-80",
  );
  for (const query of [
    "?variant=chat-840",
    "?variant=avatar-99999",
    "?variant=__proto__",
    "?variant=",
    "?variant=avatar-40&variant=avatar-80",
  ])
    assert.throws(
      () => imageVariant(request(query), "avatar"),
      /Unknown image size/,
    );
  const communityRequest = (variant: string) =>
    new Request(`http://localhost/api/community-icons/id?variant=${variant}`);
  assert.equal(
    imageVariant(communityRequest("community-cover-1920"), "community"),
    "community-cover-1920",
  );
  assert.equal(
    imageVariant(communityRequest("avatar-80"), "community"),
    "avatar-80",
  );
  assert.throws(
    () => imageVariant(communityRequest("chat-840"), "community"),
    /Unknown image size/,
  );
});

test("private transformations preserve signed tokens, animation and original delivery fallback", async (t) => {
  const requested: URL[] = [];
  let transformFails = false;
  const storage = {
    async createSignedUrl(path: string, input: unknown) {
      assert.equal(path, "private/image.png");
      assert.deepEqual(input, { expiresInSeconds: 60 });
      return {
        signedUrl: {
          url: "https://storage.example.test/image?token=private-token",
          fileId: "id",
          expiresAt: "later",
        },
      };
    },
  };
  t.mock.method(globalThis, "fetch", async (input: string) => {
    const url = new URL(input);
    requested.push(url);
    assert.equal(url.searchParams.get("token"), "private-token");
    const transformed = url.searchParams.has("tr");
    if (transformed && transformFails)
      return new Response("unavailable", { status: 503 });
    return new Response(transformed ? "webp" : "original", {
      headers: { "content-type": transformed ? "image/webp" : "image/png" },
    });
  });
  const file = {
    path: "private/image.png",
    contentType: "image/png",
    byteSize: 8,
  };
  const resized = await storedImage(storage, file, "chat-840");
  assert.equal(resized.contentType, "image/webp");
  assert.equal(resized.byteSize, undefined); // Never report the original content length for smaller bytes.
  assert.equal(await resized.response.text(), "webp");
  const transform = requested[0].searchParams.get("tr")!;
  for (const option of [
    "w:840",
    "h:640",
    "fit:scale-down",
    "animated:true",
    "format:webp",
    "q:80",
  ])
    assert.ok(transform.split(",").includes(option), option);
  const original = await storedImage(storage, file);
  assert.equal(original.byteSize, 8);
  assert.equal(requested[1].searchParams.has("tr"), false);
  assert.equal(await original.response.text(), "original");
  transformFails = true;
  const fallback = await storedImage(storage, file, "avatar-40");
  assert.equal(fallback.contentType, "image/png");
  assert.equal(await fallback.response.text(), "original");
  assert.equal(requested.length, 4);
  await assert.rejects(
    () =>
      storedImage(storage, { ...file, contentType: "text/html" }, "chat-420"),
    /cannot be resized/,
  );
  assert.equal(requested.length, 4);
});

test("community icons render uploaded images with small Byteship variants", async () => {
  const { CommunityIcon } =
    await import("../src/components/app/community-icon");
  const html = renderToStaticMarkup(
    createElement(CommunityIcon, {
      community: { icon: "sun", iconUrl: "/api/community-icons/photo" },
      size: 25,
    }),
  );
  assert.match(html, /src="\/api\/community-icons\/photo\?variant=avatar-40"/);
  assert.match(html, /avatar-80 2x/);
  const preview = renderToStaticMarkup(
    createElement(CommunityIcon, {
      community: { icon: "", iconUrl: "blob:local-icon" },
    }),
  );
  assert.match(preview, /src="blob:local-icon"/);
  assert.doesNotMatch(preview, /variant=/);
  const cover = renderToStaticMarkup(
    createElement(CommunityIcon, {
      community: { icon: "sun", iconUrl: "/api/community-icons/photo" },
      size: 74,
      cover: true,
    }),
  );
  assert.match(cover, /variant=community-cover-960/);
  assert.match(cover, /community-cover-1920 2x/);
});
