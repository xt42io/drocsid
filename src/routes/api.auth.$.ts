import { createFileRoute } from "@tanstack/react-router";
import { getAuth } from "../server/auth";
import { endpoint, json } from "../server/http";
export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: ({ request }) => endpoint(() => getAuth().handler(request)),
      POST: ({ request }) =>
        endpoint(async () => {
          if (
            new URL(request.url).pathname.endsWith("/request-password-reset") &&
            !(process.env.SMTP_URL && process.env.SMTP_FROM)
          ) {
            return json(
              {
                message:
                  "Password recovery is not configured on this server yet.",
              },
              503,
            );
          }
          return getAuth().handler(request);
        }),
    },
  },
});
