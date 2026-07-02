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

const COPY_SCHEMA = {
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
        "Exactly one sentence, sentence case, plain-spoken, that summarises the post for a newsletter reader. Include concrete details (dates, places, numbers) when present.",
    },
  },
  required: ["heading", "summary"],
  additionalProperties: false,
} as const;

export interface AiCopy {
  heading: string;
  summary: string;
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
        content: `Write the newsletter headline and one-sentence summary for this Facebook post by ${attribution}.\n\nPost title: ${item.title || "(none)"}\nPost text: ${item.text.slice(0, 2000) || "(none)"}\nPosted: ${item.publishedAt.toISOString()}`,
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
