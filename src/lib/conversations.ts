import type { AppState } from "../types/app";

export function conversationLabel(key: string, state: AppState) {
  const [communityId, channelId] = key.split(":");
  if (communityId === "dm")
    return (
      state.people.find((p) => p.id === channelId)?.name ?? "Direct message"
    );
  const community = state.communities.find((c) => c.id === communityId);
  return `${community?.name ?? "Community"} / #${community?.channels.find((c) => c.id === channelId)?.name ?? channelId}`;
}
