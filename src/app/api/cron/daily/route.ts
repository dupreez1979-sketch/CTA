import { NextRequest, NextResponse } from "next/server";
import { ingestFeed } from "@/lib/ingest";
import { cadencesDueNow, issueWindow } from "@/lib/cadence";
import { sendIssue } from "@/lib/send";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

/**
 * The daily pipeline, triggered by Vercel Cron (see vercel.json) each
 * morning Sydney time: ingest new feed items, then send whichever issues
 * are due — daily always, weekly on Mondays, fortnightly on alternate
 * Mondays (parity anchored by FORTNIGHT_ANCHOR).
 */
export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const results: Record<string, unknown> = {};

  try {
    results.ingest = await ingestFeed();
  } catch (err) {
    results.ingest = { error: String(err) };
  }

  const anchor = process.env.FORTNIGHT_ANCHOR ?? "2026-07-06";
  for (const cadence of cadencesDueNow(now, anchor)) {
    try {
      results[cadence] = await sendIssue(issueWindow(cadence, now));
    } catch (err) {
      results[cadence] = { error: String(err) };
    }
  }

  return NextResponse.json({ ok: true, at: now.toISOString(), results });
}
