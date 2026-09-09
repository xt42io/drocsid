import assert from "node:assert/strict";
import { test } from "node:test";
import { shouldPlayIncomingMessageSound } from "../src/lib/notification-sound";
import type { Message } from "../src/types/app";

const incoming: Message = {
  id: "message-1",
  conversation: "community-1:general",
  author: "person-1",
  text: "Hello",
  time: "now",
  reactions: [],
};

const context = {
  message: incoming,
  newMessage: true,
  notifications: true,
  sounds: true,
  muted: [] as string[],
};

test("plays for every new incoming message when sounds are enabled", () => {
  assert.equal(shouldPlayIncomingMessageSound(context), true);
});

test("stays quiet for message updates", () => {
  assert.equal(
    shouldPlayIncomingMessageSound({ ...context, newMessage: false }),
    false,
  );
});

test("respects authorship, notification, sound, and mute preferences", () => {
  assert.equal(
    shouldPlayIncomingMessageSound({
      ...context,
      message: { ...incoming, author: "you" },
    }),
    false,
  );
  assert.equal(
    shouldPlayIncomingMessageSound({ ...context, notifications: false }),
    false,
  );
  assert.equal(
    shouldPlayIncomingMessageSound({ ...context, sounds: false }),
    false,
  );
  assert.equal(
    shouldPlayIncomingMessageSound({
      ...context,
      muted: [incoming.conversation],
    }),
    false,
  );
});
