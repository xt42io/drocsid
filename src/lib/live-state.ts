import type { AppState } from "../types/app";
import type { MessageUpdate } from "./realtime-protocol";

export function applyLiveMessage(
  state: AppState,
  update: MessageUpdate,
): AppState {
  let messages = state.messages.filter(
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
  let dmConversations = state.dmConversations;
  if (update.dmConversation) {
    const incoming = update.dmConversation;
    const previous = dmConversations.find(
      (d) => d.personId === incoming.personId,
    );
    // Decisions are monotonic: only an explicit friendship can turn declined into accepted.
    // A delayed pre-decision message frame must not reopen a request or undo acceptance.
    const rank = { pending: 0, declined: 1, accepted: 2 };
    const decision =
      previous && rank[previous.status] > rank[incoming.status]
        ? { ...incoming, status: previous.status }
        : incoming;
    dmConversations = [
      ...dmConversations.filter((d) => d.personId !== incoming.personId),
      decision,
    ];
    if (decision.incoming && decision.status === "declined")
      messages = messages.filter(
        (m) => m.conversation !== `dm:${decision.personId}`,
      );
  }
  return { ...state, messages, people, communities, dmConversations };
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
