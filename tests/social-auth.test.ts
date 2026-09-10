import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "../src/server/db/schema";
import type { Database } from "../src/server/db";
import { makeAuth, configuredSocialProviders } from "../src/server/auth";

const engine = new PGlite();
const database = drizzle(engine, { schema });
const db = database as unknown as Database;

const socialEnvKeys = [
  "DISCORD_CLIENT_ID",
  "DISCORD_CLIENT_SECRET",
  "GITHUB_CLIENT_ID",
  "GITHUB_CLIENT_SECRET",
] as const;
const originalEnv = new Map(socialEnvKeys.map((key) => [key, process.env[key]]));

function setSocialEnv(values: Partial<Record<(typeof socialEnvKeys)[number], string>>) {
  for (const key of socialEnvKeys) {
    if (values[key]) process.env[key] = values[key];
    else delete process.env[key];
  }
}

before(async () => {
  await migrate(database, { migrationsFolder: "./drizzle" });
  process.env.BETTER_AUTH_SECRET = "social-test-" + "a".repeat(40);
  process.env.BETTER_AUTH_URL = "http://localhost:1515";
});
after(async () => {
  for (const [key, value] of originalEnv)
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  await engine.close();
});

function socialSignIn(db: Database, body: unknown) {
  const auth = makeAuth(db);
  return auth.handler(
    new Request("http://localhost:1515/api/auth/sign-in/social", {
      method: "POST",
      headers: {
        origin: "http://localhost:1515",
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    }),
  );
}

test("configuredSocialProviders reflects which credentials are set", () => {
  setSocialEnv({});
  assert.deepEqual(configuredSocialProviders(), []);

  // A client id without its secret leaves the provider unavailable.
  setSocialEnv({ DISCORD_CLIENT_ID: "d-id" });
  assert.deepEqual(configuredSocialProviders(), []);

  setSocialEnv({ DISCORD_CLIENT_ID: "d-id", DISCORD_CLIENT_SECRET: "d-secret" });
  assert.deepEqual(configuredSocialProviders(), ["discord"]);

  setSocialEnv({
    DISCORD_CLIENT_ID: "d-id",
    DISCORD_CLIENT_SECRET: "d-secret",
    GITHUB_CLIENT_ID: "g-id",
    GITHUB_CLIENT_SECRET: "g-secret",
  });
  assert.deepEqual(configuredSocialProviders(), ["discord", "github"]);
});

test("a provider without credentials is not registered", async () => {
  setSocialEnv({ DISCORD_CLIENT_ID: "d-id", DISCORD_CLIENT_SECRET: "d-secret" });
  const result = await socialSignIn(db, { provider: "github", callbackURL: "/app" });
  assert.equal(result.status, 404);
});

test("a configured provider stores OAuth state in one 10-minute cookie", async () => {
  setSocialEnv({ DISCORD_CLIENT_ID: "d-id", DISCORD_CLIENT_SECRET: "d-secret" });
  const result = await socialSignIn(db, {
    provider: "discord",
    callbackURL: "/app",
    errorCallbackURL: "/sign-up",
  });
  assert.equal(result.status, 200);
  assert.match((await result.json()).url, /discord\.com/);

  const cookies = result.headers.getSetCookie().join("\n");
  // The cookie strategy keeps a single encrypted state cookie that lives as
  // long as the flow (600s). The database strategy also pins a signed cookie
  // to 300s, whose early expiry produced the state mismatch.
  assert.match(cookies, /oauth_state/);
  assert.match(cookies, /Max-Age=600/i);
  assert.doesNotMatch(cookies, /Max-Age=300/i);
});
