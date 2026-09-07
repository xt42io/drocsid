import type { Message, Reaction } from "../types/app";

export type ReactionSelection = { id: string; emoji: string; active: boolean };
export type ReactionResult = ReactionSelection & { count: number };

export function replaceReaction(messages: Message[], result: ReactionResult) {
  return messages.map((message) => {
    if (message.id !== result.id) return message;
    const reaction = {
      emoji: result.emoji,
      count: result.count,
      mine: result.active,
    };
    const exists = message.reactions.some((r) => r.emoji === result.emoji);
    const reactions = message.reactions.flatMap((r) =>
      r.emoji === result.emoji ? (result.count > 0 ? [reaction] : []) : [r],
    );
    if (!exists && result.count > 0) reactions.push(reaction);
    return { ...message, reactions };
  });
}

type Pending = ReactionSelection & { base?: Reaction; observed: number };
const key = (id: string, emoji: string) => JSON.stringify([id, emoji]);

// Each emoji has its own in-flight request. Rapid clicks only change the desired
// selection; other reactions and unrelated app actions never wait behind it.
export class PendingReactions {
  private entries = new Map<string, Pending>();

  toggle(message: Message, emoji: string) {
    const k = key(message.id, emoji);
    const previous = this.entries.get(k);
    const base = message.reactions.find((r) => r.emoji === emoji);
    this.entries.set(
      k,
      previous
        ? { ...previous, active: !previous.active }
        : { id: message.id, emoji, active: !base?.mine, base, observed: 0 },
    );
    return !previous;
  }
  next(id: string, emoji: string) {
    const entry = this.entries.get(key(id, emoji));
    return entry
      ? { id, emoji, active: entry.active, observed: entry.observed }
      : undefined;
  }
  observe(messages: Message[]) {
    for (const entry of this.entries.values()) {
      const message = messages.find((m) => m.id === entry.id);
      if (message) {
        entry.base = message.reactions.find((r) => r.emoji === entry.emoji);
        entry.observed++;
      }
    }
  }
  overlay(messages: Message[]) {
    for (const entry of this.entries.values()) {
      const base = entry.base;
      messages = replaceReaction(messages, {
        ...entry,
        count: Math.max(
          0,
          (base?.count ?? 0) - (base?.mine ? 1 : 0) + (entry.active ? 1 : 0),
        ),
      });
    }
    return messages;
  }
  acknowledge(result: ReactionResult, observed: number) {
    const k = key(result.id, result.emoji);
    const entry = this.entries.get(k);
    if (!entry) return result;
    // A live update may already include this write plus someone else's reaction.
    if (entry.observed > observed && !!entry.base?.mine === result.active)
      result = { ...result, count: entry.base?.count ?? 0 };
    entry.base = {
      emoji: result.emoji,
      count: result.count,
      mine: result.active,
    };
    if (entry.active === result.active) this.entries.delete(k);
    return result;
  }
  reject(id: string, emoji: string): ReactionResult {
    const entry = this.entries.get(key(id, emoji));
    this.entries.delete(key(id, emoji));
    return {
      id,
      emoji,
      active: !!entry?.base?.mine,
      count: entry?.base?.count ?? 0,
    };
  }
}
