import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { WebSocket } from "ws";
import { attachRealtime } from "../src/server/realtime/gateway";
import type { BusEvent, LiveBus } from "../src/server/realtime/bus";
import type { realtimeData } from "../src/server/realtime/data";
import type { ServerFrame } from "../src/lib/realtime-protocol";

// Real WebSocket clients on a disposable loopback port. The fake bus/data isolate
// transport behavior; backend.test exercises the Postgres notification triggers.
test("WebSockets authenticate, acknowledge, scope typing, expire it and revoke access", async (t) => {
  const server = createServer();
  let emit: (event: BusEvent) => void = () => {};
  let available: (ready: boolean) => void = () => {};
  const bus: LiveBus = {
    start(cb, status) {
      emit = cb;
      available = status;
      status(true);
    },
    publish(event) {
      emit(event);
    },
    async close() {},
  };
  const messages = new Map();
  const data: typeof realtimeData = {
    async authenticate(headers) {
      const userId = headers.get("cookie");
      return userId && ["a", "b", "c", "hidden"].includes(userId)
        ? {
            userId,
            sessionId: userId,
            expiresAt: Date.now() + 60000,
            name: `User ${userId}`,
            status: userId === "hidden" ? "offline" : "online",
          }
        : null;
    },
    async sessions() {
      return [];
    },
    async authorize(userId, room) {
      if (room.conversation === "private" && userId !== "a")
        throw Object.assign(new Error("No access"), { status: 403 });
      return room.conversation;
    },
    async message(userId, conversation, id) {
      return conversation === "private" && userId !== "a"
        ? null
        : { type: "message", id, message: messages.get(id) ?? null };
    },
    async send(userId, input) {
      if (input.conversation === "private" && userId !== "a")
        throw Object.assign(new Error("No access"), { status: 403 });
      const message = {
        id: input.id,
        conversation: input.conversation,
        text: input.text,
        author: userId,
        reactions: [],
        time: "",
      };
      messages.set(input.id, message);
      emit({
        type: "message",
        id: input.id,
        conversationId: input.conversation,
      });
      return { message };
    },
  };
  const close = attachRealtime(server, data, bus, "http://localhost:1515");
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const url = `ws://127.0.0.1:${(server.address() as { port: number }).port}/api/ws`;
  const sockets: WebSocket[] = [];
  t.after(async () => {
    for (const ws of sockets) ws.terminate();
    await close();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });
  async function client(userId: string) {
    const ws = new WebSocket(url, {
      headers: { origin: "http://localhost:1515", cookie: userId },
    });
    sockets.push(ws);
    const frames: ServerFrame[] = [];
    ws.on("message", (raw) => frames.push(JSON.parse(raw.toString())));
    await until(() => frames.some((f) => f.type === "ready"));
    return {
      ws,
      frames,
      send: (frame: unknown) => ws.send(JSON.stringify(frame)),
    };
  }
  async function rejected(headers: Record<string, string>, status: number) {
    const ws = new WebSocket(url, { headers });
    sockets.push(ws);
    ws.on("error", () => {});
    const [, response] = await once(ws, "unexpected-response");
    assert.equal(response.statusCode, status);
    ws.terminate();
  }
  await rejected({ origin: "https://evil.test", cookie: "a" }, 403);
  await rejected({ origin: "http://localhost:1515" }, 401);
  const a = await client("a"),
    b = await client("b"),
    c = await client("c"),
    hidden = await client("hidden");
  a.send({
    type: "watch",
    rooms: [
      { conversation: "general" },
      { conversation: "general", threadOf: "parent" },
    ],
  });
  b.send({ type: "watch", rooms: [{ conversation: "general" }] });
  c.send({ type: "watch", rooms: [{ conversation: "elsewhere" }] });
  hidden.send({ type: "watch", rooms: [{ conversation: "general" }] });
  await until(() =>
    [a, b, c, hidden].every((x) => x.frames.some((f) => f.type === "watched")),
  );
  a.send({ type: "typing", conversation: "general", active: true });
  await until(() =>
    b.frames.some((f) => f.type === "typing" && f.people[0]?.userId === "a"),
  );
  assert.equal(
    a.frames.some(
      (f) => f.type === "typing" && f.people.some((p) => p.userId === "a"),
    ),
    false,
  );
  assert.equal(
    c.frames.some((f) => f.type === "typing" && f.people.length),
    false,
  );
  assert.equal(
    b.frames.some((f) => f.type === "typing" && f.people[0]?.name === "User a"),
    true,
  );
  a.send({ type: "typing", conversation: "general", active: false });
  await until(
    () =>
      b.frames.filter((f) => f.type === "typing").at(-1)?.people.length === 0,
  );
  a.send({
    type: "typing",
    conversation: "general",
    threadOf: "parent",
    active: true,
  });
  hidden.send({ type: "typing", conversation: "general", active: true });
  await new Promise((r) => setTimeout(r, 40));
  assert.equal(
    b.frames.filter((f) => f.type === "typing").at(-1)?.people.length,
    0,
  );
  const id = crypto.randomUUID(),
    requestId = crypto.randomUUID();
  a.send({
    type: "send",
    requestId,
    action: {
      type: "message.send",
      id,
      conversation: "general",
      text: "Instant",
      attachments: [],
    },
  });
  await until(
    () =>
      a.frames.some((f) => f.type === "ack" && f.requestId === requestId) &&
      b.frames.some((f) => f.type === "message" && f.id === id),
  );
  assert.equal(
    b.frames.some((f) => f.type === "invalidate"),
    false,
  );
  const privateId = crypto.randomUUID();
  a.send({
    type: "send",
    requestId: crypto.randomUUID(),
    action: {
      type: "message.send",
      id: privateId,
      conversation: "private",
      text: "Private",
      attachments: [],
    },
  });
  await until(() =>
    a.frames.some((f) => f.type === "message" && f.id === privateId),
  );
  assert.equal(
    b.frames.some((f) => f.type === "message" && f.id === privateId),
    false,
  );
  b.send({ type: "watch", rooms: [{ conversation: "private" }] });
  await until(() =>
    b.frames.some((f) => f.type === "error" && f.status === 403),
  );
  b.send({ type: "watch", rooms: [{ conversation: "general" }] });
  await new Promise((r) => setTimeout(r, 30));
  emit({
    type: "typing",
    connectionId: "expiry-test",
    userId: "a",
    name: "User a",
    conversationId: "general",
    expiresAt: Date.now() + 30,
  });
  await until(
    () =>
      b.frames.filter((f) => f.type === "typing").at(-1)?.people.length === 1,
  );
  await until(
    () =>
      b.frames.filter((f) => f.type === "typing").at(-1)?.people.length === 0,
  );
  // Last-tab disconnect reports offline; another tab keeps the account online.
  const a2 = await client("a");
  a.ws.close();
  await once(a.ws, "close");
  assert.notEqual(
    b.frames.filter((f) => f.type === "presence" && f.userId === "a").at(-1)
      ?.status,
    "offline",
  );
  a2.ws.close();
  await once(a2.ws, "close");
  await until(() =>
    b.frames.some(
      (f) =>
        f.type === "presence" && f.userId === "a" && f.status === "offline",
    ),
  );
  emit({ type: "session", id: "c" });
  const [code] = await once(c.ws, "close");
  assert.equal(code, 4401);
  emit({ type: "access" });
  const [accessCode] = await once(b.ws, "close");
  assert.equal(accessCode, 1012);
  const reconnected = await client("b");
  available(false);
  const [databaseCode] = await once(reconnected.ws, "close");
  assert.equal(databaseCode, 1012);
});
async function until(check: () => unknown) {
  const deadline = Date.now() + 4000;
  while (!check()) {
    if (Date.now() > deadline)
      throw new Error("Timed out waiting for WebSocket event");
    await new Promise((r) => setTimeout(r, 10));
  }
}
