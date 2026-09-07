import { createFileRoute } from "@tanstack/react-router";
import { getAuth } from "../server/auth";
import { endpoint } from "../server/http";
export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: ({ request }) => endpoint(() => getAuth().handler(request)),
      POST: ({ request }) =>
        endpoint(async () => {
          return getAuth().handler(request);
        }),
    },
  },
});
