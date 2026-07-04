import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, companies, feedItems } from "@/lib/db";
import { researchItem } from "@/lib/show-research";
import { showcaseRedirectUrl } from "@/lib/showcase-admin";

export const dynamic = "force-dynamic";

/**
 * Admin: "Save + research" on a Showcase draft card. The card's whole edit
 * form is submitted here (via formAction), so any typed changes — most
 * importantly the show title research depends on — are saved first, then
 * the item is (re-)researched against its company's shows page. Research
 * overwrites the show fields with whatever it finds; fields it can't find
 * keep their saved values for manual editing.
 */
export async function POST(request: NextRequest) {
  const form = await request.formData();
  const id = Number(form.get("id"));
  const redirect = (message: string) =>
    NextResponse.redirect(showcaseRedirectUrl(request.url, form, message), {
      status: 303,
    });
  if (!Number.isInteger(id)) return redirect("Invalid input");

  const [item] = await db()
    .select()
    .from(feedItems)
    .where(eq(feedItems.id, id))
    .limit(1);
  if (!item) return redirect("Post not found");

  // Persist the submitted edits first (the card's full form arrives here).
  // A bare POST with just the id (no field inputs) skips this.
  let showTitle = item.showTitle;
  let saved = false;
  if (form.has("showTitle")) {
    const val = (name: string) => String(form.get(name) ?? "").trim() || null;
    const aiHeading = String(form.get("aiHeading") ?? "").trim();
    const aiSummary = String(form.get("aiSummary") ?? "").trim();
    showTitle = val("showTitle");
    await db()
      .update(feedItems)
      .set({
        aiHeading: aiHeading || item.aiHeading,
        aiSummary: aiSummary || item.aiSummary,
        showTitle,
        showUrl: val("showUrl"),
        showBlurb: val("showBlurb"),
        showAgeRange: val("showAgeRange"),
        showImageUrl: val("showImageUrl"),
      })
      .where(eq(feedItems.id, id));
    saved = true;
  }
  const prefix = saved ? "Saved. " : "";

  if (!showTitle)
    return redirect(
      `${prefix}To research, type the show's name into the Show title field first — research looks it up on the company's shows page`,
    );

  const [company] = await db()
    .select()
    .from(companies)
    .where(eq(companies.key, item.companyKey))
    .limit(1);
  if (!company?.showsPageUrl)
    return redirect(
      `${prefix}This company has no shows page URL yet — add one on the Companies tab, then research again`,
    );

  const result = await researchItem(showTitle, item.guid, company.showsPageUrl);
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
      ? `${prefix}Research found: ${found.join(", ")}`
      : `${prefix}Research could not find "${showTitle}" on the company's shows page — fill the fields in by hand`,
  );
}
