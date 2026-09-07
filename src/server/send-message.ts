import { and, eq, sql } from "drizzle-orm";
import type { Database } from "./db";
import * as s from "./db/schema";
import type { Action } from "../lib/contracts";
import type { Message } from "../types/app";
import { conversationAccess, conversationIdFor, takeLimit } from "./access";
import { mutate } from "./actions";
import { HttpError } from "./http";

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

export async function sendMessage(
  db: Database,
  userId: string,
  action: Send,
): Promise<{ message: Message | null }> {
  const conversationId = conversationIdFor(userId, action.conversation);
  // The common case commits access checks, rate limiting, the message and commit notification in one atomic statement: one remote database round trip, no N+1 reads.
  if (
    !action.threadOf &&
    !action.attachments.length &&
    !action.text.includes("@")
  ) {
    const result = await db.execute<{
      allowed: boolean;
      requests: number | null;
      message: typeof s.messages.$inferSelect | null;
    }>(sql`
      with allowed as materialized (
        select ${s.conversations.id} from ${s.conversations}
        where ${s.conversations.id} = ${conversationId} and ${conversationAccess(userId)}
      ), quota as (
        insert into ${s.limits} (key, count) select ${`actions:${userId}`}, 1 from allowed
        on conflict (key) do update set
          count = case when ${s.limits.windowStart} < now() - interval '1 minute' then 1 else ${s.limits.count} + 1 end,
          window_start = case when ${s.limits.windowStart} < now() - interval '1 minute' then now() else ${s.limits.windowStart} end
        returning count
      ), inserted as (
        insert into ${s.messages} (id, conversation_id, author_id, content)
        select ${action.id}, allowed.id, ${userId}, ${action.text} from allowed, quota where quota.count <= 120
        on conflict (id) do nothing returning *

      )
      select exists(select 1 from allowed) as allowed, (select count from quota) as requests,
        (select json_build_object('id', id, 'conversationId', conversation_id, 'authorId', author_id,
          'content', content, 'parentId', parent_id, 'createdAt', created_at, 'editedAt', edited_at,
          'deletedAt', deleted_at, 'pinned', pinned) from inserted) as message
    `);
    const row = result.rows[0];
    if (row.allowed) {
      if (Number(row.requests) > 120)
        throw new HttpError(
          429,
          "A little too fast. Please try again in a minute.",
        );
      if (row.message)
        return { message: serialize(row.message, action.conversation) };
      // A concurrent retry may have committed after this statement's snapshot.
      // Read it separately; never overwrite an existing ID or publish twice.
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
      if (!duplicate) throw new HttpError(409, "Message ID is already in use.");
      return { message: serialize(duplicate, action.conversation) };
    }
    if (!action.conversation.startsWith("dm:"))
      throw new HttpError(403, "You do not have access to this conversation.");
  }
  // New DMs, attachments, mentions and replies keep the full transactional checks.
  await takeLimit(db, userId, "actions", 120);
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${userId}))`);
    const result = await mutate(tx as unknown as Database, userId, action);
    if (!result) throw new Error("Message write returned no result.");

    return {
      message: serialize(
        result.message,
        action.conversation,
        result.attachments,
      ),
    };
  });
}
