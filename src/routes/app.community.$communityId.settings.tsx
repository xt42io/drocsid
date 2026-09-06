import { createFileRoute } from "@tanstack/react-router";
import { CommunitySettings } from "../components/app/community-settings";
export const Route = createFileRoute("/app/community/$communityId/settings")({
  component: Page,
});
function Page() {
  const { communityId } = Route.useParams();
  return <CommunitySettings key={communityId} communityId={communityId} />;
}
