import { sql } from "drizzle-orm";
import type { Database } from "./db";
import * as s from "./db/schema";
import { conversationSendAccess } from "./access";
import { HttpError } from "./http";
import type { ReactionSelection, ReactionResult } from "../lib/reactions";

// Set membership rather than toggle it: repeating a request cannot undo a click.
// Permissions, quota and mutation commit in one database round trip. Existing
// reaction triggers publish the committed change to other connected clients.
export async function setReaction(
  db: Database,
  userId: string,
  input: ReactionSelection,
): Promise<ReactionResult> {
  const result = await db.execute<{
    allowed: boolean;
    requests: number | null;
    count: number;
  }>(sql`
    with allowed as materialized (
      select m.id from ${s.messages} m
      join ${s.conversations} on ${s.conversations.id} = m.conversation_id
      where m.id = ${input.id} and m.deleted_at is null and ${conversationSendAccess(userId)}
    ), quota as (
      insert into ${s.limits} (key, count) select ${`actions:${userId}`}, 1 from allowed
      on conflict (key) do update set
        count = case when ${s.limits.windowStart} < now() - interval '1 minute' then 1 else ${s.limits.count} + 1 end,
        window_start = case when ${s.limits.windowStart} < now() - interval '1 minute' then now() else ${s.limits.windowStart} end
      returning count
    ), added as (
      insert into ${s.reactions} (message_id, user_id, emoji)
      select allowed.id, ${userId}, ${input.emoji} from allowed, quota
      where ${input.active} and quota.count <= 120
      on conflict do nothing returning message_id
    ), removed as (
      delete from ${s.reactions} r using allowed, quota
      where not ${input.active} and quota.count <= 120
        and r.message_id = allowed.id and r.user_id = ${userId} and r.emoji = ${input.emoji}
      returning r.message_id
    )
    select exists(select 1 from allowed) as allowed,
      (select count from quota) as requests,
      (select count(*)::int from ${s.reactions} r, allowed
        where r.message_id = allowed.id and r.emoji = ${input.emoji} and r.user_id <> ${userId})
        + case when ${input.active} then 1 else 0 end as count
  `);
  const row = result.rows[0];
  if (!row.allowed)
    throw new HttpError(403, "Reactions are unavailable for this message.");
  if (Number(row.requests) > 120)
    throw new HttpError(
      429,
      "A little too fast. Please try again in a minute.",
    );
  return { ...input, count: Number(row.count) };
}
