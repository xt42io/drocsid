import { createFileRoute } from "@tanstack/react-router";
import { InboxPage } from "../components/app/inbox-page";
export const Route = createFileRoute("/app/inbox")({
  head: () => ({ meta: [{ title: "Your inbox — drocsid" }] }),
  component: InboxPage,
});
