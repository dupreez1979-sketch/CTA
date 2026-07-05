import { NextRequest, NextResponse } from "next/server";
import { canonicalBase } from "@/lib/canonical";
import { setBlockedSources } from "@/lib/blocked-sources";

export const dynamic = "force-dynamic";

/**
 * Admin: save the list of blocked media sources. Their articles are kept
 * out of the review queue (and skipped at ingest). Comma or newline
 * separated; terms match a story's author, link or title.
 */
export async function POST(request: NextRequest) {
  const form = await request.formData();
  const terms = await setBlockedSources(String(form.get("terms") ?? ""));
  const message =
    terms.length > 0
      ? `Blocked ${terms.length} source${terms.length === 1 ? "" : "s"}: ${terms.join(", ")}`
      : "Blocked sources cleared";
  return NextResponse.redirect(
    new URL(
      `/admin?tab=settings&message=${encodeURIComponent(message)}`,
      canonicalBase(request.url),
    ),
    { status: 303 },
  );
}
