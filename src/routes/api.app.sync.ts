import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { getDb } from "../server/db";
import { snapshot } from "../server/queries";
import {
  endpoint,
  json,
  readJson,
  requireOrigin,
  requireUser,
} from "../server/http";
const input = z.object({ ids: z.array(z.string().min(1).max(160)).max(5000) });
export const Route = createFileRoute("/api/app/sync")({
  server: {
    handlers: {
      POST: ({ request }) =>
        endpoint(async () => {
          requireOrigin(request);
          const viewer = await requireUser(request);
          const { ids } = input.parse(await readJson(request, 1_000_000));
          return json(await snapshot(getDb(), viewer, 500, ids));
        }),
    },
  },
});
