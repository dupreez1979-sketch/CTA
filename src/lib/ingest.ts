import { inArray } from "drizzle-orm";
import { db, feedItems } from "./db";
import { fetchFeed, type NormalisedItem } from "./feed";
import { generateCopy } from "./ai";
import { rehostImage } from "./images";

/**
 * Feed ingestion: fetch the RSS feed, skip items already stored (by guid),
 * and for each new item generate AI copy, re-host its image, and insert.
 * Work is capped per run and processed in parallel chunks so an invocation
 * fits inside Netlify's function time limit — anything left over is picked
 * up by the next run (each item commits independently). Item failures are
 * logged and skipped so one bad post can't block an issue.
 */

const MAX_PER_RUN = Number(process.env.INGEST_MAX_PER_RUN ?? 10);
const CHUNK = 5;

export async function ingestFeed(): Promise<{
  seen: number;
  added: number;
  remaining: number;
}> {
  const url = process.env.FEED_URL;
  if (!url) throw new Error("FEED_URL is not set");
  const items = await fetchFeed(url);
  if (items.length === 0) return { seen: 0, added: 0, remaining: 0 };

  const existing = await db()
    .select({ guid: feedItems.guid })
    .from(feedItems)
    .where(
      inArray(
        feedItems.guid,
        items.map((i) => i.guid),
      ),
    );
  const known = new Set(existing.map((e) => e.guid));
  const fresh = items.filter((i) => !known.has(i.guid));
  const batch = fresh.slice(0, MAX_PER_RUN);

  let added = 0;
  for (let i = 0; i < batch.length; i += CHUNK) {
    const results = await Promise.allSettled(
      batch.slice(i, i + CHUNK).map((item) => ingestItem(item)),
    );
    for (let j = 0; j < results.length; j++) {
      const r = results[j];
      if (r.status === "fulfilled") added++;
      else console.error(`Failed to ingest ${batch[i + j].guid}:`, r.reason);
    }
  }
  return { seen: items.length, added, remaining: fresh.length - batch.length };
}

async function ingestItem(item: NormalisedItem): Promise<void> {
  const [copy, imageUrl] = await Promise.all([
    generateCopy(item),
    item.imageUrl ? rehostImage(item.imageUrl, item.guid) : Promise.resolve(null),
  ]);
  await db()
    .insert(feedItems)
    .values({
      guid: item.guid,
      companyKey: item.companyKey,
      postUrl: item.link,
      rawTitle: item.title,
      publishedAt: item.publishedAt,
      aiHeading: copy.heading,
      aiSummary: copy.summary,
      imageUrl,
    })
    .onConflictDoNothing();
}
