import { createFileRoute } from "@tanstack/react-router";
import { FriendsPage } from "../components/app/friends-page";
export const Route = createFileRoute("/app/friends")({
  head: () => ({ meta: [{ title: "Good company — drocsid" }] }),
  component: FriendsPage,
});
