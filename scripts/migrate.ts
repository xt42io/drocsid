import { resolve } from "node:path";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("Migration failed: DATABASE_URL is missing.");
  process.exit(1);
}

let target: URL;
try {
  target = new URL(connectionString);
  if (target.protocol !== "postgres:" && target.protocol !== "postgresql:")
    throw new Error("expected a postgresql:// URL");
} catch (error) {
  console.error(
    "Migration failed: DATABASE_URL is invalid. URL-encode reserved characters in the password.",
  );
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

const destination = `${target.hostname}:${target.port || "5432"}/${target.pathname.slice(1)}`;
console.log(`Connecting to PostgreSQL at ${destination}…`);

const pool = new Pool({
  connectionString,
  max: 1,
  connectionTimeoutMillis: 10_000,
  idleTimeoutMillis: 5_000,
  statement_timeout: 120_000,
  query_timeout: 125_000,
});

try {
  const connection = await pool.connect();
  try {
    await connection.query("select current_database()");
    await connection.query("set lock_timeout = '15s'");
  } finally {
    connection.release();
  }
  console.log("Connected. Applying migrations…");
  await migrate(drizzle(pool), {
    migrationsFolder: resolve("drizzle"),
  });
  console.log("Migrations applied successfully.");
} catch (error) {
  type Failure = {
    code?: string;
    message?: string;
    detail?: string;
    hint?: string;
    cause?: unknown;
  };
  const outer = error as Failure;
  let failure = outer;
  const seen = new Set<unknown>();
  while (
    failure.cause &&
    typeof failure.cause === "object" &&
    !seen.has(failure.cause)
  ) {
    seen.add(failure);
    failure = failure.cause as Failure;
  }
  console.error("Migration failed.");
  if (failure.code) console.error(`PostgreSQL code: ${failure.code}`);
  console.error(failure.message || outer.message || String(error));
  if (failure.detail) console.error(`Detail: ${failure.detail}`);
  if (failure.hint) console.error(`Hint: ${failure.hint}`);
  process.exitCode = 1;
} finally {
  await pool.end();
}
