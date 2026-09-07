import { z } from "zod";
import { actionSchema } from "./contracts";
import type { Message, Person, Presence } from "../types/app";

export const TYPING_TTL = 5000;
export const TYPING_INTERVAL = 2000;
const room = {
  conversation: z.string().min(1).max(350),
  threadOf: z.string().min(1).max(160).optional(),
};
export const clientFrameSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("watch"), rooms: z.array(z.object(room)).max(2) }),
  z.object({ type: z.literal("typing"), ...room, active: z.boolean() }),
  z.object({
    type: z.literal("send"),
    requestId: z.string().uuid(),
    action: actionSchema,
  }),
]);
export type Room = { conversation: string; threadOf?: string };
export const roomKey = (room: Room) =>
  JSON.stringify([room.conversation, room.threadOf ?? null]);
export type TypingPerson = Room & {
  userId: string;
  name: string;
  expiresAt: number;
};
export type MessageUpdate = {
  type: "message";
  id: string;
  message: Message | null;
  person?: Person;
  conversation?: string;
  unread?: number;
};
export type ServerFrame =
  | { type: "ready" }
  | { type: "invalidate" }
  | { type: "watched" }
  | { type: "read"; conversation: string; through: string }
  | MessageUpdate
  | { type: "typing"; people: TypingPerson[] }
  | { type: "presence"; userId: string; status: Presence }
  | { type: "ack"; requestId: string; message: Message | null }
  | { type: "error"; requestId?: string; status: number; error: string };
