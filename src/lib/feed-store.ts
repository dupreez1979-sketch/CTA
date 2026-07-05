import { db, feeds, type Feed } from "./db";

/**
 * DB-backed RSS feed registry, managed from the admin console (Settings →
 * RSS feeds). Seeds itself on first read so existing deployments migrate
 * without a manual step: the original hardcoded FEED_URL becomes an
 * "automatic" (trusted) feed, and the media-coverage feed starts in
 * "review" mode so its articles queue for human approval.
 */

const MEDIA_FEED_URL = "https://rss.app/feeds/_atwjom7YiuwOfEOi.xml";

export function seedFeeds(): Array<{
  name: string;
  url: string;
  mode: Feed["mode"];
  notes: string;
}> {
  const list: Array<{
    name: string;
    url: string;
    mode: Feed["mode"];
    notes: string;
  }> = [];
  if (process.env.FEED_URL) {
    list.push({
      name: "Alliance social posts",
      url: process.env.FEED_URL,
      mode: "automatic",
      notes: "Company-controlled social media posts. Trusted.",
    });
  }
  list.push({
    name: "Media coverage",
    url: MEDIA_FEED_URL,
    mode: "review",
    notes: "News and industry articles. Reviewed before publishing.",
  });
  return list;
}

export async function loadFeeds(): Promise<Feed[]> {
  const rows = await db().select().from(feeds).orderBy(feeds.name);
  if (rows.length > 0) return rows;
  await db().insert(feeds).values(seedFeeds()).onConflictDoNothing();
  return db().select().from(feeds).orderBy(feeds.name);
}

export async function activeFeeds(): Promise<Feed[]> {
  return (await loadFeeds()).filter((f) => f.active);
}
