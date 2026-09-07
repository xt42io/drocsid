import { z } from "zod";

const id = z
  .string()
  .min(1)
  .max(160)
  .regex(/^[a-zA-Z0-9_-]+$/);
const key = z.string().min(1).max(350);
export const reactionSelectionSchema = z.object({
  id,
  emoji: z.string().min(1).max(32),
  active: z.boolean(),
});
export const preferencesSchema = z.object({
  theme: z.enum(["light", "dark"]),
  density: z.enum(["comfortable", "compact"]),
  fontSize: z.enum(["default", "large"]),
  notifications: z.boolean(),
  mentions: z.boolean(),
  sounds: z.boolean(),
  directMessages: z.boolean(),
  activity: z.boolean(),
});
export const defaults = preferencesSchema.parse({
  theme: "dark",
  density: "comfortable",
  fontSize: "default",
  notifications: true,
  mentions: true,
  sounds: false,
  directMessages: true,
  activity: true,
});
export const channelSchema = z.object({
  icon: z
    .string()
    .max(32)
    .regex(
      /^(?:\p{Extended_Pictographic}|\p{Regional_Indicator}|[0-9#*]\uFE0F?\u20E3)[\p{Extended_Pictographic}\p{Regional_Indicator}\p{Emoji_Modifier}\uFE0F\u200D\u20E3\u{E0020}-\u{E007F}]*$/u,
    )
    .or(z.literal(""))
    .optional(),
  id,
  name: z
    .string()
    .min(1)
    .max(60)
    .regex(/^[a-z0-9-]+$/),
  description: z.string().max(250),
  group: z.string().min(1).max(60),
  private: z.boolean().optional(),
});
const community = z.object({
  name: z.string().trim().min(2).max(40),
  description: z.string().max(250),
  icon: z.enum([
    "",
    "sun",
    "leaf",
    "coffee",
    "book",
    "game",
    "brush",
    "music",
    "code",
  ]),
  color: z.enum(["peach", "green", "purple", "yellow", "blue"]),
  category: z.string().max(60),
});
export const actionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("dm.request"),
    personId: id,
    operation: z.enum(["accept", "decline"]),
  }),
  z.object({
    type: z.literal("profile"),
    name: z.string().trim().min(2).max(40),
    handle: z
      .string()
      .regex(/^[a-z0-9_]{3,24}$/)
      .refine(
        (v) => !["you", "everyone", "admin"].includes(v),
        "This username is reserved.",
      ),
    color: z.enum(["peach", "green", "purple", "yellow", "blue"]),
    bio: z.string().max(500),
    activity: z.string().max(140),
    status: z.enum(["online", "away", "offline"]),
  }),
  z.object({
    type: z.literal("preferences"),
    preferences: preferencesSchema,
    muted: z.array(key).max(1000),
    onboardingComplete: z.boolean(),
  }),
  z.object({
    type: z.literal("community.create"),
    iconUploadId: z.uuid().optional(),
    id,
    community,
    channels: z.array(channelSchema).min(1).max(20),
  }),
  z.object({ type: z.literal("community.update"), id, community }),
  z.object({ type: z.literal("community.join"), id }),
  z.object({ type: z.literal("community.leave"), id }),
  z.object({
    type: z.literal("category.create"),
    communityId: id,
    name: z.string().trim().min(1).max(60),
  }),
  z.object({
    type: z.literal("channel.put"),
    communityId: id,
    channel: channelSchema,
  }),
  z.object({ type: z.literal("channel.delete"), communityId: id, id }),
  z.object({
    type: z.literal("member.role"),
    communityId: id,
    userId: id,
    role: z.enum(["Admin", "Moderator", "Member"]),
  }),
  z.object({ type: z.literal("member.remove"), communityId: id, userId: id }),
  z.object({
    type: z.literal("channel.access"),
    conversation: key,
    userId: id,
    allow: z.boolean(),
  }),
  z
    .object({
      type: z.literal("message.send"),
      id: z.uuid(),
      conversation: key,
      text: z.string().trim().max(4000),
      threadOf: id.optional(),
      attachments: z.array(z.uuid()).max(10).default([]),
    })
    .refine(
      (v) => v.text.length > 0 || v.attachments.length > 0,
      "Write a message or attach a file.",
    ),
  z.object({
    type: z.literal("message.update"),
    id,
    text: z.string().trim().min(1).max(4000).optional(),
    pinned: z.boolean().optional(),
    saved: z.boolean().optional(),
  }),
  z.object({ type: z.literal("message.delete"), id }),
  z.object({
    type: z.literal("reaction"),
    id,
    emoji: z.string().min(1).max(32),
  }),
  z.object({
    type: z.literal("friend"),
    id,
    operation: z.enum([
      "request",
      "accept",
      "decline",
      "cancel",
      "remove",
      "block",
      "unblock",
    ]),
  }),
  z.object({
    type: z.literal("notification.read"),
    ids: z.array(id).max(500),
    read: z.boolean(),
  }),
  z.object({
    type: z.literal("conversation.read"),
    conversation: key,
    through: z.iso.datetime(),
  }),
  z.object({ type: z.literal("conversation.open"), conversation: key }),
]);
export type Action = z.infer<typeof actionSchema>;
export const uploadSchema = z.object({
  conversation: key,
  filename: z.string().min(1).max(240),
  contentType: z.string().min(1).max(150),
  byteSize: z
    .number()
    .int()
    .min(1)
    .max(25 * 1024 * 1024),
});
