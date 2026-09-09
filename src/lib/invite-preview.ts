import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const getInvitePreview = createServerFn({ method: "GET" })
  .validator(z.object({ code: z.string().min(1).max(24) }))
  .handler(async ({ data }) => {
    const [{ getDb }, { invitePreview }, { HttpError }] = await Promise.all([
      import("../server/db"),
      import("../server/invites"),
      import("../server/http"),
    ]);
    try {
      return await invitePreview(getDb(), data.code);
    } catch (error) {
      if (error instanceof HttpError && error.status === 404) return null;
      throw error;
    }
  });
