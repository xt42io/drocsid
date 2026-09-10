import { createFileRoute, redirect } from "@tanstack/react-router";
import { AuthScreen } from "../components/auth-screen";
import { hasAuthenticatedViewer } from "../lib/viewer";

export const Route = createFileRoute("/sign-in")({
  validateSearch: (search: Record<string, unknown>): { next?: string } => ({
    next: typeof search.next === "string" ? search.next : undefined,
  }),
  beforeLoad: async () => {
    if (await hasAuthenticatedViewer()) throw redirect({ to: "/app" });
  },
  head: () => ({ meta: [{ title: "Welcome back — Drocsid" }] }),
  component: () => <AuthScreen mode="sign-in" />,
});
