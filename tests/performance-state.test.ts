import { test } from "node:test";
import assert from "node:assert/strict";
import { ActionQueue } from "../src/lib/action-scope";
import { ReadReceipts } from "../src/lib/read-receipts";
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

test("selection store keeps action identities stable and delegates to current state", () => {
  let current = "first";
  const store = selectionStore({ name: "first", command: () => current });
  const command = store.get().command;
  current = "next";
  store.set({ name: "next", command: () => current });
  assert.equal(store.get().command, command);
  assert.equal(command(), "next");
});
