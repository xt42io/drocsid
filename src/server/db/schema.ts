import { relations, sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import type { Preferences } from "../../types/app";

const time = (name: string) =>
  timestamp(name, { withTimezone: true }).notNull().defaultNow();
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: time("created_at"),
  updatedAt: time("updated_at"),
});
export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    token: text("token").notNull().unique(),
    expiresAt: time("expires_at"),
    createdAt: time("created_at"),
    updatedAt: time("updated_at"),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (t) => [index("session_user_idx").on(t.userId)],
);
export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", {
      withTimezone: true,
    }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
      withTimezone: true,
    }),
    scope: text("scope"),
    password: text("password"),
    createdAt: time("created_at"),
    updatedAt: time("updated_at"),
  },
  (t) => [index("account_user_idx").on(t.userId)],
);
export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: time("expires_at"),
    createdAt: time("created_at"),
    updatedAt: time("updated_at"),
  },
  (t) => [index("verification_identifier_idx").on(t.identifier)],
);
export const rateLimit = pgTable("rate_limit", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  count: integer("count").notNull(),
  lastRequest: bigint("last_request", { mode: "number" }).notNull(),
});
export const profiles = pgTable("profiles", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  handle: text("handle").unique(),
  color: text("color").notNull().default("purple"),
  bio: text("bio").notNull().default(""),
  activity: text("activity").notNull().default(""),
  status: text("status", { enum: ["online", "away", "offline"] })
    .notNull()
    .default("online"),
  preferences: jsonb("preferences").$type<Preferences>().notNull(),
  muted: jsonb("muted").$type<string[]>().notNull().default([]),
  onboardingComplete: boolean("onboarding_complete").notNull().default(false),
  lastSeenAt: time("last_seen_at"),
});
export const communities = pgTable("communities", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  icon: text("icon").notNull(),
  color: text("color").notNull(),
  category: text("category").notNull(),
  discoverable: boolean("discoverable").notNull().default(true),
  createdAt: time("created_at"),
});
export const members = pgTable(
  "community_members",
  {
    communityId: text("community_id")
      .notNull()
      .references(() => communities.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role", { enum: ["Owner", "Admin", "Moderator", "Member"] })
      .notNull()
      .default("Member"),
    joinedAt: time("joined_at"),
  },
  (t) => [
    primaryKey({ columns: [t.communityId, t.userId] }),
    index("membership_user_idx").on(t.userId),
  ],
);
export const communityInvites = pgTable(
  "community_invites",
  {
    code: text("code").primaryKey(),
    communityId: text("community_id")
      .notNull()
      .references(() => communities.id, { onDelete: "cascade" }),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: time("created_at"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    maxUses: integer("max_uses"),
    useCount: integer("use_count").notNull().default(0),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (t) => [
    index("community_invite_community_idx").on(t.communityId, t.createdAt),
    index("community_invite_creator_idx").on(t.createdBy, t.createdAt),
  ],
);
export const categories = pgTable(
  "channel_categories",
  {
    id: text("id").primaryKey(),
    communityId: text("community_id")
      .notNull()
      .references(() => communities.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    position: integer("position").notNull().default(0),
  },
  (t) => [uniqueIndex("category_name_idx").on(t.communityId, t.name)],
);
export const conversations = pgTable(
  "conversations",
  {
    id: text("id").primaryKey(),
    kind: text("kind", { enum: ["channel", "dm"] }).notNull(),
    dmInitiatorId: text("dm_initiator_id").references(() => user.id, {
      onDelete: "cascade",
    }),
    dmStatus: text("dm_status", { enum: ["pending", "accepted", "declined"] })
      .notNull()
      .default("accepted"),
    communityId: text("community_id").references(() => communities.id, {
      onDelete: "cascade",
    }),
    channelId: text("channel_id"),
    icon: text("icon").notNull().default(""),
    name: text("name").notNull().default(""),
    description: text("description").notNull().default(""),
    categoryId: text("category_id").references(() => categories.id),
    private: boolean("private").notNull().default(false),
    position: integer("position").notNull().default(0),
    createdAt: time("created_at"),
  },
  (t) => [
    uniqueIndex("community_channel_idx").on(t.communityId, t.channelId),
    uniqueIndex("community_channel_name_idx").on(t.communityId, t.name),
  ],
);
export const participants = pgTable(
  "conversation_members",
  {
    conversationId: text("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (t) => [
    primaryKey({ columns: [t.conversationId, t.userId] }),
    index("participant_user_idx").on(t.userId),
  ],
);
export const messages = pgTable(
  "messages",
  {
    id: text("id").primaryKey(),
    conversationId: text("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    authorId: text("author_id")
      .notNull()
      .references(() => user.id),
    content: text("content").notNull(),
    parentId: text("parent_id"),
    createdAt: time("created_at"),
    editedAt: timestamp("edited_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    pinned: boolean("pinned").notNull().default(false),
  },
  (t) => [
    index("message_conversation_cursor_idx").on(
      t.conversationId,
      t.createdAt,
      t.id,
    ),
    index("message_parent_idx").on(t.parentId),
    index("message_search_idx")
      .using("gin", sql`to_tsvector('simple', ${t.content})`)
      .where(sql`${t.deletedAt} is null`),
    index("message_unread_idx")
      .on(t.conversationId, t.createdAt, t.authorId)
      .where(sql`${t.deletedAt} is null`),
  ],
);
export const reactions = pgTable(
  "message_reactions",
  {
    messageId: text("message_id")
      .notNull()
      .references(() => messages.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    emoji: text("emoji").notNull(),
  },
  (t) => [primaryKey({ columns: [t.messageId, t.userId, t.emoji] })],
);
export const saved = pgTable(
  "saved_messages",
  {
    messageId: text("message_id")
      .notNull()
      .references(() => messages.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.messageId, t.userId] })],
);
export const attachments = pgTable(
  "attachments",
  {
    id: text("id").primaryKey(),
    conversationId: text("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    uploaderId: text("uploader_id")
      .notNull()
      .references(() => user.id),
    messageId: text("message_id").references(() => messages.id),
    path: text("path").notNull().unique(),
    fileId: text("file_id"),
    uploadId: text("upload_id"),
    originalName: text("original_name").notNull(),
    contentType: text("content_type").notNull(),
    byteSize: integer("byte_size").notNull(),
    status: text("status", { enum: ["pending", "ready", "deleted"] })
      .notNull()
      .default("pending"),
    createdAt: time("created_at"),
  },
  (t) => [
    index("attachment_message_idx").on(t.messageId),
    index("attachment_cleanup_idx").on(t.status, t.createdAt),
  ],
);
export const friendships = pgTable(
  "friendships",
  {
    senderId: text("sender_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    recipientId: text("recipient_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accepted: boolean("accepted").notNull().default(false),
  },
  (t) => [
    primaryKey({ columns: [t.senderId, t.recipientId] }),
    index("friendship_recipient_idx").on(t.recipientId),
  ],
);
export const blocks = pgTable(
  "blocked_users",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    targetId: text("target_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.targetId] }),
    index("blocked_target_idx").on(t.targetId),
  ],
);
export const readStates = pgTable(
  "conversation_read_states",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    conversationId: text("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    readAt: time("read_at"),
  },
  (t) => [primaryKey({ columns: [t.userId, t.conversationId] })],
);
export const notifications = pgTable(
  "notifications",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    actorId: text("actor_id")
      .notNull()
      .references(() => user.id),
    messageId: text("message_id")
      .notNull()
      .references(() => messages.id, { onDelete: "cascade" }),
    type: text("type", { enum: ["mention", "reply", "invite"] }).notNull(),
    read: boolean("read").notNull().default(false),
    createdAt: time("created_at"),
  },
  (t) => [index("notification_user_idx").on(t.userId, t.createdAt)],
);
// Durable, payload-free invalidations. Every refresh rechecks access in Postgres.
export const events = pgTable(
  "app_events",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: time("created_at"),
  },
  (t) => [index("event_user_idx").on(t.userId, t.createdAt)],
);
export const limits = pgTable("request_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  windowStart: time("window_start"),
});

export const avatars = pgTable(
  "avatars",
  {
    id: text("id").primaryKey(),
    uploaderId: text("uploader_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    path: text("path").notNull().unique(),
    uploadId: text("upload_id"),
    contentType: text("content_type").notNull(),
    byteSize: integer("byte_size").notNull(),
    status: text("status", { enum: ["pending", "active", "deleted"] })
      .notNull()
      .default("pending"),
    createdAt: time("created_at"),
  },
  (t) => [
    index("avatars_uploader_idx").on(t.uploaderId),
    uniqueIndex("avatars_active_user_idx")
      .on(t.uploaderId)
      .where(sql`${t.status} = 'active'`),
  ],
);

// Better Auth can load a session and its user in one authorized query.
export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
}));
export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, { fields: [session.userId], references: [user.id] }),
}));
export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, { fields: [account.userId], references: [user.id] }),
}));

export const communityIcons = pgTable(
  "community_icons",
  {
    id: text("id").primaryKey(),
    uploaderId: text("uploader_id").references(() => user.id, {
      onDelete: "set null",
    }),
    communityId: text("community_id").references(() => communities.id, {
      onDelete: "set null",
    }),
    path: text("path").notNull().unique(),
    uploadId: text("upload_id"),
    contentType: text("content_type").notNull(),
    byteSize: integer("byte_size").notNull(),
    status: text("status", { enum: ["pending", "ready", "active", "deleted"] })
      .notNull()
      .default("pending"),
    createdAt: time("created_at"),
  },
  (t) => [
    index("community_icons_uploader_idx").on(t.uploaderId),
    uniqueIndex("community_icons_active_idx")
      .on(t.communityId)
      .where(sql`${t.status} = 'active'`),
  ],
);
