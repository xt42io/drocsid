import { shallowEqual } from "./selection-store";
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
  let people = state.people;
  if (person && person.id !== "you") {
    const previous = people.find((p) => p.id === person.id);
    const next = { ...person, status: previous?.status ?? person.status };
    if (!shallowEqual(previous, next))
      people = previous
        ? people.map((p) => (p.id === next.id ? next : p))
        : [...people, next];
  }
  const communities =
    update.conversation && update.unread !== undefined
      ? updateUnread(state.communities, update.conversation, update.unread)
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
      // Block/unblock changes arrive in authoritative snapshots. A late message
      // frame must not re-enable the composer after a block has been applied.
      {
        ...decision,
        messagingBlocked: !!(
          previous?.messagingBlocked || decision.messagingBlocked
        ),
      },
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
    communities: updateUnread(state.communities, conversation, unread),
    dmConversations: updateDirectUnread(
      state.dmConversations,
      state.messages,
      conversation,
      through,
    ),
  };
}

function updateDirectUnread(
  conversations: AppState["dmConversations"],
  messages: AppState["messages"],
  conversation: string,
  through: string,
) {
  const index = conversations.findIndex(
    (dm) =>
      dm.conversation === conversation || `dm:${dm.personId}` === conversation,
  );
  if (index < 0) return conversations;
  const dm = conversations[index];
  const cursor = new Date(through).toISOString();
  const unread = messages.filter(
    (message) =>
      message.conversation === `dm:${dm.personId}` &&
      message.author !== "you" &&
      (message.createdAt ?? "") > cursor,
  ).length;
  if (dm.unread === unread) return conversations;
  return conversations.map((item, itemIndex) =>
    itemIndex === index ? { ...item, unread } : item,
  );
}

function updateUnread(
  communities: AppState["communities"],
  conversation: string,
  unread: number,
) {
  const index = communities.findIndex((c) =>
    c.channels.some(
      (ch) => `${c.id}:${ch.id}` === conversation && ch.unread !== unread,
    ),
  );
  if (index < 0) return communities;
  return communities.map((c, i) =>
    i !== index
      ? c
      : {
          ...c,
          channels: c.channels.map((ch) =>
            `${c.id}:${ch.id}` === conversation ? { ...ch, unread } : ch,
          ),
        },
  );
}
