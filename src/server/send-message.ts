import { and, eq, sql } from "drizzle-orm";
import type { Database } from "./db/index.ts";
import * as s from "./db/schema.ts";
import type { Action } from "../lib/contracts.ts";
import type { Message } from "../types/app.ts";
import {
  conversationSendAccess,
  conversationIdFor,
  requireConversation,
} from "./access.ts";
import { rowJson } from "./sql-json.ts";
import { HttpError } from "./http.ts";

type Send = Extract<Action, { type: "message.send" }>;
function serialize(
  message: typeof s.messages.$inferSelect,
  conversation: string,
  files: (typeof s.attachments.$inferSelect)[] = [],
): Message | null {
  if (message.deletedAt) return null;
  return {
    id: message.id,
    conversation,
    author: "you",
    text: message.content,
    createdAt: new Date(message.createdAt).toISOString(),
    time: "",
    reactions: [],
    edited: !!message.editedAt,
    pinned: message.pinned,
    threadOf: message.parentId ?? undefined,
    attachments: files.map((f) => ({
      id: f.id,
      name: f.originalName,
      byteSize: f.byteSize,
      contentType: f.contentType,
      url: `/api/attachments/${f.id}`,
    })),
  };
}

export function mentionedHandles(text: string) {
  return [
    ...new Set(
      Array.from(
        text
          .replace(/```[\s\S]*?```|`[^`]*`|https?:\/\/\S+/g, "")
          .matchAll(/(?:^|[^\p{L}\p{N}_@])@([\p{L}\p{N}_-]+)/gu),
        (m) => m[1].toLowerCase(),
      ),
    ),
  ];
}

export async function sendMessage(
  db: Database,
  userId: string,
  action: Send,
  opened = false,
): Promise<{ message: Message | null }> {
  const conversationId = conversationIdFor(userId, action.conversation);
  const handles = mentionedHandles(action.text);
  const group = handles.includes("everyone") || handles.includes("admin");
  const fileIds = [...new Set(action.attachments)];
  // One atomic statement for existing conversations, including replies, uploads,
  // mentions and notification delivery. No account-wide lock or extra transaction.
  const result = await db.execute<{
    exists: boolean;
    allowed: boolean;
    groupAllowed: boolean;
    parentAllowed: boolean;
    filesAllowed: boolean;
    requests: number | null;
    message: typeof s.messages.$inferSelect | null;
    files: (typeof s.attachments.$inferSelect)[];
  }>(sql`
    with allowed as materialized (
      select * from ${s.conversations} where ${s.conversations.id} = ${conversationId} and ${conversationSendAccess(userId)}
    ), existing as materialized (select * from messages where id = ${action.id}),
    parent as materialized (
      select * from messages where id = ${action.threadOf ?? null} and conversation_id = ${conversationId}
        and deleted_at is null and parent_id is null for share
    ), files as materialized (
      select * from attachments where id = any(${sql.param(fileIds)}::text[]) and uploader_id = ${userId}
        and conversation_id = ${conversationId} and status = 'ready' and message_id is null
        and exists(select 1 from allowed) and not exists(select 1 from existing) order by id for update
    ), checks as (
      select
        (not ${group} or not exists(select 1 from allowed where kind = 'channel') or exists(select 1 from community_members m join allowed c on c.community_id = m.community_id where m.user_id = ${userId} and m.role in ('Owner', 'Admin'))) as groups,
        (${action.threadOf ?? null}::text is null or exists(select 1 from parent)) as parent,
        ((select count(*) from files) = ${fileIds.length}) as files
    ), quota as (
      insert into request_limits (key, count) select ${`actions:${userId}`}, 1 from allowed
      on conflict (key) do update set
        count = case when request_limits.window_start < now() - interval '1 minute' then 1 else request_limits.count + 1 end,
        window_start = case when request_limits.window_start < now() - interval '1 minute' then now() else request_limits.window_start end
      returning count
    ), written as (
      insert into messages (id, conversation_id, author_id, content, parent_id)
      select ${action.id}, allowed.id, ${userId}, ${action.text}, ${action.threadOf ?? null} from allowed, quota, checks
      where quota.count <= 120 and checks.groups and checks.parent and checks.files and not exists(select 1 from existing)
      on conflict (id) do nothing returning *
    ), attached as (
      update attachments set message_id = written.id from written where attachments.id in (select id from files) returning attachments.*
    ), targets as (
      select p.user_id, written.id as message_id,
        (p.handle = any(${sql.param(handles)}::text[]) or (c.kind = 'channel' and (${handles.includes("everyone")} or (${handles.includes("admin")} and member.role in ('Owner', 'Admin'))))) as mentioned
      from profiles p cross join allowed c cross join written
      left join community_members member on member.community_id = c.community_id and member.user_id = p.user_id
      where (${handles.length > 0} or ${!!action.threadOf}) and (c.kind <> 'dm' or c.dm_status = 'accepted')
        and p.user_id <> ${userId} and (p.preferences->>'notifications')::boolean and (p.preferences->>'mentions')::boolean
        and (p.handle = any(${sql.param(handles)}::text[]) or p.user_id in (select author_id from parent) or (c.kind = 'channel' and (${handles.includes("everyone")} or (${handles.includes("admin")} and member.role in ('Owner', 'Admin')))))
        and ((c.kind = 'channel' and member.user_id is not null and (not c.private or member.role in ('Owner', 'Admin') or exists(select 1 from conversation_members cm where cm.conversation_id = c.id and cm.user_id = p.user_id)))
          or (c.kind = 'dm' and exists(select 1 from conversation_members cm where cm.conversation_id = c.id and cm.user_id = p.user_id)))
        and not exists(select 1 from blocked_users b where (b.user_id = ${userId} and b.target_id = p.user_id) or (b.target_id = ${userId} and b.user_id = p.user_id))
    ), notified as (
      insert into notifications (id, user_id, actor_id, message_id, type)
      select gen_random_uuid()::text, user_id, ${userId}, message_id, case when mentioned then 'mention' else 'reply' end from targets
    ), saved as (
      select * from written union all select * from existing where author_id = ${userId} and conversation_id = ${conversationId}
    )
    select exists(select 1 from conversations where id = ${conversationId}) as exists,
      exists(select 1 from allowed) as allowed,
      checks.groups as "groupAllowed", checks.parent as "parentAllowed", checks.files as "filesAllowed",
      (select count from quota) as requests,
      (select ${rowJson(s.messages)} from saved as messages limit 1) as message,
      coalesce((select jsonb_agg(${rowJson(s.attachments)}) from (
        select * from attached union all select * from attachments where message_id = ${action.id} and exists(select 1 from existing where author_id = ${userId} and conversation_id = ${conversationId})
      ) as attachments), '[]') as files from checks
  `);
  const row = result.rows[0];
  if (!row.allowed) {
    if (!row.exists && action.conversation.startsWith("dm:") && !opened) {
      await requireConversation(db, userId, action.conversation, true);
      return sendMessage(db, userId, action, true);
    }
    throw new HttpError(
      403,
      action.conversation.startsWith("dm:")
        ? "Messaging in this conversation is unavailable. Accept this message request before replying."
        : "You do not have access to this conversation.",
    );
  }
  if (Number(row.requests) > 120)
    throw new HttpError(
      429,
      "A little too fast. Please try again in a minute.",
    );
  if (row.message)
    return { message: serialize(row.message, action.conversation, row.files) };
  // A concurrent retry can commit after the statement's snapshot. Read the winner
  // without modifying it or rebinding attachments to a different message.
  const [duplicate] = await db
    .select()
    .from(s.messages)
    .where(
      and(
        eq(s.messages.id, action.id),
        eq(s.messages.authorId, userId),
        eq(s.messages.conversationId, conversationId),
      ),
    );
  if (!duplicate) {
    if (!row.groupAllowed)
      throw new HttpError(403, "Only community owners and admins can do that.");
    if (!row.parentAllowed)
      throw new HttpError(400, "The original message is unavailable.");
    if (!row.filesAllowed)
      throw new HttpError(
        400,
        "An attachment is unavailable or belongs to another message.",
      );
    throw new HttpError(409, "Message ID is already in use.");
  }
  const files = fileIds.length
    ? await db
        .select()
        .from(s.attachments)
        .where(eq(s.attachments.messageId, action.id))
    : [];
  return { message: serialize(duplicate, action.conversation, files) };
}
