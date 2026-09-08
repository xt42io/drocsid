import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { takeLimit } from "../server/access";
import { getDb } from "../server/db";
import { createInvite } from "../server/invites";
import {
  endpoint,
  json,
  readJson,
  requireOrigin,
  requireUser,
} from "../server/http";

export const Route = createFileRoute("/api/invites")({
  server: {
    handlers: {
      POST: ({ request }) =>
        endpoint(async () => {
          requireOrigin(request);
          const viewer = await requireUser(request);
          const input = z
            .object({ communityId: z.string().min(1).max(160) })
            .parse(await readJson(request));
          const db = getDb();
          await takeLimit(db, viewer.id, "invite-create", 30);
          return json(await createInvite(db, viewer.id, input.communityId));
        }),
    },
  },
});
