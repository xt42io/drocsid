import * as Sentry from "@sentry/tanstackstart-react";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

function RouterError() {
  return (
    <main
      data-ui="router-error"
      className="min-h-svh flex flex-col items-center justify-center p-7.5 text-center [&_h1]:text-[50px] [&_h1]:tracking-[-2px] [&_h1]:mt-0 [&_h1]:mb-0 [&_h1]:mx-0 [&_p]:text-[#919586] [&_p]:mb-6.25"
    >
      <h1>Let’s try that again.</h1>
      <p>A part of the page didn’t load. Reloading usually fixes it.</p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        data-ui="button button-dark"
        className="inline-flex items-center justify-center gap-3 border border-solid border-transparent min-h-13 py-3.5 px-5.5 text-[14px] font-semibold rounded-[7px] [transition:background_0.2s,transform_0.2s,box-shadow_0.2s] whitespace-nowrap bg-ink text-white hover:transform-[translateY(-2px)] hover:bg-[#42433d] active:transform-[translateY(0)] motion-reduce:hover:transform-none"
      >
        Reload
      </button>
    </main>
  );
}

export function getRouter() {
  const router = createRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreload: "intent",
    defaultErrorComponent: RouterError,
    defaultOnCatch: (error, errorInfo) => {
      Sentry.captureException(error, {
        extra: { componentStack: errorInfo.componentStack },
      });
    },
  });

  if (!router.isServer) {
    Sentry.addIntegration(
      Sentry.tanstackRouterBrowserTracingIntegration(router),
    );
  }

  return router;
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
