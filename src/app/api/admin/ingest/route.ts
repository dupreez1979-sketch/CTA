import { NextRequest, NextResponse } from "next/server";
import { canonicalBase } from "@/lib/canonical";
import { ingestFeed } from "@/lib/ingest";
import { runPresenterPipeline } from "@/lib/presenter";

export const dynamic = "force-dynamic";

/** Keep error details readable inside the banner message. */
function trim(error: string | undefined): string {
  if (!error) return "unknown error";
  return error.length > 120 ? `${error.slice(0, 120)}…` : error;
}

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
    const broken = result.feeds.filter((f) => f.error && !f.failed);
    const failedNote =
      broken.length > 0
        ? `; feed problem: ${broken.map((f) => `${f.name} (${trim(f.error)})`).join(", ")}`
        : "";
    const firstItemError = result.feeds.find((f) => f.failed)?.error;
    const itemNote =
      result.failed > 0
        ? `; ${result.failed} stor${result.failed === 1 ? "y" : "ies"} could not be processed${firstItemError ? ` (first error: ${trim(firstItemError)})` : ""}`
        : "";
    const reviewNote =
      result.queued > 0
        ? `, ${result.queued} waiting for review below`
        : "";
    const message = `Refreshed ${result.feeds.length} feed${result.feeds.length === 1 ? "" : "s"}: ${result.seen} stories seen, ${result.added} new${reviewNote}${result.remaining > 0 ? `, ${result.remaining} still queued (click again)` : ""}${showcaseNote}${itemNote}${failedNote}`;
    return NextResponse.redirect(
      new URL(`/admin?tab=review&message=${encodeURIComponent(message)}`, canonicalBase(request.url)),
      { status: 303 },
    );
  } catch (err) {
    return NextResponse.redirect(
      new URL(`/admin?tab=review&message=${encodeURIComponent(`Ingest failed: ${err}`)}`, canonicalBase(request.url)),
      { status: 303 },
    );
  }
}
