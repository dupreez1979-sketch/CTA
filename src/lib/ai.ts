import Anthropic from "@anthropic-ai/sdk";
import type { NormalisedItem } from "./feed";
import { recordAiUsage } from "./ai-spend";

/**
 * AI copy for the newsletter: one headline + one-sentence summary per feed
 * item, in the Alliance voice, plus featured-story selection for weekly and
 * fortnightly issues. Uses Claude Haiku 4.5 (per plan) — cheap, fast, and
 * structured outputs guarantee parseable JSON.
 */

const MODEL = "claude-haiku-4-5";

let _client: Anthropic | null = null;
function client() {
  if (!_client) _client = new Anthropic();
  return _client;
}

const VOICE = `You write for the Children's Theatre Alliance — the national
platform of Australia's professional theatre companies making work for
children. Voice: bold, warm, plain-spoken advocacy. Short declarative
sentences. Australian spelling ("theatre", not "theater"). No emoji, no
exclamation-spam — warmth comes from plain confident language.`;

export const COPY_SCHEMA = {
  type: "object",
  properties: {
    heading: {
      type: "string",
      description:
        "A short, punchy headline for the post, max ~9 words. It will be displayed in ALL CAPS display type, so write it in sentence case without relying on capitalisation for emphasis. Verb-first or noun-punch style, e.g. 'Rules of Summer returns for the holidays'.",
    },
    summary: {
      type: "string",
      description:
        "Exactly one sentence, sentence case, plain-spoken, that summarises the post for a newsletter reader. Include concrete details (dates, places, numbers) when present. Never use relative time words (today, tonight, tomorrow, yesterday, this weekend, next week): readers may see this days or weeks after the post. Convert them to absolute dates using the posted date, e.g. 'on Saturday 12 July' or 'in mid July'.",
    },
    presenterRelevance: {
      type: "string",
      enum: ["low", "medium", "high"],
      description:
        "Relevance to The Showcase, a bulletin for presenters and venues looking to book touring theatre for young audiences. 'high': the post announces a new show, a premiere, a new season, or a tour of a titled production that presenters elsewhere could book or present. 'medium': production news a presenter might follow but cannot book yet, such as a work in development, a creative development showing, casting for a future tour, or a major award for a production. 'low': everything else, including ticket reminders or promotion of an existing local run, social impact and access work, fundraising, workshops and classes, staffing and company news, and general community posts. A politician or dignitary visiting a company is 'low'.",
    },
    socialRelevance: {
      type: "string",
      enum: ["low", "medium", "high"],
      description:
        "Relevance to Social Theatre, a section about theatre embedded as social infrastructure. 'high': theatre genuinely working in social settings, such as performances or programmes in hospitals and health care, work with and for children with disability, relaxed or sensory-adapted performances, removing barriers to access, community wellbeing partnerships, or theatre reaching children who otherwise could not attend. 'medium': a post partly about such work. 'low': everything else. Education and learning programmes, school workshops and classes are NOT social theatre, and neither is fundraising.",
    },
    showTitle: {
      type: ["string", "null"],
      description:
        "The production's title exactly as written in the post, or null when relevance is low or no clear title is given.",
    },
    presenterReason: {
      type: "string",
      description: "One short sentence explaining the relevance rating.",
    },
  },
  required: [
    "heading",
    "summary",
    "presenterRelevance",
    "socialRelevance",
    "showTitle",
    "presenterReason",
  ],
  additionalProperties: false,
} as const;

export interface AiCopy {
  heading: string;
  summary: string;
  presenterRelevance: "low" | "medium" | "high";
  socialRelevance: "low" | "medium" | "high";
  showTitle: string | null;
  presenterReason: string;
}

/**
 * @param companyDisplayName the matched company's name, or null when the
 * post couldn't be matched — the copy must then take the name from the
 * post itself rather than attributing the news to the fallback bucket.
 */
