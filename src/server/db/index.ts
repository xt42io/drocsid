import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema.ts";

export type Database = ReturnType<typeof drizzle<typeof schema>>;
let instance: Database | undefined;
export function getDb() {
  if (!process.env.DATABASE_URL)
    throw new Error(
      "DATABASE_URL is missing. Configure .env and run pnpm db:migrate.",
    );
  return (instance ??= drizzle(
    new Pool({ connectionString: process.env.DATABASE_URL, max: 10 }),
    { schema },
  ));
}
