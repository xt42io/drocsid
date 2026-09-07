import { user } from "../src/server/db/schema";
import { getDb, type Database } from "../src/server/db";
import { ensureProfile } from "../src/server/access";
import { mutate } from "../src/server/actions";

if (process.env.NODE_ENV === "production")
  throw new Error("Seed is for development only.");
if (!process.env.SEED_EMAIL)
  throw new Error(
    "Set SEED_EMAIL to an inbox you control for the development account.",
  );
const db = getDb();
const [created] = await db
  .insert(user)
  .values({
    id: crypto.randomUUID(),
    name: "Community host",
    email: process.env.SEED_EMAIL.trim().toLowerCase(),
  })
  .returning();
const result = { user: created };
await ensureProfile(db, result.user);
await db.transaction(async (tx) => {
  await mutate(tx as unknown as Database, result.user.id, {
    type: "community.create",
    id: crypto.randomUUID(),
    community: {
      name: "The Common Room",
      description: "A place to test your new community.",
      icon: "sun",
      color: "peach",
      category: "Community",
    },
    channels: [
      {
        id: "general",
        name: "general",
        description: "Say a little hello.",
        group: "THE COMMON ROOM",
      },
      {
        id: "introductions",
        name: "introductions",
        description: "Meet your people.",
        group: "START HERE",
      },
    ],
  });
});
console.log(
  "Development account and community created. Sign in with an email code sent to your SEED_EMAIL inbox.",
);
process.exit(0);
