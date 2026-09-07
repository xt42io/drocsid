import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { getDb } from "../server/db";
import { takeLimit } from "../server/access";
import {
  communityIconSchema,
  prepareCommunityIcon,
  completeCommunityIcon,
  discardCommunityIcon,
  removeCommunityIcon,
} from "../server/community-icons";
import {
  endpoint,
  json,
  readJson,
  requireOrigin,
  requireUser,
} from "../server/http";
export const Route = createFileRoute("/api/community-icons")({
  server: {
    handlers: {
      POST: ({ request }) =>
        endpoint(async () => {
          requireOrigin(request);
          const viewer = await requireUser(request);
          const db = getDb();
          await takeLimit(db, viewer.id, "community-icons", 30);
          const input = z
            .discriminatedUnion("type", [
              communityIconSchema.extend({
                type: z.literal("prepare"),
                communityId: z.string().min(1).max(160).optional(),
              }),
              z.object({ type: z.literal("complete"), id: z.uuid() }),
              z.object({ type: z.literal("discard"), id: z.uuid() }),
              z.object({
                type: z.literal("remove"),
                communityId: z.string().min(1).max(160),
              }),
            ])
            .parse(await readJson(request));
          return json(
            input.type === "prepare"
              ? await prepareCommunityIcon(db, viewer.id, input)
              : input.type === "complete"
                ? await completeCommunityIcon(db, viewer.id, input.id)
                : input.type === "discard"
                  ? await discardCommunityIcon(db, viewer.id, input.id)
                  : await removeCommunityIcon(db, viewer.id, input.communityId),
          );
        }),
    },
  },
});
