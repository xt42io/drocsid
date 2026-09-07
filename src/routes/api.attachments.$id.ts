import { imageVariant } from "../server/media-images";
import { createFileRoute } from "@tanstack/react-router";
import { getDb } from "../server/db";
import { attachmentResponse } from "../server/uploads";
import { endpoint, requireUser } from "../server/http";
export const Route = createFileRoute("/api/attachments/$id")({
  server: {
    handlers: {
      GET: ({ request, params }) =>
        endpoint(async () =>
          attachmentResponse(
            getDb(),
            (await requireUser(request)).id,
            params.id,
            undefined,
            imageVariant(request, "chat"),
          ),
        ),
    },
  },
});
