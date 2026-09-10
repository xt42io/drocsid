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

class AuthSocket {
  static OPEN = 1;
  static instances: AuthSocket[] = [];
  readyState = 1;
  onmessage?: (event: any) => void;
  onclose?: (event: any) => void;
  onerror?: (event: any) => void;
  constructor(public url: URL) {
    AuthSocket.instances.push(this);
  }
  send() {}
  close(code = 1006) {
    this.readyState = 3;
    this.onclose?.({ code });
  }
  receive(frame: unknown) {
    this.onmessage?.({ data: JSON.stringify(frame) });
  }
}

function authEnvironment(t: any, sessionResponse: () => Response) {
  const oldWindow = globalThis.window,
    oldSocket = globalThis.WebSocket,
    oldFetch = globalThis.fetch;
  const assigned: string[] = [];
  globalThis.window = {
    location: {
      href: "http://localhost:1515/app/community/home/general",
      pathname: "/app/community/home/general",
      assign: (url: string) => assigned.push(url),
    },
  } as any;
  AuthSocket.instances = [];
  globalThis.WebSocket = AuthSocket as any;
  globalThis.fetch = (async (input: any) => {
    assert.equal(String(input), "/api/session");
    return sessionResponse();
  }) as any;
  const events: { event: string; properties?: Record<string, unknown> }[] = [];
  const client = new RealtimeClient(
    () => {},
    () => {},
    (event, properties) => events.push({ event, properties }),
  );
  t.after(() => {
    client.close();
    globalThis.window = oldWindow;
    globalThis.WebSocket = oldSocket;
    globalThis.fetch = oldFetch;
  });
  return { client, assigned, events };
}

const response = (status: number, body: unknown): Response =>
  ({ ok: status < 400, status, json: async () => body }) as Response;

test("a 4401 close that leaves the session valid reconnects instead of signing out", async (t) => {
  const { client, assigned, events } = authEnvironment(t, () =>
    response(200, { user: { id: "you" } }),
  );
  client.start();
  AuthSocket.instances[0].receive({ type: "ready" });
  AuthSocket.instances[0].close(4401);
  const deadline = Date.now() + 2000;
  while (AuthSocket.instances.length < 2) {
    assert.ok(Date.now() < deadline, "expected a reconnect");
    await new Promise((r) => setTimeout(r, 10));
  }
  assert.deepEqual(assigned, []);
  assert.equal(
    events.some((e) => e.event === "realtime_forced_sign_out"),
    false,
  );
});

test("a 4401 close on a gone session signs out and records the forced sign-out", async (t) => {
  const { client, assigned, events } = authEnvironment(t, () =>
    response(401, { error: "Please sign in to continue." }),
  );
  client.start();
  AuthSocket.instances[0].receive({ type: "ready" });
  AuthSocket.instances[0].close(4401);
  const deadline = Date.now() + 2000;
  while (assigned.length < 1) {
    assert.ok(Date.now() < deadline, "expected a redirect to sign-in");
    await new Promise((r) => setTimeout(r, 10));
  }
  assert.equal(
    assigned[0],
    "/sign-in?next=%2Fapp%2Fcommunity%2Fhome%2Fgeneral",
  );
  assert.equal(AuthSocket.instances.length, 1);
  assert.equal(
    events.some((e) => e.event === "realtime_forced_sign_out"),
    true,
  );
});

test("a live connection that drops records the loss with its close code", async (t) => {
  const { client, events } = authEnvironment(t, () =>
    response(200, { user: { id: "you" } }),
  );
  client.start();
  AuthSocket.instances[0].receive({ type: "ready" });
  AuthSocket.instances[0].close(1006);
  const drop = events.find((e) => e.event === "realtime_connection_lost");
  assert.ok(drop, "expected a connection-lost event");
  assert.equal(drop!.properties?.code, 1006);
  client.close();
});

test("a failed initial handshake does not record a connection loss", async (t) => {
  const { client, events } = authEnvironment(t, () =>
    response(200, { user: { id: "you" } }),
  );
  client.start();
  // Close before a "ready" frame ever arrives.
  AuthSocket.instances[0].close(1006);
  assert.equal(
    events.some((e) => e.event === "realtime_connection_lost"),
    false,
  );
  client.close();
});
