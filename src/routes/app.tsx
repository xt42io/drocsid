import { createFileRoute } from "@tanstack/react-router";
import { AppProvider } from "../lib/app-state";
import { AppShell } from "../components/app/app-shell";
import appStyles from "../app.css?url";
export const Route = createFileRoute("/app")({
  head: () => ({
    meta: [{ title: "Your little corner — drocsid" }],
    links: [{ rel: "stylesheet", href: appStyles }],
  }),
  component: () => (
    <AppProvider>
      <AppShell />
    </AppProvider>
  ),
});
