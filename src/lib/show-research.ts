import { pickShowUrl } from "./ai";
import { rehostImage } from "./images";

/**
 * The Showcase's automatic show research. Given a company's "our shows"
 * page and a show title from the classifier, find the show's official page
 * and pull official copy from it (blurb, age range, image). Every step is
 * best-effort: any failure just leaves fields null for manual editing in
 * admin — research must never break the pipeline.
 *
 * The parsers are pure functions (regex over HTML) so they're unit-testable
 * from fixtures; only fetchHtml/researchItem touch the network, and real
 * fetches of company sites only work in production.
 */

const FETCH_TIMEOUT_MS = 6_000;
const ITEM_DEADLINE_MS = 20_000;
const MAX_HTML_BYTES = 500 * 1024;
const MAX_LINKS = 100;
const MAX_BLURB_CHARS = 400;

export interface PageLink {
  url: string;
  text: string;
}

export interface ShowResearchResult {
  showUrl: string | null;
  showBlurb: string | null;
  showAgeRange: string | null;
  showImageUrl: string | null;
}

export const EMPTY_RESEARCH: ShowResearchResult = {
  showUrl: null,
  showBlurb: null,
  showAgeRange: null,
  showImageUrl: null,
};

// Common named HTML entities seen in website copy. Unknown names are left
// as-is rather than guessed.
const NAMED_ENTITIES: Record<string, string> = {
  quot: '"',
  apos: "'",
  nbsp: " ",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”",
  ndash: "–",
  mdash: "—",
  hellip: "…",
  middot: "·",
  bull: "•",
  copy: "©",
  reg: "®",
  trade: "™",
  deg: "°",
  frac12: "½",
  times: "×",
  shy: "",
  aacute: "á",
  agrave: "à",
  auml: "ä",
  ccedil: "ç",
  eacute: "é",
  egrave: "è",
  iacute: "í",
  ntilde: "ñ",
  oacute: "ó",
  ouml: "ö",
  uacute: "ú",
  uuml: "ü",
};

function fromCodePointSafe(code: number): string {
  try {
    return String.fromCodePoint(code);
  } catch {
    return "";
  }
}

/**
 * Decode HTML entities in text pulled from websites: numeric forms
 * (&#8217; and &#x2019;), the common named forms above, and &amp; last so
 * it can't manufacture new entities. Also collapses whitespace. Safe to
 * run on already-clean text.
 */
export function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
      fromCodePointSafe(parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, dec) => fromCodePointSafe(parseInt(dec, 10)))
    .replace(/&([a-z]+[0-9]*);/gi, (match, name) => {
      const lower = name.toLowerCase();
      if (lower === "amp") return match; // handled last
      if (lower === "lt") return "<";
      if (lower === "gt") return ">";
      return NAMED_ENTITIES[lower] ?? match;
    })
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

/** All anchor links on a page, absolutised, deduped, junk removed. */
export function extractLinks(html: string, baseUrl: string): PageLink[] {
  const links: PageLink[] = [];
  const seen = new Set<string>();
  const re = /<a\b[^>]*href=["']([^"'#][^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null && links.length < MAX_LINKS) {
    const href = m[1].trim();
    if (/^(mailto:|tel:|javascript:)/i.test(href)) continue;
    let url: string;
    try {
      const u = new URL(href, baseUrl);
      if (u.protocol !== "http:" && u.protocol !== "https:") continue;
      u.hash = "";
      url = u.toString();
    } catch {
      continue;
    }
    if (seen.has(url)) continue;
    seen.add(url);
    links.push({ url, text: decodeEntities(m[2].replace(/<[^>]+>/g, " ")) });
  }
  return links;
}

