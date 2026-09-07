import { test } from "node:test";
import assert from "node:assert/strict";
import { PendingReactions, replaceReaction } from "../src/lib/reactions";
import { reactionSelectionSchema } from "../src/lib/contracts";
import type { Message } from "../src/types/app";
const message: Message = {
  id: "m",
  conversation: "c:general",
  author: "you",
  text: "Hello",
  time: "",
  reactions: [{ emoji: "👍", count: 2, mine: false }],
};

test("reactions appear instantly and rapid toggles coalesce without waiting on other emojis", () => {
  const pending = new PendingReactions();
  assert.equal(pending.toggle(message, "👍"), true);
  let shown = pending.overlay([message]);
  assert.deepEqual(shown[0].reactions[0], {
    emoji: "👍",
    count: 3,
    mine: true,
  });
  const first = pending.next("m", "👍")!;
  assert.equal(pending.toggle(shown[0], "👍"), false);
  assert.equal(pending.toggle(shown[0], "🔥"), true);
  const confirmation = pending.acknowledge(
    { id: "m", emoji: "👍", active: true, count: 3 },
    first.observed,
  );
  shown = pending.overlay(replaceReaction(shown, confirmation));
  assert.equal(shown[0].reactions.find((r) => r.emoji === "👍")?.mine, false);
  assert.equal(shown[0].reactions.find((r) => r.emoji === "🔥")?.count, 1);
  assert.equal(pending.next("m", "👍")?.active, false);
  assert.equal(pending.next("m", "🔥")?.active, true);
  pending.acknowledge({ id: "m", emoji: "👍", active: false, count: 2 }, 0);
  assert.equal(pending.next("m", "👍"), undefined);
  assert.ok(pending.next("m", "🔥"));
});

test("live updates preserve pending selections; rejection restores latest counts without losing other reactions", () => {
  const pending = new PendingReactions();
  pending.toggle(message, "👍");
  const live = {
    ...message,
    reactions: [
      { emoji: "👍", count: 5, mine: false },
      { emoji: "🔥", count: 1, mine: false },
    ],
  };
  pending.observe([live]);
  const shown = pending.overlay([live]);
  assert.equal(shown[0].reactions.find((r) => r.emoji === "👍")?.count, 6);
  assert.equal(
    pending.overlay(shown)[0].reactions.find((r) => r.emoji === "👍")?.count,
    6,
    "Rendering twice must not count a click twice",
  );
  assert.deepEqual(
    replaceReaction(shown, pending.reject("m", "👍"))[0]
      .reactions.slice()
      .sort((a, b) => a.emoji.localeCompare(b.emoji)),
    live.reactions.slice().sort((a, b) => a.emoji.localeCompare(b.emoji)),
  );
  assert.deepEqual(
    pending.overlay([]),
    [],
    "Pending reactions cannot resurrect deleted messages",
  );
});

test("acknowledgements keep newer live counts and retries explicitly select membership", () => {
  const pending = new PendingReactions();
  pending.toggle(message, "👍");
  const first = pending.next("m", "👍")!;
  pending.observe([
    { ...message, reactions: [{ emoji: "👍", count: 4, mine: true }] },
  ]);
  const confirmed = pending.acknowledge(
    { id: "m", emoji: "👍", active: true, count: 3 },
    first.observed,
  );
  assert.equal(confirmed.count, 4);
  assert.equal(pending.next("m", "👍"), undefined);
  assert.equal(
    reactionSelectionSchema.safeParse({ id: "m", emoji: "👍" }).success,
    false,
  );
  assert.equal(
    reactionSelectionSchema.safeParse({ id: "m", emoji: "👍", active: false })
      .success,
    true,
  );
});
