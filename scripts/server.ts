import { createAppServer } from "../src/server/node-server";
import { attachRealtime } from "../src/server/realtime/gateway";
import { realtimeData } from "../src/server/realtime/data";
import { postgresBus } from "../src/server/realtime/bus";
import { getDb } from "../src/server/db";
import { inviteExists, inviteShortOrigin } from "../src/server/invites";

const { default: app } = await import("../dist/server/server.js");
const canonicalOrigin = new URL(
  process.env.BETTER_AUTH_URL || "http://localhost:1515",
).origin;
const shortOrigin = inviteShortOrigin();
if (new URL(shortOrigin).host === new URL(canonicalOrigin).host)
  throw new Error("INVITE_SHORT_URL must use a different host from BETTER_AUTH_URL.");
const server = createAppServer(
  (request) => app.fetch(request),
  "dist/client",
  {
    origin: shortOrigin,
    canonicalOrigin,
    resolve: (code) => inviteExists(getDb(), code),
  },
);
const close = attachRealtime(
  server,
  realtimeData,
  postgresBus(),
  canonicalOrigin,
);
server.listen(Number(process.env.PORT || 1515), "0.0.0.0", () =>
  console.log(`Drocsid listening on port ${process.env.PORT || 1515}`),
);
for (const signal of ["SIGINT", "SIGTERM"] as const)
  process.once(signal, () => {
    void close().then(() => server.close(() => process.exit(0)));
    setTimeout(() => process.exit(0), 5000).unref();
  });
