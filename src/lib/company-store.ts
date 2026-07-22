import { db, companies } from "./db";
import { DEFAULT_COMPANIES, type Company } from "./companies";

/**
 * DB-backed company registry, managed from the admin console. Seeds
 * itself with DEFAULT_COMPANIES the first time it's read so existing
 * deployments migrate without a manual step.
 */

function parseMatch(match: string): string[] {
  return match
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export async function loadCompanies(): Promise<Company[]> {
  const rows = await db().select().from(companies).orderBy(companies.name);
  if (rows.length === 0) {
    await db()
      .insert(companies)
      .values(
        DEFAULT_COMPANIES.map((c) => ({
          key: c.key,
          name: c.name,
          match: c.match.join(", "),
        })),
      )
      .onConflictDoNothing();
    return [...DEFAULT_COMPANIES].sort((a, b) => a.name.localeCompare(b.name));
  }
  return rows.map((r) => ({
    key: r.key,
    name: r.name,
    match: parseMatch(r.match),
    inclusionMode: r.inclusionMode,
  }));
}

export async function companyNameMap(): Promise<Map<string, string>> {
  const list = await loadCompanies();
  return new Map(list.map((c) => [c.key, c.name]));
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
