import { createFileRoute } from "@tanstack/react-router";
import { SavedPage } from "../components/app/inbox-page";
export const Route = createFileRoute("/app/saved")({
  head: () => ({ meta: [{ title: "For a quieter moment — Drocsid" }] }),
  component: SavedPage,
});
