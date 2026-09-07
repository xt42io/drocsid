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
  ensureProfile,
  requireConversation,
} from "./access";
import type { Community, AppState, Message, Person } from "../types/app";
import { HttpError } from "./http";

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
  const [reactions, saved, files, participation] = await Promise.all([
    db.select().from(s.reactions).where(inArray(s.reactions.messageId, ids)),
    db
      .select()
      .from(s.saved)
      .where(and(eq(s.saved.userId, userId), inArray(s.saved.messageId, ids))),
    db
      .select()
      .from(s.attachments)
      .where(
        and(
          inArray(s.attachments.messageId, ids),
          eq(s.attachments.status, "ready"),
        ),
      ),
    db
      .select()
      .from(s.participants)
      .where(
        inArray(s.participants.conversationId, [
          ...new Set(rows.map((m) => m.conversationId)),
        ]),
      ),
  ]);
  return rows.flatMap((m) => {
    const c = allowed.find((c) => c.id === m.conversationId);
    if (!c) return [];
    const grouped = new Map<
      string,
      { emoji: string; count: number; mine: boolean }
    >();
    for (const r of reactions.filter((r) => r.messageId === m.id)) {
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
        conversation: uiKey(c, userId, participation),
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
        saved: saved.some((s) => s.messageId === m.id),
        threadOf: m.parentId ?? undefined,
        reactions: [...grouped.values()],
        attachments: files
          .filter((f) => f.messageId === m.id)
          .map((f) => ({
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
): Promise<AppState> {
  await ensureProfile(db, viewer);
  const userId = viewer.id;
  const allowed = await visibleConversations(db, userId);
  const allowedIds = allowed.map((c) => c.id);
  const [
    profileRows,
    communityRows,
    allMembers,
    categoryRows,
    friendships,
    blocked,
    readStates,
    notices,
    directRows,
  ] = await Promise.all([
    db
      .select({
        profile: s.profiles,
        name: s.user.name,
        avatarId: s.avatars.id,
      })
      .from(s.profiles)
      .innerJoin(s.user, eq(s.user.id, s.profiles.userId))
      .leftJoin(
        s.avatars,
        and(
          eq(s.avatars.uploaderId, s.user.id),
          eq(s.avatars.status, "active"),
        ),
      ),
    db.select().from(s.communities).orderBy(asc(s.communities.createdAt)),
    db.select().from(s.members),
    db
      .select()
      .from(s.categories)
      .orderBy(asc(s.categories.position), asc(s.categories.name)),
    db
      .select()
      .from(s.friendships)
      .where(
        or(
          eq(s.friendships.senderId, userId),
          eq(s.friendships.recipientId, userId),
        ),
      ),
    db
      .select()
      .from(s.blocks)
      .where(or(eq(s.blocks.userId, userId), eq(s.blocks.targetId, userId))),
    db.select().from(s.readStates).where(eq(s.readStates.userId, userId)),
    db
      .select({ notice: s.notifications, message: s.messages })
      .from(s.notifications)
      .innerJoin(s.messages, eq(s.messages.id, s.notifications.messageId))
      .where(
        and(eq(s.notifications.userId, userId), isNull(s.messages.deletedAt)),
      )
      .orderBy(desc(s.notifications.createdAt))
      .limit(500),
    db
      .select({
        conversation: s.conversations,
        personId: s.participants.userId,
        hasMessages: sql<boolean>`exists (select 1 from messages m where m.conversation_id = ${s.conversations.id} and m.deleted_at is null)`,
      })
      .from(s.conversations)
      .innerJoin(
        s.participants,
        and(
          eq(s.participants.conversationId, s.conversations.id),
          sql`${s.participants.userId} <> ${userId}`,
        ),
      )
      .where(
        and(
          eq(s.conversations.kind, "dm"),
          sql`exists (select 1 from conversation_members own where own.conversation_id = ${s.conversations.id} and own.user_id = ${userId})`,
        ),
      ),
  ]);
  const own = profileRows.find((p) => p.profile.userId === userId)!;
  const person = (p: typeof own): Person => ({
    id: p.profile.userId === userId ? "you" : p.profile.userId,
    name: p.name,
    avatarUrl: p.avatarId ? `/api/avatars/${p.avatarId}` : undefined,
    handle: p.profile.handle,
    bio: p.profile.bio,
    color: p.profile.color,
    activity: p.profile.preferences.activity ? p.profile.activity : "",
    status:
      p.profile.lastSeenAt.getTime() < Date.now() - 90_000
        ? "offline"
        : p.profile.status,
    role: "Member",
  });
  // A bounded bootstrap; each conversation has its own cursor pagination endpoint.
  const recent = allowedIds.length
    ? await db
        .select()
        .from(s.messages)
        .where(
          and(
            inArray(s.messages.conversationId, allowedIds),
            isNull(s.messages.deletedAt),
          ),
        )
        .orderBy(desc(s.messages.createdAt), desc(s.messages.id))
        .limit(Math.min(5000, Math.max(500, messageLimit)))
    : [];
  const savedRows = allowedIds.length
    ? await db
        .select({ message: s.messages })
        .from(s.saved)
        .innerJoin(s.messages, eq(s.saved.messageId, s.messages.id))
        .where(
          and(
            eq(s.saved.userId, userId),
            inArray(s.messages.conversationId, allowedIds),
            isNull(s.messages.deletedAt),
          ),
        )
        .limit(500)
    : [];
  const messageRows = [
    ...new Map(
      [...recent, ...savedRows.map((r) => r.message)].map((m) => [m.id, m]),
    ).values(),
  ].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  const unread = allowedIds.length
    ? await db
        .select({
          conversationId: s.messages.conversationId,
          count: sql<number>`count(*)::int`,
        })
        .from(s.messages)
        .leftJoin(
          s.readStates,
          and(
            eq(s.readStates.userId, userId),
            eq(s.readStates.conversationId, s.messages.conversationId),
          ),
        )
        .where(
          and(
            inArray(s.messages.conversationId, allowedIds),
            isNull(s.messages.deletedAt),
            sql`${s.messages.authorId} <> ${userId}`,
            sql`${s.messages.createdAt} > coalesce(${s.readStates.readAt}, '-infinity'::timestamptz)`,
          ),
        )
        .groupBy(s.messages.conversationId)
    : [];
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
        joined,
        members: membership.length,
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
            group:
              categoryRows.find((g) => g.id === ch.categoryId)?.name ??
              "CHANNELS",
            private: ch.private,
            unread: unread.find((r) => r.conversationId === ch.id)?.count ?? 0,
          })),
      };
    }),
    messages: await serializeMessages(db, userId, messageRows, allowed),
    dmConversations: directRows.map(
      ({ conversation: c, personId, hasMessages }) => ({
        hasMessages,
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
    onboardingComplete: own.profile.onboardingComplete,
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
    hasMore: !target && rows.length > 50,
  };
}
export async function searchMessages(db: Database, userId: string, q: string) {
  const allowed = await visibleConversations(db, userId);
  if (!q.trim() || !allowed.length) return [];
  const escaped = q.replace(/[\\%_]/g, "\\$&");
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
          : ilike(s.messages.content, `%${escaped}%`),
      ),
    )
    .orderBy(desc(s.messages.createdAt), desc(s.messages.id))
    .limit(100);
  return serializeMessages(db, userId, rows, allowed);
}
