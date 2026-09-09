import "./instrument.client";

import { StartClient } from "@tanstack/react-start/client";
import { StrictMode, startTransition } from "react";
import { hydrateRoot } from "react-dom/client";
import { reloadAfterChunkFailure } from "./lib/chunk-recovery";

window.addEventListener("vite:preloadError", (event) => {
  if (reloadAfterChunkFailure()) event.preventDefault();
});

startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <StartClient />
    </StrictMode>,
  );
});
