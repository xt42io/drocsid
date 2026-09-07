import { and, eq, ne } from "drizzle-orm";
import type { Database } from "./db";
import { profiles } from "./db/schema";
import { usernameError } from "../lib/usernames";
import { HttpError } from "./http";

export async function usernameAvailability(
  db: Database,
  userId: string,
  username: string,
) {
  const error = usernameError(username);
  if (error) throw new HttpError(400, error);
  const [match] = await db
    .select({ userId: profiles.userId })
    .from(profiles)
    .where(and(eq(profiles.handle, username), ne(profiles.userId, userId)))
    .limit(1);
  return { username, available: !match };
}
