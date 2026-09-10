import { createFileRoute, redirect } from "@tanstack/react-router";
import { AuthScreen } from "../components/auth-screen";
import { hasAuthenticatedViewer, listSocialProviders } from "../lib/viewer";

export const Route = createFileRoute("/sign-up")({
  beforeLoad: async () => {
    if (await hasAuthenticatedViewer()) throw redirect({ to: "/app" });
  },
  loader: () => listSocialProviders(),
  head: () => ({ meta: [{ title: "Make yourself at home — Drocsid" }] }),
  component: SignUpRoute,
});

function SignUpRoute() {
  return <AuthScreen mode="sign-up" providers={Route.useLoaderData()} />;
}
