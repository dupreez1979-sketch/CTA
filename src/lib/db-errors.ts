import { sql } from "drizzle-orm";
import { db } from "./db";

/**
 * Detecting "this column/table does not exist" errors. When a migration has
 * not reached an environment yet (e.g. the runtime database is behind the
 * code), queries against the new schema fail with Postgres SQLSTATE 42703
 * (undefined_column) or 42P01 (undefined_table). Drizzle wraps the driver
 * error, so the SQLSTATE and the descriptive message live on the error's
 * `cause` chain rather than the top-level error we catch. Walk that chain.
 */
export function isMissingSchema(err: unknown): boolean {
  let e: unknown = err;
  for (let depth = 0; e && depth < 6; depth++) {
    const code = (e as { code?: string }).code;
    if (code === "42703" || code === "42P01") return true;
    const msg = ((e as { message?: string }).message ?? "").toLowerCase();
    if (
      msg.includes("does not exist") &&
      (msg.includes("ignored") || msg.includes("newsletter_inclusions"))
    ) {
      return true;
    }
    if (/column .*ignored.* does not exist/.test(msg)) return true;
    if (/relation .*newsletter_inclusions.* does not exist/.test(msg)) return true;
    e = (e as { cause?: unknown }).cause;
  }
  return false;
}

/**
 * Ensure migration 0016's schema (feed_items.ignored + the
 * newsletter_inclusions table) exists in the runtime database, in case the
 * build-time migration ran against a different database than the app
 * queries at runtime. The statements are idempotent (IF NOT EXISTS), so
 * this is a no-op once the schema is present, and it never touches
 * drizzle's migration bookkeeping. Runs at most once per process; if the
 * database role can't run DDL, callers fall back to the pre-0016 queries.
 */
let ensured: Promise<boolean> | null = null;
export function ensureNewsletterSchema(): Promise<boolean> {
  ensured ??= (async () => {
    try {
      await db().execute(
        sql`ALTER TABLE "feed_items" ADD COLUMN IF NOT EXISTS "ignored" boolean DEFAULT false NOT NULL`,
      );
      await db().execute(
        sql`CREATE TABLE IF NOT EXISTS "newsletter_inclusions" (
          "id" serial PRIMARY KEY NOT NULL,
          "feed_item_id" integer NOT NULL,
          "cadence" text NOT NULL,
          "created_at" timestamp with time zone DEFAULT now() NOT NULL
        )`,
      );
      await db().execute(
        sql`CREATE UNIQUE INDEX IF NOT EXISTS "newsletter_inclusion_idx" ON "newsletter_inclusions" ("feed_item_id","cadence")`,
      );
      // 0019: persistent marker for a story manually pushed into the
      // newsletters (keeps the pool's Regular "+" greyed for good).
      await db().execute(
        sql`ALTER TABLE "feed_items" ADD COLUMN IF NOT EXISTS "forced_newsletter_at" timestamp with time zone`,
      );
      return true;
    } catch (err) {
      // Reset so a later call can retry (e.g. transient connection issue).
      ensured = null;
      console.error(
        "ensureNewsletterSchema: could not verify/create 0016 schema; using degraded queries:",
        err,
      );
      return false;
    }
  })();
  return ensured;
}

/**
 * Ensure the activity-log table (migration 0017) exists, in case the
 * runtime database is behind the migrations. Idempotent and best-effort,
 * run at most once per process; callers of the log tolerate its absence.
 */
let logsEnsured: Promise<boolean> | null = null;
export function ensureLogsSchema(): Promise<boolean> {
  logsEnsured ??= (async () => {
    try {
      await db().execute(
        sql`CREATE TABLE IF NOT EXISTS "logs" (
          "id" serial PRIMARY KEY NOT NULL,
          "created_at" timestamp with time zone DEFAULT now() NOT NULL,
          "level" text NOT NULL,
          "category" text NOT NULL,
          "message" text NOT NULL
        )`,
      );
      await db().execute(
        sql`CREATE INDEX IF NOT EXISTS "logs_created_idx" ON "logs" ("created_at")`,
      );
      return true;
    } catch (err) {
      logsEnsured = null;
      console.error("ensureLogsSchema: could not verify/create logs table:", err);
      return false;
    }
  })();
  return logsEnsured;
}

/**
 * Ensure the alliance-updates table (migration 0020) exists, in case the
 * runtime database is behind the migrations. Idempotent and best-effort,
 * run at most once per process.
 */
let allianceEnsured: Promise<boolean> | null = null;
export function ensureAllianceSchema(): Promise<boolean> {
  allianceEnsured ??= (async () => {
    try {
      await db().execute(
        sql`CREATE TABLE IF NOT EXISTS "alliance_updates" (
          "id" serial PRIMARY KEY NOT NULL,
          "status" text DEFAULT 'draft' NOT NULL,
          "subject" text DEFAULT '' NOT NULL,
          "content" text DEFAULT '' NOT NULL,
          "recipients" text DEFAULT '' NOT NULL,
          "sent_at" timestamp with time zone,
          "created_at" timestamp with time zone DEFAULT now() NOT NULL,
          "updated_at" timestamp with time zone DEFAULT now() NOT NULL
        )`,
      );
      return true;
    } catch (err) {
      allianceEnsured = null;
      console.error(
        "ensureAllianceSchema: could not verify/create alliance_updates table:",
        err,
      );
      return false;
    }
  })();
  return allianceEnsured;
}
