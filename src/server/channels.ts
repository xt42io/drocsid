import { sql } from "drizzle-orm";
import type { Database } from "./db";
import * as s from "./db/schema";
import type { Action } from "../lib/contracts";
import type { ChannelWriteResult } from "../lib/channels";
import { HttpError } from "./http";

type PutChannel = Extract<Action, { type: "channel.put" }>;

// The common single-channel write commits authorization, quota, category,
// channel and member notifications together in one database round trip.
export async function putChannel(
  db: Database,
  userId: string,
  input: PutChannel,
): Promise<ChannelWriteResult> {
  const channel = input.channel;
  const id = `${input.communityId}:${channel.id}`;
  const result = await db.execute<{
    allowed: boolean;
    requests: number | null;
    channel: ChannelWriteResult["channel"] | null;
  }>(sql`
    with allowed as materialized (
      select community_id from ${s.members}
      where community_id = ${input.communityId} and user_id = ${userId} and role in ('Owner', 'Admin')
    ), target as (
      select * from allowed where not exists (
        select 1 from ${s.conversations} c where c.id = ${id}
          and (c.kind <> 'channel' or c.community_id is distinct from ${input.communityId} or c.channel_id is distinct from ${channel.id})
      )
    ), quota as (
      insert into ${s.limits} (key, count) select ${`actions:${userId}`}, 1 from allowed
      on conflict (key) do update set
        count = case when ${s.limits.windowStart} < now() - interval '1 minute' then 1 else ${s.limits.count} + 1 end,
        window_start = case when ${s.limits.windowStart} < now() - interval '1 minute' then now() else ${s.limits.windowStart} end
      returning count
    ), category as (
      insert into ${s.categories} (id, community_id, name)
      select ${crypto.randomUUID()}, target.community_id, ${channel.group} from target, quota where quota.count <= 120
      on conflict (community_id, name) do update set name = excluded.name
      returning id, name
    ), written as (
      insert into ${s.conversations} (id, kind, community_id, channel_id, name, description, icon, category_id, private)
      select ${id}, 'channel', allowed.community_id, ${channel.id}, ${channel.name}, ${channel.description}, ${channel.icon ?? ""}, category.id, ${!!channel.private}
      from allowed, category
      on conflict (id) do update set
        name = excluded.name, description = excluded.description, icon = excluded.icon, category_id = excluded.category_id, private = excluded.private
      where ${s.conversations.kind} = 'channel' and ${s.conversations.communityId} = excluded.community_id
        and ${s.conversations.channelId} is not null
        and (${s.conversations.name}, ${s.conversations.description}, ${s.conversations.icon}, ${s.conversations.categoryId}, ${s.conversations.private})
          is distinct from (excluded.name, excluded.description, excluded.icon, excluded.category_id, excluded.private)
      returning channel_id, name, description, private, icon
    ), notified as (
      insert into ${s.events} (id, user_id)
      select gen_random_uuid()::text, member.user_id from ${s.members} member
      where member.community_id = ${input.communityId} and exists(select 1 from written)
    ), saved as (
      select * from written
      union all
      select c.channel_id, c.name, c.description, c.private, c.icon from ${s.conversations} c, allowed, category
      where c.id = ${id} and c.kind = 'channel' and c.community_id = allowed.community_id and c.channel_id = ${channel.id}
        and c.icon = ${channel.icon ?? ""} and c.name = ${channel.name} and c.description = ${channel.description} and c.category_id = category.id and c.private = ${!!channel.private}
        and not exists(select 1 from written)
    )
    select exists(select 1 from allowed) as allowed, (select count from quota) as requests,
      (select json_build_object('id', saved.channel_id, 'name', saved.name, 'description', saved.description,
        'group', category.name, 'private', saved.private, 'icon', saved.icon,
        'hasMessages', exists(select 1 from messages where conversation_id = ${id})) from saved, category limit 1) as channel
  `);
  const row = result.rows[0];
  if (!row.allowed)
    throw new HttpError(403, "Only community owners and admins can do that.");
  if (Number(row.requests) > 120)
    throw new HttpError(
      429,
      "A little too fast. Please try again in a minute.",
    );
  if (!row.channel)
    throw new HttpError(
      409,
      "This channel is no longer available. Create a new channel instead.",
    );
  return { communityId: input.communityId, channel: row.channel };
}
