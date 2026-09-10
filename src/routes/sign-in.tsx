import { createFileRoute, redirect } from "@tanstack/react-router";
import { AuthScreen } from "../components/auth-screen";
import { hasAuthenticatedViewer, listSocialProviders } from "../lib/viewer";

export const Route = createFileRoute("/sign-in")({
  beforeLoad: async () => {
    if (await hasAuthenticatedViewer()) throw redirect({ to: "/app" });
  },
  loader: () => listSocialProviders(),
  head: () => ({ meta: [{ title: "Welcome back — Drocsid" }] }),
  component: SignInRoute,
});

function SignInRoute() {
  return <AuthScreen mode="sign-in" providers={Route.useLoaderData()} />;
}
