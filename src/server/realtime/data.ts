import { and, eq, inArray, sql } from "drizzle-orm";
import { getAuth } from "../auth.ts";
import { getDb, type Database } from "../db/index.ts";
import * as s from "../db/schema.ts";
import {
  conversationAccess,
  requireConversation,
  requireDmUnblocked,
  dmUnblocked,
} from "../access.ts";
import { HttpError } from "../http.ts";
import { sendMessage } from "../send-message.ts";
import type { MessageUpdate, Room } from "../../lib/realtime-protocol.ts";
import type { Person, Message, DirectConversation } from "../../types/app.ts";
import { normalizeGender } from "../../lib/people.ts";

export type Identity = {
  userId: string;
  sessionId: string;
  expiresAt: number;
  name: string;
  status: Person["status"];
};

// One round trip for the recipient batch; permissions and data share a snapshot.
// NOTIFY contains IDs only. Content is never sent before this authorization check.
export async function liveMessage(
  db: Database,
  userId: string,
  conversationId: string,
  id: string,
): Promise<MessageUpdate | null> {
  return (
    (await liveMessages(db, [userId], conversationId, id))[0]?.frame ?? null
  );
}

export async function liveMessages(
  db: Database,
  userIds: string[],
  conversationId: string,
  id: string,
) {
  if (!userIds.length) return [];
  const userId = sql`viewer.id`;
  const result = await db.execute<{
    userId: string;
    message: Message | null;
    person: Person | null;
    unread: number;
    dmConversation: DirectConversation | null;
  }>(sql`
    with audience as materialized (
      select member.user_id as id from conversations c join community_members member on member.community_id = c.community_id
      where c.id = ${conversationId} and c.kind = 'channel' and member.user_id = any(${sql.param(userIds)}::text[])
        and c.channel_id is not null and (not c.private or member.role in ('Owner', 'Admin') or exists(select 1 from conversation_members p where p.conversation_id = c.id and p.user_id = member.user_id))
      union select member.user_id from conversations c join conversation_members member on member.conversation_id = c.id
      where c.id = ${conversationId} and c.kind = 'dm' and member.user_id = any(${sql.param(userIds)}::text[])
        and (c.dm_status <> 'declined' or c.dm_initiator_id = member.user_id)
    )
    select viewer.id as "userId", case when ${s.conversations.kind} = 'dm' then json_build_object(
      'conversation', ${s.conversations.id},
      'personId', (select p.user_id from conversation_members p where p.conversation_id = ${s.conversations.id} and p.user_id <> ${userId} limit 1),
      'hasMessages', exists(select 1 from messages d where d.conversation_id = ${s.conversations.id} and d.deleted_at is null),
      'messagingBlocked', not (${dmUnblocked(userId)}),
      'status', ${s.conversations.dmStatus}, 'incoming', ${s.conversations.dmInitiatorId} <> ${userId}
    ) else null end as "dmConversation",
    case when m.id is null or m.deleted_at is not null then null else json_build_object(
      'id', m.id, 'conversation', case when ${s.conversations.kind} = 'dm' then
        'dm:' || (select p.user_id from conversation_members p where p.conversation_id = ${s.conversations.id} and p.user_id <> ${userId} limit 1)
        else ${s.conversations.id} end,
      'author', case when m.author_id = ${userId} then 'you' else m.author_id end,
      'text', m.content, 'createdAt', m.created_at, 'time', '', 'edited', m.edited_at is not null,
      'pinned', m.pinned, 'saved', exists(select 1 from saved_messages v where v.message_id = m.id and v.user_id = ${userId}),
      'threadOf', m.parent_id,
      'reactions', coalesce((select json_agg(r) from (select emoji, count(*)::int as count, bool_or(user_id = ${userId}) as mine from message_reactions where message_id = m.id group by emoji order by emoji) r), '[]'::json),
      'attachments', coalesce((select json_agg(json_build_object('id', a.id, 'name', a.original_name, 'contentType', a.content_type, 'byteSize', a.byte_size, 'url', '/api/attachments/' || a.id)) from attachments a where a.message_id = m.id and a.status = 'ready'), '[]'::json)
    ) end as message,
    case when p.user_id is null then null else json_build_object('id', case when p.user_id = ${userId} then 'you' else p.user_id end,
      'name', u.name, 'handle', case when p.handle ~ '^user_[a-z0-9]{19}$' then '' else coalesce(p.handle, '') end, 'color', p.color, 'bio', p.bio, 'gender', coalesce(p.gender, ''), 'activity', case when (p.preferences->>'activity')::boolean then p.activity else '' end,
      'status', case when p.last_seen_at < now() - interval '90 seconds' then 'offline' else p.status end,
      'role', 'Member', 'avatarUrl', (select '/api/avatars/' || a.id from avatars a where a.uploader_id = p.user_id and a.status = 'active' limit 1)) end as person,
    (select count(*)::int from messages unread where unread.conversation_id = ${s.conversations.id}
      and unread.deleted_at is null and unread.author_id <> ${userId}
      and unread.created_at > coalesce((select read_at from conversation_read_states where conversation_id = ${s.conversations.id} and user_id = ${userId}), '-infinity'::timestamptz)) as unread
    from ${s.conversations} cross join audience viewer
    left join messages m on m.id = ${id} and m.conversation_id = ${s.conversations.id}
    left join profiles p on p.user_id = m.author_id
    left join "user" u on u.id = p.user_id
    where ${s.conversations.id} = ${conversationId} and ${conversationAccess(userId)}
  `);
  return result.rows.map((row) => {
    if (row.message?.createdAt)
      row.message.createdAt = new Date(row.message.createdAt).toISOString();
    const frame: MessageUpdate = {
      type: "message",
      id,
      message: row.message,
      conversation: conversationId,
      unread: row.unread,
      ...(row.dmConversation
        ? { dmConversation: { ...row.dmConversation, unread: row.unread } }
        : {}),
      ...(row.person
        ? {
            person: {
              ...row.person,
              gender: normalizeGender(row.person.gender),
            },
          }
        : {}),
    };
    return { userId: row.userId, frame };
  });
}

