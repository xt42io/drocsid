import { test } from "node:test";
import assert from "node:assert/strict";
import {
  applyChannel,
  getChannelCategories,
  showChannelWelcome,
} from "../src/lib/channels";
import type { AppState, Community, Channel, Message } from "../src/types/app";

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

test("welcome is only for owners/admins in an unstarted general channel", () => {
  const community = {
    id: "room",
    joined: true,
    memberRoles: { you: "Owner" },
  } as Community;
  const channel = {
    id: "general",
    name: "general",
    hasMessages: false,
  } as Channel;
  assert.equal(showChannelWelcome(community, channel, []), true);
  for (const role of ["Member", "Moderator"] as const)
    assert.equal(
      showChannelWelcome(
        { ...community, memberRoles: { you: role } },
        channel,
        [],
      ),
      false,
    );
  assert.equal(
    showChannelWelcome(
      { ...community, memberRoles: { you: "Admin" } },
      channel,
      [],
    ),
    true,
  );
  assert.equal(
    showChannelWelcome(community, { ...channel, name: "projects" }, []),
    false,
  );
  assert.equal(
    showChannelWelcome({ ...community, joined: false }, channel, []),
    false,
  );
  const message = { id: "first", conversation: "room:general" } as Message;
  assert.equal(
    showChannelWelcome(community, channel, [{ ...message, sending: true }]),
    true,
  );
  assert.equal(
    showChannelWelcome(community, channel, [
      { ...message, sendError: "Failed" },
    ]),
    true,
  );
  assert.equal(showChannelWelcome(community, channel, [message]), false);
  assert.equal(
    showChannelWelcome(community, { ...channel, hasMessages: true }, []),
    false,
  );
});
