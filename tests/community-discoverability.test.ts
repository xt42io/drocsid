import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import type { Database } from "../src/server/db";
import * as schema from "../src/server/db/schema";
import { ensureProfile } from "../src/server/access";
import { mutate } from "../src/server/actions";
import { directory } from "../src/server/directory";
import { fastAction } from "../src/server/fast-actions";
import { acceptInvite, createInvite } from "../src/server/invites";
import { snapshot } from "../src/server/queries";

const engine = new PGlite();
const database = drizzle(engine, { schema });
const db = database as unknown as Database;
const communityId = "private-corner";

before(async () => {
  await migrate(database, { migrationsFolder: "./drizzle" });
  for (const id of ["owner", "member", "outsider"]) {
    await db
      .insert(schema.user)
      .values({ id, name: id, email: `${id}@discoverability.test` });
    await ensureProfile(db, { id, name: id });
  }
  await mutate(db, "owner", {
    type: "community.create",
    id: communityId,
    community: {
      name: "Private corner",
      description: "A community that can leave Discover.",
      icon: "sun",
      color: "purple",
      category: "Tests",
      discoverable: true,
    },
    channels: [
      {
        id: "general",
        name: "general",
        description: "",
        group: "",
      },
    ],
  });
});

after(() => engine.close());

test("private communities stay visible to members and joinable only by invite", async () => {
  const publicResults = await directory(db, "outsider", {
    kind: "communities",
    query: "Private corner",
    offset: 0,
  });
  assert.equal(publicResults.communities?.[0].id, communityId);

  await fastAction(db, "member", { type: "community.join", id: communityId });
  await assert.rejects(
    () =>
      mutate(db, "member", {
        type: "community.update",
        id: communityId,
        community: {
          name: "Private corner",
          description: "A community that can leave Discover.",
          icon: "sun",
          color: "purple",
          category: "Tests",
          discoverable: false,
        },
      }),
    /owners and admins/,
  );

  await mutate(db, "owner", {
    type: "community.update",
    id: communityId,
    community: {
      name: "Private corner",
      description: "A community that can leave Discover.",
      icon: "sun",
      color: "purple",
      category: "Tests",
      discoverable: false,
    },
  });

  const hiddenSearch = await directory(db, "outsider", {
    kind: "communities",
    query: "Private corner",
    offset: 0,
  });
  assert.deepEqual(hiddenSearch.communities, []);
  const hiddenIdLookup = await directory(db, "outsider", {
    kind: "communities",
    query: "",
    id: communityId,
    offset: 0,
  });
  assert.deepEqual(hiddenIdLookup.communities, []);

  const memberResults = await directory(db, "member", {
    kind: "communities",
    query: "Private corner",
    offset: 0,
  });
  assert.equal(memberResults.communities?.[0].id, communityId);
  assert.ok(
    (await snapshot(db, { id: "member", name: "member" }, 0)).communities.some(
      (community) => community.id === communityId && community.joined,
    ),
  );
  assert.ok(
    !(await snapshot(db, { id: "outsider", name: "outsider" }, 0)).communities.some(
      (community) => community.id === communityId,
    ),
  );

  await assert.rejects(
    () => mutate(db, "outsider", { type: "community.join", id: communityId }),
    /only be joined with an invite/,
  );
  await assert.rejects(
    () => fastAction(db, "outsider", { type: "community.join", id: communityId }),
    /only be joined with an invite/,
  );

  const invite = await createInvite(db, "owner", communityId);
  assert.deepEqual(await acceptInvite(db, "outsider", invite.code), {
    communityId,
    channelId: "general",
  });
  assert.ok(
    (await snapshot(db, { id: "outsider", name: "outsider" }, 0)).communities.some(
      (community) => community.id === communityId && community.joined,
    ),
  );
});
