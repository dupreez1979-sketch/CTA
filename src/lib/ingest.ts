import { inArray } from "drizzle-orm";
import { db, feedItems } from "./db";
import { fetchFeed, type NormalisedItem } from "./feed";
import { generateCopy } from "./ai";
import { rehostImage } from "./images";

/**
 * Feed ingestion: fetch the RSS feed, skip items already stored (by guid),
 * and for each new item generate AI copy, re-host its image, and insert.
 * Item failures are logged and skipped so one bad post can't block an issue.
 */
export async function ingestFeed(): Promise<{ seen: number; added: number }> {
  const url = process.env.FEED_URL;
  if (!url) throw new Error("FEED_URL is not set");
  const items = await fetchFeed(url);
  if (items.length === 0) return { seen: 0, added: 0 };

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

  let added = 0;
  for (const item of fresh) {
    try {
      await ingestItem(item);
      added++;
    } catch (err) {
      console.error(`Failed to ingest ${item.guid}:`, err);
    }
  }
  return { seen: items.length, added };
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
