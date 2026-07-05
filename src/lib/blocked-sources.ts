import { getSetting, setSetting } from "./settings";

/**
 * Sources the admin has blocked: media outlets whose articles should never
 * reach the review queue (e.g. an aggregator that only ever mentions the
 * wrong "Patch Theatre"). Stored as a comma-separated list of plain terms
 * matched against a story's author, link and title. Terms can be a domain
 * ("australianstage.com.au") or a name ("Australian Stage").
 */
const BLOCKED_KEY = "blocked_sources";

/** Split the stored/entered list into clean terms (commas or new lines). */
function parseTerms(raw: string): string[] {
  return [
    ...new Set(
      raw
        .split(/[,\n]+/)
        .map((s) => s.trim().replace(/^["']|["']$/g, "").trim())
        .filter(Boolean),
    ),
  ];
}

export async function getBlockedSources(): Promise<string[]> {
  return parseTerms((await getSetting(BLOCKED_KEY)) ?? "");
}

export async function setBlockedSources(raw: string): Promise<string[]> {
  const terms = parseTerms(raw);
  await setSetting(BLOCKED_KEY, terms.join(", "));
  return terms;
}

/** True when a story matches any blocked term (author, link or title). */
export function isBlockedSource(
  fields: { creator?: string | null; link?: string | null; title?: string | null },
  terms: string[],
): boolean {
  if (terms.length === 0) return false;
  const hay = `${fields.creator ?? ""} ${fields.link ?? ""} ${fields.title ?? ""}`.toLowerCase();
  return terms.some((t) => hay.includes(t.toLowerCase()));
}
