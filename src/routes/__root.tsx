import {
  createRootRoute,
  HeadContent,
  Link,
  Outlet,
  Scripts,
} from "@tanstack/react-router";
import stylesheet from "../styles.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "drocsid — A place for your people." },
      {
        name: "description",
        content:
          "An open-source home for your community. Thoughtful text chat, shared interests, and a little more human connection.",
      },
      { name: "theme-color", content: "#f8f7f4" },
    ],
    links: [
      { rel: "stylesheet", href: stylesheet },
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
    ],
  }),
  component: Root,
  notFoundComponent: () => (
    <main className="not-found">
      <span className="eyebrow">404 · A LITTLE LOST?</span>
      <h1>This room is empty.</h1>
      <p>Let’s get you back to your people.</p>
      <Link to="/" className="button button-dark">
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
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <Outlet />
        <Scripts />
      </body>
    </html>
  );
}
