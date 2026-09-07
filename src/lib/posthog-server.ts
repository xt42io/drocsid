import { PostHog } from "posthog-node";

let posthogClient: PostHog | null = null;

export function getPostHogClient(): PostHog | null {
  const token =
    process.env.VITE_PUBLIC_POSTHOG_PROJECT_TOKEN ||
    (typeof import.meta !== "undefined"
      ? (import.meta as { env?: Record<string, string> }).env
          ?.VITE_PUBLIC_POSTHOG_PROJECT_TOKEN
      : undefined);

  if (!token) {
    if (process.env.NODE_ENV !== "production") {
      console.error(
        "VITE_PUBLIC_POSTHOG_PROJECT_TOKEN variable required by PostHog is missing or un-configured, " +
          "this causes events to be silently missed. " +
          "This error stops appearing once VITE_PUBLIC_POSTHOG_PROJECT_TOKEN is configured.",
      );
    }
    return null;
  }

  if (!posthogClient) {
    posthogClient = new PostHog(token, {
      host:
        process.env.VITE_PUBLIC_POSTHOG_HOST ||
        (typeof import.meta !== "undefined"
          ? (import.meta as { env?: Record<string, string> }).env
              ?.VITE_PUBLIC_POSTHOG_HOST
          : undefined) ||
        "https://us.i.posthog.com",
      flushAt: 1,
      flushInterval: 0,
    });
  }

  return posthogClient;
}
