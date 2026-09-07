import type { AppState, Message } from "../types/app";

export function enqueueMessage(state: AppState, message: Message): AppState {
  const draftKey = message.threadOf
    ? `thread:${message.threadOf}`
    : message.conversation;
  return {
    ...state,
    messages: [...state.messages, message],
    drafts: { ...state.drafts, [draftKey]: "" },
  };
}

// Settle this ID in place. Another send or a newer draft must remain untouched.
export function replaceMessage(
  state: AppState,
  id: string,
  message: Message | null,
): AppState {
  return {
    ...state,
    messages: state.messages.flatMap((existing) =>
      existing.id === id ? (message ? [message] : []) : [existing],
    ),
  };
}

// Keep local sends through stale snapshots; a server copy acknowledges that ID.
export function reconcileMessages(
  remote: Message[],
  local: Map<string, Message>,
) {
  for (const message of remote) local.delete(message.id);
  return [...remote, ...local.values()].sort(
    (a, b) =>
      (a.createdAt ?? "").localeCompare(b.createdAt ?? "") ||
      a.id.localeCompare(b.id),
  );
}
