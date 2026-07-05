import { and, eq, inArray, sql } from "drizzle-orm";
import { db, feedItems } from "./db";

/**
 * Potential-duplicate detection for the story pool. Social feeds sometimes
 * carry the same story twice, and a media-coverage story can echo one
 * already in the pool. We flag these by heading similarity within a recent
 * window so the admin can decide what to keep — it never deletes anything
 * itself.
 */

/** How similar two headings must be (0..1) to count as a potential duplicate. */
export const SIMILARITY_THRESHOLD = 0.9;
/** Only compare against stories from the last this-many days. */
export const DUP_WINDOW_DAYS = 7;

/** Lowercase, strip punctuation, collapse whitespace — compare on meaning, not formatting. */
export function normalizeHeading(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Sørensen-Dice coefficient over character bigrams: robust for near-duplicate text. */
function diceCoefficient(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;
  const bigrams = (s: string) => {
    const m = new Map<string, number>();
    for (let i = 0; i < s.length - 1; i++) {
      const bg = s.slice(i, i + 2);
      m.set(bg, (m.get(bg) ?? 0) + 1);
    }
    return m;
  };
  const A = bigrams(a);
  const B = bigrams(b);
  let overlap = 0;
  for (const [bg, ca] of A) {
    const cb = B.get(bg);
    if (cb) overlap += Math.min(ca, cb);
  }
  const total = a.length - 1 + (b.length - 1);
  return (2 * overlap) / total;
}

/** Heading similarity in 0..1 (1 = identical after normalising). */
export function headingSimilarity(a: string, b: string): number {
  const x = normalizeHeading(a);
  const y = normalizeHeading(b);
  if (!x || !y) return 0;
  return diceCoefficient(x, y);
}

export interface DupStory {
  id: number;
  /** The AI headline shown in the pool. */
  heading: string;
  /** The original post title, when present (compared too). */
  rawTitle: string | null;
  companyKey: string;
  /** Effective date: approval date for media stories, else ingest date. */
  date: Date;
}

/** Best similarity between two stories, comparing headings and raw titles. */
export function storySimilarity(a: DupStory, b: DupStory): number {
  let s = headingSimilarity(a.heading, b.heading);
  if (a.rawTitle && b.rawTitle) {
    s = Math.max(s, headingSimilarity(a.rawTitle, b.rawTitle));
  }
  return s;
}

/** True when two stories are similar enough to be a potential duplicate. */
export function isPotentialDuplicate(a: DupStory, b: DupStory): boolean {
  return storySimilarity(a, b) >= SIMILARITY_THRESHOLD;
}

/**
 * Pool stories (usable, not ignored) whose effective date is within the
 * last `days` days. This is the set every duplicate check compares against.
 * Uses an ISO-string cast so the postgres-js driver never has to serialise a
 * bare Date against the coalesce() expression.
 */
export async function recentPoolStories(days = DUP_WINDOW_DAYS): Promise<DupStory[]> {
  const cutoff = new Date(Date.now() - days * 86_400_000).toISOString();
  const ourDate = sql`coalesce(${feedItems.reviewedAt}, ${feedItems.createdAt})`;
  const rows = await db()
    .select({
      id: feedItems.id,
      heading: feedItems.aiHeading,
      rawTitle: feedItems.rawTitle,
      companyKey: feedItems.companyKey,
      reviewedAt: feedItems.reviewedAt,
      createdAt: feedItems.createdAt,
    })
    .from(feedItems)
    .where(
      and(
        eq(feedItems.ignored, false),
        inArray(feedItems.reviewStatus, ["auto", "approved"]),
        sql`${ourDate} >= ${cutoff}::timestamptz`,
      ),
    );
  return rows.map((r) => ({
    id: r.id,
    heading: r.heading,
    rawTitle: r.rawTitle,
    companyKey: r.companyKey,
    date: r.reviewedAt ?? r.createdAt,
  }));
}

/**
 * For each story, the other recent stories it is a potential duplicate of.
 * Both members of a pair appear in the map, so the pool can highlight both.
 */
export function duplicateMap(stories: DupStory[]): Map<number, DupStory[]> {
  const map = new Map<number, DupStory[]>();
  const add = (id: number, other: DupStory) => {
    const list = map.get(id);
    if (list) list.push(other);
    else map.set(id, [other]);
  };
  for (let i = 0; i < stories.length; i++) {
    for (let j = i + 1; j < stories.length; j++) {
      if (isPotentialDuplicate(stories[i], stories[j])) {
        add(stories[i].id, stories[j]);
        add(stories[j].id, stories[i]);
      }
    }
  }
  return map;
}

/**
 * The recent pool stories that a candidate (a review-queue item about to be
 * approved, or an incoming story) is a potential duplicate of. Excludes the
 * candidate's own id.
 */
export function similarInPool(candidate: DupStory, pool: DupStory[]): DupStory[] {
  return pool.filter((p) => p.id !== candidate.id && isPotentialDuplicate(candidate, p));
}
