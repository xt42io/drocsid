import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useApp } from "../lib/app-state";
export const Route = createFileRoute("/app/")({ component: AppHome });
function AppHome() {
  const { state, ready } = useApp();
  const community = state.communities.find((c) => c.joined);
  if (!ready)
    return (
      <div
        data-ui="a-loading"
        className="h-full flex justify-center items-center text-(--a-muted) text-[14px]"
      >
        Finding your little corner…
      </div>
    );
  if (!state.onboardingComplete) return <Navigate to="/app/welcome" />;
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
