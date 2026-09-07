import { createFileRoute } from "@tanstack/react-router";
import { getDb } from "../server/db";
import { messagePage, searchMessages } from "../server/queries";
import { endpoint, HttpError, json, requireUser } from "../server/http";
export const Route = createFileRoute("/api/messages")({
  server: {
    handlers: {
      GET: ({ request }) =>
        endpoint(async () => {
          const viewer = await requireUser(request);
          const params = new URL(request.url).searchParams;
          const q = params.get("q");
          if (q !== null)
            return json({
              messages: await searchMessages(
                getDb(),
                viewer.id,
                q.slice(0, 200),
              ),
            });
          const conversation = params.get("conversation");
          if (!conversation || conversation.length > 350)
            throw new HttpError(400, "Choose a conversation.");
          return json(
            await messagePage(
              getDb(),
              viewer.id,
              conversation,
              params.get("before") || undefined,
              params.get("target") || undefined,
            ),
          );
        }),
    },
  },
});
