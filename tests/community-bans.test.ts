import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import type { Database } from "../src/server/db";
import * as schema from "../src/server/db/schema";
import { ensureProfile } from "../src/server/access";
import { mutate } from "../src/server/actions";
import { fastAction } from "../src/server/fast-actions";
import { acceptInvite, createInvite } from "../src/server/invites";
import { snapshot } from "../src/server/queries";

const engine = new PGlite();
const database = drizzle(engine, { schema });
const db = database as unknown as Database;
const communityId = "ban-corner";

before(async () => {
  await migrate(database, { migrationsFolder: "./drizzle" });
  for (const id of ["owner", "admin", "member", "watcher", "outsider"]) {
    await db
      .insert(schema.user)
      .values({ id, name: id, email: `${id}@bans.test` });
    await ensureProfile(db, { id, name: id });
  }
  await mutate(db, "owner", {
    type: "community.create",
    id: communityId,
    community: {
      name: "Ban corner",
      description: "Bans keep this place safe.",
      icon: "sun",
      color: "purple",
      category: "Tests",
      discoverable: true,
    },
    channels: [{ id: "general", name: "general", description: "", group: "" }],
  });
  await mutate(db, "admin", { type: "community.join", id: communityId });
  await mutate(db, "owner", {
    type: "member.role",
    communityId,
    userId: "admin",
    role: "Admin",
  });
  await mutate(db, "member", { type: "community.join", id: communityId });
  await mutate(db, "watcher", { type: "community.join", id: communityId });
});

after(() => engine.close());

test("bans remove members and block rejoining, unbans restore it", async () => {
  // Non-managers cannot ban.
  await assert.rejects(
    () =>
      mutate(db, "member", {
        type: "member.ban",
        communityId,
        userId: "outsider",
      }),
    /owners and admins/,
  );

  // Cannot ban the owner, yourself, or (as admin) another admin.
  await assert.rejects(
    () =>
      mutate(db, "admin", {
        type: "member.ban",
        communityId,
        userId: "owner",
      }),
    /cannot change this member/,
  );
  await assert.rejects(
    () =>
      mutate(db, "owner", {
        type: "member.ban",
        communityId,
        userId: "owner",
      }),
    /cannot change this member/,
  );
  await assert.rejects(
    () =>
      mutate(db, "admin", {
        type: "member.ban",
        communityId,
        userId: "admin",
      }),
    /cannot change this member/,
  );

  // Owner bans a member: membership gone, ban visible in snapshot.
  await mutate(db, "owner", {
    type: "member.ban",
    communityId,
    userId: "member",
  });
  const bannedSnap = await snapshot(db, { id: "owner", name: "owner" }, 0);
  const bannedCommunity = bannedSnap.communities.find(
    (c) => c.id === communityId,
  );
  assert.ok(bannedCommunity?.bannedIds?.includes("member"));
  assert.ok(!bannedCommunity?.memberIds?.includes("member"));

  // Ban lists are manager-only: admins see them, plain members do not.
  const adminSnap = await snapshot(db, { id: "admin", name: "admin" }, 0);
  assert.ok(
    adminSnap.communities
      .find((c) => c.id === communityId)
      ?.bannedIds?.includes("member"),
  );
  const watcherSnap = await snapshot(db, { id: "watcher", name: "watcher" }, 0);
  assert.deepEqual(
    watcherSnap.communities.find((c) => c.id === communityId)?.bannedIds,
    [],
  );

  // Banned user cannot rejoin directly (both paths) or via invite.
  await assert.rejects(
    () => mutate(db, "member", { type: "community.join", id: communityId }),
    /cannot join this community/,
  );
  await assert.rejects(
    () => fastAction(db, "member", { type: "community.join", id: communityId }),
    /cannot join this community/,
  );
  const invite = await createInvite(db, "owner", communityId);
  await assert.rejects(
    () => acceptInvite(db, "member", invite.code),
    /no longer available/,
  );

  // Unban restores invite joins.
  await mutate(db, "owner", {
    type: "member.unban",
    communityId,
    userId: "member",
  });
  assert.deepEqual(await acceptInvite(db, "member", invite.code), {
    communityId,
    channelId: "general",
  });

  // Remove (not ban) still allows rejoining.
  await mutate(db, "owner", {
    type: "member.remove",
    communityId,
    userId: "member",
  });
  await mutate(db, "member", { type: "community.join", id: communityId });
  const rejoined = await snapshot(db, { id: "member", name: "member" }, 0);
  assert.ok(
    rejoined.communities.some((c) => c.id === communityId && c.joined),
  );

  // Admins follow remove parity: they can ban/unban plain members but not
  // other admins, and cannot touch the owner.
  await mutate(db, "admin", {
    type: "member.ban",
    communityId,
    userId: "member",
  });
  await assert.rejects(
    () => mutate(db, "member", { type: "community.join", id: communityId }),
    /cannot join this community/,
  );
  await assert.rejects(
    () =>
      mutate(db, "admin", {
        type: "member.ban",
        communityId,
        userId: "owner",
      }),
    /cannot change this member/,
  );
  await mutate(db, "admin", {
    type: "member.unban",
    communityId,
    userId: "member",
  });
  await mutate(db, "member", { type: "community.join", id: communityId });
  assert.ok(
    (await snapshot(db, { id: "member", name: "member" }, 0)).communities.some(
      (c) => c.id === communityId && c.joined,
    ),
  );
});
