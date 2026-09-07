import type { AppState } from "../types/app";

export function incomingMessageRequests(state: AppState) {
  return state.dmConversations.filter(
    (d) => d.incoming && d.status === "pending" && d.hasMessages,
  );
}
export function normalDirectMessages(state: AppState) {
  return state.people.filter((person) => {
    const dm = state.dmConversations.find((d) => d.personId === person.id);
    if (
      !dm ||
      dm.status === "declined" ||
      (dm.incoming && dm.status === "pending")
    )
      return false;
    return (
      dm.hasMessages ||
      state.messages.some((m) => m.conversation === `dm:${person.id}`)
    );
  });
}

export function dmMessagingBlocked(state: AppState, personId: string) {
  return (
    state.blocked.includes(personId) ||
    !!state.dmConversations.find((d) => d.personId === personId)
      ?.messagingBlocked
  );
}

export function dmReadOnly(state: AppState, conversation: string) {
  if (!conversation.startsWith("dm:")) return false;
  const personId = conversation.slice(3);
  const dm = state.dmConversations.find((d) => d.personId === personId);
  return (
    dmMessagingBlocked(state, personId) ||
    dm?.status === "declined" ||
    !!(dm?.incoming && dm.status === "pending")
  );
}
