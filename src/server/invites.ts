import { randomBytes } from "node:crypto";
import { and, desc, eq, gt, isNull, or, sql } from "drizzle-orm";
import type { Database } from "./db";
import * as s from "./db/schema";
import { HttpError } from "./http";
import type {
  AcceptedInvite,
  InviteLink,
  InvitePreview,
} from "../types/invites";

const codePattern = /^[A-Za-z0-9_-]{10,24}$/;

export function inviteShortOrigin() {
  const configured = process.env.INVITE_SHORT_URL || "https://drocsid.cc";
  const url = new URL(configured);
  if (url.pathname !== "/" || url.search || url.hash)
    throw new Error("INVITE_SHORT_URL must contain only an origin.");
  return url.origin;
}

export function validInviteCode(code: string) {
  return codePattern.test(code);
}

function link(code: string): InviteLink {
  return { code, url: `${inviteShortOrigin()}/${code}` };
}

function activeInviteWhere(code: string) {
  return and(
    eq(s.communityInvites.code, code),
    isNull(s.communityInvites.revokedAt),
    or(
      isNull(s.communityInvites.expiresAt),
      gt(s.communityInvites.expiresAt, new Date()),
    ),
    or(
      isNull(s.communityInvites.maxUses),
      sql`${s.communityInvites.useCount} < ${s.communityInvites.maxUses}`,
    ),
  );
}

export async function inviteExists(db: Database, code: string) {
  if (!validInviteCode(code)) return false;
  const [invite] = await db
    .select({ code: s.communityInvites.code })
    .from(s.communityInvites)
    .where(activeInviteWhere(code))
    .limit(1);
  return !!invite;
}

export async function createInvite(
  db: Database,
  userId: string,
  communityId: string,
): Promise<InviteLink> {
  const [membership] = await db
    .select({ communityId: s.members.communityId })
    .from(s.members)
    .where(
      and(
        eq(s.members.communityId, communityId),
        eq(s.members.userId, userId),
      ),
    )
    .limit(1);
  if (!membership)
    throw new HttpError(403, "Join this community before inviting people.");

  const [existing] = await db
    .select({ code: s.communityInvites.code })
    .from(s.communityInvites)
    .where(
      and(
        eq(s.communityInvites.communityId, communityId),
        eq(s.communityInvites.createdBy, userId),
        isNull(s.communityInvites.revokedAt),
        or(
          isNull(s.communityInvites.expiresAt),
          gt(s.communityInvites.expiresAt, new Date()),
        ),
        or(
          isNull(s.communityInvites.maxUses),
          sql`${s.communityInvites.useCount} < ${s.communityInvites.maxUses}`,
        ),
      ),
    )
    .orderBy(desc(s.communityInvites.createdAt))
    .limit(1);
  if (existing) return link(existing.code);

  for (let attempt = 0; attempt < 4; attempt++) {
    const code = randomBytes(9).toString("base64url");
    const inserted = await db
      .insert(s.communityInvites)
      .values({ code, communityId, createdBy: userId })
      .onConflictDoNothing()
      .returning({ code: s.communityInvites.code });
    if (inserted[0]) return link(inserted[0].code);
  }
  throw new HttpError(503, "Could not make an invite link. Please try again.");
}

export async function revokeInvite(
  db: Database,
  userId: string,
  code: string,
) {
  if (!validInviteCode(code)) throw new HttpError(404, "Invite not found.");
  const revoked = await db
    .update(s.communityInvites)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(s.communityInvites.code, code),
        eq(s.communityInvites.createdBy, userId),
        isNull(s.communityInvites.revokedAt),
      ),
    )
    .returning({ code: s.communityInvites.code });
  if (!revoked[0])
    throw new HttpError(403, "You can only revoke invite links you created.");
}

export async function invitePreview(
  db: Database,
  code: string,
): Promise<InvitePreview> {
  if (!validInviteCode(code)) throw new HttpError(404, "Invite not found.");
  const result = await db.execute<{
    code: string;
    id: string;
    name: string;
    description: string;
    icon: InvitePreview["community"]["icon"];
    color: string;
    members: number;
    iconId: string | null;
  }>(sql`
    select i.code, c.id, c.name, c.description, c.icon, c.color,
      (select count(*)::int from community_members m where m.community_id = c.id) as members,
      (select ci.id from community_icons ci where ci.community_id = c.id and ci.status = 'active') as "iconId"
    from community_invites i join communities c on c.id = i.community_id
    where i.code = ${code} and i.revoked_at is null
      and (i.expires_at is null or i.expires_at > now())
      and (i.max_uses is null or i.use_count < i.max_uses)
    limit 1
  `);
  const row = result.rows[0];
  if (!row) throw new HttpError(404, "Invite not found.");
  return {
    code: row.code,
    community: {
      id: row.id,
      name: row.name,
      description: row.description,
      icon: row.icon,
      iconUrl: row.iconId ? `/api/community-icons/${row.iconId}` : undefined,
      color: row.color,
      members: Number(row.members),
    },
  };
}

export async function acceptInvite(
  db: Database,
  userId: string,
  code: string,
): Promise<AcceptedInvite> {
  if (!validInviteCode(code)) throw new HttpError(404, "Invite not found.");
  const result = await db.execute<{ communityId: string; channelId: string }>(sql`
    with invite as materialized (
      select * from community_invites where code = ${code}
        and revoked_at is null
        and (expires_at is null or expires_at > now())
        and (max_uses is null or use_count < max_uses)
      for update
    ), joined as (
      insert into community_members (community_id, user_id)
      select community_id, ${userId} from invite
      on conflict do nothing returning community_id
    ), counted as (
      update community_invites set use_count = use_count + 1
      where code = ${code} and exists (select 1 from joined)
    )
    select i.community_id as "communityId",
      coalesce(
        (select channel_id from conversations where community_id = i.community_id and kind = 'channel' order by case when channel_id = 'general' then 0 else 1 end, position, created_at limit 1),
        'general'
      ) as "channelId"
    from invite i
  `);
  const accepted = result.rows[0];
  if (!accepted) throw new HttpError(404, "This invitation is no longer available.");
  return accepted;
}
