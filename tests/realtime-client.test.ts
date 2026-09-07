import { test } from "node:test";
import assert from "node:assert/strict";
import { RealtimeClient } from "../src/lib/realtime-client";
import { ApiError } from "../src/lib/api-client";

test("client acknowledges concurrent sends, rejects uncertain sends and restores subscriptions after reconnect", async (t) => {
  const oldWindow = globalThis.window,
    oldSocket = globalThis.WebSocket;
  class Socket {
    static OPEN = 1;
    static instances: Socket[] = [];
    readyState = 1;
    frames: any[] = [];
    onmessage?: (event: any) => void;
    onclose?: (event: any) => void;
    onerror?: (event: any) => void;
    constructor(public url: URL) {
      Socket.instances.push(this);
    }
    send(text: string) {
      this.frames.push(JSON.parse(text));
    }
    close() {
      this.readyState = 3;
      this.onclose?.({ code: 1006 });
    }
    receive(frame: unknown) {
      this.onmessage?.({ data: JSON.stringify(frame) });
    }
  }
  globalThis.window = {
    location: {
      href: "http://localhost:1515/app",
      pathname: "/app",
      assign() {},
    },
  } as any;
  globalThis.WebSocket = Socket as any;
  const connected: boolean[] = [];
  const client = new RealtimeClient(
    () => {},
    (online) => connected.push(online),
  );
  t.after(() => {
    client.close();
    globalThis.window = oldWindow;
    globalThis.WebSocket = oldSocket;
  });
  client.start();
  const socket = Socket.instances[0];
  assert.equal(socket.url.toString(), "ws://localhost:1515/api/ws");
  const unobserve = client.observe({ conversation: "general" });
  socket.receive({ type: "ready" });
  assert.deepEqual(socket.frames.at(-1), {
    type: "watch",
    rooms: [{ conversation: "general" }],
  });
  const first = {
    type: "message.send" as const,
    id: crypto.randomUUID(),
    conversation: "general",
    text: "Same",
    attachments: [],
  };
  const second = { ...first, id: crypto.randomUUID() };
  const one = client.send(first),
    two = client.send(second);
  const [sendOne, sendTwo] = socket.frames.filter((f) => f.type === "send");
  socket.receive({
    type: "ack",
    requestId: sendTwo.requestId,
    message: { ...second, sending: false },
  });
  assert.equal((await two).message?.id, second.id);
  socket.receive({
    type: "ack",
    requestId: sendOne.requestId,
    message: { ...first, sending: false },
  });
  assert.equal((await one).message?.id, first.id);
  client.setTyping({ conversation: "general" }, true);
  client.setTyping({ conversation: "general" }, true);
  assert.equal(
    socket.frames.filter((f) => f.type === "typing" && f.active).length,
    1,
  );
  client.setTyping({ conversation: "general" }, false);
  assert.equal(socket.frames.at(-1).active, false);
  const uncertain = client.send({ ...first, id: crypto.randomUUID() });
  const rejected = assert.rejects(
    uncertain,
    (error) => error instanceof ApiError && error.status === 0,
  );
  socket.close();
  await rejected;
  const deadline = Date.now() + 2000;
  while (Socket.instances.length < 2) {
    assert.ok(Date.now() < deadline);
    await new Promise((r) => setTimeout(r, 10));
  }
  const reconnected = Socket.instances[1];
  reconnected.receive({ type: "ready" });
  assert.deepEqual(reconnected.frames.at(-1).rooms, [
    { conversation: "general" },
  ]);
  assert.deepEqual(connected, [true, false, true]);
  const forbidden = client.send(first);
  const requestId = reconnected.frames.at(-1).requestId;
  reconnected.receive({
    type: "error",
    requestId,
    status: 403,
    error: "No access",
  });
  await assert.rejects(
    forbidden,
    (error) => error instanceof ApiError && error.status === 403,
  );
  unobserve();
  assert.deepEqual(reconnected.frames.at(-1), { type: "watch", rooms: [] });
});
