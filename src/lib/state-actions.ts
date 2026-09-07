import type { Action } from "./contracts";
import type { Community, AppState } from "../types/app";
const changed = (a: unknown, b: unknown) =>
  JSON.stringify(a) !== JSON.stringify(b);
const details = (c: Community) => ({
  name: c.name,
  description: c.description,
  icon: c.icon,
  color: c.color as "peach",
  category: c.category,
});
// Translate UI edits into narrow commands; the server never accepts arbitrary state.
export function stateActions(previous: AppState, next: AppState): Action[] {
  const actions: Action[] = [];
  if (changed(previous.profile, next.profile)) {
    const { name, handle, color, bio, activity, status } = next.profile;
    actions.push({
      type: "profile",
      name,
      handle,
      color: color as "peach",
      bio,
      activity,
      status,
    });
  }
  if (
    changed(previous.preferences, next.preferences) ||
    changed(previous.muted, next.muted) ||
    previous.onboardingComplete !== next.onboardingComplete
  )
    actions.push({
      type: "preferences",
      preferences: next.preferences,
      muted: next.muted,
      onboardingComplete: next.onboardingComplete,
    });
  for (const c of next.communities) {
    const old = previous.communities.find((p) => p.id === c.id);
    if (!old) {
      actions.push({
        type: "community.create",
        id: c.id,
        community: details(c),
        channels: c.channels,
      });
      continue;
    }
    if (old.joined !== c.joined)
      actions.push({
        type: c.joined ? "community.join" : "community.leave",
        id: c.id,
      });
    if (changed(details(old), details(c)))
      actions.push({
        type: "community.update",
        id: c.id,
        community: details(c),
      });
    for (const group of c.channelCategories ?? [])
      if (!old.channelCategories?.includes(group))
        actions.push({
          type: "category.create",
          communityId: c.id,
          name: group,
        });
    for (const channel of c.channels) {
      const before = old.channels.find((ch) => ch.id === channel.id);
      const detail = ({
        id,
        name,
        description,
        group,
        private: isPrivate,
      }: typeof channel) => ({
        id,
        name,
        description,
        group,
        private: isPrivate,
      });
      if (!before || changed(detail(before), detail(channel)))
        actions.push({
          type: "channel.put",
          communityId: c.id,
          channel: detail(channel),
        });
    }
    for (const channel of old.channels)
      if (!c.channels.some((ch) => ch.id === channel.id))
        actions.push({
          type: "channel.delete",
          communityId: c.id,
          id: channel.id,
        });
  }
  for (const id of next.blocked)
    if (!previous.blocked.includes(id))
      actions.push({ type: "friend", id, operation: "block" });
  for (const id of previous.blocked)
    if (!next.blocked.includes(id))
      actions.push({ type: "friend", id, operation: "unblock" });
  for (const id of next.friends)
    if (!previous.friends.includes(id))
      actions.push({ type: "friend", id, operation: "accept" });
  for (const id of previous.friends)
    if (!next.friends.includes(id) && !next.blocked.includes(id))
      actions.push({ type: "friend", id, operation: "remove" });
  for (const id of next.outgoing)
    if (!previous.outgoing.includes(id))
      actions.push({ type: "friend", id, operation: "request" });
  for (const id of previous.outgoing)
    if (!next.outgoing.includes(id) && !next.blocked.includes(id))
      actions.push({ type: "friend", id, operation: "cancel" });
  for (const id of previous.pending)
    if (
      !next.pending.includes(id) &&
      !next.friends.includes(id) &&
      !next.blocked.includes(id)
    )
      actions.push({ type: "friend", id, operation: "decline" });
  for (const read of [true, false]) {
    const ids = next.activities
      .filter(
        (a) =>
          a.read === read &&
          previous.activities.find((p) => p.id === a.id)?.read !== read,
      )
      .map((a) => a.id);
    if (ids.length) actions.push({ type: "notification.read", ids, read });
  }
  return actions;
}
