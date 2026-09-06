import { createFileRoute } from "@tanstack/react-router";
import { Conversation } from "../components/app/conversation";
export const Route = createFileRoute("/app/dm/$personId")({
  validateSearch: (search: Record<string, unknown>): { message?: string } => ({
    message: typeof search.message === "string" ? search.message : undefined,
  }),
  component: DirectMessage,
});
function DirectMessage() {
  const { personId } = Route.useParams();
  const { message } = Route.useSearch();
  return <Conversation personId={personId} messageId={message} />;
}