function normalise(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Deterministic show-link match: the show's title appears in exactly one
 * link's text or URL slug. Returns null when nothing or more than one
 * distinct URL matches (the AI fallback then decides).
 */
export function matchLinkByTitle(
  links: PageLink[],
  showTitle: string,
): string | null {
  const title = normalise(showTitle);
  if (!title) return null;
  const slugTitle = title.replace(/ /g, "-");
  const hits = links.filter(
    (l) =>
      normalise(l.text).includes(title) ||
      normalise(decodeURIComponent(l.url)).includes(title) ||
      l.url.toLowerCase().includes(slugTitle),
  );
  const unique = [...new Set(hits.map((h) => h.url))];
  return unique.length === 1 ? unique[0] : null;
}

function metaContent(html: string, matcher: RegExp): string | null {
  // Meta tags can have property/name before or after content
  const tags = html.match(/<meta\b[^>]*>/gi) ?? [];
  for (const tag of tags) {
    if (!matcher.test(tag)) continue;
    const content = tag.match(/content=["']([^"']*)["']/i);
    if (content?.[1]?.trim()) return decodeEntities(content[1]);
  }
  return null;
}

/**
 * Normalise an age mention to plain "ages X to Y" style copy (no dashes,
 * per the Alliance style rules).
 */
export function extractAgeRange(text: string): string | null {
  const range = text.match(
    /ages?\s+(\d{1,2})\s*(?:to|[-–—])\s*(\d{1,3})/i,
  );
  if (range) return `ages ${range[1]} to ${range[2]}`;
  const rangeYears = text.match(
    /(\d{1,2})\s*(?:to|[-–—])\s*(\d{1,3})\s*(?:year|yr)s?/i,
  );
  if (rangeYears) return `ages ${rangeYears[1]} to ${rangeYears[2]}`;
  const plus = text.match(/ages?\s+(\d{1,2})\s*\+|(\d{1,2})\s*\+\s*(?:year|yr)s?/i);
  if (plus) return `ages ${plus[1] ?? plus[2]} and up`;
  const single = text.match(/ages?\s+(\d{1,2})(?!\d)/i);
  if (single) return `ages ${single[1]}`;
  return null;
}

/** Official copy from a show page: blurb, age range, lead image. */
export function extractShowMeta(
  html: string,
  pageUrl: string,
): { blurb: string | null; ageRange: string | null; imageUrl: string | null } {
  let blurb =
    metaContent(html, /property=["']og:description["']/i) ??
    metaContent(html, /name=["']description["']/i);
  if (!blurb) {
    // First non-trivial paragraph as a fallback
    const paras = html.match(/<p\b[^>]*>([\s\S]*?)<\/p>/gi) ?? [];
    for (const p of paras) {
      const textContent = decodeEntities(p.replace(/<[^>]+>/g, " "));
      if (textContent.length >= 60) {
        blurb = textContent;
        break;
      }
    }
  }
  if (blurb && blurb.length > MAX_BLURB_CHARS) {
    blurb = `${blurb.slice(0, MAX_BLURB_CHARS).replace(/\s+\S*$/, "")}...`;
  }

  const visibleText = decodeEntities(
    html
      .replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  );
  const ageRange = extractAgeRange(`${blurb ?? ""} ${visibleText}`);

  const ogImage =
    metaContent(html, /property=["']og:image:secure_url["']/i) ??
    metaContent(html, /property=["']og:image["']/i);
  let imageUrl: string | null = null;
  if (ogImage) {
    try {
      imageUrl = new URL(ogImage, pageUrl).toString();
    } catch {
      imageUrl = null;
    }
  }

  return { blurb: blurb ?? null, ageRange, imageUrl };
}

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { "user-agent": "CTA-Newsletter/1.0" },
    });
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) return null;
    const text = await res.text();
    return text.slice(0, MAX_HTML_BYTES);
  } catch (err) {
    console.error(`Show research fetch failed for ${url}:`, err);
    return null;
  }
}

async function researchItemInner(
  showTitle: string | null,
  guid: string,
  showsPageUrl: string | null,
): Promise<ShowResearchResult> {
  if (!showTitle || !showsPageUrl) return EMPTY_RESEARCH;

  const showsPageHtml = await fetchHtml(showsPageUrl);
  if (!showsPageHtml) return EMPTY_RESEARCH;

  const links = extractLinks(showsPageHtml, showsPageUrl);
  let showUrl = matchLinkByTitle(links, showTitle);
  if (!showUrl && links.length > 0) {
    const idx = await pickShowUrl(showTitle, links).catch(() => null);
    if (idx !== null) showUrl = links[idx].url;
  }
  if (!showUrl) return EMPTY_RESEARCH;

  const showPageHtml = await fetchHtml(showUrl);
  if (!showPageHtml) return { ...EMPTY_RESEARCH, showUrl };

  const meta = extractShowMeta(showPageHtml, showUrl);
  const showImageUrl = meta.imageUrl
    ? await rehostImage(meta.imageUrl, `${guid}-show`)
    : null;

  return {
    showUrl,
    showBlurb: meta.blurb,
    showAgeRange: meta.ageRange,
    showImageUrl,
  };
}

/**
 * Research one Showcase draft item against its company's shows page.
 * Never throws; always returns a (possibly partial or empty) result within
 * a hard deadline so one slow site can't eat the function's time budget.
 */
export async function researchItem(
  showTitle: string | null,
  guid: string,
  showsPageUrl: string | null,
): Promise<ShowResearchResult> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<ShowResearchResult>((resolve) => {
    timer = setTimeout(() => resolve(EMPTY_RESEARCH), ITEM_DEADLINE_MS);
  });
  try {
    return await Promise.race([
      researchItemInner(showTitle, guid, showsPageUrl),
      deadline,
    ]);
  } catch (err) {
    console.error(`Show research failed for ${guid}:`, err);
    return EMPTY_RESEARCH;
  } finally {
    clearTimeout(timer);
  }
}
