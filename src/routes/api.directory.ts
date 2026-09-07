import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { getDb } from "../server/db";
import { directory } from "../server/directory";
import { endpoint, json, requireUser } from "../server/http";
const input = z.object({
  kind: z.enum(["people", "communities"]),
  query: z.string().max(200).default(""),
  category: z.string().max(60).optional(),
  id: z.string().max(160).optional(),
  offset: z.coerce.number().int().min(0).max(100000).default(0),
});
export const Route = createFileRoute("/api/directory")({
  server: {
    handlers: {
      GET: ({ request }) =>
        endpoint(async () => {
          const viewer = await requireUser(request);
          const params = input.parse(
            Object.fromEntries(new URL(request.url).searchParams),
          );
          return json(await directory(getDb(), viewer.id, params));
        }),
    },
  },
});
