import { sql } from "drizzle-orm";
import type { Database } from "./db";
import type { Action } from "../lib/contracts";

function profileAudience(userId: string) {
  return sql`select ${userId}::text as id
    union select user_id from community_members where community_id in (select community_id from community_members where user_id = ${userId})
    union select case when sender_id = ${userId} then recipient_id else sender_id end from friendships where sender_id = ${userId} or recipient_id = ${userId}
    union select user_id from conversation_members where conversation_id in (select conversation_id from conversation_members where user_id = ${userId})`;
}

export async function invalidateProfile(db: Database, userId: string) {
  await db.execute(sql`insert into app_events (id, user_id)
    select gen_random_uuid()::text, id from (${profileAudience(userId)}) recipients`);
}

// Invalidation carries no content. Recipient selection is scoped to the entity
// that changed; every subsequent read still checks current permissions.
export async function invalidateActions(
  db: Database,
  userId: string,
  actions: Action[],
) {
  const scopes = actions.flatMap((action) => {
    if (
      [
        "message.send",
        "message.update",
        "message.delete",
        "reaction",
        "conversation.read",
        "conversation.open",
        "preferences",
      ].includes(action.type)
    )
      return [];
    if (action.type === "friend")
      return [
        sql`select ${userId}::text as id union select ${action.id}::text`,
      ];
    if (action.type === "dm.request")
      return [
        sql`select ${userId}::text as id union select ${action.personId}::text`,
      ];
    if (action.type === "notification.read")
      return [sql`select ${userId}::text as id`];
    const communityId =
      "communityId" in action
        ? action.communityId
        : action.type.startsWith("community.") && "id" in action
          ? action.id
          : undefined;
    if (communityId)
      return [
        sql`select user_id as id from community_members where community_id = ${communityId} union select ${userId}::text ${"userId" in action ? sql`union select ${action.userId}::text` : sql``}`,
      ];
    if (action.type === "channel.access")
      return [
        sql`select user_id as id from community_members where community_id = (select community_id from conversations where id = ${action.conversation}) union select ${userId}::text`,
      ];
    // Profile changes matter only to shared communities, friends and DM partners.
    return [profileAudience(userId)];
  });
  if (scopes.length)
    await db.execute(
      sql`insert into app_events (id, user_id) select gen_random_uuid()::text, id from (${sql.join(
        scopes.map((scope) => sql`(${scope})`),
        sql` union `,
      )}) recipients`,
    );
}
