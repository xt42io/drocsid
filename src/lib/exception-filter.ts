// Scripts injected into the page by an in-app browser or a content blocker throw
// in the browser context, not in our code. Their stack frames point at the served
// document, so every frame filename is the page URL and none is a JavaScript file
// we ship. We drop those unhandled exceptions before they reach error tracking.

const JS_FILE = /\.[cm]?js(?:[?#]|$)/i;

/** True when a stack frame comes from a JavaScript file served by our own app. */
export function isOwnAppFrame(
  filename: string | null | undefined,
  appOrigin: string | null,
): boolean {
  if (!filename || !JS_FILE.test(filename)) return false;
  // Origin unknown (server side): treat a real script file as ours.
  if (!appOrigin) return true;
  try {
    return new URL(filename, appOrigin).origin === appOrigin;
  } catch {
    return false;
  }
}

/**
 * True when an unhandled exception has no frame from our own assets, which marks
 * it as injected third-party script rather than a fault in our code. Handled
 * exceptions and exceptions with no resolved frames are always kept.
 */
export function isInjectedException(
  unhandled: boolean,
  frameFilenames: Array<string | null | undefined>,
  appOrigin: string | null,
): boolean {
  if (!unhandled || frameFilenames.length === 0) return false;
  return !frameFilenames.some((filename) => isOwnAppFrame(filename, appOrigin));
}

/** The current page origin, or null when there is no browser context. */
export function currentAppOrigin(): string | null {
  return typeof window === "undefined" ? null : window.location.origin;
}
