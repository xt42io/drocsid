import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { getDb } from "../server/db";
import {
  avatarSchema,
  prepareAvatar,
  completeAvatar,
  discardAvatar,
  removeAvatar,
} from "../server/avatars";
import {
  endpoint,
  json,
  readJson,
  requireOrigin,
  requireUser,
} from "../server/http";
import { takeLimit } from "../server/access";

export const Route = createFileRoute("/api/avatars")({
  server: {
    handlers: {
      POST: ({ request }) =>
        endpoint(async () => {
          requireOrigin(request);
          const viewer = await requireUser(request);
          const db = getDb();
          await takeLimit(db, viewer.id, "avatars", 30);
          const input = z
            .discriminatedUnion("type", [
              avatarSchema.extend({ type: z.literal("prepare") }),
              z.object({ type: z.literal("complete"), id: z.uuid() }),
              z.object({ type: z.literal("discard"), id: z.uuid() }),
              z.object({ type: z.literal("remove") }),
            ])
            .parse(await readJson(request));
          return json(
            input.type === "prepare"
              ? await prepareAvatar(db, viewer.id, input)
              : input.type === "complete"
                ? await completeAvatar(db, viewer.id, input.id)
                : input.type === "discard"
                  ? await discardAvatar(db, viewer.id, input.id)
                  : await removeAvatar(db, viewer.id),
          );
        }),
    },
  },
});
