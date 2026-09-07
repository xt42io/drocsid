import { createFileRoute } from "@tanstack/react-router";
import { endpoint, json, requireUser } from "../server/http";
import { getDb } from "../server/db";
import { takeLimit } from "../server/access";
import { usernameAvailability } from "../server/usernames";

export const Route = createFileRoute("/api/username")({
  server: {
    handlers: {
      GET: ({ request }) =>
        endpoint(async () => {
          const user = await requireUser(request);
          const db = getDb();
          await takeLimit(db, user.id, "username-check", 120);
          const username =
            new URL(request.url).searchParams.get("username") || "";
          return json(await usernameAvailability(db, user.id, username));
        }),
    },
  },
});
