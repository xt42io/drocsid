import assert from "node:assert/strict";
import { test } from "node:test";
import {
  canManageCommunity,
  canManageCommunityMember,
  canModerateCommunity,
  canPinConversation,
} from "../src/lib/community-permissions";
import type { AppState, Community } from "../src/types/app";

function community(role: "Owner" | "Admin" | "Moderator" | "Member") {
  return { id: "corner", memberRoles: { you: role } } as Community;
}

test("only owners and admins receive community management controls", () => {
  assert.equal(canManageCommunity(community("Owner")), true);
  assert.equal(canManageCommunity(community("Admin")), true);
  assert.equal(canManageCommunity(community("Moderator")), false);
  assert.equal(canManageCommunity(community("Member")), false);
  assert.equal(canManageCommunity(undefined), false);
});

test("moderators can moderate without receiving management controls", () => {
  assert.equal(canModerateCommunity(community("Moderator")), true);
  assert.equal(canModerateCommunity(community("Member")), false);
});

test("member controls follow the owner and admin hierarchy", () => {
  const owner = {
    ...community("Owner"),
    memberRoles: { you: "Owner", admin: "Admin", owner: "Owner" },
  } as Community;
  const admin = {
    ...community("Admin"),
    memberRoles: {
      you: "Admin",
      peer: "Admin",
      moderator: "Moderator",
      member: "Member",
    },
  } as Community;
  assert.equal(canManageCommunityMember(owner, "admin"), true);
  assert.equal(canManageCommunityMember(owner, "owner"), false);
  assert.equal(canManageCommunityMember(admin, "peer"), false);
  assert.equal(canManageCommunityMember(admin, "moderator"), true);
  assert.equal(canManageCommunityMember(admin, "member"), true);
  assert.equal(canManageCommunityMember(admin, "you"), false);
});

test("pin controls follow the server permission for channels and remain available in DMs", () => {
  const state = {
    communities: [community("Member")],
  } as AppState;
  assert.equal(canPinConversation(state, "corner:general"), false);
  assert.equal(
    canPinConversation(
      { ...state, communities: [community("Admin")] },
      "corner:general",
    ),
    true,
  );
  assert.equal(canPinConversation(state, "dm:someone"), true);
});
