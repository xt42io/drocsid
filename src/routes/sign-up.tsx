import { createFileRoute, redirect } from "@tanstack/react-router";
import { AuthScreen } from "../components/auth-screen";
import { hasAuthenticatedViewer } from "../lib/viewer";

export const Route = createFileRoute("/sign-up")({
  beforeLoad: async () => {
    if (await hasAuthenticatedViewer()) throw redirect({ to: "/app" });
  },
  head: () => ({ meta: [{ title: "Make yourself at home — Drocsid" }] }),
  component: () => <AuthScreen mode="sign-up" />,
});
