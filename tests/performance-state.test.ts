import { test } from "node:test";
import assert from "node:assert/strict";
import { ActionQueue } from "../src/lib/action-scope";
import {
  persistReadReceipts,
  ReadReceipts,
} from "../src/lib/read-receipts";
import { Drafts } from "../src/lib/drafts";
import { selectionStore } from "../src/lib/selection-store";

test("unrelated actions run independently while edits to one message retain order", async () => {
  const queue = new ActionQueue();
  let release!: () => void;
  const waiting = new Promise<void>((resolve) => (release = resolve));
  const order: string[] = [];
  const first = queue.run(
    [{ type: "message.update", id: "one", text: "first" }],
    async () => {
      order.push("first");
      await waiting;
      order.push("saved");
    },
  );
  const second = queue.run(
    [{ type: "message.delete", id: "one" }],
    async () => {
      order.push("deleted");
    },
  );
  await queue.run(
    [
      {
        type: "conversation.read",
        conversation: "other",
        through: new Date().toISOString(),
      },
    ],
    async () => {
      order.push("read");
    },
  );
  assert.deepEqual(order, ["first", "read"]);
  release();
  await Promise.all([first, second]);
  assert.deepEqual(order, ["first", "read", "saved", "deleted"]);
});

test("draft changes notify only their composer, preserve other drafts and clear immediately", () => {
  const drafts = new Drafts();
  let a = 0,
    b = 0;
  drafts.subscribe("a", () => a++);
  drafts.subscribe("b", () => b++);
  drafts.set("a", "one");
  drafts.set("a", "one two");
  assert.equal(a, 2);
  assert.equal(b, 0);
  drafts.set("b", "another");
  drafts.set("a", "");
  assert.equal(drafts.get("b"), "another");
  drafts.clear();
  assert.equal(drafts.get("b"), "");
});

test("read receipts coalesce bursts without delaying another conversation", async () => {
  const receipts = new ReadReceipts(5);
  const sent: string[] = [];
  const send = async (action: { conversation: string; through: string }) => {
    sent.push(`${action.conversation}:${action.through}`);
    return true;
  };
  const actions = [1, 2, 3].map((value) =>
    receipts.enqueue(
      { type: "conversation.read", conversation: "a", through: String(value) },
      send,
    ),
  );
  actions.push(
    receipts.enqueue(
      { type: "conversation.read", conversation: "b", through: "1" },
      send,
    ),
  );
  assert.deepEqual(await Promise.all(actions), [true, true, true, true]);
  assert.deepEqual(sent.sort(), ["a:3", "b:1"]);
});

test("pending read receipts survive refresh as bounded keepalive requests", async () => {
  const receipts = new ReadReceipts(60_000);
  const waiting = [
    receipts.enqueue(
      { type: "conversation.read", conversation: "a", through: "1" },
      async () => true,
    ),
    receipts.enqueue(
      { type: "conversation.read", conversation: "a", through: "2" },
      async () => true,
    ),
    receipts.enqueue(
      { type: "conversation.read", conversation: "b", through: "1" },
      async () => true,
    ),
  ];
  assert.deepEqual(
    receipts
      .pending()
      .map((read) => `${read.conversation}:${read.through}`)
      .sort(),
    ["a:2", "b:1"],
  );

  const requests: { path: string; init?: RequestInit }[] = [];
  await Promise.all(
    persistReadReceipts(receipts.pending(), async (path, init) => {
      requests.push({ path: String(path), init });
      return new Response(null, { status: 200 });
    }),
  );
  assert.equal(requests.length, 1);
  assert.equal(requests[0].path, "/api/app");
  assert.equal(requests[0].init?.keepalive, true);
  assert.equal(requests[0].init?.credentials, "same-origin");
  assert.deepEqual(JSON.parse(String(requests[0].init?.body)), [
    { type: "conversation.read", conversation: "a", through: "2" },
    { type: "conversation.read", conversation: "b", through: "1" },
  ]);
  receipts.clear();
  assert.deepEqual(await Promise.all(waiting), [false, false, false]);
});

test("an in-flight read cursor remains recoverable during page teardown", async () => {
  const receipts = new ReadReceipts(0);
  let finish!: (value: boolean) => void;
  const sending = new Promise<boolean>((resolve) => {
    finish = resolve;
  });
  const result = receipts.enqueue(
    { type: "conversation.read", conversation: "a", through: "3" },
    () => sending,
  );
  await new Promise((resolve) => setTimeout(resolve, 5));
  assert.deepEqual(receipts.pending(), [
    { type: "conversation.read", conversation: "a", through: "3" },
  ]);
  finish(true);
  assert.equal(await result, true);
});

test("selection store keeps action identities stable and delegates to current state", () => {
  let current = "first";
  const store = selectionStore({ name: "first", command: () => current });
  const command = store.get().command;
  current = "next";
  store.set({ name: "next", command: () => current });
  assert.equal(store.get().command, command);
  assert.equal(command(), "next");
});
