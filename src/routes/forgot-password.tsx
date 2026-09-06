import { createFileRoute } from "@tanstack/react-router";
import { AuthScreen } from "../components/auth-screen";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "Find your way back — drocsid" }] }),
  component: () => <AuthScreen mode="forgot-password" />,
});
