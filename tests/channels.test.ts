import { test } from "node:test";
import assert from "node:assert/strict";
import { applyChannel, getChannelCategories } from "../src/lib/channels";
import type { AppState } from "../src/types/app";

test("confirmed channels are immediately navigable without a refresh and retries preserve current state", () => {
  const existing = {
    id: "general",
    name: "general",
    description: "",
    group: "CHAT",
    unread: 4,
  };
  const state = {
    communities: [
      { id: "community", channels: [existing], channelCategories: ["CHAT"] },
      { id: "other", channels: [] },
    ],
    drafts: { general: "Unsent" },
    messages: [{ id: "message" }],
  } as unknown as AppState;
  const result = {
    communityId: "community",
    channel: {
      id: "new",
      name: "new",
      description: "New channel",
      group: "PROJECTS",
    },
  };
  const next = applyChannel(state, result);
  assert.equal(
    next.communities[0].channels.find((c) => c.id === "new")?.name,
    "new",
  );
  assert.deepEqual(getChannelCategories(next.communities[0]), [
    "CHAT",
    "PROJECTS",
  ]);
  assert.equal(next.communities[1], state.communities[1]);
  assert.equal(next.messages, state.messages);
  assert.equal(next.drafts, state.drafts);
  assert.deepEqual(applyChannel(next, result), next);
  const edited = applyChannel(next, {
    communityId: "community",
    channel: { ...existing, unread: undefined, description: "Changed" },
  });
  assert.equal(edited.communities[0].channels[0].description, "Changed");
  assert.equal(edited.communities[0].channels[0].unread, 4);
  assert.equal(state.communities[0].channels.length, 1);
});