export async function generateCopy(
  item: NormalisedItem,
  companyDisplayName: string | null,
): Promise<AiCopy> {
  const attribution =
    companyDisplayName ??
    "a company in the Alliance (the exact company is not identified — take the company name from the post itself if it's mentioned, and never attribute the news to 'the Alliance' or 'Around the Alliance')";
  const response = await client().messages.create({
    model: MODEL,
    max_tokens: 300,
    system: VOICE,
    output_config: { format: { type: "json_schema", schema: COPY_SCHEMA } },
    messages: [
      {
        role: "user",
        content: `Write the newsletter headline and one-sentence summary for this Facebook post by ${attribution}. Also rate the post's relevance to a separate presenter-facing edition about bookable touring shows. Important: the reader may see this days or weeks after the post, so never write relative time words like today, tomorrow or next week; use the posted date below to convert them to absolute dates.\n\nPost title: ${item.title || "(none)"}\nPost text: ${item.text.slice(0, 2000) || "(none)"}\nPosted: ${item.publishedAt.toISOString()}`,
      },
    ],
  });
  await recordAiUsage(response.usage.input_tokens, response.usage.output_tokens);
  const text = response.content.find((b) => b.type === "text");
  if (!text) throw new Error("No text block in AI copy response");
  return JSON.parse(text.text) as AiCopy;
}

const FEATURED_SCHEMA = {
  type: "object",
  properties: {
    index: {
      type: "integer",
      description: "Zero-based index of the most newsworthy item in the list.",
    },
    reason: { type: "string", description: "One short sentence why." },
  },
  required: ["index", "reason"],
  additionalProperties: false,
} as const;

/**
 * Pick the featured story for a weekly/fortnightly issue: the most
 * significant post across the whole window. Returns the item's index.
 */
export async function pickFeatured(
  items: { company: string; heading: string; summary: string }[],
): Promise<number> {
  if (items.length === 0) throw new Error("No items to pick featured from");
  if (items.length === 1) return 0;
  const list = items
    .map((it, i) => `${i}. [${it.company}] ${it.heading} — ${it.summary}`)
    .join("\n");
  const response = await client().messages.create({
    model: MODEL,
    max_tokens: 200,
    system: VOICE,
    output_config: { format: { type: "json_schema", schema: FEATURED_SCHEMA } },
    messages: [
      {
        role: "user",
        content: `Pick the single most newsworthy item to feature at the top of the Alliance newsletter — favour sector-wide significance (leadership changes, milestones, records, national tours) over routine show reminders.\n\n${list}`,
      },
    ],
  });
  await recordAiUsage(response.usage.input_tokens, response.usage.output_tokens);
  const text = response.content.find((b) => b.type === "text");
  if (!text) throw new Error("No text block in featured-pick response");
  const parsed = JSON.parse(text.text) as { index: number };
  return parsed.index >= 0 && parsed.index < items.length ? parsed.index : 0;
}

const REASSESS_SCHEMA = {
  type: "object",
  properties: {
    presenterRelevance: COPY_SCHEMA.properties.presenterRelevance,
    socialRelevance: COPY_SCHEMA.properties.socialRelevance,
    presenterReason: {
      type: "string",
      description: "One short sentence explaining the two ratings.",
    },
  },
  required: ["presenterRelevance", "socialRelevance", "presenterReason"],
  additionalProperties: false,
} as const;

/**
 * Re-rate a story that was ingested before the current rating rules
 * existed (or that the classifier got wrong). Works from the stored
 * headline, summary and raw post text; one small Haiku call.
 */
export async function reassessRatings(item: {
  heading: string;
  summary: string;
  rawTitle: string | null;
  company: string;
}): Promise<{
  presenterRelevance: "low" | "medium" | "high";
  socialRelevance: "low" | "medium" | "high";
  presenterReason: string;
}> {
  const response = await client().messages.create({
    model: MODEL,
    max_tokens: 250,
    system: VOICE,
    output_config: { format: { type: "json_schema", schema: REASSESS_SCHEMA } },
    messages: [
      {
        role: "user",
        content: `Rate this story on two independent scales, each low, medium or high. Judge each scale on its own merits — a story can be high on one and low on the other.\n\npresenterRelevance — ${COPY_SCHEMA.properties.presenterRelevance.description}\n\nsocialRelevance — ${COPY_SCHEMA.properties.socialRelevance.description}\n\nStory by ${item.company}:\nHeadline: ${item.heading}\nSummary: ${item.summary}\nOriginal post title: ${(item.rawTitle ?? "").slice(0, 1500) || "(none)"}`,
      },
    ],
  });
  await recordAiUsage(response.usage.input_tokens, response.usage.output_tokens);
  const text = response.content.find((b) => b.type === "text");
  if (!text) throw new Error("No text block in reassess response");
  return JSON.parse(text.text) as {
    presenterRelevance: "low" | "medium" | "high";
    socialRelevance: "low" | "medium" | "high";
    presenterReason: string;
  };
}

