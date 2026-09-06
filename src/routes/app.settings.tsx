import { createFileRoute } from "@tanstack/react-router";
import { SettingsPage } from "../components/app/settings-page";
const validSections = [
  "profile",
  "appearance",
  "notifications",
  "privacy",
  "data",
];
export const Route = createFileRoute("/app/settings")({
  head: () => ({ meta: [{ title: "Make yourself comfortable — drocsid" }] }),
  validateSearch: (search: Record<string, unknown>): { section: string } => ({
    section:
      typeof search.section === "string" &&
      validSections.includes(search.section)
        ? search.section
        : "profile",
  }),
  component: Settings,
});
function Settings() {
  const { section } = Route.useSearch();
  return <SettingsPage section={section} />;
}
