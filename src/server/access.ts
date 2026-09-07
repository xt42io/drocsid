import { hydrate, rowJson } from "./sql-json";
import { and, eq, inArray, or, sql, type SQL } from "drizzle-orm";
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
  return db.select().from(s.conversations).where(conversationAccess(userId));
}
// Check one conversation in SQL instead of loading every membership and channel.
export function conversationAccess(userId: string | SQL) {
  return sql`(
    (${s.conversations.kind} = 'channel' and ${s.conversations.channelId} is not null
      and exists (select 1 from ${s.members} m
        where m.community_id = ${s.conversations.communityId} and m.user_id = ${userId}
          and (not ${s.conversations.private} or m.role in ('Owner', 'Admin')
            or exists (select 1 from ${s.participants} p where p.conversation_id = ${s.conversations.id} and p.user_id = ${userId}))))
    or (${s.conversations.kind} = 'dm'
      and (${s.conversations.dmStatus} <> 'declined' or ${s.conversations.dmInitiatorId} = ${userId})
      and exists (select 1 from ${s.participants} p where p.conversation_id = ${s.conversations.id} and p.user_id = ${userId}))
  )`;
}
export function conversationIdFor(userId: string, key: string) {
  if (!key.startsWith("dm:")) return key;
  const target = key.slice(3);
  if (!/^[a-zA-Z0-9_-]{1,160}$/.test(target) || target === userId)
    throw new HttpError(400, "Choose another person.");
  return `dm:${[userId, target].sort().join(":")}`;
}
export async function requireConversation(
  db: Database,
  userId: string,
  key: string,
  createDm = false,
) {
  const id = conversationIdFor(userId, key);
  const [found] = await db
    .select({
      conversation: s.conversations,
      allowed: conversationAccess(userId),
    })
    .from(s.conversations)
    .where(eq(s.conversations.id, id));
  const allowed = found?.allowed ? found.conversation : undefined;
  if (allowed) {
    // Empty DMs created before message requests have no known initiator yet.
    if (allowed.kind === "dm" && !allowed.dmInitiatorId && createDm) {
      await db
        .update(s.conversations)
        .set({ dmInitiatorId: userId })
        .where(
          and(
            eq(s.conversations.id, id),
            sql`${s.conversations.dmInitiatorId} is null`,
          ),
        );
      return (
        await db
          .select()
          .from(s.conversations)
          .where(eq(s.conversations.id, id))
      )[0];
    }
    return allowed;
  }
  if (!key.startsWith("dm:") || !createDm)
    throw new HttpError(
      !found && key.startsWith("dm:") ? 404 : 403,
      key.startsWith("dm:")
        ? "This conversation is unavailable."
        : "You do not have access to this conversation.",
    );
  if (found)
    throw new HttpError(
      403,
      "You do not have access to this conversation; it is unavailable.",
    );
  const target = key.slice(3);
  const result = await db.execute<{
    conversation: typeof s.conversations.$inferSelect | null;
    blocked: boolean;
    target: boolean;
  }>(sql`
    with peer as materialized (select * from profiles where user_id = ${target}),
    friendship as (select 1 from friendships where accepted and ((sender_id = ${userId} and recipient_id = ${target}) or (recipient_id = ${userId} and sender_id = ${target}))),
    blocked as (select 1 from blocked_users where (user_id = ${userId} and target_id = ${target}) or (user_id = ${target} and target_id = ${userId})),
    eligible as (
      select * from peer where not exists(select 1 from blocked) and (exists(select 1 from friendship) or
        ((preferences->>'directMessages')::boolean and exists(select 1 from community_members own join community_members other on other.community_id = own.community_id where own.user_id = ${userId} and other.user_id = ${target})))
    ), written as (
      insert into conversations (id, kind, dm_initiator_id, dm_status)
      select ${id}, 'dm', ${userId}, case when exists(select 1 from friendship) then 'accepted' else 'pending' end from eligible
      on conflict (id) do nothing returning *
    ), members as (
      insert into conversation_members (conversation_id, user_id) select written.id, member.id from written cross join (values (${userId}), (${target})) as member(id)
      on conflict do nothing
    ) select (select ${rowJson(s.conversations)} from written as conversations) as conversation,
      exists(select 1 from blocked) as blocked, exists(select 1 from peer) as target
  `);
  if (result.rows[0].conversation)
    return hydrate(s.conversations, [result.rows[0].conversation])[0];
  if (result.rows[0].blocked)
    throw new HttpError(403, "This conversation is unavailable.");
  if (!result.rows[0].target) throw new HttpError(404, "Person not found.");

  const [conversation] = await db
    .select()
    .from(s.conversations)
    .where(and(eq(s.conversations.id, id), conversationAccess(userId)));
  if (!conversation)
    throw new HttpError(
      403,
      "Become friends before starting this conversation.",
    );
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

// Blocking restricts interaction, not access to existing conversation history.
export function dmUnblocked(userId: string | SQL) {
  return sql`not exists (select 1 from ${s.participants} p join ${s.blocks} b
    on (b.user_id = ${userId} and b.target_id = p.user_id) or (b.target_id = ${userId} and b.user_id = p.user_id)
    where p.conversation_id = ${s.conversations.id} and p.user_id <> ${userId})`;
}
export async function requireDmUnblocked(
  db: Database,
  conversationId: string,
  userId: string,
) {
  const [allowed] = await db
    .select({ id: s.conversations.id })
    .from(s.conversations)
    .where(and(eq(s.conversations.id, conversationId), dmUnblocked(userId)));
  if (!allowed)
    throw new HttpError(403, "Messaging in this conversation is unavailable.");
}

// Separate reading a request from permission to reply or upload into it.
export function conversationSendAccess(userId: string) {
  return sql`${conversationAccess(userId)} and (${s.conversations.kind} <> 'dm' or
    (${dmUnblocked(userId)} and ${s.conversations.dmStatus} <> 'declined' and
      (${s.conversations.dmStatus} = 'accepted' or ${s.conversations.dmInitiatorId} = ${userId})))`;
}
export async function requireDmSend(
  db: Database,
  c: typeof s.conversations.$inferSelect,
  userId: string,
) {
  if (c.kind !== "dm") return;
  await requireDmUnblocked(db, c.id, userId);
  if (c.dmStatus === "declined")
    throw new HttpError(403, "This conversation is unavailable.");
  if (c.dmStatus === "pending" && c.dmInitiatorId !== userId)
    throw new HttpError(403, "Accept this message request before replying.");
}
