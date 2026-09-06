import { createFileRoute } from "@tanstack/react-router";
import { AuthScreen } from "../components/auth-screen";

export const Route = createFileRoute("/sign-in")({
  head: () => ({ meta: [{ title: "Welcome back — drocsid" }] }),
  component: () => <AuthScreen mode="sign-in" />,
});
