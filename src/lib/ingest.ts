import { inArray } from "drizzle-orm";
import { db, feedItems, type Feed } from "./db";
import { fetchFeed, type NormalisedItem } from "./feed";
import { assessCompanyMatch, generateCopy } from "./ai";
import { rehostImage } from "./images";
import { loadCompanies } from "./company-store";
import {
  FALLBACK_COMPANY_KEY,
  matchCompanyDetailed,
  type Company,
} from "./companies";
import { activeFeeds } from "./feed-store";

/**
 * Feed ingestion across every active feed in the registry (Settings → RSS
 * feeds). For each feed: skip items already stored (by guid), and for each
 * new item generate AI copy, re-host its image, and insert. Items from
 * "automatic" feeds (trusted, company-controlled) enter the story stream
 * immediately; items from "review" feeds (media/news coverage) are stored
 * as pending with an AI company-match assessment and wait in the review
 * queue for human approval. Work is capped per run and processed in
 * parallel chunks so an invocation fits inside Netlify's function time
 * limit — anything left over is picked up by the next run (each item
 * commits independently). Item and feed failures are logged and skipped so
 * one bad post or one broken feed can't block the pipeline.
 */

const MAX_PER_RUN = Number(process.env.INGEST_MAX_PER_RUN ?? 10);
const CHUNK = 5;
const RAW_TEXT_MAX = 4000;

export interface IngestSummary {
  seen: number;
  added: number;
  remaining: number;
  /** How many of the added items went to the review queue. */
  queued: number;
  feeds: Array<{ name: string; added: number; error?: string }>;
}

export async function ingestFeed(): Promise<IngestSummary> {
  const [companies, sources] = await Promise.all([
    loadCompanies(),
    activeFeeds(),
  ]);
  const summary: IngestSummary = {
    seen: 0,
    added: 0,
    remaining: 0,
    queued: 0,
    feeds: [],
  };
  for (const feed of sources) {
    try {
      const r = await ingestOneFeed(feed, companies);
      summary.seen += r.seen;
      summary.added += r.added;
      summary.remaining += r.remaining;
      if (feed.mode === "review") summary.queued += r.added;
      summary.feeds.push({ name: feed.name, added: r.added });
    } catch (err) {
      console.error(`Feed "${feed.name}" failed:`, err);
      summary.feeds.push({
        name: feed.name,
        added: 0,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
  return summary;
}

async function ingestOneFeed(
  feed: Feed,
  companies: Company[],
): Promise<{ seen: number; added: number; remaining: number }> {
  const nameByKey = new Map(companies.map((c) => [c.key, c.name]));
  const items = await fetchFeed(feed.url, companies);
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
      batch
        .slice(i, i + CHUNK)
        .map((item) =>
          feed.mode === "review"
            ? ingestReviewItem(item, feed, companies, nameByKey)
            : ingestItem(item, feed, nameByKey.get(item.companyKey) ?? null),
        ),
    );
    for (let j = 0; j < results.length; j++) {
      const r = results[j];
      if (r.status === "fulfilled") added++;
      else console.error(`Failed to ingest ${batch[i + j].guid}:`, r.reason);
    }
  }
  return { seen: items.length, added, remaining: fresh.length - batch.length };
}

/** Trusted automatic feed: the item enters the story stream immediately. */
async function ingestItem(
  item: NormalisedItem,
  feed: Feed,
  companyDisplayName: string | null,
): Promise<void> {
  const [copy, imageUrl] = await Promise.all([
    generateCopy(item, companyDisplayName),
    item.imageUrl ? rehostImage(item.imageUrl, item.guid) : Promise.resolve(null),
  ]);
  await db()
    .insert(feedItems)
    .values({
      guid: item.guid,
      feedId: feed.id,
      reviewStatus: "auto",
      companyKey: item.companyKey,
      postUrl: item.link,
      rawTitle: item.title,
      creator: item.creator,
      publishedAt: item.publishedAt,
      aiHeading: copy.heading,
      aiSummary: copy.summary,
      imageUrl,
      // The Showcase: high-relevance stories are offered to new editions.
      presenterRelevance: copy.presenterRelevance,
      socialRelevance: copy.socialRelevance,
      presenterReason: copy.presenterReason,
      showTitle: copy.showTitle,
    })
    .onConflictDoNothing();
}

/**
 * Manual-review feed: assess which company (if any) the article is really
 * about, generate the copy up front so approval is instant and reviewers
 * can judge the finished story, and park the row as "pending".
 */
async function ingestReviewItem(
  item: NormalisedItem,
  feed: Feed,
  companies: Company[],
  nameByKey: Map<string, string>,
): Promise<void> {
  const { markers } = matchCompanyDetailed(
    { creator: item.creator ?? undefined, title: item.title, link: item.link },
    companies,
  );
  const match = await assessCompanyMatch(item, companies);
  const suggestedKey =
    match.companyKey && nameByKey.has(match.companyKey)
      ? match.companyKey
      : FALLBACK_COMPANY_KEY;
  const [copy, imageUrl] = await Promise.all([
    generateCopy(item, nameByKey.get(suggestedKey) ?? null),
    item.imageUrl ? rehostImage(item.imageUrl, item.guid) : Promise.resolve(null),
  ]);
  await db()
    .insert(feedItems)
    .values({
      guid: item.guid,
      feedId: feed.id,
      reviewStatus: "pending",
      companyKey: suggestedKey,
      suggestedCompanyKey: suggestedKey,
      aiMatchConfidence: match.confidence,
      aiMatchReason: match.reason,
      matchedMarkers: markers.join(", ") || null,
      rawText: item.text.slice(0, RAW_TEXT_MAX) || null,
      postUrl: item.link,
      rawTitle: item.title,
      creator: item.creator,
      publishedAt: item.publishedAt,
      aiHeading: copy.heading,
      aiSummary: copy.summary,
      imageUrl,
      presenterRelevance: copy.presenterRelevance,
      socialRelevance: copy.socialRelevance,
      presenterReason: copy.presenterReason,
      showTitle: copy.showTitle,
    })
    .onConflictDoNothing();
}
