import * as Sentry from "@sentry/tanstackstart-react";
import { currentAppOrigin, isInjectedException } from "./lib/exception-filter";

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
  beforeSend(event) {
    const values = event.exception?.values;
    if (!values || values.length === 0) return event;
    let unhandled = false;
    const filenames: Array<string | undefined> = [];
    for (const value of values) {
      if (value.mechanism?.handled === false) unhandled = true;
      for (const frame of value.stacktrace?.frames ?? []) {
        filenames.push(frame.filename);
      }
    }
    return isInjectedException(unhandled, filenames, currentAppOrigin())
      ? null
      : event;
  },
});
