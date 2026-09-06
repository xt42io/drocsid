import { createFileRoute } from "@tanstack/react-router";
import { DiscoverPage } from "../components/app/discover-page";
export const Route = createFileRoute("/app/discover")({
  head: () => ({ meta: [{ title: "Find your people — drocsid" }] }),
  component: DiscoverPage,
});
