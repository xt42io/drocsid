import { createServerFn } from "@tanstack/react-start";

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
