import * as Sentry from "@sentry/tanstackstart-react";

const dsn =
  process.env.SENTRY_DSN ||
  process.env.VITE_SENTRY_DSN ||
  "https://bf0ec9e2947e12ae926f2fbfe59f2337@o4512045375291392.ingest.de.sentry.io/4512045611548752";

Sentry.init({
  dsn,
  environment: process.env.NODE_ENV || "production",
  dataCollection: {
    userInfo: false,
    cookies: false,
    httpBodies: [],
    urlQueryParams: false,
    databaseQueryData: false,
    stackFrameVariables: false,
  },
  tracesSampleRate: 0.2,
});
