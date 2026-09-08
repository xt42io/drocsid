import { createFileRoute } from "@tanstack/react-router";
import { InvitePage } from "../components/app/discover-page";

export const Route = createFileRoute("/invite/$code")({
  head: () => ({ meta: [{ title: "You’re invited — Drocsid" }] }),
  component: Page,
});

function Page() {
  const { code } = Route.useParams();
  return <InvitePage code={code} />;
}
