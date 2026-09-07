import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { sql } from "drizzle-orm";
import { getDb, type Database } from "../server/db";
import { events, user } from "../server/db/schema";
import { actionSchema } from "../lib/contracts";
import { mutate } from "../server/actions";
import { snapshot } from "../server/queries";
import { ensureProfile, takeLimit } from "../server/access";
import {
  endpoint,
  json,
  readJson,
  requireOrigin,
  requireUser,
} from "../server/http";

export const Route = createFileRoute("/api/app")({
  server: {
    handlers: {
      GET: ({ request }) =>
        endpoint(async () =>
          json(
            await snapshot(
              getDb(),
              await requireUser(request),
              Number(new URL(request.url).searchParams.get("limit")) || 500,
            ),
          ),
        ),
      POST: ({ request }) =>
        endpoint(async () => {
          requireOrigin(request);
          const viewer = await requireUser(request);
          const actions = z
            .array(actionSchema)
            .min(1)
            .max(50)
            .parse(await readJson(request));
          const db = getDb();
          await ensureProfile(db, viewer);
          await takeLimit(db, viewer.id, "actions", 120);
          await db.transaction(async (tx) => {
            // Serialize actions from multiple tabs for the same account.
            await tx.execute(
              sql`select pg_advisory_xact_lock(hashtext(${viewer.id}))`,
            );
            for (const action of actions)
              await mutate(tx as unknown as Database, viewer.id, action);
            // Message triggers deliver narrow updates; reads don't need a full snapshot.
            if (
              actions.every((action) =>
                [
                  "message.send",
                  "message.update",
                  "message.delete",
                  "reaction",
                  "conversation.read",
                ].includes(action.type),
              )
            )
              return;
            // Payload-free invalidation for this small, single-service release. Reads always reauthorize.
            const onlyPersonal = actions.every((action) =>
              ["conversation.read", "notification.read"].includes(action.type),
            );
            const recipients = onlyPersonal
              ? [{ id: viewer.id }]
              : await tx.select({ id: user.id }).from(user);
            if (recipients.length)
              await tx.insert(events).values(
                recipients.map((r) => ({
                  id: crypto.randomUUID(),
                  userId: r.id,
                })),
              );
          });
          return json({ ok: true });
        }),
    },
  },
});
