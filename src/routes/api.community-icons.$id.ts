import { createFileRoute } from "@tanstack/react-router";
import { getDb } from "../server/db";
import { communityIconResponse } from "../server/community-icons";
import { imageVariant } from "../server/media-images";
import { endpoint, requireUser } from "../server/http";
export const Route = createFileRoute("/api/community-icons/$id")({
  server: {
    handlers: {
      GET: ({ request, params }) =>
        endpoint(async () => {
          await requireUser(request);
          return communityIconResponse(
            getDb(),
            params.id,
            undefined,
            imageVariant(request, "avatar"),
            request,
          );
        }),
    },
  },
});
