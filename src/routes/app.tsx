import { createFileRoute } from "@tanstack/react-router";
import { AppProvider } from "../lib/app-state";
import { AppShell } from "../components/app/app-shell";
export const Route = createFileRoute("/app")({
  head: () => ({
    meta: [{ title: "Your little corner — Drocsid" }],
  }),
  component: () => (
    <AppProvider>
      <AppShell />
    </AppProvider>
  ),
});
