import { createAppServer } from "../src/server/node-server";
import { attachRealtime } from "../src/server/realtime/gateway";
import { realtimeData } from "../src/server/realtime/data";
import { postgresBus } from "../src/server/realtime/bus";

const { default: app } = await import("../dist/server/server.js");
const server = createAppServer((request) => app.fetch(request));
const close = attachRealtime(
  server,
  realtimeData,
  postgresBus(),
  new URL(process.env.BETTER_AUTH_URL || "http://localhost:1515").origin,
);
server.listen(Number(process.env.PORT || 1515), "0.0.0.0", () =>
  console.log(`Drocsid listening on port ${process.env.PORT || 1515}`),
);
for (const signal of ["SIGINT", "SIGTERM"] as const)
  process.once(signal, () => {
    void close().then(() => server.close(() => process.exit(0)));
    setTimeout(() => process.exit(0), 5000).unref();
  });
