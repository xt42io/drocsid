import { createFileRoute } from "@tanstack/react-router";
import { endpoint, json, requireUser } from "../server/http";
export const Route = createFileRoute("/api/session")({
  server: {
    handlers: {
      GET: ({ request }) =>
        endpoint(async () => json({ user: await requireUser(request) })),
    },
  },
});
