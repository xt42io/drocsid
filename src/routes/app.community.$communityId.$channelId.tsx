import { createFileRoute } from "@tanstack/react-router";
import { Conversation } from "../components/app/conversation";
export const Route = createFileRoute("/app/community/$communityId/$channelId")({
  validateSearch: (search: Record<string, unknown>): { message?: string } => ({
    message: typeof search.message === "string" ? search.message : undefined,
  }),
  component: ChannelPage,
});
function ChannelPage() {
  const { communityId, channelId } = Route.useParams();
  const { message } = Route.useSearch();
  return (
    <Conversation
      communityId={communityId}
      channelId={channelId}
      messageId={message}
    />
  );
}
