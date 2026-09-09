import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { eq } from "drizzle-orm";
import * as schema from "../src/server/db/schema";
import type { Database } from "../src/server/db";
import {
  acceptInvite,
  createInvite,
  inviteExists,
  invitePreview,
  revokeInvite,
  validInviteCode,
} from "../src/server/invites";

const engine = new PGlite();
const database = drizzle(engine, { schema });
const db = database as unknown as Database;
const communityId = "invite-test-room";

before(async () => {
  process.env.INVITE_SHORT_URL = "https://drocsid.cc";
  await migrate(database, { migrationsFolder: "./drizzle" });
  await db.insert(schema.user).values([
    { id: "owner", name: "Owner", email: "owner@invite.test" },
    { id: "member", name: "Member", email: "member@invite.test" },
    { id: "guest", name: "Guest", email: "guest@invite.test" },
  ]);
  await db.insert(schema.communities).values({
    id: communityId,
    name: "Invite room",
    description: "A room reached through a short link.",
    icon: "sun",
    color: "purple",
    category: "Tests",
  });
  await db.insert(schema.members).values([
    { communityId, userId: "owner", role: "Owner" },
    { communityId, userId: "member", role: "Member" },
  ]);
  await db.insert(schema.categories).values({
    id: "invite-category",
    communityId,
    name: "CHAT",
  });
  await db.insert(schema.conversations).values({
    id: "invite-conversation",
    kind: "channel",
    communityId,
    channelId: "general",
    name: "general",
    categoryId: "invite-category",
  });
});

after(async () => engine.close());

test("only owners and admins can create stable short invite links", async () => {
  await assert.rejects(() => createInvite(db, "member", communityId), {
    message: "Only community owners and admins can do that.",
  });
  await assert.rejects(() => createInvite(db, "guest", communityId), {
    message: "Only community owners and admins can do that.",
  });
  const first = await createInvite(db, "owner", communityId);
  const repeated = await createInvite(db, "owner", communityId);
  assert.equal(first.code, repeated.code);
  assert.match(first.code, /^[A-Za-z0-9]{7}$/);
  assert.equal(first.url, `https://drocsid.cc/${first.code}`);
  assert.equal(await inviteExists(db, first.code), true);
  const preview = await invitePreview(db, first.code);
  assert.equal(preview.community.name, "Invite room");
  assert.equal(preview.community.members, 2);
});

test("invite validation accepts current codes and previously issued legacy codes", () => {
  assert.equal(validInviteCode("Abc1234"), true);
  assert.equal(validInviteCode("6F_70I_yzEwM"), true);
  assert.equal(validInviteCode("Abc_234"), false);
  assert.equal(validInviteCode("Abc-234"), false);
  assert.equal(validInviteCode("Abc123!"), false);
  assert.equal(validInviteCode("Ａbc1234"), false);
  assert.equal(validInviteCode("Abc123"), false);
  assert.equal(validInviteCode("Abc12345"), false);
});

test("accepting is atomic and only counts a newly joined member", async () => {
  const invite = await createInvite(db, "owner", communityId);
  assert.deepEqual(await acceptInvite(db, "guest", invite.code), {
    communityId,
    channelId: "general",
  });
  await acceptInvite(db, "guest", invite.code);
  const [stored] = await db
    .select()
    .from(schema.communityInvites)
    .where(eq(schema.communityInvites.code, invite.code));
  assert.equal(stored.useCount, 1);
  const joined = await db
    .select()
    .from(schema.members)
    .where(eq(schema.members.userId, "guest"));
  assert.equal(joined.length, 1);
});

test("members cannot revoke links and an owner can revoke any community link", async () => {
  const invite = await createInvite(db, "owner", communityId);
  await assert.rejects(() => revokeInvite(db, "member", invite.code), {
    message: "Only community owners and admins can do that.",
  });
  await revokeInvite(db, "owner", invite.code);
  assert.equal(await inviteExists(db, invite.code), false);
  await assert.rejects(() => invitePreview(db, invite.code), {
    message: "Invite not found.",
  });
  await assert.rejects(() => acceptInvite(db, "guest", invite.code), {
    message: "This invitation is no longer available.",
  });
});
