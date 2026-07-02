import Parser from "rss-parser";
import { matchCompany } from "./companies";

/**
 * Feed ingestion for the Alliance RSS feed (rss.app — aggregated Facebook
 * posts from member companies). Normalises each item to the fields the
 * pipeline needs and matches it to a member company.
 */

export interface NormalisedItem {
  guid: string;
  companyKey: string;
  title: string;
  text: string;
  link: string;
  publishedAt: Date;
  imageUrl: string | null;
}

type RawItem = {
  guid?: string;
  title?: string;
  link?: string;
  pubDate?: string;
  isoDate?: string;
  creator?: string;
  content?: string;
  contentSnippet?: string;
  enclosure?: { url?: string };
  mediaContent?: { $?: { url?: string } } | Array<{ $?: { url?: string } }>;
};

const parser = new Parser<Record<string, never>, RawItem>({
  customFields: {
    item: [
      ["media:content", "mediaContent", { keepArray: false }],
      ["dc:creator", "creator"],
    ],
  },
});

function extractImage(item: RawItem): string | null {
  const media = Array.isArray(item.mediaContent)
    ? item.mediaContent[0]
    : item.mediaContent;
  if (media?.$?.url) return media.$.url;
  if (item.enclosure?.url) return item.enclosure.url;
  const imgMatch = item.content?.match(/<img[^>]+src=["']([^"']+)["']/i);
  return imgMatch ? imgMatch[1] : null;
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

export function normaliseItem(item: RawItem): NormalisedItem | null {
  const link = item.link?.trim();
  if (!link) return null;
  const guid = item.guid?.trim() || link;
  const publishedAt = new Date(item.isoDate ?? item.pubDate ?? "");
  if (isNaN(publishedAt.getTime())) return null;
  const title = (item.title ?? "").trim();
  const text = item.contentSnippet?.trim() || stripHtml(item.content ?? "");
  return {
    guid,
    companyKey: matchCompany({ creator: item.creator, title, link }),
    title,
    text,
    link,
    publishedAt,
    imageUrl: extractImage(item),
  };
}

export async function parseFeed(xml: string): Promise<NormalisedItem[]> {
  const feed = await parser.parseString(xml);
  return (feed.items ?? [])
    .map((item) => normaliseItem(item))
    .filter((i): i is NormalisedItem => i !== null);
}

export async function fetchFeed(url: string): Promise<NormalisedItem[]> {
  const res = await fetch(url, {
    headers: { "user-agent": "CTA-Newsletter/1.0" },
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) {
    throw new Error(`Feed fetch failed: ${res.status} ${res.statusText}`);
  }
  return parseFeed(await res.text());
}
