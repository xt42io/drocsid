import { sql, type SQL } from "drizzle-orm";
import type { Database } from "./db";
import type { Community, Person } from "../types/app";

export function personJson(userId: string) {
  return sql`jsonb_build_object('id', case when p.user_id = ${userId} then 'you' else p.user_id end,
    'name', u.name, 'handle', p.handle, 'color', p.color, 'bio', p.bio,
    'activity', case when (p.preferences->>'activity')::boolean then p.activity else '' end,
    'status', case when p.last_seen_at < now() - interval '90 seconds' then 'offline' else p.status end,
    'role', 'Member', 'avatarUrl', (select '/api/avatars/' || a.id from avatars a where a.uploader_id = p.user_id and a.status = 'active'))`;
}
export async function peopleFor(db: Database, userId: string, ids: string[]) {
  if (!ids.length) return [];
  const result = await db.execute<{ person: Person }>(
    sql`select ${personJson(userId)} as person from profiles p join "user" u on u.id = p.user_id where p.user_id = any(${sql.param(ids)}::text[])`,
  );
  return result.rows.map((row) => row.person);
}
export async function directory(
  db: Database,
  userId: string,
  input: {
    kind: "people" | "communities";
    query: string;
    category?: string;
    id?: string;
    offset: number;
  },
) {
  const pattern = `%${input.query.replace(/[\\%_]/g, "\\$&")}%`;
  if (input.kind === "people") {
    const result = await db.execute<{
      person: Person;
    }>(sql`select ${personJson(userId)} as person from profiles p join "user" u on u.id = p.user_id
      where p.user_id <> ${userId} and ${input.id ? sql`p.user_id = ${input.id}` : sql`(p.handle ilike ${pattern} or u.name ilike ${pattern})`}
        and not exists(select 1 from blocked_users b where b.user_id = ${userId} and b.target_id = p.user_id)
      order by p.handle, p.user_id limit 51 offset ${input.offset}`);
    return {
      people: result.rows.slice(0, 50).map((row) => row.person),
      hasMore: result.rows.length > 50,
    };
  }
  const result = await db.execute<{
    community: Community;
  }>(sql`select jsonb_build_object('id', c.id, 'name', c.name, 'description', c.description,
    'icon', c.icon, 'iconUrl', (select '/api/community-icons/' || i.id from community_icons i where i.community_id = c.id and i.status = 'active'), 'color', c.color, 'category', c.category,
    'members', (select count(*)::int from community_members m where m.community_id = c.id),
    'joined', false, 'channels', '[]'::jsonb, 'memberIds', '[]'::jsonb, 'memberRoles', '{}'::jsonb, 'channelCategories', '[]'::jsonb) as community
    from communities c where ${input.id ? sql`c.id = ${input.id}` : sql`(c.name ilike ${pattern} or c.description ilike ${pattern})`}
      ${input.category ? sql`and c.category = ${input.category}` : sql``}
    order by c.created_at, c.id limit 51 offset ${input.offset}`);
  return {
    communities: result.rows.slice(0, 50).map((row) => row.community),
    hasMore: result.rows.length > 50,
  };
}
