import type { Plugin } from "vite";
import { attachRealtime } from "./gateway.ts";
import { realtimeData } from "./data.ts";
import { postgresBus } from "./bus.ts";

export function realtimePlugin(): Plugin {
  return {
    name: "drocsid-websocket",
    configureServer(server) {
      if (!server.httpServer) return;
      const close = attachRealtime(
        server.httpServer,
        realtimeData,
        postgresBus(),
        new URL(process.env.BETTER_AUTH_URL || "http://localhost:1515").origin,
      );
      server.httpServer.once("close", () => {
        void close();
      });
    },
  };
}
