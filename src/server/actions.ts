import { attachCommunityIcon } from "./community-icons";
import { and, eq, inArray, isNull, or, sql } from "drizzle-orm";
import type { Database } from "./db";
import * as s from "./db/schema";
import type { Action } from "../lib/contracts";
import {
  conversationAccess,
  isBlocked,
  requireDmSend,
  requireDmUnblocked,
  conversationIdFor,
  requireConversation,
  requireManager,
  roleFor,
} from "./access";
import { HttpError } from "./http";

export async function mutate(db: Database, userId: string, action: Action) {
  switch (action.type) {
    case "dm.request": {
      const c = await requireConversation(db, userId, `dm:${action.personId}`);
      await requireDmUnblocked(db, c.id, userId);
      if (
        c.kind !== "dm" ||
        c.dmInitiatorId !== action.personId ||
        c.dmStatus !== "pending"
      )
        throw new HttpError(403, "No incoming message request to respond to.");
      const updated = await db
        .update(s.conversations)
        .set({
          dmStatus: action.operation === "accept" ? "accepted" : "declined",
        })
        .where(
          and(
            eq(s.conversations.id, c.id),
            eq(s.conversations.dmStatus, "pending"),
          ),
        )
        .returning();
      if (!updated.length)
        throw new HttpError(409, "This request has already been handled.");
      break;
    }
    case "profile": {
      const { type, name, ...profile } = action;
      await db
        .update(s.user)
        .set({ name, updatedAt: new Date() })
        .where(eq(s.user.id, userId));
      await db
        .update(s.profiles)
        .set(profile)
        .where(eq(s.profiles.userId, userId));
      break;
    }
    case "preferences": {
      const { type, ...values } = action;
      await db
        .update(s.profiles)
        .set(values)
        .where(eq(s.profiles.userId, userId));
      break;
    }
    case "community.create": {
      await db
        .insert(s.communities)
        .values({ id: action.id, ...action.community });
      await db
        .insert(s.members)
        .values({ communityId: action.id, userId, role: "Owner" });
      const categories = [
        ...new Set(
          action.channels.map((channel) => channel.group).filter(Boolean),
        ),
      ].map((name) => ({
        id: crypto.randomUUID(),
        communityId: action.id,
        name,
      }));
      if (categories.length) await db.insert(s.categories).values(categories);
      const categoryIds = new Map(
        categories.map((category) => [category.name, category.id]),
      );
      await db.insert(s.conversations).values(
        action.channels.map((channel) => ({
          id: `${action.id}:${channel.id}`,
          kind: "channel" as const,
          communityId: action.id,
          channelId: channel.id,
          name: channel.name,
          description: channel.description,
          icon: channel.icon ?? "",
          categoryId: categoryIds.get(channel.group) ?? null,
          private: !!channel.private,
        })),
      );
      if (action.iconUploadId)
        await attachCommunityIcon(db, userId, action.id, action.iconUploadId);
      break;
    }
    case "community.update":
      await requireManager(db, userId, action.id);
      await db
        .update(s.communities)
        .set(action.community)
        .where(eq(s.communities.id, action.id));
      break;
    case "community.join": {
      const [community] = await db
        .select()
        .from(s.communities)
        .where(eq(s.communities.id, action.id));
      if (!community) throw new HttpError(404, "Community not found.");
      if (!community.discoverable)
        throw new HttpError(
          403,
          "This community can only be joined with an invite.",
        );
      await db
        .insert(s.members)
        .values({ communityId: action.id, userId })
        .onConflictDoNothing();
      break;
    }
    case "community.leave":
      if ((await roleFor(db, userId, action.id)) === "Owner")
        throw new HttpError(403, "The owner must stay in the community.");
      await db
        .delete(s.members)
        .where(
          and(
            eq(s.members.communityId, action.id),
            eq(s.members.userId, userId),
          ),
        );
      // Private invitations do not survive leaving and rejoining.
      await db
        .delete(s.participants)
        .where(
          and(
            eq(s.participants.userId, userId),
            inArray(
              s.participants.conversationId,
              db
                .select({ id: s.conversations.id })
                .from(s.conversations)
                .where(eq(s.conversations.communityId, action.id)),
            ),
          ),
        );
      break;
    case "category.create":
      await requireManager(db, userId, action.communityId);
      await db
        .insert(s.categories)
        .values({
          id: crypto.randomUUID(),
          communityId: action.communityId,
          name: action.name,
        })
        .onConflictDoNothing();
      break;
    case "channel.put": {
      await requireManager(db, userId, action.communityId);
      const category = action.channel.group
        ? await (async () => {
            await mutate(db, userId, {
              type: "category.create",
              communityId: action.communityId,
              name: action.channel.group,
            });
            const [created] = await db
              .select()
              .from(s.categories)
              .where(
                and(
                  eq(s.categories.communityId, action.communityId),
                  eq(s.categories.name, action.channel.group),
                ),
              );
            return created;
          })()
        : null;
      const id = `${action.communityId}:${action.channel.id}`;
      const { name, description } = action.channel;
      const values = {
        icon: action.channel.icon ?? "",
        name,
        description,
        categoryId: category?.id ?? null,
        private: !!action.channel.private,
      };
      await db
        .insert(s.conversations)
        .values({
          id,
          kind: "channel",
          communityId: action.communityId,
          channelId: action.channel.id,
          ...values,
        })
        .onConflictDoUpdate({ target: s.conversations.id, set: values });
      break;
    }
    case "channel.delete": {
      await requireManager(db, userId, action.communityId);
      const id = `${action.communityId}:${action.id}`;
      // Soft-delete files and messages; cleanup removes remote objects with retry.
      await db
        .update(s.attachments)
        .set({ status: "deleted" })
        .where(eq(s.attachments.conversationId, id));
      await db
        .update(s.messages)
        .set({ deletedAt: new Date() })
        .where(eq(s.messages.conversationId, id));
      await db
        .update(s.conversations)
        .set({
          private: true,
          channelId: null,
          name: `deleted-${crypto.randomUUID()}`,
        })
        .where(eq(s.conversations.id, id));
      await db
        .delete(s.participants)
        .where(eq(s.participants.conversationId, id));
      break;
    }
    case "member.role":
    case "member.remove": {
      const ownRole = await requireManager(db, userId, action.communityId);
      const targetRole = await roleFor(db, action.userId, action.communityId);
      if (
        !targetRole ||
        targetRole === "Owner" ||
        action.userId === userId ||
        (ownRole !== "Owner" &&
          (targetRole === "Admin" ||
            (action.type === "member.role" && action.role === "Admin")))
      )
        throw new HttpError(403, "You cannot change this member.");
      const where = and(
        eq(s.members.communityId, action.communityId),
        eq(s.members.userId, action.userId),
      );
      if (action.type === "member.role")
        await db.update(s.members).set({ role: action.role }).where(where);
      else {
        await db.delete(s.members).where(where);
        await db
          .delete(s.participants)
          .where(
            and(
              eq(s.participants.userId, action.userId),
              inArray(
                s.participants.conversationId,
                db
                  .select({ id: s.conversations.id })
                  .from(s.conversations)
                  .where(eq(s.conversations.communityId, action.communityId)),
              ),
            ),
          );
      }
      break;
    }
    case "channel.access": {
      const c = await requireConversation(db, userId, action.conversation);
      if (!c.communityId || !c.private)
        throw new HttpError(400, "Choose a private channel.");
      await requireManager(db, userId, c.communityId);
      if (!(await roleFor(db, action.userId, c.communityId)))
        throw new HttpError(400, "This person is not a member.");
      if (action.allow)
        await db
          .insert(s.participants)
          .values({ conversationId: c.id, userId: action.userId })
          .onConflictDoNothing();
      else
        await db
          .delete(s.participants)
          .where(
            and(
              eq(s.participants.conversationId, c.id),
              eq(s.participants.userId, action.userId),
            ),
          );
      break;
    }
    case "message.send": {
      const c = await requireConversation(
        db,
        userId,
        action.conversation,
        true,
      );
      await requireDmSend(db, c, userId);
      const [duplicate] = await db
        .select()
        .from(s.messages)
        .where(eq(s.messages.id, action.id));
      if (duplicate) {
        if (duplicate.authorId !== userId || duplicate.conversationId !== c.id)
          throw new HttpError(409, "Message ID is already in use.");
        return {
          message: duplicate,
          attachments: await db
            .select()
            .from(s.attachments)
            .where(eq(s.attachments.messageId, duplicate.id)),
        };
      }
      if (action.threadOf) {
        const [parent] = await db
          .select()
          .from(s.messages)
          .where(
            and(
              eq(s.messages.id, action.threadOf),
              eq(s.messages.conversationId, c.id),
              isNull(s.messages.deletedAt),
              isNull(s.messages.parentId),
            ),
          );
        if (!parent)
          throw new HttpError(400, "The original message is unavailable.");
      }
      const files = action.attachments.length
        ? await db
            .select()
            .from(s.attachments)
            .where(inArray(s.attachments.id, action.attachments))
            .for("update")
        : [];
      if (
        files.length !== new Set(action.attachments).size ||
        files.some(
          (f) =>
            f.uploaderId !== userId ||
            f.conversationId !== c.id ||
            f.status !== "ready" ||
            f.messageId,
        )
      )
        throw new HttpError(
          400,
          "An attachment is unavailable or belongs to another message.",
        );
      const [message] = await db
        .insert(s.messages)
        .values({
          id: action.id,
          authorId: userId,
          conversationId: c.id,
          content: action.text,
          parentId: action.threadOf,
        })
        .returning();
      if (files.length)
        await db
          .update(s.attachments)
          .set({ messageId: action.id })
          .where(
            inArray(
              s.attachments.id,
              files.map((f) => f.id),
            ),
          );
      await createMentions(
        db,
        userId,
        action.id,
        c,
        action.text,
        action.threadOf,
      );
      return { message, attachments: files };
    }
    case "message.update":
    case "message.delete":
    case "reaction": {
      const [message] = await db
        .select()
        .from(s.messages)
        .where(and(eq(s.messages.id, action.id), isNull(s.messages.deletedAt)));
      if (!message) throw new HttpError(404, "Message not found.");
      const [c] = await db
        .select()
        .from(s.conversations)
        .where(
          and(
            eq(s.conversations.id, message.conversationId),
            conversationAccess(userId),
          ),
        );
      if (!c || (c.kind === "channel" && !c.channelId))
        throw new HttpError(403, "You cannot access this message.");
      await requireDmSend(db, c, userId);
      if (action.type === "reaction") {
        const where = and(
          eq(s.reactions.messageId, action.id),
          eq(s.reactions.userId, userId),
          eq(s.reactions.emoji, action.emoji),
        );
        const [existing] = await db.select().from(s.reactions).where(where);
        if (existing) await db.delete(s.reactions).where(where);
        else
          await db
            .insert(s.reactions)
            .values({ messageId: action.id, userId, emoji: action.emoji })
            .onConflictDoNothing();
      } else if (action.type === "message.delete") {
        const role = c.communityId
          ? await roleFor(db, userId, c.communityId)
          : undefined;
        if (
          message.authorId !== userId &&
          !["Owner", "Admin", "Moderator"].includes(role ?? "")
        )
          throw new HttpError(403, "You cannot delete this message.");
        const deleted = await db
          .update(s.messages)
          .set({ deletedAt: new Date() })
          .where(
            or(
              eq(s.messages.id, action.id),
              eq(s.messages.parentId, action.id),
            ),
          )
          .returning({ id: s.messages.id });
        await db
          .update(s.attachments)
          .set({ status: "deleted" })
          .where(
            inArray(
              s.attachments.messageId,
              deleted.map((m) => m.id),
            ),
          );
      } else {
        if (action.text !== undefined) {
          if (message.authorId !== userId)
            throw new HttpError(403, "You can only edit your own messages.");
          await db
            .update(s.messages)
            .set({ content: action.text, editedAt: new Date() })
            .where(eq(s.messages.id, action.id));
        }
        if (action.pinned !== undefined) {
          if (c.communityId) await requireManager(db, userId, c.communityId);
          await db
            .update(s.messages)
            .set({ pinned: action.pinned })
            .where(eq(s.messages.id, action.id));
        }
        if (action.saved === true)
          await db
            .insert(s.saved)
            .values({ messageId: action.id, userId })
            .onConflictDoNothing();
        if (action.saved === false)
          await db
            .delete(s.saved)
            .where(
              and(eq(s.saved.messageId, action.id), eq(s.saved.userId, userId)),
            );
      }
      break;
    }
    case "friend": {
      const target = action.id;
      if (target === userId) throw new HttpError(400, "Choose another person.");
      const [person] = await db
        .select({ id: s.user.id })
        .from(s.user)
        .where(eq(s.user.id, target));
      if (!person) throw new HttpError(404, "Person not found.");
      const pair = or(
        and(
          eq(s.friendships.senderId, userId),
          eq(s.friendships.recipientId, target),
        ),
        and(
          eq(s.friendships.senderId, target),
          eq(s.friendships.recipientId, userId),
        ),
      );
      if (action.operation === "block") {
        await db
          .insert(s.blocks)
          .values({ userId, targetId: target })
          .onConflictDoNothing();
        await db.delete(s.friendships).where(pair);
      } else if (action.operation === "unblock")
        await db
          .delete(s.blocks)
          .where(
            and(eq(s.blocks.userId, userId), eq(s.blocks.targetId, target)),
          );
      else if (action.operation === "remove")
        await db
          .delete(s.friendships)
          .where(and(pair, eq(s.friendships.accepted, true)));
      else if (action.operation === "cancel")
        await db
          .delete(s.friendships)
          .where(
            and(
              eq(s.friendships.senderId, userId),
              eq(s.friendships.recipientId, target),
              eq(s.friendships.accepted, false),
            ),
          );
      else if (action.operation === "decline")
        await db
          .delete(s.friendships)
          .where(
            and(
              eq(s.friendships.recipientId, userId),
              eq(s.friendships.senderId, target),
              eq(s.friendships.accepted, false),
            ),
          );
      else {
        if (await isBlocked(db, userId, target))
          throw new HttpError(403, "This person is unavailable.");
        if (action.operation === "accept") {
          const updated = await db
            .update(s.friendships)
            .set({ accepted: true })
            .where(
              and(
                eq(s.friendships.senderId, target),
                eq(s.friendships.recipientId, userId),
              ),
            )
            .returning();
          if (!updated.length)
            throw new HttpError(400, "No incoming request to accept.");
          await db
            .update(s.conversations)
            .set({ dmStatus: "accepted" })
            .where(
              eq(s.conversations.id, conversationIdFor(userId, `dm:${target}`)),
            );
        } else {
          const [existing] = await db.select().from(s.friendships).where(pair);
          if (!existing)
            await db
              .insert(s.friendships)
              .values({ senderId: userId, recipientId: target });
        }
      }
      break;
    }
    case "notification.read":
      if (action.ids.length)
        await db
          .update(s.notifications)
          .set({ read: action.read })
          .where(
            and(
              eq(s.notifications.userId, userId),
              inArray(s.notifications.id, action.ids),
            ),
          );
      break;
    case "conversation.open":
      await requireConversation(db, userId, action.conversation, true);
      break;
    case "conversation.read": {
      const c = await requireConversation(db, userId, action.conversation);
      if (c.kind === "dm" && c.dmStatus !== "accepted") break;
      const readAt = new Date(
        Math.min(new Date(action.through).getTime(), Date.now()),
      );
      await db
        .insert(s.readStates)
        .values({ userId, conversationId: c.id, readAt })
        .onConflictDoUpdate({
          target: [s.readStates.userId, s.readStates.conversationId],
          set: {
            readAt: sql`greatest(${s.readStates.readAt}, ${readAt.toISOString()}::timestamptz)`,
          },
        });
      break;
    }
  }
}

