import { sql } from "drizzle-orm";
import type { Action } from "../lib/contracts";
import type { Database } from "./db";
import { conversationSendAccess } from "./access";
import { HttpError } from "./http";
import * as s from "./db/schema";

// These writes don't need an explicit transaction or advisory lock: the checks,
// mutation and commit notifications are already one atomic SQL statement.
export async function fastAction(db: Database, userId: string, action: Action) {
  if (action.type === "community.join") {
    const result = await db.execute<{
      allowed: boolean;
      requests: number | null;
    }>(sql`
      with allowed as materialized (select id from communities where id = ${action.id}),
      quota as (${quota(userId)}),
      written as (insert into community_members (community_id, user_id) select id, ${userId} from allowed, quota where quota.count <= 120 on conflict do nothing returning community_id),
      notified as (insert into app_events (id, user_id) select gen_random_uuid()::text, id from
        (select user_id as id from community_members where community_id = ${action.id} union select ${userId}::text) recipients where exists(select 1 from written))
      select exists(select 1 from allowed) as allowed, (select count from quota) as requests
    `);
    check(result.rows[0], "Community not found.");
    return true;
  }
  if (action.type === "category.create") {
    const result = await db.execute<{
      allowed: boolean;
      requests: number | null;
    }>(sql`
      with allowed as materialized (select community_id from community_members where community_id = ${action.communityId} and user_id = ${userId} and role in ('Owner', 'Admin')),
      quota as (${quota(userId)}),
      written as (insert into channel_categories (id, community_id, name) select gen_random_uuid()::text, community_id, ${action.name} from allowed, quota where quota.count <= 120 on conflict do nothing returning id),
      notified as (insert into app_events (id, user_id) select gen_random_uuid()::text, user_id from community_members where community_id = ${action.communityId} and exists(select 1 from written))
      select exists(select 1 from allowed) as allowed, (select count from quota) as requests
    `);
    check(result.rows[0], "Only community owners and admins can do that.");
    return true;
  }
  if (action.type !== "message.update" && action.type !== "message.delete")
    return false;
  const text = action.type === "message.update" ? action.text : undefined;
  const pinned = action.type === "message.update" ? action.pinned : undefined;
  const saved = action.type === "message.update" ? action.saved : undefined;
  const deleted = action.type === "message.delete";
  const result = await db.execute<{
    allowed: boolean;
    requests: number | null;
  }>(sql`
    with accessible as materialized (
      select m.*, (select role from community_members where community_id = ${s.conversations.communityId} and user_id = ${userId}) as role, ${s.conversations.kind} as kind
      from messages m join ${s.conversations} on ${s.conversations.id} = m.conversation_id
      where m.id = ${action.id} and m.deleted_at is null and ${conversationSendAccess(userId)}
    ), allowed as materialized (
      select * from accessible where
        (${!deleted} or author_id = ${userId} or role in ('Owner', 'Admin', 'Moderator'))
        and (${text === undefined} or author_id = ${userId})
        and (${pinned === undefined} or kind = 'dm' or role in ('Owner', 'Admin'))
    ), quota as (${quota(userId)}),
    written as (
      update messages set content = coalesce(${text ?? null}::text, messages.content),
        edited_at = case when ${text !== undefined} then now() else messages.edited_at end,
        pinned = coalesce(${pinned ?? null}::boolean, messages.pinned),
        deleted_at = case when ${deleted} then now() else messages.deleted_at end
      from allowed, quota where quota.count <= 120 and (${deleted || text !== undefined || pinned !== undefined})
        and (messages.id = allowed.id or (${deleted} and messages.parent_id = allowed.id))
      returning messages.id
    ), deleted_files as (
      update attachments set status = 'deleted' where ${deleted} and message_id in (select id from written)
    ), saved as (
      insert into saved_messages (message_id, user_id) select allowed.id, ${userId} from allowed, quota where ${saved === true} and quota.count <= 120 on conflict do nothing
    ), unsaved as (
      delete from saved_messages using allowed, quota where ${saved === false} and quota.count <= 120 and saved_messages.message_id = allowed.id and user_id = ${userId}
    ) select exists(select 1 from allowed) as allowed, (select count from quota) as requests
  `);
  check(
    result.rows[0],
    "You cannot change this message, or messaging in this conversation is unavailable.",
  );
  return true;
}
function quota(userId: string) {
  return sql`insert into request_limits (key, count) select ${`actions:${userId}`}, 1 from allowed limit 1
    on conflict (key) do update set count = case when request_limits.window_start < now() - interval '1 minute' then 1 else request_limits.count + 1 end,
      window_start = case when request_limits.window_start < now() - interval '1 minute' then now() else request_limits.window_start end returning count`;
}
function check(
  row: { allowed: boolean; requests: number | null },
  error: string,
) {
  if (!row.allowed) throw new HttpError(403, error);
  if (Number(row.requests) > 120)
    throw new HttpError(
      429,
      "A little too fast. Please try again in a minute.",
    );
}
