import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "../src/server/db/schema";
import type { Database } from "../src/server/db";
import { mutate } from "../src/server/actions";
import { ensureProfile } from "../src/server/access";
import { snapshot } from "../src/server/queries";
import { actionSchema } from "../src/lib/contracts";
import { stateActions } from "../src/lib/state-actions";
import type { AppState } from "../src/lib/app-state";

const engine = new PGlite();
const database = drizzle(engine, { schema });
const db = database as unknown as Database;
const userA = { id: "user_a", name: "Alice" };
const userB = { id: "user_b", name: "Bob" };

before(async () => {
  await migrate(database, { migrationsFolder: "./drizzle" });
  for (const viewer of [userA, userB]) {
    await db
      .insert(schema.user)
      .values({ ...viewer, email: `${viewer.id}@example.test` });
    await ensureProfile(db, viewer);
  }
  await db.insert(schema.friendships).values({
    senderId: userA.id,
    recipientId: userB.id,
    status: "accepted",
  });
});

after(async () => {
  await engine.close();
});

async function runAction(userId: string, input: unknown) {
  return db.transaction((tx) =>
    mutate(tx as unknown as Database, userId, actionSchema.parse(input)),
  );
}

test("profile gender can be saved, updated, and queried in snapshots", async () => {
  const profileAction = {
    type: "profile" as const,
    name: "Alice",
    handle: "alice_wonder",
    color: "peach" as const,
    bio: "Curiouser and curiouser",
    gender: "Woman",
    activity: "Exploring",
    status: "online" as const,
  };

  // 1. Action schema parses valid gender
  const parsed = actionSchema.parse(profileAction);
  assert.equal(parsed.gender, "Woman");

  // 2. Mutate saves gender to database
  await runAction(userA.id, profileAction);

  // 3. User snapshot returns gender for own profile
  const ownSnapshot = await snapshot(db, userA);
  assert.equal(ownSnapshot.profile.gender, "Woman");

  // 4. Other user snapshot returns gender in people list
  const otherSnapshot = await snapshot(db, userB);
  const aliceInPeople = otherSnapshot.people.find((p) => p.id === userA.id);
  assert.ok(aliceInPeople);
  assert.equal(aliceInPeople.gender, "Woman");

  // 5. Gender field trims whitespace
  const trimmedAction = {
    ...profileAction,
    gender: "  Non-binary  ",
  };
  await runAction(userA.id, trimmedAction);
  const updatedSnapshot = await snapshot(db, userA);
  assert.equal(updatedSnapshot.profile.gender, "Non-binary");

  // 6. Max length validation (<= 40 chars succeeds, > 40 chars fails)
  assert.equal(
    actionSchema.safeParse({ ...profileAction, gender: "a".repeat(40) }).success,
    true,
  );
  assert.equal(
    actionSchema.safeParse({ ...profileAction, gender: "a".repeat(41) }).success,
    false,
  );

  // 7. State actions generates profile action including gender
  const mockState: AppState = {
    ...ownSnapshot,
    profile: {
      ...ownSnapshot.profile,
      gender: "She/Her",
    },
  };
  const diffs = stateActions(ownSnapshot, mockState);
  assert.equal(diffs.length, 1);
  assert.equal(diffs[0].type, "profile");
  assert.equal((diffs[0] as typeof profileAction).gender, "She/Her");
});
