const recoveryKey = "drocsid:chunk-recovery";
const recoveryCooldown = 60_000;

export function isChunkLoadError(error: unknown) {
  const message =
    error instanceof Error
      ? `${error.name}: ${error.message}`
      : typeof error === "string"
        ? error
        : "";
  return /(?:failed to fetch dynamically imported module|error loading dynamically imported module|importing a module script failed|unable to preload css|loading chunk .+ failed|chunkloaderror)/i.test(
    message,
  );
}

export function reloadAfterChunkFailure() {
  try {
    const previous = Number(sessionStorage.getItem(recoveryKey) || 0);
    if (Date.now() - previous < recoveryCooldown) return false;
    sessionStorage.setItem(recoveryKey, String(Date.now()));
  } catch {
    // Reloading still repairs the page when storage is unavailable.
  }
  window.location.reload();
  return true;
}
