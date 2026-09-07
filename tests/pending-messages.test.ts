import { test } from "node:test";
import assert from "node:assert/strict";
import {
  reconcileMessages,
  enqueueMessage,
  replaceMessage,
} from "../src/lib/pending-messages";
import type { AppState, Message } from "../src/types/app";

test("stale refreshes preserve a local send and an acknowledgement replaces it without duplication", () => {
  const pending: Message = {
    id: "send-1",
    conversation: "room:general",
    author: "you",
    text: "Hello",
    createdAt: "2026-09-07T01:00:01Z",
    time: "",
    reactions: [],
    sending: true,
  };
  const local = new Map([[pending.id, pending]]);
  assert.equal(reconcileMessages([], local)[0].sending, true);
  const acknowledged = {
    ...pending,
    sending: undefined,
    createdAt: "2026-09-07T01:00:02Z",
  };
  local.set(pending.id, acknowledged);
  assert.deepEqual(reconcileMessages([], local), [acknowledged]);
  const remote = {
    ...acknowledged,
    reactions: [{ emoji: "👍", count: 1, mine: false }],
  };
  assert.deepEqual(reconcileMessages([remote], local), [remote]);
  assert.equal(local.size, 0);
  // Once confirmed, subsequent deletion from the server stays deleted.
  assert.deepEqual(reconcileMessages([], local), []);
});

test("concurrent identical sends and out-of-order acknowledgements never clear the next draft", () => {
  let state = {
    messages: [],
    drafts: { "room:general": "Hello" },
  } as unknown as AppState;
  const first: Message = {
    id: "first",
    conversation: "room:general",
    author: "you",
    text: "Hello",
    time: "",
    reactions: [],
    sending: true,
  };
  state = enqueueMessage(state, first);
  assert.equal(state.drafts["room:general"], "");
  state = { ...state, drafts: { "room:general": "Hello" } };
  const second = { ...first, id: "second" };
  state = enqueueMessage(state, second);
  assert.equal(state.messages.length, 2);
  state = { ...state, drafts: { "room:general": "Hello" } };
  state = replaceMessage(state, second.id, { ...second, sending: undefined });
  assert.equal(state.messages[0].sending, true);
  assert.equal(state.messages[1].sending, undefined);
  assert.equal(state.drafts["room:general"], "Hello");
  state = replaceMessage(state, first.id, {
    ...first,
    sending: false,
    sendError: "Connection interrupted",
  });
  assert.deepEqual(
    state.messages.map((m) => m.id),
    ["first", "second"],
  );
  assert.equal(state.messages[0].sendError, "Connection interrupted");
  const retried = { ...first, sending: true, sendError: undefined };
  state = replaceMessage(state, first.id, retried);
  state = replaceMessage(state, first.id, { ...retried, sending: undefined });
  assert.equal(state.messages.length, 2);
  assert.equal(state.drafts["room:general"], "Hello");
});

test("a pending thread reply clears only its own composer and survives stale snapshots", () => {
  const reply: Message = {
    id: "reply",
    conversation: "room:general",
    threadOf: "parent",
    author: "you",
    text: "Reply",
    time: "",
    reactions: [],
    sending: true,
  };
  const state = enqueueMessage(
    {
      messages: [],
      drafts: { "thread:parent": "Reply", "room:general": "Main draft" },
    } as unknown as AppState,
    reply,
  );
  assert.equal(state.drafts["thread:parent"], "");
  assert.equal(state.drafts["room:general"], "Main draft");
  const failed = { ...reply, sending: false, sendError: "Network unavailable" };
  assert.deepEqual(reconcileMessages([], new Map([[reply.id, failed]])), [
    failed,
  ]);
});
