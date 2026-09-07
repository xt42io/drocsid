import { createAuthFixture } from "./auth-fixture";
// Run after building; creates and removes only its own database fixtures.
import assert from "node:assert/strict";
import { eq } from "drizzle-orm";
import { getDb } from "../src/server/db";
import * as s from "../src/server/db/schema";

const { default: app } = await import("../dist/server/server.js");
const base = process.env.BETTER_AUTH_URL || "http://localhost:1515";
const path = process.argv[2] || "/api/messages";
const communityId = crypto.randomUUID();
let userId: string | undefined;
let cookie = "";
async function request(path: string, body?: unknown) {
  return app.fetch(
    new Request(`${base}${path}`, {
      method: body ? "POST" : "GET",
      headers: {
        origin: new URL(base).origin,
        "content-type": "application/json",
        cookie,
      },
      body: body ? JSON.stringify(body) : undefined,
    }),
  );
}
const db = getDb();
try {
  const fixture = await createAuthFixture(
    `send-benchmark-${communityId}@example.test`,
    "Send benchmark",
  );
  userId = fixture.user.id;
  cookie = fixture.cookie;
  const setup = await request("/api/app", [
    {
      type: "community.create",
      id: communityId,
      community: {
        name: "Temporary send benchmark",
        description: "Removed after testing",
        icon: "sun",
        color: "purple",
        category: "Test",
      },
      channels: [
        { id: "general", name: "general", description: "", group: "CHAT" },
      ],
    },
  ]);
  assert.equal(setup.status, 200);
  for (let i = 0; i < 3; i++) {
    const input = {
      type: "message.send",
      id: crypto.randomUUID(),
      conversation: `${communityId}:general`,
      text: "Timing check",
      attachments: [],
    };
    const start = performance.now();
    const result = await request(path, path === "/api/app" ? [input] : input);
    assert.equal(result.status, 200, await result.text());
    console.log(
      JSON.stringify({ path, sendMs: Math.round(performance.now() - start) }),
    );
  }
  const start = performance.now();
  assert.equal((await request("/api/app")).status, 200);
  console.log(
    JSON.stringify({ snapshotMs: Math.round(performance.now() - start) }),
  );
} finally {
  await db.delete(s.communities).where(eq(s.communities.id, communityId));
  if (userId) await db.delete(s.user).where(eq(s.user.id, userId));
}
process.exit(0);
