import { sql } from "drizzle-orm";
import { db, settings } from "./db";

/** Small key/value settings store, managed from the admin console. */

export async function getSetting(key: string): Promise<string | null> {
  const rows = await db()
    .select()
    .from(settings)
    .where(sql`${settings.key} = ${key}`)
    .limit(1);
  return rows[0]?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await db()
    .insert(settings)
    .values({ key, value })
    .onConflictDoUpdate({ target: settings.key, set: { value } });
}
