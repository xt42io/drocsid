import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { getDb } from "../server/db";
import { uploadSchema } from "../lib/contracts";
import {
  completeUpload,
  prepareUpload,
  discardUpload,
} from "../server/uploads";
import {
  endpoint,
  json,
  readJson,
  requireOrigin,
  requireUser,
} from "../server/http";
import { takeLimit } from "../server/access";
import { getPostHogClient } from "../lib/posthog-server";
export const Route = createFileRoute("/api/uploads")({
  server: {
    handlers: {
      POST: ({ request }) =>
        endpoint(async () => {
          requireOrigin(request);
          const viewer = await requireUser(request);
          const db = getDb();
          await takeLimit(db, viewer.id, "uploads", 30);
          const input = z
            .discriminatedUnion("type", [
              uploadSchema.extend({ type: z.literal("prepare") }),
              z.object({ type: z.literal("complete"), id: z.uuid() }),
              z.object({ type: z.literal("discard"), id: z.uuid() }),
            ])
            .parse(await readJson(request));
          const result =
            input.type === "prepare"
              ? await prepareUpload(db, viewer.id, input)
              : input.type === "discard"
                ? await discardUpload(db, viewer.id, input.id)
                : await completeUpload(db, viewer.id, input.id);
          if (input.type === "complete") {
            const posthog = getPostHogClient();
            if (posthog) {
              const sessionId = request.headers.get("X-PostHog-Session-Id");
              posthog.capture({
                distinctId: viewer.id,
                event: "file_uploaded",
                properties: {
                  $session_id: sessionId || undefined,
                  upload_id: input.id,
                },
              });
              await posthog.flush();
            }
          }
          return json(result);
        }),
    },
  },
});
