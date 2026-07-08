import { NextRequest, NextResponse } from "next/server";
import { ingestFeed } from "@/lib/ingest";
import { cadencesDueNow, issueWindow } from "@/lib/cadence";
import { sendIssue } from "@/lib/send";
import { runPresenterPipeline } from "@/lib/presenter";

export const dynamic = "force-dynamic";

/**
 * The daily pipeline, triggered by the Netlify scheduled function
 * (netlify/functions/daily-pipeline.mts) each morning Sydney time:
 * ingest new feed items, then send whichever issues are due — daily
 * always, weekly on Mondays, fortnightly on alternate Mondays (parity
 * anchored by FORTNIGHT_ANCHOR).
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

  // The Showcase: research new drafts and notify the test list that a
  // draft is ready. Never sends the edition itself — that happens from
  // admin after review.
  try {
    results.showcase = await runPresenterPipeline();
  } catch (err) {
    results.showcase = { error: String(err) };
  }

  // Capture the send window AFTER ingest so this run's freshly-ingested
  // stories fall inside it. The window ends at `sendAt`; using the top-of-
  // handler `now` (before ingest) would stamp new stories just past the end
  // and skip the edition. Same Sydney day, so the window key is unchanged.
  const sendAt = new Date();
  const anchor = process.env.FORTNIGHT_ANCHOR ?? "2026-07-06";
  for (const cadence of cadencesDueNow(sendAt, anchor)) {
    try {
      results[cadence] = await sendIssue(issueWindow(cadence, sendAt));
    } catch (err) {
      results[cadence] = { error: String(err) };
    }
  }

  return NextResponse.json({ ok: true, at: now.toISOString(), results });
}
