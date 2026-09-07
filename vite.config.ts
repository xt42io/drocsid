import "dotenv/config";
import { defineConfig } from "vite";
import { realtimePlugin } from "./src/server/realtime/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [
    realtimePlugin(),
    tailwindcss(),
    tanstackStart({ vite: { installDevServerMiddleware: true } }),
    react(),
  ],
  // Preserve Better Auth's own dependency resolution in pnpm production builds.
  ssr: { external: ["better-auth"], noExternal: ["@tanstack/history"] },
  server: { port: 1515, strictPort: true, host: "0.0.0.0" },
});
