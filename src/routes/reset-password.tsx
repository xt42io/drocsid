import { createFileRoute, redirect } from "@tanstack/react-router";
export const Route = createFileRoute("/reset-password")({
  beforeLoad: () => {
    throw redirect({ to: "/sign-in" });
  },
});
