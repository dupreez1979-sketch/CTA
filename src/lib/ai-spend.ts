import { sql } from "drizzle-orm";
import { db, aiSpend } from "./db";
import { getSetting, setSetting } from "./settings";

/**
 * Estimated Anthropic API spend tracker. Anthropic has no API for reading
 * the remaining prepaid credit balance, so we count the tokens this app
 * uses and convert to dollars — shown in admin against an editable
 * "credits purchased" budget, with a reset for top-ups. The console
 * remains the authoritative balance.
 */

// USD per million tokens for claude-haiku-4-5 (keep in sync with the
// model used in src/lib/ai.ts).
const INPUT_USD_PER_MTOK = 1;
const OUTPUT_USD_PER_MTOK = 5;

const BUDGET_KEY = "ai_budget_usd";
const BASELINE_KEY = "ai_baseline_usd";
const DEFAULT_BUDGET_USD = 25;

export function tokensToUsd(inputTokens: number, outputTokens: number): number {
  return (
    (inputTokens / 1_000_000) * INPUT_USD_PER_MTOK +
    (outputTokens / 1_000_000) * OUTPUT_USD_PER_MTOK
  );
}

/** Record one API call's token usage. Never throws — tracking must not
 * break ingestion. */
export async function recordAiUsage(
  inputTokens: number,
  outputTokens: number,
): Promise<void> {
  try {
    const day = new Date().toISOString().slice(0, 10);
    await db()
      .insert(aiSpend)
      .values({ day, inputTokens, outputTokens, calls: 1 })
      .onConflictDoUpdate({
        target: aiSpend.day,
        set: {
          inputTokens: sql`${aiSpend.inputTokens} + ${inputTokens}`,
          outputTokens: sql`${aiSpend.outputTokens} + ${outputTokens}`,
          calls: sql`${aiSpend.calls} + 1`,
        },
      });
  } catch (err) {
    console.error("Failed to record AI usage:", err);
  }
}

export interface AiSpendSummary {
  /** Estimated USD used since the last "topped up" reset. */
  usedUsd: number;
  /** Admin-set credits budget in USD. */
  budgetUsd: number;
  /** Estimated USD remaining of the budget. */
  remainingUsd: number;
  /** 0..100 for the progress bar. */
  usedPct: number;
  totalCalls: number;
}

export async function getAiSpend(): Promise<AiSpendSummary> {
  const [totals] = await db()
    .select({
      input: sql<number>`coalesce(sum(${aiSpend.inputTokens}), 0)::bigint`,
      output: sql<number>`coalesce(sum(${aiSpend.outputTokens}), 0)::bigint`,
      calls: sql<number>`coalesce(sum(${aiSpend.calls}), 0)::int`,
    })
    .from(aiSpend);
  const totalUsd = tokensToUsd(Number(totals.input), Number(totals.output));
  const baseline = Number((await getSetting(BASELINE_KEY)) ?? "0") || 0;
  const budgetUsd =
    Number((await getSetting(BUDGET_KEY)) ?? "") || DEFAULT_BUDGET_USD;
  const usedUsd = Math.max(0, totalUsd - baseline);
  return {
    usedUsd,
    budgetUsd,
    remainingUsd: Math.max(0, budgetUsd - usedUsd),
    usedPct: Math.min(100, (usedUsd / budgetUsd) * 100),
    totalCalls: Number(totals.calls),
  };
}

export async function setBudget(usd: number): Promise<void> {
  await setSetting(BUDGET_KEY, String(usd));
}

/** "I've just topped up" — zeroes the bar without losing usage history. */
export async function resetBaseline(): Promise<void> {
  const [totals] = await db()
    .select({
      input: sql<number>`coalesce(sum(${aiSpend.inputTokens}), 0)::bigint`,
      output: sql<number>`coalesce(sum(${aiSpend.outputTokens}), 0)::bigint`,
    })
    .from(aiSpend);
  await setSetting(
    BASELINE_KEY,
    String(tokensToUsd(Number(totals.input), Number(totals.output))),
  );
}
