import {
  createRootRoute,
  HeadContent,
  Link,
  Outlet,
  Scripts,
} from "@tanstack/react-router";
import { PostHogProvider } from "@posthog/react";
import stylesheet from "../styles.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Drocsid — A place for your people." },
      {
        name: "description",
        content:
          "An open-source home for your community. Thoughtful text chat, shared interests, and a little more human connection.",
      },
      { name: "theme-color", content: "#f8f7f4" },
    ],
    links: [
      { rel: "stylesheet", href: stylesheet },
      { rel: "icon", type: "image/png", href: "/logo.png" },
      { rel: "apple-touch-icon", href: "/logo.png" },
    ],
  }),
  component: Root,
  notFoundComponent: () => (
    <main
      data-ui="not-found"
      className="min-h-svh flex flex-col items-center justify-center p-7.5 text-center [&_h1]:text-[50px] [&_h1]:tracking-[-2px] [&_h1]:mt-5 [&_h1]:mb-0 [&_h1]:mx-0 [&_p]:text-[#919586] [&_p]:mb-6.25"
    >
      <span
        data-ui="eyebrow"
        className="block font-mono text-[11px] tracking-[1.6px] font-normal leading-[1.7] max-[580px]:text-[9px]"
      >
        404 · A LITTLE LOST?
      </span>
      <h1>This room is empty.</h1>
      <p>Let’s get you back to your people.</p>
      <Link
        to="/"
        data-ui="button button-dark"
        className="inline-flex items-center justify-center gap-3 border border-solid border-transparent min-h-13 py-3.5 px-5.5 text-[14px] font-semibold rounded-[7px] [transition:background_0.2s,transform_0.2s,box-shadow_0.2s] whitespace-nowrap bg-ink text-white hover:transform-[translateY(-2px)] hover:bg-[#42433d] active:transform-[translateY(0)] motion-reduce:hover:transform-none"
      >
        Back to home
      </Link>
    </main>
  ),
});

function Root() {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <PostHogProvider
          apiKey={import.meta.env.VITE_PUBLIC_POSTHOG_PROJECT_TOKEN ?? ""}
          options={{
            api_host: "/ingest",
            ui_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST || "https://us.posthog.com",
            defaults: "2025-05-24",
            capture_exceptions: true,
            debug: import.meta.env.DEV,
            tracing_headers:
              typeof window !== "undefined" ? [window.location.hostname] : [],
          }}
        >
          <a
            href="#main"
            data-ui="skip-link"
            className="fixed z-100 -top-25 left-5 py-3 px-5 bg-ink text-white rounded-lg focus:top-2.5"
          >
            Skip to content
          </a>
          <Outlet />
        </PostHogProvider>
        <Scripts />
      </body>
    </html>
  );
}
