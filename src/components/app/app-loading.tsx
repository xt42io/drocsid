import { useEffect, useState } from "react";
import { LogoMark } from "../ui";
import { AppIcon } from "./primitives";
import { workspaceTheme } from "./workspace-theme";

export const workspaceThemeKey = "drocsid:workspace-theme";

function Skeleton({ className = "" }: { className?: string }) {
  return (
    <span
      className={`block rounded-md bg-(--a-border) motion-safe:animate-pulse ${className}`}
    />
  );
}

export function AppLoading({
  error,
  onRetry,
}: {
  error?: string;
  onRetry: () => void;
}) {
  const [theme, setTheme] = useState("dark");
  useEffect(() => {
    try {
      const saved = localStorage.getItem(workspaceThemeKey);
      if (saved === "light" || saved === "dark") setTheme(saved);
    } catch {
      /* Storage may be unavailable in private browsing. */
    }
  }, []);
  return (
    <main
      data-ui={`workspace a-loading theme-${theme}`}
      className={`${workspaceTheme} relative flex h-svh min-h-90 w-full overflow-hidden bg-(--a-bg) font-sans text-(--a-text)`}
      aria-busy={!error}
    >
      <div
        aria-hidden="true"
        className="hidden w-19 shrink-0 flex-col items-center gap-4 border-r border-(--a-border) bg-(--a-rail) py-7 sm:flex"
      >
        <span className="mb-2 text-(--a-muted) opacity-40">
          <LogoMark />
        </span>
        <span className="mb-1 h-px w-8 bg-(--a-border)" />
        {[0, 1, 2, 3].map((item) => (
          <Skeleton key={item} className="size-10 rounded-xl opacity-40" />
        ))}
        <Skeleton className="mt-auto size-9 rounded-full opacity-40" />
      </div>
      <div
        aria-hidden="true"
        className="hidden w-59 shrink-0 flex-col border-r border-(--a-border) bg-(--a-sidebar) px-5 py-7 lg:flex"
      >
        <Skeleton className="h-4 w-32 opacity-60" />
        <Skeleton className="mt-3 h-2 w-23 opacity-40" />
        <Skeleton className="mt-9 h-9 w-full opacity-30" />
        <div className="mt-9 space-y-5 opacity-35">
          {["w-28", "w-36", "w-24"].map((width) => (
            <div key={width} className="flex items-center gap-3">
              <Skeleton className="size-4" />
              <Skeleton className={`h-2 ${width}`} />
            </div>
          ))}
        </div>
        <Skeleton className="mt-12 h-2 w-20 opacity-30" />
        <div className="mt-6 space-y-5 opacity-25">
          {["w-32", "w-24", "w-28"].map((width) => (
            <div key={width} className="flex items-center gap-3">
              <Skeleton className="size-4" />
              <Skeleton className={`h-2 ${width}`} />
            </div>
          ))}
        </div>
        <div className="mt-auto flex items-center gap-3 border-t border-(--a-border) pt-5 opacity-40">
          <Skeleton className="size-9 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-2 w-21" />
            <Skeleton className="h-1.5 w-15" />
          </div>
        </div>
      </div>
      <div className="relative flex min-w-0 flex-1 flex-col">
        <div
          aria-hidden="true"
          className="flex h-20 shrink-0 items-center justify-between border-b border-(--a-border) px-6 opacity-50 sm:px-8"
        >
          <div className="flex items-center gap-3">
            <Skeleton className="size-6" />
            <Skeleton className="h-3 w-28" />
          </div>
          <div className="flex gap-4">
            <Skeleton className="size-5" />
            <Skeleton className="size-5" />
          </div>
        </div>
        <div className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto px-6 py-10">
          <section className="flex w-full max-w-80 flex-col items-center text-center">
            <div className="relative mb-7 flex size-20 items-center justify-center **:data-[ui~=logo-mark]:size-20">
              <LogoMark />
              {!error && (
                <span
                  aria-hidden="true"
                  className="absolute -right-1 -bottom-1 flex size-6 items-center justify-center rounded-full border-4 border-(--a-bg) bg-(--a-orange)"
                >
                  <span className="size-1.5 rounded-full bg-white motion-safe:animate-pulse" />
                </span>
              )}
            </div>
            <span className="mb-5 text-2xl font-bold tracking-tight">
              drocsid<span className="text-(--a-orange)">.</span>
            </span>
            {error ? (
              <div role="alert" className="w-full">
                <h1 className="text-lg! font-semibold! tracking-tight!">
                  Couldn’t open your space
                </h1>
                <p className="mt-3! text-sm leading-6 text-(--a-muted)">
                  {error}
                </p>
                <button
                  type="button"
                  onClick={onRetry}
                  className="mt-6 inline-flex items-center justify-center gap-2 rounded-lg bg-(--a-orange) px-5 py-3 text-sm! font-semibold! text-[#331a12] hover:bg-[#ff704b] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-(--a-orange)"
                >
                  <AppIcon name="reset" size={17} />
                  Try again
                </button>
              </div>
            ) : (
              <div
                role="status"
                aria-live="polite"
                className="flex flex-col items-center"
              >
                <h1 className="text-base! font-medium! tracking-normal!">
                  Getting your space ready
                </h1>
                <p className="mt-2! text-xs leading-5 text-(--a-muted)">
                  Loading your communities and conversations.
                </p>
                <div
                  aria-hidden="true"
                  className="mt-6 flex items-center gap-1.5 text-(--a-orange)"
                >
                  <span className="size-1.5 rounded-full bg-current motion-safe:animate-pulse" />
                  <span className="size-1.5 rounded-full bg-current motion-safe:animate-pulse [animation-delay:200ms]" />
                  <span className="size-1.5 rounded-full bg-current motion-safe:animate-pulse [animation-delay:400ms]" />
                </div>
              </div>
            )}
          </section>
        </div>
        <div
          aria-hidden="true"
          className="mx-6 mb-6 flex h-14 shrink-0 items-center gap-4 rounded-xl border border-(--a-border) bg-(--a-surface) px-4 opacity-40 sm:mx-8"
        >
          <Skeleton className="size-5" />
          <Skeleton className="h-2 w-36" />
          <Skeleton className="ml-auto size-5" />
        </div>
      </div>
    </main>
  );
}
