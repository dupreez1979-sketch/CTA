import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, companies, feedItems } from "@/lib/db";
import { researchItem } from "@/lib/show-research";

export const dynamic = "force-dynamic";

/**
 * Admin: (re-)research one Showcase draft item against its company's shows
 * page. Overwrites the show fields with whatever fresh research finds;
 * fields it can't find are left as they are for manual editing.
 */
export async function POST(request: NextRequest) {
  const form = await request.formData();
  const id = Number(form.get("id"));
  const redirect = (message: string) =>
    NextResponse.redirect(
      new URL(`/admin?tab=presenters&message=${encodeURIComponent(message)}`, request.url),
      { status: 303 },
    );
  if (!Number.isInteger(id)) return redirect("Invalid input");

  const [item] = await db()
    .select()
    .from(feedItems)
    .where(eq(feedItems.id, id))
    .limit(1);
  if (!item) return redirect("Post not found");
  if (!item.showTitle)
    return redirect(
      "Add a show title first — research looks the title up on the company's shows page",
    );

  const [company] = await db()
    .select()
    .from(companies)
    .where(eq(companies.key, item.companyKey))
    .limit(1);
  if (!company?.showsPageUrl)
    return redirect(
      "This company has no shows page URL yet — add one on the Companies tab",
    );

  const result = await researchItem(
    item.showTitle,
    item.guid,
    company.showsPageUrl,
  );
  await db()
    .update(feedItems)
    .set({
      presenterResearchedAt: new Date(),
      ...(result.showUrl ? { showUrl: result.showUrl } : {}),
      ...(result.showBlurb ? { showBlurb: result.showBlurb } : {}),
      ...(result.showAgeRange ? { showAgeRange: result.showAgeRange } : {}),
      ...(result.showImageUrl ? { showImageUrl: result.showImageUrl } : {}),
    })
    .where(eq(feedItems.id, id));

  const found = [
    result.showUrl && "show page",
    result.showBlurb && "blurb",
    result.showAgeRange && "age range",
    result.showImageUrl && "image",
  ].filter(Boolean);
  return redirect(
    found.length > 0
      ? `Research found: ${found.join(", ")}`
      : "Research could not find a matching show — fill the fields in by hand",
  );
}
