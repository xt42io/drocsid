import { createAuthFixture } from "./auth-fixture";
// Against your already-running server. Creates and removes only its own fixtures.
import assert from "node:assert/strict";
import { once } from "node:events";
import { WebSocket } from "ws";
import { eq, inArray } from "drizzle-orm";
import { getDb, type Database } from "../src/server/db";
import * as s from "../src/server/db/schema";
import { ensureProfile } from "../src/server/access";
import { mutate } from "../src/server/actions";
import type { ServerFrame } from "../src/lib/realtime-protocol";

const base = process.env.BETTER_AUTH_URL || "http://localhost:1515";
const url = new URL("/api/ws", base);
url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
const db = getDb();
const communityId = crypto.randomUUID();
const users: { id: string; cookie: string }[] = [];
const sockets: WebSocket[] = [];
async function connect(user: (typeof users)[number]) {
  const ws = new WebSocket(url, {
    headers: { origin: new URL(base).origin, cookie: user.cookie },
  });
  sockets.push(ws);
  const frames: ServerFrame[] = [];
  let error: Error | undefined;
  ws.on("error", (e) => {
    error = e;
  });
  ws.on("message", (raw) => frames.push(JSON.parse(raw.toString())));
  await until(() => {
    if (error) throw error;
    return frames.some((f) => f.type === "ready");
  });
  return {
    ws,
    frames,
    send: (frame: unknown) => ws.send(JSON.stringify(frame)),
  };
}
async function until(check: () => unknown) {
  const deadline = Date.now() + 20000;
  while (!check()) {
    if (Date.now() > deadline) throw new Error("Realtime check timed out");
    await new Promise((r) => setTimeout(r, 10));
  }
}
try {
  for (const name of ["Socket sender", "Socket receiver"]) {
    const { user, cookie } = await createAuthFixture(
      `ws-${crypto.randomUUID()}@example.test`,
      name,
    );
    users.push({ id: user.id, cookie });
    await ensureProfile(db, user);
  }
  await db.transaction(async (tx) => {
    await mutate(tx as unknown as Database, users[0].id, {
      type: "community.create",
      id: communityId,
      community: {
        name: "Temporary socket check",
        description: "Removed after testing",
        icon: "sun",
        color: "purple",
        category: "Test",
      },
      channels: [
        { id: "general", name: "general", description: "", group: "CHAT" },
      ],
    });
    await mutate(tx as unknown as Database, users[1].id, {
      type: "community.join",
      id: communityId,
    });
  });
  const a = await connect(users[0]),
    b = await connect(users[1]);
  const conversation = `${communityId}:general`;
  for (const client of [a, b])
    client.send({ type: "watch", rooms: [{ conversation }] });
  await until(() =>
    [a, b].every((c) => c.frames.some((f) => f.type === "watched")),
  );
  let start = performance.now();
  a.send({ type: "typing", conversation, active: true });
  await until(() =>
    b.frames.some(
      (f) => f.type === "typing" && f.people[0]?.userId === users[0].id,
    ),
  );
  console.log(
    JSON.stringify({ typingMs: Math.round(performance.now() - start) }),
  );
  for (let i = 0; i < 3; i++) {
    const id = crypto.randomUUID(),
      requestId = crypto.randomUUID();
    start = performance.now();
    a.send({
      type: "send",
      requestId,
      action: {
        type: "message.send",
        id,
        conversation,
        text: `Live check ${i}`,
        attachments: [],
      },
    });
    await until(() =>
      a.frames.some((f) => f.type === "ack" && f.requestId === requestId),
    );
    const ackMs = Math.round(performance.now() - start);
    await until(() =>
      b.frames.some((f) => f.type === "message" && f.id === id),
    );
    console.log(
      JSON.stringify({
        ackMs,
        deliveredMs: Math.round(performance.now() - start),
      }),
    );
    assert.equal(
      b.frames.some((f) => f.type === "invalidate"),
      false,
    );
  }
  await until(
    () =>
      b.frames.filter((f) => f.type === "typing").at(-1)?.people.length === 0,
  );
  b.ws.close();
  await once(b.ws, "close");
  const id = crypto.randomUUID();
  // An HTTP write made while a receiver is away must appear in their catch-up read.
  const response = await fetch(`${base}/api/messages`, {
    method: "POST",
    headers: {
      origin: new URL(base).origin,
      cookie: users[0].cookie,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      type: "message.send",
      id,
      conversation,
      text: "Reconnect recovery",
      attachments: [],
    }),
  });
  assert.equal(response.status, 200);
  await connect(users[1]);
  const history = await fetch(
    `${base}/api/messages?conversation=${encodeURIComponent(conversation)}`,
    { headers: { cookie: users[1].cookie } },
  );
  assert.equal(history.status, 200);
  assert.equal(
    (await history.json()).messages.some((m: { id: string }) => m.id === id),
    true,
  );
  console.log("Realtime send, typing, stop and reconnect checks passed.");
} finally {
  for (const ws of sockets) ws.terminate();
  await db.delete(s.communities).where(eq(s.communities.id, communityId));
  if (users.length) {
    await db.delete(s.limits).where(
      inArray(
        s.limits.key,
        users.map((u) => `actions:${u.id}`),
      ),
    );
    await db.delete(s.user).where(
      inArray(
        s.user.id,
        users.map((u) => u.id),
      ),
    );
  }
}
process.exit(0);
