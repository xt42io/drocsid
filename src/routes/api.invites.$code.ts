import { createFileRoute } from "@tanstack/react-router";
import { getDb } from "../server/db";
import {
  acceptInvite,
  invitePreview,
  revokeInvite,
} from "../server/invites";
import {
  endpoint,
  json,
  requireOrigin,
  requireUser,
} from "../server/http";
import { takeLimit } from "../server/access";

export const Route = createFileRoute("/api/invites/$code")({
  server: {
    handlers: {
      GET: ({ params }) =>
        endpoint(async () => json(await invitePreview(getDb(), params.code))),
      POST: ({ request, params }) =>
        endpoint(async () => {
          requireOrigin(request);
          const viewer = await requireUser(request);
          const db = getDb();
          await takeLimit(db, viewer.id, "invite-accept", 30);
          return json(await acceptInvite(db, viewer.id, params.code));
        }),
      DELETE: ({ request, params }) =>
        endpoint(async () => {
          requireOrigin(request);
          const viewer = await requireUser(request);
          const db = getDb();
          await takeLimit(db, viewer.id, "invite-revoke", 30);
          await revokeInvite(db, viewer.id, params.code);
          return json({ ok: true });
        }),
    },
  },
});
