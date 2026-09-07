import { and, eq, inArray, or, sql } from "drizzle-orm";
import type { Database } from "./db";
import * as s from "./db/schema";
import { HttpError } from "./http";
import { defaults } from "../lib/contracts";

export async function ensureProfile(
  db: Database,
  viewer: { id: string; name: string },
) {
  await db
    .insert(s.profiles)
    .values({
      userId: viewer.id,
      handle: `user_${viewer.id
        .replace(/[^a-z0-9]/gi, "")
        .toLowerCase()
        .slice(0, 19)}`,
      preferences: defaults,
    })
    .onConflictDoNothing({ target: s.profiles.userId });
}
export async function roleFor(
  db: Database,
  userId: string,
  communityId: string,
) {
  const [member] = await db
    .select()
    .from(s.members)
    .where(
      and(eq(s.members.communityId, communityId), eq(s.members.userId, userId)),
    );
  return member?.role;
}
export async function requireManager(
  db: Database,
  userId: string,
  communityId: string,
) {
  const role = await roleFor(db, userId, communityId);
  if (role !== "Owner" && role !== "Admin")
    throw new HttpError(403, "Only community owners and admins can do that.");
  return role;
}
export async function isBlocked(db: Database, a: string, b: string) {
  const [block] = await db
    .select()
    .from(s.blocks)
    .where(
      or(
        and(eq(s.blocks.userId, a), eq(s.blocks.targetId, b)),
        and(eq(s.blocks.userId, b), eq(s.blocks.targetId, a)),
      ),
    )
    .limit(1);
  return !!block;
}
export async function accessibleConversations(db: Database, userId: string) {
  const [memberships, participation] = await Promise.all([
    db.select().from(s.members).where(eq(s.members.userId, userId)),
    db.select().from(s.participants).where(eq(s.participants.userId, userId)),
  ]);
  const communityIds = memberships.map((m) => m.communityId);
  const directIds = participation.map((p) => p.conversationId);
  if (!communityIds.length && !directIds.length) return [];
  const rows = await db
    .select()
    .from(s.conversations)
    .where(
      or(
        communityIds.length
          ? inArray(s.conversations.communityId, communityIds)
          : undefined,
        directIds.length ? inArray(s.conversations.id, directIds) : undefined,
      ),
    );
  return rows.filter((c) =>
    c.kind === "dm"
      ? directIds.includes(c.id)
      : !!c.channelId &&
        communityIds.includes(c.communityId!) &&
        (!c.private ||
          directIds.includes(c.id) ||
          ["Owner", "Admin"].includes(
            memberships.find((m) => m.communityId === c.communityId)?.role ??
              "",
          )),
  );
}
export async function requireConversation(
  db: Database,
  userId: string,
  key: string,
  createDm = false,
) {
  let id = key;
  if (key.startsWith("dm:")) {
    const target = key.slice(3);
    if (!/^[a-zA-Z0-9_-]{1,160}$/.test(target) || target === userId)
      throw new HttpError(400, "Choose another person.");
    if (await isBlocked(db, userId, target))
      throw new HttpError(403, "This conversation is unavailable.");
    id = `dm:${[userId, target].sort().join(":")}`;
    const [existing] = await db
      .select()
      .from(s.conversations)
      .where(eq(s.conversations.id, id));
    if (!existing && createDm) {
      const [targetProfile] = await db
        .select()
        .from(s.profiles)
        .where(eq(s.profiles.userId, target));
      if (!targetProfile) throw new HttpError(404, "Person not found.");
      const [friend] = await db
        .select()
        .from(s.friendships)
        .where(
          and(
            eq(s.friendships.accepted, true),
            or(
              and(
                eq(s.friendships.senderId, userId),
                eq(s.friendships.recipientId, target),
              ),
              and(
                eq(s.friendships.senderId, target),
                eq(s.friendships.recipientId, userId),
              ),
            ),
          ),
        );
      const shared = await db
        .select({ communityId: s.members.communityId })
        .from(s.members)
        .where(eq(s.members.userId, userId));
      const targetShared = shared.length
        ? await db
            .select()
            .from(s.members)
            .where(
              and(
                eq(s.members.userId, target),
                inArray(
                  s.members.communityId,
                  shared.map((m) => m.communityId),
                ),
              ),
            )
        : [];
      if (
        !friend &&
        (!targetProfile.preferences.directMessages || !targetShared.length)
      )
        throw new HttpError(
          403,
          "Become friends before starting this conversation.",
        );
      await db
        .insert(s.conversations)
        .values({ id, kind: "dm" })
        .onConflictDoNothing();
      await db
        .insert(s.participants)
        .values([
          { conversationId: id, userId },
          { conversationId: id, userId: target },
        ])
        .onConflictDoNothing();
    }
  }
  const conversation = (await accessibleConversations(db, userId)).find(
    (c) => c.id === id,
  );
  if (!conversation)
    throw new HttpError(403, "You do not have access to this conversation.");
  if (conversation.kind === "dm") {
    const participants = await db
      .select()
      .from(s.participants)
      .where(eq(s.participants.conversationId, id));
    for (const p of participants)
      if (p.userId !== userId && (await isBlocked(db, userId, p.userId)))
        throw new HttpError(403, "This conversation is unavailable.");
  }
  return conversation;
}
export async function takeLimit(
  db: Database,
  userId: string,
  bucket: string,
  max = 60,
) {
  const key = `${bucket}:${userId}`;
  const [row] = await db
    .insert(s.limits)
    .values({ key, count: 1 })
    .onConflictDoUpdate({
      target: s.limits.key,
      set: {
        count: sql`case when ${s.limits.windowStart} < now() - interval '1 minute' then 1 else ${s.limits.count} + 1 end`,
        windowStart: sql`case when ${s.limits.windowStart} < now() - interval '1 minute' then now() else ${s.limits.windowStart} end`,
      },
    })
    .returning();
  if (row.count > max)
    throw new HttpError(
      429,
      "A little too fast. Please try again in a minute.",
    );
}
