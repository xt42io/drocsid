import { createServerFn } from "@tanstack/react-start";
import type { SocialProviderId } from "../server/auth";

export const listSocialProviders = createServerFn({ method: "GET" }).handler(
  async (): Promise<SocialProviderId[]> => {
    try {
      const { configuredSocialProviders } = await import("../server/auth");
      return configuredSocialProviders();
    } catch (error) {
      console.error(
        "[Drocsid auth] could not resolve the configured social providers",
        error instanceof Error ? error.name : "Unknown error",
      );
      return [];
    }
  },
);

export const hasAuthenticatedViewer = createServerFn({ method: "GET" }).handler(
  async () => {
    try {
      const [{ getRequestHeaders }, { getAuth }] = await Promise.all([
        import("@tanstack/react-start/server"),
        import("../server/auth"),
      ]);
      const session = await getAuth().api.getSession({
        headers: getRequestHeaders(),
      });
      return Boolean(session?.user.emailVerified);
    } catch (error) {
      console.error(
        "[Drocsid auth] could not resolve the public session",
        error instanceof Error ? error.name : "Unknown error",
      );
      return false;
    }
  },
);
