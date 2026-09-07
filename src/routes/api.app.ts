import { fastAction } from "../server/fast-actions";
import { invalidateActions } from "../server/invalidation";
import { markRead } from "../server/read-state";
import { actionScope } from "../lib/action-scope";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { sql } from "drizzle-orm";
import { getDb, type Database } from "../server/db";
import { actionSchema } from "../lib/contracts";
import { mutate } from "../server/actions";
import { putChannel } from "../server/channels";
import { snapshot } from "../server/queries";
import { takeLimit } from "../server/access";
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
              new URL(request.url).searchParams.get("history") === "none"
                ? 0
                : 500,
            ),
          ),
        ),
      POST: ({ request }) =>
        endpoint(async () => {
          requireOrigin(request);
          const start = performance.now();
          const viewer = await requireUser(request);
          const authenticated = performance.now();
          const actions = z
            .array(actionSchema)
            .min(1)
            .max(50)
            .parse(await readJson(request));
          const db = getDb();
          if (actions.length === 1 && actions[0].type === "channel.put") {
            const result = await putChannel(db, viewer.id, actions[0]);
            const response = json({ ok: true, ...result });
            response.headers.set(
              "Server-Timing",
              `auth;dur=${(authenticated - start).toFixed(1)}, write;dur=${(performance.now() - authenticated).toFixed(1)}`,
            );
            return response;
          }
          if (actions.every((action) => action.type === "conversation.read")) {
            await Promise.all(
              actions.map((action) =>
                markRead(
                  db,
                  viewer.id,
                  action as Extract<
                    typeof action,
                    { type: "conversation.read" }
                  >,
                ),
              ),
            );
            return json({ ok: true });
          }
          if (
            actions.length === 1 &&
            (await fastAction(db, viewer.id, actions[0]))
          ) {
            if (actions[0].type === "community.join") {
              const id = actions[0].id;
              const next = await snapshot(db, viewer, 0);
              return json({
                ok: true,
                community: next.communities.find((c) => c.id === id),
                people: next.people,
              });
            }
            return json({ ok: true });
          }
          await takeLimit(db, viewer.id, "actions", 120);
          await db.transaction(async (tx) => {
            // Same entity edits remain ordered across tabs; unrelated work runs independently.
            const keys = [
              ...new Set(
                actions.map((action) => `${viewer.id}:${actionScope(action)}`),
              ),
            ].sort();
            await tx.execute(
              sql`select pg_advisory_xact_lock(hashtext(key)) from unnest(${sql.param(keys)}::text[]) as keys(key) order by key`,
            );
            for (const action of actions)
              await mutate(tx as unknown as Database, viewer.id, action);
            await invalidateActions(
              tx as unknown as Parameters<typeof invalidateActions>[0],
              viewer.id,
              actions,
            );
          });
          return json({ ok: true });
        }),
    },
  },
});
