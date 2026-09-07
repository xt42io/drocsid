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
import { getPostHogClient } from "../lib/posthog-server";

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
          if (input.active) {
            const posthog = getPostHogClient();
            if (posthog) {
              const sessionId = request.headers.get("X-PostHog-Session-Id");
              posthog.capture({
                distinctId: viewer.id,
                event: "reaction_added",
                properties: {
                  $session_id: sessionId || undefined,
                  emoji: input.emoji,
                  message_id: input.id,
                },
              });
              await posthog.flush();
            }
          }
          return response;
        }),
    },
  },
});
