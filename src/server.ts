import { wrapFetchWithSentry } from "@sentry/tanstackstart-react";
import handler, {
  createServerEntry,
  type ServerEntry,
} from "@tanstack/react-start/server-entry";

const requestHandler: ServerEntry = wrapFetchWithSentry({
  fetch(request) {
    return handler.fetch(request);
  },
});

export default createServerEntry(requestHandler);
