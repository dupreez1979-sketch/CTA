import { NextRequest, NextResponse } from "next/server";
import { ingestFeed } from "@/lib/ingest";

export const dynamic = "force-dynamic";

/**
 * Admin: fetch new posts from the feed on demand (same ingest step the
 * daily pipeline runs). Handy after first deploy and for browser-only
 * smoke tests — no curl required.
 */
export async function POST(request: NextRequest) {
  try {
    const result = await ingestFeed();
    const message = `Fetched feed: ${result.seen} posts seen, ${result.added} new ingested${result.remaining > 0 ? `, ${result.remaining} still queued (click again)` : ""}`;
    return NextResponse.redirect(
      new URL(`/admin?tab=sending&message=${encodeURIComponent(message)}`, request.url),
      { status: 303 },
    );
  } catch (err) {
    return NextResponse.redirect(
      new URL(`/admin?tab=sending&message=${encodeURIComponent(`Ingest failed: ${err}`)}`, request.url),
      { status: 303 },
    );
  }
}
