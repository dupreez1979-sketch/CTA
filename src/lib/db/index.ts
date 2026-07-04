import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

/**
 * Supabase Postgres via postgres-js. At runtime the app prefers
 * DATABASE_POOL_URL (the Supabase *Transaction* pooler, port 6543), which
 * multiplexes many clients over the project's small backend pool and is
 * the right mode for serverless; `prepare: false` keeps postgres-js
 * compatible with it. DATABASE_URL (Session pooler) remains for
 * migrations at build time, and is the fallback when no pool URL is set.
 *
 * Against the Session pooler every connection here holds one of only
 * ~15 backend slots for as long as it lives, and each warm serverless
 * instance keeps its own pool — so the defaults stay small and idle
 * connections are released quickly.
 */
export function db() {
  if (!_db) {
    const url = process.env.DATABASE_POOL_URL ?? process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    const client = postgres(url, {
      prepare: false,
      max: Number(process.env.DB_POOL_MAX ?? 2),
      idle_timeout: 10,
      connect_timeout: 10,
      max_lifetime: 60 * 10,
      ssl: "require",
    });
    _db = drizzle(client, { schema });
  }
  return _db;
}

export * from "./schema";
