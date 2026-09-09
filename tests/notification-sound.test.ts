import assert from "node:assert/strict";
import { test } from "node:test";
import {
  isConversationOpen,
  shouldPlayIncomingMessageSound,
} from "../src/lib/notification-sound";
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
  alreadyKnown: false,
  notifications: true,
  sounds: true,
  muted: [] as string[],
  pathname: "/app/dm/person-2",
  visibility: "visible" as const,
};

test("matches the active DM and community conversation paths", () => {
  assert.equal(isConversationOpen("dm:person-1", "/app/dm/person-1"), true);
  assert.equal(
    isConversationOpen(
      "community-1:general",
      "/app/community/community-1/general",
    ),
    true,
  );
  assert.equal(
    isConversationOpen(
      "community-1:general",
      "/app/community/community-1/random",
    ),
    false,
  );
});

test("plays for a new incoming message outside the visible conversation", () => {
  assert.equal(shouldPlayIncomingMessageSound(context), true);
  assert.equal(
    shouldPlayIncomingMessageSound({ ...context, visibility: "hidden" }),
    true,
  );
});

test("stays quiet for the open visible conversation and message updates", () => {
  assert.equal(
    shouldPlayIncomingMessageSound({
      ...context,
      pathname: "/app/community/community-1/general",
    }),
    false,
  );
  assert.equal(
    shouldPlayIncomingMessageSound({ ...context, newMessage: false }),
    false,
  );
  assert.equal(
    shouldPlayIncomingMessageSound({ ...context, alreadyKnown: true }),
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
