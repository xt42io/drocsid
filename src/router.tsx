import * as Sentry from "@sentry/tanstackstart-react";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
  const router = createRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreload: "intent",
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
