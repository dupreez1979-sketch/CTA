import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, feedItems, type PresenterRelevance } from "@/lib/db";
import {
  RELEVANCE_OPTIONS,
  addItemToEdition,
  addShowFromItem,
  addShowToEdition,
  getEdition,
  moveEditionItem,
  removeItemFromEdition,
  setEditionItemFeatured,
  setEditionItemSocial,
} from "@/lib/presenter";
import { rewriteTimeReferences } from "@/lib/ai";
import { showcaseRedirectUrl } from "@/lib/showcase-admin";

export const dynamic = "force-dynamic";

/**
 * Admin: manage one story for The Showcase — edit its copy and show
 * details, set its relevance rating, and manage its membership in a draft
 * edition (add, remove, profile flag, ordering).
 */
export async function POST(request: NextRequest) {
  const form = await request.formData();
  const action = String(form.get("action") ?? "");
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
  if (!item) return redirect("Story not found");

  if (action === "update") {
    const val = (name: string) => String(form.get(name) ?? "").trim() || null;
    const aiHeading = String(form.get("aiHeading") ?? "").trim();
    const aiSummary = String(form.get("aiSummary") ?? "").trim();
    if (!aiHeading || !aiSummary)
      return redirect("Heading and summary can't be empty");
    // Social Theatre cards submit a reduced form (no show fields) — only
    // touch the fields that were actually present, so hidden show details
    // survive a save.
    const set: Partial<typeof feedItems.$inferInsert> = { aiHeading, aiSummary };
    if (form.has("showTitle")) set.showTitle = val("showTitle");
    if (form.has("showUrl")) set.showUrl = val("showUrl");
    if (form.has("showBlurb")) set.showBlurb = val("showBlurb");
    if (form.has("showAgeRange")) set.showAgeRange = val("showAgeRange");
    if (form.has("showImageUrl")) set.showImageUrl = val("showImageUrl");
    await db().update(feedItems).set(set).where(eq(feedItems.id, id));
    return redirect(`Saved "${item.showTitle ?? aiHeading}"`);
  }

  if (action === "rewrite-time") {
    try {
      const fixed = await rewriteTimeReferences(
        item.aiHeading,
        item.aiSummary,
        item.publishedAt,
      );
      await db()
        .update(feedItems)
        .set({ aiHeading: fixed.heading, aiSummary: fixed.summary })
        .where(eq(feedItems.id, id));
      return redirect(
        "Time words rewritten to absolute dates. Check the copy reads well",
      );
    } catch (err) {
      return redirect(`Could not rewrite the copy: ${err}`);
    }
  }

  if (action === "relevance") {
    const relevance = String(form.get("relevance") ?? "") as PresenterRelevance;
    if (!RELEVANCE_OPTIONS.includes(relevance))
      return redirect("Invalid input");
    await db()
      .update(feedItems)
      .set({ presenterRelevance: relevance })
      .where(eq(feedItems.id, id));
    return redirect(
      relevance === "high"
        ? `"${item.aiHeading.slice(0, 50)}" rated high, it will be offered to new Showcases`
        : `"${item.aiHeading.slice(0, 50)}" rated ${relevance}`,
    );
  }

  // Everything below operates on a draft/failed edition's membership.
  const editionId = Number(form.get("edition"));
  if (!Number.isInteger(editionId) || editionId <= 0)
    return redirect("Invalid input");
  const edition = await getEdition(editionId);
  if (!edition) return redirect("That Showcase no longer exists");
  if (edition.status === "sent" || edition.status === "sending")
    return redirect("A sent Showcase can't be changed");

  if (action === "add") {
    const added = await addItemToEdition(editionId, id);
    if (added && !item.presenterNotifiedAt) {
      // The admin is looking right at it — no need to notify later.
      await db()
        .update(feedItems)
        .set({ presenterNotifiedAt: new Date() })
        .where(eq(feedItems.id, id));
    }
    return redirect(
      added
        ? `Added "${item.aiHeading.slice(0, 50)}" to this Showcase`
        : "That story is already in this Showcase",
    );
  }

  if (action === "remove") {
    await removeItemFromEdition(editionId, id);
    return redirect(
      "Removed from this Showcase. The story stays in the pool; set its relevance to Low if it should not come back",
    );
  }

  if (action === "social" || action === "unsocial") {
    await setEditionItemSocial(editionId, id, action === "social");
    return redirect(
      action === "social"
        ? "Moved to Social Theatre (a social story can't also be a profile)"
        : "Back with the news stories",
    );
  }

  if (action === "feature" || action === "unfeature") {
    const ok = await setEditionItemFeatured(
      editionId,
      id,
      action === "feature",
    );
    if (!ok)
      return redirect(
        "This Showcase already has 2 profiles. Remove one first",
      );
    return redirect(
      action === "feature" ? "Marked as a profile" : "No longer a profile",
    );
  }

  if (action === "move-up" || action === "move-down") {
    const moved = await moveEditionItem(
      editionId,
      id,
      action === "move-up" ? "up" : "down",
    );
    if (!moved)
      return redirect(action === "move-up" ? "Already first" : "Already last");
    return redirect(action === "move-up" ? "Moved up" : "Moved down");
  }

  if (action === "add-show") {
    const showId = await addShowFromItem(id);
    if (showId === null) return redirect("Story not found");
    await addShowToEdition(editionId, showId);
    return redirect(
      `"${item.showTitle ?? item.aiHeading}" is in Shows in the Spotlight and linked to this Showcase`,
    );
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
