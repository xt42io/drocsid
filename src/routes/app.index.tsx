import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useApp } from "../lib/app-state";
export const Route = createFileRoute("/app/")({ component: AppHome });
function AppHome() {
  const { state, ready } = useApp();
  const community = state.communities.find((c) => c.joined);
  if (!ready)
    return <div className="a-loading">Finding your little corner…</div>;
  return community ? (
    <Navigate
      to="/app/community/$communityId/$channelId"
      params={{
        communityId: community.id,
        channelId: community.channels.some((c) => c.id === "general")
          ? "general"
          : (community.channels[0]?.id ?? "general"),
      }}
    />
  ) : (
    <Navigate to="/app/discover" />
  );
}
