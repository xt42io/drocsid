import { createFileRoute } from "@tanstack/react-router";
import { AuthScreen } from "../components/auth-screen";

export const Route = createFileRoute("/sign-up")({
  head: () => ({ meta: [{ title: "Make yourself at home — Drocsid" }] }),
  component: () => <AuthScreen mode="sign-up" />,
});
