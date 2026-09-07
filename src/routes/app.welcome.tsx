import { createFileRoute } from "@tanstack/react-router";
import { WelcomePage } from "../components/app/welcome-page";
export const Route = createFileRoute("/app/welcome")({
  head: () => ({ meta: [{ title: "Make yourself at home — Drocsid" }] }),
  component: WelcomePage,
});