async function createMentions(
  db: Database,
  userId: string,
  messageId: string,
  c: typeof s.conversations.$inferSelect,
  text: string,
  parentId?: string,
) {
  const handles = new Set(
    Array.from(
      text
        .replace(/```[\s\S]*?```|`[^`]*`|https?:\/\/\S+/g, "")
        .matchAll(/(?:^|[^\p{L}\p{N}_@])@([\p{L}\p{N}_-]+)/gu),
      (m) => m[1].toLowerCase(),
    ),
  );
  if (c.kind === "dm" && c.dmStatus !== "accepted") return;
  if (!handles.size && !parentId) return;
  // Group mentions remain restricted to community managers.
  if ((handles.has("everyone") || handles.has("admin")) && c.communityId)
    await requireManager(db, userId, c.communityId);
  const parent = parentId
    ? (await db.select().from(s.messages).where(eq(s.messages.id, parentId)))[0]
    : undefined;
  const notBlocked = sql`not exists (select 1 from ${s.blocks} b where
    (b.user_id = ${userId} and b.target_id = ${s.profiles.userId}) or
    (b.target_id = ${userId} and b.user_id = ${s.profiles.userId}))`;
  const targets = c.communityId
    ? await db
        .select({ profile: s.profiles, role: s.members.role })
        .from(s.profiles)
        .innerJoin(
          s.members,
          and(
            eq(s.members.userId, s.profiles.userId),
            eq(s.members.communityId, c.communityId),
          ),
        )
        .where(
          and(
            notBlocked,
            c.private
              ? sql`(${s.members.role} in ('Owner', 'Admin') or exists
        (select 1 from ${s.participants} p where p.conversation_id = ${c.id} and p.user_id = ${s.profiles.userId}))`
              : undefined,
          ),
        )
    : await db
        .select({ profile: s.profiles, role: sql<string>`'Member'` })
        .from(s.profiles)
        .innerJoin(
          s.participants,
          and(
            eq(s.participants.userId, s.profiles.userId),
            eq(s.participants.conversationId, c.id),
          ),
        )
        .where(notBlocked);
  const notices = targets.flatMap(({ profile, role }) => {
    if (
      profile.userId === userId ||
      !profile.preferences.notifications ||
      !profile.preferences.mentions
    )
      return [];
    const mentioned =
      handles.has(profile.handle) ||
      (!!c.communityId &&
        (handles.has("everyone") ||
          (handles.has("admin") && ["Owner", "Admin"].includes(role))));
    if (!mentioned && parent?.authorId !== profile.userId) return [];
    return [
      {
        id: crypto.randomUUID(),
        userId: profile.userId,
        actorId: userId,
        messageId,
        type: mentioned ? ("mention" as const) : ("reply" as const),
      },
    ];
  });
  if (notices.length) await db.insert(s.notifications).values(notices);
}
