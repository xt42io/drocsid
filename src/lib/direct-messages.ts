import type { AppState } from "../types/app";

export function incomingMessageRequests(state: AppState) {
  return state.dmConversations.filter(
    (d) =>
      d.incoming &&
      d.status === "pending" &&
      d.hasMessages &&
      !state.blocked.includes(d.personId),
  );
}
export function normalDirectMessages(state: AppState) {
  return state.people.filter((person) => {
    const dm = state.dmConversations.find((d) => d.personId === person.id);
    if (
      !dm ||
      state.blocked.includes(person.id) ||
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
