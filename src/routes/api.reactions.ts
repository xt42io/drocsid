import { createFileRoute } from "@tanstack/react-router";
import { reactionSelectionSchema } from "../lib/contracts";
import { getDb } from "../server/db";
import { setReaction } from "../server/reactions";
import {
  endpoint,
  json,
  readJson,
  requireOrigin,
  requireUser,
} from "../server/http";

export const Route = createFileRoute("/api/reactions")({
  server: {
    handlers: {
      POST: ({ request }) =>
        endpoint(async () => {
          requireOrigin(request);
          const input = reactionSelectionSchema.parse(await readJson(request));
          const start = performance.now();
          const viewer = await requireUser(request);
          const authenticated = performance.now();
          const result = await setReaction(getDb(), viewer.id, input);
          const response = json(result);
          response.headers.set(
            "Server-Timing",
            `auth;dur=${(authenticated - start).toFixed(1)}, write;dur=${(performance.now() - authenticated).toFixed(1)}`,
          );
          return response;
        }),
    },
  },
});
