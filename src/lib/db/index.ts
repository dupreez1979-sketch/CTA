import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

/**
 * Supabase Postgres via postgres-js. Use the Supabase *pooler* connection
 * string (Session or Transaction mode) — `prepare: false` keeps it
 * compatible with the transaction pooler. A small per-instance pool lets
 * the admin pages run their queries genuinely in parallel (max 1 made
 * every Promise.all serialise); keep it modest so concurrent serverless
 * instances don't exhaust the Supabase pooler.
 */
export function db() {
  if (!_db) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    const client = postgres(url, {
      prepare: false,
      max: Number(process.env.DB_POOL_MAX ?? 4),
      idle_timeout: 20,
      ssl: "require",
    });
    _db = drizzle(client, { schema });
  }
  return _db;
}

export * from "./schema";
