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
          return json(
            input.type === "prepare"
              ? await prepareUpload(db, viewer.id, input)
              : input.type === "discard"
                ? await discardUpload(db, viewer.id, input.id)
                : await completeUpload(db, viewer.id, input.id),
          );
        }),
    },
  },
});
