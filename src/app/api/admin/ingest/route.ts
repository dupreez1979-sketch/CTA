import { NextRequest, NextResponse } from "next/server";
import { ingestFeed } from "@/lib/ingest";
import { runPresenterPipeline } from "@/lib/presenter";

export const dynamic = "force-dynamic";

/**
 * Admin: fetch new posts from the feed on demand (same ingest step the
 * daily pipeline runs, including The Showcase's research/notify step).
 * Handy after first deploy and for browser-only smoke tests — no curl
 * required.
 */
export async function POST(request: NextRequest) {
  try {
    const result = await ingestFeed();
    const showcase = await runPresenterPipeline().catch(() => null);
    const showcaseNote =
      showcase && showcase.availableCount > 0
        ? `; ${showcase.availableCount} stor${showcase.availableCount === 1 ? "y is" : "ies are"} ready for the next Showcase`
        : "";
    const failed = result.feeds.filter((f) => f.error);
    const failedNote =
      failed.length > 0
        ? `; feed problem: ${failed.map((f) => f.name).join(", ")}`
        : "";
    const reviewNote =
      result.queued > 0
        ? `, ${result.queued} waiting in Review`
        : "";
    const message = `Refreshed ${result.feeds.length} feed${result.feeds.length === 1 ? "" : "s"}: ${result.seen} stories seen, ${result.added} new${reviewNote}${result.remaining > 0 ? `, ${result.remaining} still queued (click again)` : ""}${showcaseNote}${failedNote}`;
    return NextResponse.redirect(
      new URL(`/admin?tab=editions&message=${encodeURIComponent(message)}`, request.url),
      { status: 303 },
    );
  } catch (err) {
    return NextResponse.redirect(
      new URL(`/admin?tab=editions&message=${encodeURIComponent(`Ingest failed: ${err}`)}`, request.url),
      { status: 303 },
    );
  }
}