const REWRITE_TIME_SCHEMA = {
  type: "object",
  properties: {
    heading: {
      type: "string",
      description:
        "The headline with any relative time expression converted to an absolute date; otherwise word-for-word identical.",
    },
    summary: {
      type: "string",
      description:
        "The summary with any relative time expression converted to an absolute date; otherwise word-for-word identical.",
    },
  },
  required: ["heading", "summary"],
  additionalProperties: false,
} as const;

/**
 * Fix copy written before the no-relative-time rule (or that slipped
 * through): convert "tomorrow" / "next week" style phrases to absolute
 * dates anchored on the post's publish date, changing nothing else.
 */
export async function rewriteTimeReferences(
  heading: string,
  summary: string,
  publishedAt: Date,
): Promise<{ heading: string; summary: string }> {
  const posted = new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Sydney",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(publishedAt);
  const response = await client().messages.create({
    model: MODEL,
    max_tokens: 300,
    system: VOICE,
    output_config: {
      format: { type: "json_schema", schema: REWRITE_TIME_SCHEMA },
    },
    messages: [
      {
        role: "user",
        content: `This newsletter copy was written about a post published on ${posted}. Readers may see it much later, so rewrite ONLY relative time expressions (today, tonight, tomorrow, yesterday, this weekend, next week and similar) into absolute dates calculated from the publish date, e.g. "tomorrow" becomes "on Saturday 12 July". If an exact day can't be worked out, use the month ("in mid July"). Keep every other word unchanged.\n\nHeadline: ${heading}\nSummary: ${summary}`,
      },
    ],
  });
  await recordAiUsage(response.usage.input_tokens, response.usage.output_tokens);
  const text = response.content.find((b) => b.type === "text");
  if (!text) throw new Error("No text block in time-rewrite response");
  return JSON.parse(text.text) as { heading: string; summary: string };
}

const SHOW_URL_SCHEMA = {
  type: "object",
  properties: {
    index: {
      type: "integer",
      description:
        "Zero-based index of the link that is the official page for the show, or -1 if none of the links match.",
    },
  },
  required: ["index"],
  additionalProperties: false,
} as const;

/**
 * The Showcase's research fallback: given the links found on a company's
 * shows page, pick the one that is the official page for the named show.
 * Only called when deterministic title matching was ambiguous. Returns the
 * link index, or null when no link matches.
 */
export async function pickShowUrl(
  showTitle: string,
  links: { url: string; text: string }[],
): Promise<number | null> {
  if (links.length === 0) return null;
  const list = links
    .map((l, i) => `${i}. "${l.text}" -> ${l.url}`)
    .join("\n");
  const response = await client().messages.create({
    model: MODEL,
    max_tokens: 150,
    system: VOICE,
    output_config: { format: { type: "json_schema", schema: SHOW_URL_SCHEMA } },
    messages: [
      {
        role: "user",
        content: `These links were found on a theatre company's shows page. Which one is the official page for the production titled "${showTitle}"? Answer -1 if none of them clearly is.\n\n${list}`,
      },
    ],
  });
  await recordAiUsage(response.usage.input_tokens, response.usage.output_tokens);
  const text = response.content.find((b) => b.type === "text");
  if (!text) throw new Error("No text block in show-url response");
  const parsed = JSON.parse(text.text) as { index: number };
  return parsed.index >= 0 && parsed.index < links.length ? parsed.index : null;
}
