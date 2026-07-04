import { NextRequest, NextResponse } from "next/server";
import { and, eq, ne } from "drizzle-orm";
import { db, feedItems } from "@/lib/db";
import { addShowFromItem, compareDrafts } from "@/lib/presenter";

export const dynamic = "force-dynamic";

const MAX_PROFILES = 2;

/**
 * Admin: manage one item in The Showcase's draft pool — edit its copy and
 * show details, toggle its Profile flag, exclude/restore it, promote a
 * post the classifier missed, or copy it into the show registry.
 */
export async function POST(request: NextRequest) {
  const form = await request.formData();
  const action = String(form.get("action") ?? "");
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

  if (action === "update") {
    const val = (name: string) => String(form.get(name) ?? "").trim() || null;
    const aiHeading = String(form.get("aiHeading") ?? "").trim();
    const aiSummary = String(form.get("aiSummary") ?? "").trim();
    if (!aiHeading || !aiSummary)
      return redirect("Heading and summary can't be empty");
    await db()
      .update(feedItems)
      .set({
        aiHeading,
        aiSummary,
        showTitle: val("showTitle"),
        showUrl: val("showUrl"),
        showBlurb: val("showBlurb"),
        showAgeRange: val("showAgeRange"),
        showImageUrl: val("showImageUrl"),
      })
      .where(eq(feedItems.id, id));
    return redirect(`Saved "${item.showTitle ?? aiHeading}"`);
  }

  if (action === "feature") {
    const featured = await db()
      .select({ id: feedItems.id })
      .from(feedItems)
      .where(
        and(
          eq(feedItems.presenterStatus, "draft"),
          eq(feedItems.presenterFeatured, true),
          ne(feedItems.id, id),
        ),
      );
    if (featured.length >= MAX_PROFILES)
      return redirect(
        `The Showcase already has ${MAX_PROFILES} profiles — remove one first`,
      );
    await db()
      .update(feedItems)
      .set({ presenterFeatured: true })
      .where(eq(feedItems.id, id));
    return redirect("Marked as a profile");
  }

  if (action === "unfeature") {
    await db()
      .update(feedItems)
      .set({ presenterFeatured: false })
      .where(eq(feedItems.id, id));
    return redirect("No longer a profile");
  }

  if (action === "exclude") {
    await db()
      .update(feedItems)
      .set({
        presenterStatus: "excluded",
        presenterFeatured: false,
        presenterPosition: null,
      })
      .where(eq(feedItems.id, id));
    return redirect("Excluded from The Showcase");
  }

  if (action === "restore") {
    // Rejoins at the bottom of the manually ordered items.
    await db()
      .update(feedItems)
      .set({ presenterStatus: "draft", presenterPosition: null })
      .where(eq(feedItems.id, id));
    return redirect("Back in the draft");
  }

  if (action === "move-up" || action === "move-down") {
    const drafts = (
      await db()
        .select()
        .from(feedItems)
        .where(eq(feedItems.presenterStatus, "draft"))
    ).sort(compareDrafts);
    const idx = drafts.findIndex((d) => d.id === id);
    if (idx === -1) return redirect("That item is no longer in the draft");
    const target = action === "move-up" ? idx - 1 : idx + 1;
    if (target < 0) return redirect("Already first");
    if (target >= drafts.length) return redirect("Already last");
    [drafts[idx], drafts[target]] = [drafts[target], drafts[idx]];
    // Normalise to dense 0..n so future moves and newcomers behave
    // deterministically.
    for (let i = 0; i < drafts.length; i++) {
      if (drafts[i].presenterPosition !== i) {
        await db()
          .update(feedItems)
          .set({ presenterPosition: i })
          .where(eq(feedItems.id, drafts[i].id));
      }
    }
    return redirect(action === "move-up" ? "Moved up" : "Moved down");
  }

  if (action === "promote") {
    // The classifier missed a post: pull it into the draft pool by hand.
    // Marked as already notified — the admin is looking right at it.
    await db()
      .update(feedItems)
      .set({ presenterStatus: "draft", presenterNotifiedAt: new Date() })
      .where(eq(feedItems.id, id));
    return redirect(`Added "${item.aiHeading}" to The Showcase draft`);
  }

  if (action === "add-show") {
    const added = await addShowFromItem(id);
    return redirect(
      added
        ? `Added "${item.showTitle ?? item.aiHeading}" to What's happening`
        : "That show is already in What's happening",
    );
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