export async function authorizeRoom(db: Database, userId: string, room: Room) {
  const conversation = await requireConversation(db, userId, room.conversation);
  if (conversation.kind === "dm")
    await requireDmUnblocked(db, conversation.id, userId);
  if (conversation.kind === "dm" && conversation.dmStatus !== "accepted")
    throw new HttpError(
      403,
      "Accept the message request before sharing typing indicators.",
    );
  if (room.threadOf) {
    const [parent] = await db
      .select({ id: s.messages.id })
      .from(s.messages)
      .where(
        and(
          eq(s.messages.id, room.threadOf),
          eq(s.messages.conversationId, conversation.id),
          sql`${s.messages.deletedAt} is null`,
        ),
      );
    if (!parent) throw new HttpError(403, "This thread is unavailable.");
  }
  return conversation.id;
}
export const realtimeData = {
  async authenticate(headers: Headers): Promise<Identity | null> {
    const auth = await getAuth().api.getSession({ headers });
    if (!auth?.user.emailVerified) return null;
    const [profile] = await getDb()
      .select()
      .from(s.profiles)
      .where(eq(s.profiles.userId, auth.user.id));
    return {
      userId: auth.user.id,
      sessionId: auth.session.id,
      expiresAt: auth.session.expiresAt.getTime(),
      name: auth.user.name,
      status: profile?.status ?? "offline",
    };
  },
  async sessions(ids: string[]) {
    if (!ids.length) return [];
    const db = getDb();
    const rows = await db
      .select({
        userId: s.session.userId,
        sessionId: s.session.id,
        expiresAt: s.session.expiresAt,
        name: s.user.name,
        status: s.profiles.status,
      })
      .from(s.session)
      .innerJoin(s.user, eq(s.user.id, s.session.userId))
      .innerJoin(s.profiles, eq(s.profiles.userId, s.user.id))
      .where(
        and(
          inArray(s.session.id, ids),
          eq(s.user.emailVerified, true),
          sql`${s.session.expiresAt} > now()`,
        ),
      );
    if (rows.length)
      await db
        .update(s.profiles)
        .set({ lastSeenAt: new Date() })
        .where(
          inArray(
            s.profiles.userId,
            rows.map((r) => r.userId),
          ),
        );
    return rows.map((r) => ({ ...r, expiresAt: r.expiresAt.getTime() }));
  },
  authorize: (userId: string, room: Room) =>
    authorizeRoom(getDb(), userId, room),
  messages: (userIds: string[], conversationId: string, id: string) =>
    liveMessages(getDb(), userIds, conversationId, id),
  message: (userId: string, conversationId: string, id: string) =>
    liveMessage(getDb(), userId, conversationId, id),
  send: (userId: string, action: Parameters<typeof sendMessage>[2]) =>
    sendMessage(getDb(), userId, action),
};
