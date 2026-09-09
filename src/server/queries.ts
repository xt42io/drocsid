import { peopleFor } from "./directory";
import { groupBy } from "../lib/group-by";
import {
  and,
  asc,
  desc,
  eq,
  gt,
  ilike,
  inArray,
  isNull,
  lt,
  or,
  sql,
} from "drizzle-orm";
import type { Database } from "./db";
import * as s from "./db/schema";
import {
  accessibleConversations,
  conversationAccess,
  ensureProfile,
  requireConversation,
} from "./access";
import type { Community, AppState, Message, Person } from "../types/app";
import { HttpError } from "./http";
import { hydrate, rowJson } from "./sql-json";
import { chosenUsername } from "../lib/usernames";

function uiKey(
  c: typeof s.conversations.$inferSelect,
  userId: string,
  participants: (typeof s.participants.$inferSelect)[],
) {
  return c.kind === "channel"
    ? c.id
    : `dm:${participants.find((p) => p.conversationId === c.id && p.userId !== userId)?.userId}`;
}
export async function serializeMessages(
  db: Database,
  userId: string,
  rows: (typeof s.messages.$inferSelect)[],
  allowed: (typeof s.conversations.$inferSelect)[],
): Promise<Message[]> {
  if (!rows.length) return [];
  const ids = rows.map((m) => m.id);
  const bundle = await db.execute<{
    reactions: (typeof s.reactions.$inferSelect)[];
    saved: (typeof s.saved.$inferSelect)[];
    files: (typeof s.attachments.$inferSelect)[];
    participation: (typeof s.participants.$inferSelect)[];
  }>(sql`select
    coalesce((select jsonb_agg(${rowJson(s.reactions)}) from ${s.reactions} where ${inArray(s.reactions.messageId, ids)}), '[]') as reactions,
    coalesce((select jsonb_agg(${rowJson(s.saved)}) from ${s.saved} where ${s.saved.userId} = ${userId} and ${inArray(s.saved.messageId, ids)}), '[]') as saved,
    coalesce((select jsonb_agg(${rowJson(s.attachments)}) from ${s.attachments} where ${inArray(s.attachments.messageId, ids)} and ${s.attachments.status} = 'ready'), '[]') as files,
    coalesce((select jsonb_agg(${rowJson(s.participants)}) from ${s.participants} where ${inArray(s.participants.conversationId, [...new Set(rows.map((m) => m.conversationId))])}), '[]') as participation
  `);
  const { reactions, saved, files, participation } = bundle.rows[0];
  const conversationsById = new Map(allowed.map((c) => [c.id, c]));
  const savedIds = new Set(saved.map((m) => m.messageId));
  const reactionsByMessage = groupBy(reactions, (r) => r.messageId);
  const filesByMessage = groupBy(files, (f) => f.messageId);
  const participationByConversation = groupBy(
    participation,
    (p) => p.conversationId,
  );
  return rows.flatMap((m) => {
    const c = conversationsById.get(m.conversationId);
    if (!c) return [];
    const grouped = new Map<
      string,
      { emoji: string; count: number; mine: boolean }
    >();
    for (const r of reactionsByMessage.get(m.id) ?? []) {
      const value = grouped.get(r.emoji) ?? {
        emoji: r.emoji,
        count: 0,
        mine: false,
      };
      value.count++;
      value.mine ||= r.userId === userId;
      grouped.set(r.emoji, value);
    }
    return [
      {
        id: m.id,
        conversation: uiKey(
          c,
          userId,
          participationByConversation.get(c.id) ?? [],
        ),
        author: m.authorId === userId ? "you" : m.authorId,
        text: m.content,
        time: m.createdAt.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          timeZone: "UTC",
        }),
        createdAt: m.createdAt.toISOString(),
        edited: !!m.editedAt,
        pinned: m.pinned,
        saved: savedIds.has(m.id),
        threadOf: m.parentId ?? undefined,
        reactions: [...grouped.values()],
        attachments: (filesByMessage.get(m.id) ?? []).map((f) => ({
          id: f.id,
          name: f.originalName,
          contentType: f.contentType,
          byteSize: f.byteSize,
          url: `/api/attachments/${f.id}`,
        })),
      },
    ];
  });
}
export async function visibleConversations(db: Database, userId: string) {
  return accessibleConversations(db, userId);
}
export async function snapshot(
  db: Database,
  viewer: { id: string; name: string },
  messageLimit = 500,
  messageIds: string[] = [],
): Promise<AppState> {
  const userId = viewer.id;
  const limit = Math.min(500, Math.max(0, messageLimit));
  const result = await db.execute<{
    profileRows: {
      profile: typeof s.profiles.$inferSelect;
      name: string;
      avatarId: string | null;
    }[];
    communityRows: (typeof s.communities.$inferSelect & {
      memberCount: number;
      iconUrl?: string;
    })[];
    allMembers: (typeof s.members.$inferSelect)[];
    categoryRows: (typeof s.categories.$inferSelect)[];
    friendships: (typeof s.friendships.$inferSelect)[];
    blocked: (typeof s.blocks.$inferSelect)[];
    notices: {
      notice: typeof s.notifications.$inferSelect;
      message: typeof s.messages.$inferSelect;
    }[];
    directRows: {
      conversation: typeof s.conversations.$inferSelect;
      personId: string;
      hasMessages: boolean;
    }[];
    allowed: (typeof s.conversations.$inferSelect)[];
    messageRows: (typeof s.messages.$inferSelect)[];
    startedChannels: string[];
    unread: { conversationId: string; count: number }[];
  }>(sql`
    with permitted as materialized (select * from ${s.conversations} where ${conversationAccess(userId)}),
    joined as materialized (select community_id from community_members where user_id = ${userId}),
    related as materialized (
      select ${userId}::text as id
      union select user_id from community_members where community_id in (select community_id from joined)
      union select case when sender_id = ${userId} then recipient_id else sender_id end from friendships where sender_id = ${userId} or recipient_id = ${userId}
      union select case when user_id = ${userId} then target_id else user_id end from blocked_users where user_id = ${userId} or target_id = ${userId}
      union select user_id from conversation_members where conversation_id in (select id from permitted where kind = 'dm')
    ), catalog as materialized (
      select id from communities where id in (select community_id from joined)
      union select id from (select id from communities where discoverable order by created_at, id limit 50) discovered
    ), history as materialized (
      (select id from messages where ${limit} > 0 and conversation_id in (select id from permitted) and deleted_at is null order by created_at desc, id desc limit ${limit})
      union (select m.id from saved_messages v join messages m on m.id = v.message_id where ${limit} > 0 and v.user_id = ${userId} and m.conversation_id in (select id from permitted) and m.deleted_at is null order by m.created_at desc limit 500)
      union select id from messages where id = any(${sql.param(messageIds)}::text[]) and conversation_id in (select id from permitted) and deleted_at is null
    )
    select
    coalesce((select jsonb_agg(id) from permitted where kind = 'channel' and exists(select 1 from messages m where m.conversation_id = permitted.id)), '[]') as "startedChannels",
    coalesce((select jsonb_agg(jsonb_build_object('profile', ${rowJson(s.profiles)}, 'name', ${s.user.name}, 'avatarId', ${s.avatars.id}))
      from ${s.profiles} join ${s.user} on ${s.user.id} = ${s.profiles.userId}
      left join ${s.avatars} on ${s.avatars.uploaderId} = ${s.profiles.userId} and ${s.avatars.status} = 'active'
      where ${s.profiles.userId} in (select id from related union select author_id from messages where id in (select id from history))), '[]') as "profileRows",
    coalesce((select jsonb_agg(${rowJson(s.communities)} || jsonb_build_object('iconUrl', (select '/api/community-icons/' || i.id from community_icons i where i.community_id = ${s.communities.id} and i.status = 'active'), 'memberCount', (select count(*)::int from community_members m where m.community_id = ${s.communities.id})) order by ${s.communities.createdAt}) from ${s.communities} where ${s.communities.id} in (select id from catalog)), '[]') as "communityRows",
    coalesce((select jsonb_agg(${rowJson(s.members)}) from ${s.members} where ${s.members.communityId} in (select community_id from joined)), '[]') as "allMembers",
    coalesce((select jsonb_agg(${rowJson(s.categories)} order by ${s.categories.position}, ${s.categories.name}) from ${s.categories} where ${s.categories.communityId} in (select community_id from joined)), '[]') as "categoryRows",
    coalesce((select jsonb_agg(${rowJson(s.friendships)}) from ${s.friendships} where ${s.friendships.senderId} = ${userId} or ${s.friendships.recipientId} = ${userId}), '[]') as friendships,
    coalesce((select jsonb_agg(${rowJson(s.blocks)}) from ${s.blocks} where ${s.blocks.userId} = ${userId} or ${s.blocks.targetId} = ${userId}), '[]') as blocked,
    coalesce((select jsonb_agg(n.value) from (select jsonb_build_object('notice', ${rowJson(s.notifications)}, 'message', ${rowJson(s.messages)}) as value
      from ${s.notifications} join ${s.messages} on ${s.messages.id} = ${s.notifications.messageId}
      where ${s.notifications.userId} = ${userId} and ${s.messages.deletedAt} is null and ${s.messages.conversationId} in (select id from permitted)
      order by ${s.notifications.createdAt} desc limit 100) n), '[]') as notices,
    coalesce((select jsonb_agg(jsonb_build_object('conversation', ${rowJson(s.conversations)}, 'personId', ${s.participants.userId},
      'hasMessages', exists(select 1 from messages m where m.conversation_id = ${s.conversations.id} and m.deleted_at is null)))
      from ${s.conversations} join ${s.participants} on ${s.participants.conversationId} = ${s.conversations.id} and ${s.participants.userId} <> ${userId}
      where ${s.conversations.kind} = 'dm' and exists(select 1 from conversation_members own where own.conversation_id = ${s.conversations.id} and own.user_id = ${userId})), '[]') as "directRows",
    coalesce((select jsonb_agg(${rowJson(s.conversations)}) from ${s.conversations} where ${s.conversations.id} in (select id from permitted)), '[]') as allowed,
    coalesce((select jsonb_agg(${rowJson(s.messages)} order by ${s.messages.createdAt}, ${s.messages.id}) from ${s.messages} where ${s.messages.id} in (select id from history)), '[]') as "messageRows",
    coalesce((select jsonb_agg(r) from (select m.conversation_id as "conversationId", count(*)::int as count from messages m
      left join conversation_read_states r on r.conversation_id = m.conversation_id and r.user_id = ${userId}
      where m.conversation_id in (select id from permitted) and m.deleted_at is null and m.author_id <> ${userId}
      and m.created_at > coalesce(r.read_at, '-infinity'::timestamptz) group by m.conversation_id) r), '[]') as unread
  `);
  const {
    profileRows,
    communityRows,
    allMembers,
    categoryRows,
    friendships,
    blocked,
    notices,
    directRows,
    unread,
  } = result.rows[0];
  const startedChannels = new Set(result.rows[0].startedChannels);
  const allowed = hydrate(s.conversations, result.rows[0].allowed);
  const messageRows = hydrate(s.messages, result.rows[0].messageRows);
  hydrate(
    s.profiles,
    profileRows.map((p) => p.profile),
  );
  hydrate(
    s.notifications,
    notices.map((n) => n.notice),
  );
  if (!profileRows.some((p) => p.profile.userId === userId)) {
    // Legacy accounts without a profile are repaired once, not written on every read.
    await ensureProfile(db, viewer);
    return snapshot(db, viewer, limit);
  }
  const own = profileRows.find((p) => p.profile.userId === userId)!;
  const person = (p: typeof own): Person => ({
    id: p.profile.userId === userId ? "you" : p.profile.userId,
    name: p.name,
    avatarUrl: p.avatarId ? `/api/avatars/${p.avatarId}` : undefined,
    handle: chosenUsername(p.profile.handle),
    bio: p.profile.bio,
    gender: p.profile.gender ?? "",
    color: p.profile.color,
    activity: p.profile.preferences.activity ? p.profile.activity : "",
    status:
      p.profile.lastSeenAt.getTime() < Date.now() - 90_000
        ? "offline"
        : p.profile.status,
    role: "Member",
  });
  return {
    version: 1,
    profile: person(own),
    people: profileRows.filter((p) => p.profile.userId !== userId).map(person),
    communities: communityRows.map((c) => {
      const membership = allMembers.filter((m) => m.communityId === c.id);
      const joined = membership.some((m) => m.userId === userId);
      return {
        ...c,
        icon: c.icon as Community["icon"],
        iconUrl: c.iconUrl ?? undefined,
        joined,
        members: c.memberCount,
        memberIds: joined
          ? membership.map((m) => (m.userId === userId ? "you" : m.userId))
          : [],
        memberRoles: joined
          ? Object.fromEntries(
              membership.map((m) => [
                m.userId === userId ? "you" : m.userId,
                m.role,
              ]),
            )
          : {},
        channelCategories: joined
          ? categoryRows
              .filter((g) => g.communityId === c.id)
              .map((g) => g.name)
          : [],
        channels: allowed
          .filter((ch) => ch.communityId === c.id)
          .map((ch) => ({
            id: ch.channelId!,
            name: ch.name,
            description: ch.description,
            icon: ch.icon,
            hasMessages: startedChannels.has(ch.id),
            group:
              categoryRows.find((g) => g.id === ch.categoryId)?.name ??
              "",
            private: ch.private,
            unread: unread.find((r) => r.conversationId === ch.id)?.count ?? 0,
          })),
      };
    }),
    messages: await serializeMessages(db, userId, messageRows, allowed),
    dmConversations: directRows.map(
      ({ conversation: c, personId, hasMessages }) => ({
        conversation: c.id,
        hasMessages,
        unread: unread.find((row) => row.conversationId === c.id)?.count ?? 0,
        personId,
        status: c.dmStatus,
        incoming: c.dmInitiatorId !== userId,
        messagingBlocked: blocked.some(
          (b) => b.userId === personId || b.targetId === personId,
        ),
      }),
    ),
    friends: friendships
      .filter((f) => f.accepted)
      .map((f) => (f.senderId === userId ? f.recipientId : f.senderId)),
    pending: friendships
      .filter((f) => !f.accepted && f.recipientId === userId)
      .map((f) => f.senderId),
    outgoing: friendships
      .filter((f) => !f.accepted && f.senderId === userId)
      .map((f) => f.recipientId),
    blocked: blocked.filter((b) => b.userId === userId).map((b) => b.targetId),
    activities: notices
      .filter((n) =>
        allowed.some(
          (c) =>
            c.id === n.message.conversationId &&
            (c.kind !== "dm" || c.dmStatus === "accepted"),
        ),
      )
      .map(({ notice: n, message: m }) => ({
        id: n.id,
        person: n.actorId === userId ? "you" : n.actorId,
        type: n.type,
        text: m.content,
        community:
          allowed.find((c) => c.id === m.conversationId)?.communityId ?? "dm",
        channel:
          allowed.find((c) => c.id === m.conversationId)?.channelId ??
          n.actorId,
        time: n.createdAt.toLocaleString("en-US", { timeZone: "UTC" }),
        read: n.read,
      })),
    preferences: own.profile.preferences,
    muted: own.profile.muted,
    onboardingComplete:
      own.profile.onboardingComplete &&
      Boolean(chosenUsername(own.profile.handle)),
    drafts: {},
  };
}
export async function messagePage(
  db: Database,
  userId: string,
  key: string,
  before?: string,
  target?: string,
) {
  const c = await requireConversation(db, userId, key);
  let cursor: typeof s.messages.$inferSelect | undefined;
  if (before || target) {
    [cursor] = await db
      .select()
      .from(s.messages)
      .where(
        and(
          eq(s.messages.id, (before || target)!),
          eq(s.messages.conversationId, c.id),
          isNull(s.messages.deletedAt),
        ),
      );
    if (!cursor) throw new HttpError(404, "Message not found.");
  }
  const rows =
    target && cursor
      ? await db
          .select()
          .from(s.messages)
          .where(
            and(
              eq(s.messages.conversationId, c.id),
              isNull(s.messages.deletedAt),
              or(
                eq(s.messages.id, cursor.parentId || cursor.id),
                eq(s.messages.parentId, cursor.parentId || cursor.id),
              ),
            ),
          )
          .orderBy(asc(s.messages.createdAt), asc(s.messages.id))
          .limit(100)
      : await db
          .select()
          .from(s.messages)
          .where(
            and(
              eq(s.messages.conversationId, c.id),
              isNull(s.messages.deletedAt),
              cursor
                ? or(
                    lt(s.messages.createdAt, cursor.createdAt),
                    and(
                      eq(s.messages.createdAt, cursor.createdAt),
                      lt(s.messages.id, cursor.id),
                    ),
                  )
                : undefined,
            ),
          )
          .orderBy(desc(s.messages.createdAt), desc(s.messages.id))
          .limit(51);
  const selected = target ? rows : rows.slice(0, 50).reverse();
  return {
    messages: await serializeMessages(db, userId, selected, [c]),
    people: await peopleFor(db, userId, [
      ...new Set(selected.map((m) => m.authorId)),
    ]),
    hasMore: !target && rows.length > 50,
  };
}
export async function searchMessages(db: Database, userId: string, q: string) {
  const allowed = await visibleConversations(db, userId);
  if (!q.trim() || !allowed.length) return [];
  const terms = q.toLowerCase().match(/[\p{L}\p{N}_]+/gu) ?? [];
  if (!q.startsWith("#") && !terms.length) return [];
  const search = terms.map((term) => `'${term}':*`).join(" & ");
  const filtered = q.startsWith("#")
    ? allowed.filter((c) => c.name.includes(q.slice(1)))
    : allowed;
  if (!filtered.length) return [];
  const rows = await db
    .select()
    .from(s.messages)
    .where(
      and(
        inArray(
          s.messages.conversationId,
          filtered.map((c) => c.id),
        ),
        isNull(s.messages.deletedAt),
        q.startsWith("#")
          ? undefined
          : sql`to_tsvector('simple', ${s.messages.content}) @@ to_tsquery('simple', ${search})`,
      ),
    )
    .orderBy(desc(s.messages.createdAt), desc(s.messages.id))
    .limit(100);
  return serializeMessages(db, userId, rows, allowed);
}
