import * as Sentry from "@sentry/tanstackstart-react";

const dsn =
  import.meta.env.VITE_SENTRY_DSN ||
  "https://bf0ec9e2947e12ae926f2fbfe59f2337@o4512045375291392.ingest.de.sentry.io/4512045611548752";

Sentry.init({
  dsn,
  environment: import.meta.env.MODE,
  dataCollection: {
    userInfo: false,
    cookies: false,
    httpBodies: [],
    urlQueryParams: false,
    databaseQueryData: false,
    stackFrameVariables: false,
  },
  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
  tracesSampleRate: 0.2,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1,
});
