import { getAuth } from "../src/server/auth";
import { getDb, type Database } from "../src/server/db";
import { ensureProfile } from "../src/server/access";
import { mutate } from "../src/server/actions";

if (process.env.NODE_ENV === "production")
  throw new Error("Seed is for development only.");
if (!process.env.SEED_EMAIL || !process.env.SEED_PASSWORD)
  throw new Error(
    "Set SEED_EMAIL and SEED_PASSWORD to create an optional development account.",
  );
const result = await getAuth().api.signUpEmail({
  body: {
    name: "Community host",
    email: process.env.SEED_EMAIL,
    password: process.env.SEED_PASSWORD,
  },
});
const db = getDb();
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
  "Development account and community created. Sign in with the SEED_EMAIL and SEED_PASSWORD you supplied.",
);
process.exit(0);
