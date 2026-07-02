import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

/**
 * Supabase Postgres via postgres-js. Use the Supabase *pooler* connection
 * string (Session or Transaction mode) — `prepare: false` keeps it
 * compatible with the transaction pooler, and `max: 1` suits serverless
 * functions.
 */
export function db() {
  if (!_db) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    const client = postgres(url, { prepare: false, max: 1, ssl: "require" });
    _db = drizzle(client, { schema });
  }
  return _db;
}

export * from "./schema";
