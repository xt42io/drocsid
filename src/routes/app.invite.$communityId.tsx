import { createFileRoute } from "@tanstack/react-router";
import { InvitePage } from "../components/app/discover-page";
export const Route = createFileRoute("/app/invite/$communityId")({
  head: () => ({ meta: [{ title: "You’re invited — Drocsid" }] }),
  component: Page,
});
function Page() {
  const { communityId } = Route.useParams();
  return <InvitePage communityId={communityId} />;
}
