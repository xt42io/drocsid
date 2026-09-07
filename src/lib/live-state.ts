import type { AppState } from "../types/app";
import type { MessageUpdate } from "./realtime-protocol";

export function applyLiveMessage(
  state: AppState,
  update: MessageUpdate,
): AppState {
  const messages = state.messages.filter(
    (m) =>
      m.id !== update.id &&
      (update.message !== null || m.threadOf !== update.id),
  );
  if (update.message) messages.push(update.message);
  messages.sort(
    (a, b) =>
      (a.createdAt ?? "").localeCompare(b.createdAt ?? "") ||
      a.id.localeCompare(b.id),
  );
  const person = update.person;
  const people =
    !person || person.id === "you"
      ? state.people
      : [
          ...state.people.filter((p) => p.id !== person.id),
          // Presence has its own socket updates. A delayed DB heartbeat must not replace it.
          {
            ...person,
            status:
              state.people.find((p) => p.id === person.id)?.status ??
              person.status,
          },
        ];
  const communities =
    update.conversation && update.unread !== undefined
      ? state.communities.map((c) => ({
          ...c,
          channels: c.channels.map((ch) =>
            `${c.id}:${ch.id}` === update.conversation
              ? { ...ch, unread: update.unread }
              : ch,
          ),
        }))
      : state.communities;
  return { ...state, messages, people, communities };
}

export function applyLiveRead(
  state: AppState,
  conversation: string,
  through: string,
): AppState {
  const unread = state.messages.filter(
    (m) =>
      m.conversation === conversation &&
      m.author !== "you" &&
      (m.createdAt ?? "") > new Date(through).toISOString(),
  ).length;
  return {
    ...state,
    communities: state.communities.map((c) => ({
      ...c,
      channels: c.channels.map((ch) =>
        `${c.id}:${ch.id}` === conversation ? { ...ch, unread } : ch,
      ),
    })),
  };
}
