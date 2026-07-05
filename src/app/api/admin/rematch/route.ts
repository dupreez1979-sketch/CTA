import { NextRequest, NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { db, feedItems } from "@/lib/db";
import { FALLBACK_COMPANY_KEY, matchCompany } from "@/lib/companies";
import { loadCompanies } from "@/lib/company-store";

export const dynamic = "force-dynamic";

/**
 * Admin: re-run company matching for posts sitting in "Around the
 * Alliance", using the current registry. Run after adding a match word
 * (e.g. a show title) so already-ingested posts file under the right
 * company in future issues.
 */
export async function POST(request: NextRequest) {
  const companies = await loadCompanies();
  // Ignored (reviewed) items are left alone — they were triaged already.
  const unfiled = await db()
    .select()
    .from(feedItems)
    .where(
      and(
        eq(feedItems.companyKey, FALLBACK_COMPANY_KEY),
        eq(feedItems.reviewed, false),
        // Review-feed items get their company set in the Review queue.
        inArray(feedItems.reviewStatus, ["auto", "approved"]),
      ),
    );

  let moved = 0;
  for (const item of unfiled) {
    const key = matchCompany(
      {
        creator: item.creator ?? undefined,
        title: item.rawTitle ?? undefined,
        link: item.postUrl,
      },
      companies,
    );
    if (key !== FALLBACK_COMPANY_KEY) {
      await db()
        .update(feedItems)
        .set({ companyKey: key })
        .where(eq(feedItems.id, item.id));
      moved++;
    }
  }

  const message =
    unfiled.length === 0
      ? "No unfiled posts to re-check"
      : `Re-checked ${unfiled.length} unfiled post${unfiled.length === 1 ? "" : "s"}: ${moved} now filed under a company, ${unfiled.length - moved} still unmatched`;
  return NextResponse.redirect(
    new URL(`/admin?tab=settings&message=${encodeURIComponent(message)}`, request.url),
    { status: 303 },
  );
}
