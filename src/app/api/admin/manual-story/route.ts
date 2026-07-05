import { NextRequest, NextResponse } from "next/server";
import { canonicalBase } from "@/lib/canonical";
import { randomBytes } from "crypto";
import { db, feedItems } from "@/lib/db";
import {
  addItemToEdition,
  getEdition,
  setEditionItemSocial,
} from "@/lib/presenter";
import { showcaseRedirectUrl } from "@/lib/showcase-admin";

export const dynamic = "force-dynamic";

const URL_RE = /^https?:\/\/\S+$/i;

/**
 * Admin: write a Showcase story by hand, outside the RSS pathway. The
 * story is created as a manual feed item (excluded from the cadence
 * newsletters) and dropped straight into the edition being built, in the
 * news section or Social Theatre. All fields stay editable on the story
 * card afterwards, exactly like an RSS story.
 */
export async function POST(request: NextRequest) {
  const form = await request.formData();
  const editionId = Number(form.get("edition"));
  const asSocial = String(form.get("social") ?? "") === "1";
  const redirect = (message: string, ok = true) =>
    NextResponse.redirect(
      showcaseRedirectUrl(canonicalBase(request.url), form, message, {
        edition: Number.isInteger(editionId) && editionId > 0 ? editionId : null,
      }),
      { status: ok ? 303 : 303 },
    );

  if (!Number.isInteger(editionId) || editionId <= 0)
    return redirect("Invalid input", false);
  const edition = await getEdition(editionId);
  if (!edition) return redirect("That Showcase no longer exists", false);
  if (edition.status === "sent" || edition.status === "sending")
    return redirect("A sent Showcase can't be changed", false);

  const val = (name: string) => String(form.get(name) ?? "").trim();
  const opt = (name: string) => val(name) || null;
  const companyKey = val("companyKey");
  const heading = val("heading");
  const summary = val("summary");
  const postUrl = val("postUrl");
  const imageUrl = val("imageUrl");

  if (!companyKey) return redirect("Pick a company for the story", false);
  if (!heading || !summary)
    return redirect("The story needs a heading and a summary", false);
  if (postUrl && !URL_RE.test(postUrl))
    return redirect(
      "The story link does not look like a web address (it should start with https://)",
      false,
    );
  if (imageUrl && !URL_RE.test(imageUrl))
    return redirect(
      "The image link does not look like a web address (it should start with https://)",
      false,
    );

  const [item] = await db()
    .insert(feedItems)
    .values({
      guid: `manual-${Date.now()}-${randomBytes(6).toString("hex")}`,
      source: "manual",
      companyKey,
      postUrl,
      rawTitle: heading,
      publishedAt: new Date(),
      aiHeading: heading,
      aiSummary: summary,
      imageUrl: imageUrl || null,
      presenterRelevance: asSocial ? "low" : "high",
      socialRelevance: asSocial ? "high" : "low",
      presenterReason: "Written by hand in the Showcase builder.",
      showTitle: asSocial ? null : opt("showTitle"),
      showUrl: asSocial ? null : opt("showUrl"),
      showBlurb: asSocial ? null : opt("showBlurb"),
      showAgeRange: asSocial ? null : opt("showAgeRange"),
      presenterNotifiedAt: new Date(),
    })
    .returning({ id: feedItems.id });

  await addItemToEdition(editionId, item.id);
  if (asSocial) await setEditionItemSocial(editionId, item.id, true);

  return redirect(
    `Added "${heading.slice(0, 50)}" to ${asSocial ? "Social Theatre" : "the news stories"}`,
  );
}
