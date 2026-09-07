import { sql } from "drizzle-orm";
import type { Database } from "./db";
import { conversationAccess, conversationIdFor } from "./access";
import { HttpError } from "./http";
import * as s from "./db/schema";
import type { Action } from "../lib/contracts";

export async function markRead(
  db: Database,
  userId: string,
  action: Extract<Action, { type: "conversation.read" }>,
) {
  const id = conversationIdFor(userId, action.conversation);
  const result = await db.execute<{
    allowed: boolean;
    requests: number | null;
  }>(sql`
    with allowed as materialized (select id, kind, dm_status from ${s.conversations} where ${s.conversations.id} = ${id} and ${conversationAccess(userId)}),
    quota as (
      insert into request_limits (key, count) select ${`reads:${userId}`}, 1 from allowed
      on conflict (key) do update set count = case when request_limits.window_start < now() - interval '1 minute' then 1 else request_limits.count + 1 end,
        window_start = case when request_limits.window_start < now() - interval '1 minute' then now() else request_limits.window_start end returning count
    ), written as (
      insert into conversation_read_states (user_id, conversation_id, read_at)
      select ${userId}, id, least(${action.through}::timestamptz, now()) from allowed, quota where quota.count <= 120 and (kind <> 'dm' or dm_status = 'accepted')
      on conflict (user_id, conversation_id) do update set read_at = excluded.read_at
      where conversation_read_states.read_at < excluded.read_at
    ) select exists(select 1 from allowed) as allowed, (select count from quota) as requests
  `);
  if (Number(result.rows[0].requests) > 120)
    throw new HttpError(
      429,
      "Too many read updates. Please try again shortly.",
    );
  if (!result.rows[0].allowed)
    throw new HttpError(403, "This conversation is unavailable.");
}
