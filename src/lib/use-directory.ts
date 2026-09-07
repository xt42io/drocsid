import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "./api-client";
import { useApp } from "./app-state";
import type { Community, Person } from "../types/app";
type Page = { people?: Person[]; communities?: Community[]; hasMore: boolean };
export function useDirectory(
  kind: "people" | "communities",
  query: string,
  category?: string,
  id?: string,
  enabled = true,
) {
  const { rememberPeople, rememberCommunities } = useApp((app) => ({
    rememberPeople: app.rememberPeople,
    rememberCommunities: app.rememberCommunities,
  }));
  const [page, setPage] = useState<Page>({ hasMore: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [offset, setOffset] = useState(0);
  const key = JSON.stringify([kind, query, category, id, enabled]);
  const previous = useRef(key);
  const validOffset = previous.current === key ? offset : 0;
  useEffect(() => {
    if (previous.current !== key) {
      previous.current = key;
      setOffset(0);
      setPage({ hasMore: false });
    }
    if (!enabled || (kind === "people" && !query.trim() && !id)) {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    const timer = setTimeout(
      () => {
        const params = new URLSearchParams({
          kind,
          query: query.replace(/^@/, ""),
          offset: String(validOffset),
          ...(category ? { category } : {}),
          ...(id ? { id } : {}),
        });
        void api<Page>(`/api/directory?${params}`, undefined, controller.signal)
          .then((result) => {
            if (controller.signal.aborted) return;
            rememberPeople(result.people ?? []);
            rememberCommunities(result.communities ?? []);
            setPage((previous) =>
              validOffset
                ? {
                    hasMore: result.hasMore,
                    people: [
                      ...(previous.people ?? []),
                      ...(result.people ?? []),
                    ],
                    communities: [
                      ...(previous.communities ?? []),
                      ...(result.communities ?? []),
                    ],
                  }
                : result,
            );
            setError("");
          })
          .catch((error) => {
            if (!controller.signal.aborted)
              setError(error.message || "Could not load results.");
          })
          .finally(() => {
            if (!controller.signal.aborted) setLoading(false);
          });
      },
      query ? 250 : 0,
    );
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [
    key,
    kind,
    query,
    category,
    id,
    enabled,
    validOffset,
    rememberPeople,
    rememberCommunities,
  ]);
  const more = useCallback(() => {
    if (!loading && page.hasMore) setOffset((value) => value + 50);
  }, [loading, page.hasMore]);
  return { ...page, loading, error, more };
}
