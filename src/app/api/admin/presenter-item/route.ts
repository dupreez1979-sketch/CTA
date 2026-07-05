import { NextRequest, NextResponse } from "next/server";
import { canonicalBase } from "@/lib/canonical";
import { and, eq, inArray, isNull } from "drizzle-orm";
import {
  db,
  feedItems,
  newsletterInclusions,
  type PresenterRelevance,
} from "@/lib/db";
import {
  RELEVANCE_OPTIONS,
  addItemToEdition,
  addShowFromItem,
  addShowToEdition,
  createEditionFromPool,
  getEdition,
  moveEditionItem,
  moveEditionShow,
  removeItemFromEdition,
  setEditionItemFeatured,
  setEditionItemSocial,
} from "@/lib/presenter";
import { ensureNewsletterSchema } from "@/lib/db-errors";
import { reassessRatings, rewriteTimeReferences } from "@/lib/ai";
import { companyNameFrom } from "@/lib/companies";
import { companyNameMap } from "@/lib/company-store";
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
  // Background ("quick") calls from client buttons get JSON instead of a
  // redirect: success needs no page reload, and problems surface as a
  // pop-up in the browser.
  const quick = request.headers.get("x-quick") === "1";
  const redirect = (message: string, ok = true) =>
    quick
      ? NextResponse.json({ ok, message }, { status: ok ? 200 : 409 })
      : NextResponse.redirect(showcaseRedirectUrl(canonicalBase(request.url), form, message), {
          status: 303,
        });
  const backToPool = (message: string) =>
    NextResponse.redirect(
      new URL(
        `/admin?tab=review&message=${encodeURIComponent(message)}#story-pool`,
        canonicalBase(request.url),
      ),
      { status: 303 },
    );

  // Story pool "Regular +": push a story into the next send of every
  // cadence. It appears once in each, then drops off (send.ts clears the
  // rows once that cadence has gone out).
  if (action === "force-newsletter") {
    if (!Number.isInteger(id) || id <= 0) return backToPool("Invalid input");
    // The newsletter_inclusions table / "ignored" column may not exist yet
    // in this environment; create them on demand (see db-errors).
    await ensureNewsletterSchema();
    const [story] = await db()
      .select()
      .from(feedItems)
      .where(eq(feedItems.id, id))
      .limit(1);
    if (!story) return backToPool("Story not found");
    // Social/auto-feed stories are already in the newsletters.
    if (story.source === "feed" && story.reviewStatus === "auto")
      return backToPool("That story is already in the newsletters");
    await db()
      .insert(newsletterInclusions)
      .values(
        (["daily", "weekly", "fortnightly"] as const).map((cadence) => ({
          feedItemId: id,
          cadence,
        })),
      )
      .onConflictDoNothing();
    return backToPool(
      `"${story.aiHeading.slice(0, 50)}" will be in the next daily, weekly and fortnightly newsletter`,
    );
  }

  // Story pool "X": drop a story from the pool for good. Kept in the DB so
  // the feed's de-duplication stops the article ever coming back.
  if (action === "ignore") {
    if (!Number.isInteger(id) || id <= 0) return backToPool("Invalid input");
    await ensureNewsletterSchema();
    const updated = await db()
      .update(feedItems)
      .set({ ignored: true })
      .where(eq(feedItems.id, id))
      .returning({ heading: feedItems.aiHeading });
    if (updated.length === 0) return backToPool("Story not found");
    return backToPool(
      `Removed "${updated[0].heading.slice(0, 50)}" from the story pool for good`,
    );
  }

  // Bulk add from the story pool (Stories tab): every ticked story goes
  // into a draft Showcase in one action, creating the draft first when
  // asked. Lands in the builder so the result is right in front of you.
  if (action === "add-many") {
    const ids = form
      .getAll("ids")
      .map((v) => Number(v))
      .filter((n) => Number.isInteger(n) && n > 0);
    if (ids.length === 0) return backToPool("No stories selected");

    const asSocial = String(form.get("social") ?? "") === "1";
    const editionRaw = String(form.get("edition") ?? "");
    let editionId: number;
    let createdNew = false;
    if (editionRaw === "new") {
      const created = await createEditionFromPool();
      editionId = created.id;
      createdNew = true;
    } else {
      editionId = Number(editionRaw);
      if (!Number.isInteger(editionId) || editionId <= 0)
        return backToPool("Pick a Showcase draft first");
      const edition = await getEdition(editionId);
      if (!edition) return backToPool("That Showcase no longer exists");
      if (edition.status === "sent" || edition.status === "sending")
        return backToPool("A sent Showcase can't be changed");
    }

    const added: number[] = [];
    for (const itemId of ids) {
      const ok = await addItemToEdition(editionId, itemId);
      if (!ok) continue;
      added.push(itemId);
      if (asSocial) await setEditionItemSocial(editionId, itemId, true);
    }
    if (added.length > 0) {
      // The admin is looking right at them — no need to notify later.
      await db()
        .update(feedItems)
        .set({ presenterNotifiedAt: new Date() })
        .where(
          and(
            inArray(feedItems.id, added),
            isNull(feedItems.presenterNotifiedAt),
          ),
        );
    }
    const skipped = ids.length - added.length;
    const message = [
      createdNew ? "New Showcase draft created. " : "",
      `Added ${added.length} stor${added.length === 1 ? "y" : "ies"} to ${asSocial ? "Social Theatre" : "the news stories"}`,
      skipped > 0
        ? ` (${skipped} ${skipped === 1 ? "was" : "were"} already in this Showcase)`
        : "",
    ].join("");
    return NextResponse.redirect(
      showcaseRedirectUrl(canonicalBase(request.url), form, message, { edition: editionId }),
      { status: 303 },
    );
  }

  if (!Number.isInteger(id)) return redirect("Invalid input", false);

  // Moves are the hottest button in the builder: handled first, with no
  // preliminary lookups (the single-statement swap enforces everything).
  if (action === "move-up" || action === "move-down") {
    const editionIdForMove = Number(form.get("edition"));
    if (!Number.isInteger(editionIdForMove) || editionIdForMove <= 0)
      return redirect("Invalid input");
    const moved = await moveEditionItem(
      editionIdForMove,
      id,
      action === "move-up" ? "up" : "down",
    );
    if (!moved)
      return redirect(action === "move-up" ? "Already first" : "Already last");
    return redirect(action === "move-up" ? "Moved up" : "Moved down");
  }

  // Spotlight show reordering: same fast path, id is the show's id.
  if (action === "move-show-up" || action === "move-show-down") {
    const editionIdForMove = Number(form.get("edition"));
    if (!Number.isInteger(editionIdForMove) || editionIdForMove <= 0)
      return redirect("Invalid input");
    const moved = await moveEditionShow(
      editionIdForMove,
      id,
      action === "move-show-up" ? "up" : "down",
    );
    if (!moved)
      return redirect(
        action === "move-show-up" ? "Already first" : "Already last",
      );
    return redirect(action === "move-show-up" ? "Moved up" : "Moved down");
  }

  const [item] = await db()
    .select()
    .from(feedItems)
    .where(eq(feedItems.id, id))
    .limit(1);
  if (!item) return redirect("Story not found", false);

  if (action === "update") {
    const val = (name: string) => String(form.get(name) ?? "").trim() || null;
    const aiHeading = String(form.get("aiHeading") ?? "").trim();
    const aiSummary = String(form.get("aiSummary") ?? "").trim();
    if (!aiHeading || !aiSummary)
      return redirect("Heading and summary can't be empty", false);
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
      return redirect(`Could not rewrite the copy: ${err}`, false);
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

  if (action === "reassess") {
    try {
      const nameByKey = await companyNameMap();
      const rated = await reassessRatings({
        heading: item.aiHeading,
        summary: item.aiSummary,
        rawTitle: item.rawTitle,
        company: companyNameFrom(nameByKey, item.companyKey),
      });
      await db()
        .update(feedItems)
        .set({
          presenterRelevance: rated.presenterRelevance,
          socialRelevance: rated.socialRelevance,
          presenterReason: rated.presenterReason,
        })
        .where(eq(feedItems.id, id));
      return redirect(
        `Show relevance: ${rated.presenterRelevance}. Social Theatre: ${rated.socialRelevance}. ${rated.presenterReason}`,
      );
    } catch (err) {
      return redirect(`Could not re-rate: ${err}`, false);
    }
  }

  if (action === "ratings") {
    const rel = String(form.get("relevance") ?? "") as PresenterRelevance;
    const soc = String(form.get("socialRelevance") ?? "") as PresenterRelevance;
    if (!RELEVANCE_OPTIONS.includes(rel) || !RELEVANCE_OPTIONS.includes(soc))
      return redirect("Invalid input");
    await db()
      .update(feedItems)
      .set({ presenterRelevance: rel, socialRelevance: soc })
      .where(eq(feedItems.id, id));
    return redirect(
      `"${item.aiHeading.slice(0, 40)}" rated show ${rel}, social ${soc}`,
    );
  }

  if (action === "social-relevance") {
    const relevance = String(form.get("relevance") ?? "") as PresenterRelevance;
    if (!RELEVANCE_OPTIONS.includes(relevance))
      return redirect("Invalid input");
    await db()
      .update(feedItems)
      .set({ socialRelevance: relevance })
      .where(eq(feedItems.id, id));
    return redirect(
      relevance === "high"
        ? `"${item.aiHeading.slice(0, 50)}" rated high for Social Theatre, it will be offered to new Showcases`
        : `"${item.aiHeading.slice(0, 50)}" rated ${relevance} for Social Theatre`,
    );
  }

  // Everything below operates on a draft/failed edition's membership.
  const editionId = Number(form.get("edition"));
  if (!Number.isInteger(editionId) || editionId <= 0)
    return redirect("Invalid input");
  const edition = await getEdition(editionId);
  if (!edition) return redirect("That Showcase no longer exists", false);
  if (edition.status === "sent" || edition.status === "sending")
    return redirect("A sent Showcase can't be changed", false);

  if (action === "add") {
    const asSocial = String(form.get("social") ?? "") === "1";
    const added = await addItemToEdition(editionId, id);
    if (added && asSocial) {
      await setEditionItemSocial(editionId, id, true);
    }
    if (added && !item.presenterNotifiedAt) {
      // The admin is looking right at it — no need to notify later.
      await db()
        .update(feedItems)
        .set({ presenterNotifiedAt: new Date() })
        .where(eq(feedItems.id, id));
    }
    return redirect(
      added
        ? `Added "${item.aiHeading.slice(0, 50)}" to ${asSocial ? "Social Theatre" : "the news stories"}`
        : "That story is already in this Showcase",
      added,
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
        false,
      );
    return redirect(
      action === "feature" ? "Marked as a profile" : "No longer a profile",
    );
  }

  if (action === "add-show") {
    const show = await addShowFromItem(id);
    if (show === null) return redirect("Story not found", false);
    await addShowToEdition(editionId, show.id);
    return redirect(
      `"${item.showTitle ?? item.aiHeading}" is ${show.created ? "in the show list" : "already in the show list"} and linked to this Showcase`,
    );
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
