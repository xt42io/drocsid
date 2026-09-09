import { createFileRoute, redirect } from "@tanstack/react-router";
import { AuthScreen } from "../components/auth-screen";
import { hasAuthenticatedViewer } from "../lib/viewer";

export const Route = createFileRoute("/sign-in")({
  beforeLoad: async () => {
    if (await hasAuthenticatedViewer()) throw redirect({ to: "/app" });
  },
  head: () => ({ meta: [{ title: "Welcome back — Drocsid" }] }),
  component: () => <AuthScreen mode="sign-in" />,
});
