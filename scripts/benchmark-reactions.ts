// Run after building with: node --env-file=.env --import tsx scripts/benchmark-reactions.ts
// Creates and removes only its own fixtures; never starts a server.
import assert from "node:assert/strict";
import { eq } from "drizzle-orm";
import { getDb } from "../src/server/db";
import * as s from "../src/server/db/schema";

const { default: app } = await import("../dist/server/server.js");
const base = process.env.BETTER_AUTH_URL || "http://localhost:1515";
const communityId = crypto.randomUUID();
const messageId = crypto.randomUUID();
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
    email: `reaction-benchmark-${communityId}@example.test`,
    name: "Reaction benchmark",
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
        name: "Temporary reaction benchmark",
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
  const message = await request("/api/messages", {
    type: "message.send",
    id: messageId,
    conversation: `${communityId}:general`,
    text: "Reaction timing check",
    attachments: [],
  });
  assert.equal(message.status, 200);
  for (const path of ["/api/app", "/api/reactions"]) {
    const timings: number[] = [];
    for (let i = 0; i < 3; i++) {
      const start = performance.now();
      const result = await request(
        path,
        path === "/api/app"
          ? [{ type: "reaction", id: messageId, emoji: "👍" }]
          : { id: messageId, emoji: "👍", active: i === 1 },
      );
      assert.equal(result.status, 200, await result.text());
      timings.push(Math.round(performance.now() - start));
      console.log(
        JSON.stringify({
          path,
          elapsedMs: timings.at(-1),
          serverTiming: result.headers.get("server-timing"),
        }),
      );
    }
    console.log(
      JSON.stringify({ path, medianMs: timings.sort((a, b) => a - b)[1] }),
    );
  }
  assert.equal(
    (
      await db
        .select()
        .from(s.reactions)
        .where(eq(s.reactions.messageId, messageId))
    ).length,
    0,
  );
} finally {
  await db.delete(s.communities).where(eq(s.communities.id, communityId));
  if (userId) await db.delete(s.user).where(eq(s.user.id, userId));
}
process.exit(0);
