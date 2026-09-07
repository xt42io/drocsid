// Run after building with: node --env-file=.env --import tsx scripts/benchmark-channels.ts
// Creates and removes only its own fixtures; never starts a server.
import assert from "node:assert/strict";
import { eq } from "drizzle-orm";
import { getDb } from "../src/server/db";
import * as s from "../src/server/db/schema";

const { default: app } = await import("../dist/server/server.js");
const base = process.env.BETTER_AUTH_URL || "http://localhost:1515";
const communityId = crypto.randomUUID();
let userId: string | undefined;
let cookie = "";
const db = getDb();
async function request(path: string, body: unknown) {
  return app.fetch(
    new Request(`${base}${path}`, {
      method: "POST",
      headers: {
        origin: new URL(base).origin,
        "content-type": "application/json",
        cookie,
      },
      body: JSON.stringify(body),
    }),
  );
}
try {
  const signup = await request("/api/auth/sign-up/email", {
    email: `channel-benchmark-${communityId}@example.test`,
    name: "Channel benchmark",
    password: crypto.randomUUID(),
  });
  assert.equal(signup.status, 200);
  userId = (await signup.json()).user.id;
  cookie = signup.headers.get("set-cookie")!.split(";")[0];
  const setup = await request("/api/app", [
    {
      type: "community.create",
      id: communityId,
      community: {
        name: "Temporary channel benchmark",
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
  const timings: number[] = [];
  for (let i = 0; i < 3; i++) {
    const start = performance.now();
    const response = await request("/api/app", [
      {
        type: "channel.put",
        communityId,
        channel: {
          id: `timing-${i}`,
          name: `timing-${i}`,
          description: "Timing check",
          group: "CHAT",
        },
      },
    ]);
    assert.equal(response.status, 200, await response.text());
    timings.push(Math.round(performance.now() - start));
    console.log(
      JSON.stringify({
        elapsedMs: timings.at(-1),
        serverTiming: response.headers.get("server-timing"),
      }),
    );
  }
  console.log(JSON.stringify({ medianMs: timings.sort((a, b) => a - b)[1] }));
  const channels = await db
    .select()
    .from(s.conversations)
    .where(eq(s.conversations.communityId, communityId));
  assert.equal(channels.length, 4);
} finally {
  await db.delete(s.communities).where(eq(s.communities.id, communityId));
  if (userId) await db.delete(s.user).where(eq(s.user.id, userId));
}
process.exit(0);
