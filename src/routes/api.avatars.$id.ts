import { createFileRoute } from "@tanstack/react-router";
import { getDb } from "../server/db";
import { avatarResponse } from "../server/avatars";
import { endpoint, requireUser } from "../server/http";

export const Route = createFileRoute("/api/avatars/$id")({
  server: {
    handlers: {
      GET: ({ request, params }) =>
        endpoint(async () => {
          await requireUser(request);
          return avatarResponse(getDb(), params.id);
        }),
    },
  },
});
