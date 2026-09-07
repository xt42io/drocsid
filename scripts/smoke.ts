import { createAuthFixture } from "./auth-fixture";
// Explicit smoke check against configured services. Creates and removes only its own fixtures.
import assert from "node:assert/strict";
import { eq } from "drizzle-orm";
import { getDb } from "../src/server/db";
import * as s from "../src/server/db/schema";
import { getStorage } from "../src/server/uploads";

const { default: app } = await import("../dist/server/server.js");
const base = process.env.BETTER_AUTH_URL || "http://localhost:1515";
let cookie = "";
let userId: string | undefined;
let filePath: string | undefined;
const communityId = crypto.randomUUID();
const db = getDb();
async function request(path: string, body?: unknown, authenticated = true) {
  return app.fetch(
    new Request(`${base}${path}`, {
      method: body ? "POST" : "GET",
      headers: {
        origin: new URL(base).origin,
        "content-type": "application/json",
        ...(authenticated && cookie ? { cookie } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    }),
  );
}
async function data(path: string, body?: unknown) {
  const response = await request(path, body);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(
      `${path}: HTTP ${response.status}: ${error.error || error.message || "Request failed"}`,
    );
  }
  return response.json();
}
try {
  assert.equal((await request("/api/app", undefined, false)).status, 401);
  const fixture = await createAuthFixture(
    `smoke-${communityId}@example.test`,
    "Upload verification",
  );
  userId = fixture.user.id;
  cookie = fixture.cookie;
  assert.equal((await data("/api/app")).profile.name, "Upload verification");
  await data("/api/app", [
    {
      type: "community.create",
      id: communityId,
      community: {
        name: "Temporary verification",
        description: "Removed after verification.",
        icon: "sun",
        color: "purple",
        category: "Test",
      },
      channels: [
        { id: "general", name: "general", description: "", group: "CHAT" },
      ],
    },
  ]);
  const file = new TextEncoder().encode(
    "Drocsid private upload verification. This file is deleted after testing.",
  );
  const upload = await data("/api/uploads", {
    type: "prepare",
    conversation: `${communityId}:general`,
    filename: "verification.txt",
    contentType: "text/plain",
    byteSize: file.byteLength,
  });
  filePath = (
    await db.select().from(s.attachments).where(eq(s.attachments.id, upload.id))
  )[0]?.path;
  const put = await fetch(upload.url, {
    method: "PUT",
    headers: upload.headers,
    body: new Blob([file], { type: "text/plain" }),
    signal: AbortSignal.timeout(30000),
  });
  assert.ok(put.ok, `Byteship PUT returned ${put.status}`);
  const ready = await data("/api/uploads", { type: "complete", id: upload.id });
  assert.equal(ready.contentType, "application/octet-stream");
  const messageId = crypto.randomUUID();
  await data("/api/app", [
    {
      type: "message.send",
      id: messageId,
      conversation: `${communityId}:general`,
      text: "",
      attachments: [upload.id],
    },
  ]);
  const state = await data("/api/app");
  assert.equal(
    state.messages.find((m: { id: string }) => m.id === messageId)?.attachments
      .length,
    1,
  );
  const download = await request(`/api/attachments/${upload.id}`);
  assert.equal(download.status, 200);
  assert.deepEqual(new Uint8Array(await download.arrayBuffer()), file);
  assert.equal(
    (await request(`/api/attachments/${upload.id}`, undefined, false)).status,
    401,
  );
  await data("/api/app", [{ type: "message.delete", id: messageId }]);
  assert.equal((await request(`/api/attachments/${upload.id}`)).status, 404);
  const image = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWioAAAAASUVORK5CYII=",
    "base64",
  );
  const avatar = await data("/api/avatars", {
    type: "prepare",
    byteSize: image.length,
    contentType: "image/png",
  });
  const avatarPut = await fetch(avatar.url, {
    method: "PUT",
    headers: avatar.headers,
    body: image,
    signal: AbortSignal.timeout(30000),
  });
  assert.ok(avatarPut.ok, `Avatar PUT returned ${avatarPut.status}`);
  const photo = await data("/api/avatars", { type: "complete", id: avatar.id });
  assert.equal((await data("/api/app")).profile.avatarUrl, photo.url);
  const photoResponse = await request(photo.url);
  assert.equal(photoResponse.status, 200);
  assert.equal(photoResponse.headers.get("content-type"), "image/png");
  assert.deepEqual(Buffer.from(await photoResponse.arrayBuffer()), image);
  assert.equal((await request(photo.url, undefined, false)).status, 401);
  await data("/api/avatars", { type: "remove" });
  assert.equal((await request(photo.url)).status, 404);
  assert.equal((await data("/api/app")).profile.avatarUrl, undefined);
  console.log(
    "PASS: production route handlers, authentication, Postgres persistence, live private Byteship upload, authorized download, avatar upload/removal, and deletion.",
  );
} finally {
  if (userId) {
    const fixtures = [
      ...(await db
        .select()
        .from(s.attachments)
        .where(eq(s.attachments.uploaderId, userId))),
      ...(await db
        .select()
        .from(s.avatars)
        .where(eq(s.avatars.uploaderId, userId))),
    ];
    for (const fixture of fixtures) {
      try {
        await getStorage().deleteFile(fixture.path);
      } catch (error) {
        if ((error as { status?: number }).status !== 404)
          console.error("Could not remove smoke-test file", fixture.id);
      }
    }
    await db.delete(s.communities).where(eq(s.communities.id, communityId));
    await db.delete(s.user).where(eq(s.user.id, userId));
    console.log("Disposable database fixtures removed.");
  }
}
process.exit(0);
