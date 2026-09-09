import { createFileRoute } from "@tanstack/react-router";
import { getDb } from "../server/db";
import { communityIconResponse } from "../server/community-icons";
import { imageVariant } from "../server/media-images";
import { endpoint } from "../server/http";
export const Route = createFileRoute("/api/community-icons/$id")({
  server: {
    handlers: {
      GET: ({ request, params }) =>
        endpoint(async () => {
          return communityIconResponse(
            getDb(),
            params.id,
            undefined,
            imageVariant(request, "community"),
            request,
          );
        }),
    },
  },
});
