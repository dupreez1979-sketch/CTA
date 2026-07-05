import { desc, eq, sql } from "drizzle-orm";
import { db, logs, type LogLevel, type LogRow } from "./db";
import { ensureLogsSchema } from "./db-errors";

/**
 * A small, self-pruning activity log for the admin. It records the things
 * that are NOT already visible elsewhere: errors, warnings and subscriber
 * lifecycle events (joined / changed / unsubscribed). It deliberately does
 * NOT record sends or editions (those have their own history).
 *
 * Design goals from the brief:
 * - Keep the database small: the table is capped at MAX_ROWS; older rows are
 *   trimmed on write (only occasionally, to stay cheap).
 * - Never impact app load: nothing here runs on a normal page render. Writes
 *   are best-effort and swallow their own errors so logging can never break
 *   a request; reads happen only when the admin opens the log panel.
 */
const MAX_ROWS = 1000;

/**
 * Record one event. Best-effort: any failure (including a missing table on
 * an environment behind the migrations) is swallowed after a console note,
 * so a logging problem never breaks the request that triggered it.
 */
export async function writeLog(
  level: LogLevel,
  category: string,
  message: string,
): Promise<void> {
  try {
    await ensureLogsSchema();
    await db().insert(logs).values({ level, category, message: message.slice(0, 2000) });
    // Keep the table bounded. Trimming on ~8% of writes keeps it near the cap
    // without paying for a delete on every single event.
    if (Math.random() < 0.08) {
      await db().execute(sql`
        delete from ${logs} where id < (
          select coalesce(min(id), 0) from (
            select id from ${logs} order by id desc limit ${MAX_ROWS}
          ) recent
        )
      `);
    }
  } catch (err) {
    console.error("writeLog failed (ignored):", err);
  }
}

export const logError = (category: string, message: string) =>
  writeLog("error", category, message);
export const logWarning = (category: string, message: string) =>
  writeLog("warning", category, message);
export const logInfo = (category: string, message: string) =>
  writeLog("info", category, message);

export interface LogQuery {
  /** Filter to one level, or all levels when omitted. */
  level?: LogLevel;
  /** How many rows to return (newest first). */
  limit?: number;
}

/**
 * Read the most recent log rows, newest first. Only ever called on demand
 * from the Settings log panel, never during a normal page render.
 */
export async function getLogs(q: LogQuery = {}): Promise<LogRow[]> {
  const limit = Math.min(Math.max(q.limit ?? 200, 1), 1000);
  try {
    await ensureLogsSchema();
    const base = db().select().from(logs);
    const rows = q.level
      ? await base.where(eq(logs.level, q.level)).orderBy(desc(logs.id)).limit(limit)
      : await base.orderBy(desc(logs.id)).limit(limit);
    return rows;
  } catch (err) {
    console.error("getLogs failed:", err);
    return [];
  }
}
