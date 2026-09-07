import { createFileRoute } from "@tanstack/react-router";
import { SearchPage } from "../components/app/search-page";
export const Route = createFileRoute("/app/search")({
  head: () => ({ meta: [{ title: "Find that little something — Drocsid" }] }),
  validateSearch: (search: Record<string, unknown>): { q: string } => ({
    q: typeof search.q === "string" ? search.q : "",
  }),
  component: Search,
});
function Search() {
  const { q } = Route.useSearch();
  return <SearchPage initialQuery={q} />;
}
