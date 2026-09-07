import { createFileRoute } from "@tanstack/react-router";
import { MessageRequestsPage } from "../components/app/message-requests";
export const Route = createFileRoute("/app/requests")({
  head: () => ({ meta: [{ title: "Message requests — drocsid" }] }),
  component: MessageRequestsPage,
});
