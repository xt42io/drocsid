import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  renderInviteOpenGraphImage,
  renderSiteOpenGraphImage,
} from "../src/server/og-image";

function assertOpenGraphPng(image: Uint8Array) {
  assert.deepEqual(
    Array.from(image.subarray(0, 8)),
    [137, 80, 78, 71, 13, 10, 26, 10],
  );
  const view = new DataView(image.buffer, image.byteOffset, image.byteLength);
  assert.equal(view.getUint32(16), 1200);
  assert.equal(view.getUint32(20), 630);
}

test("renders the default Open Graph image as a 1200 by 630 PNG", async () => {
  assertOpenGraphPng(await renderSiteOpenGraphImage());
});

test("renders an invite Open Graph image with untrusted text and an uploaded icon", async () => {
  const icon = await readFile("public/logo.png");
  const image = await renderInviteOpenGraphImage(
    {
      code: "Ab3dE7x",
      community: {
        id: "community-1",
        name: "Makers < Friends & Neighbours",
        description:
          "A welcoming place for experiments, unfinished ideas, and the people making them.",
        icon: "sun",
        color: "purple",
        members: 42,
      },
    },
    {
      data: icon,
      contentType: "image/png",
    },
  );
  assertOpenGraphPng(image);
});
