import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";
import { render } from "@react-email/render";
import { Resend } from "resend";
import * as React from "react";
import {
  db,
  companies,
  feedItems,
  presenterSends,
  shows,
  type FeedItem,
  type Show,
} from "./db";
import { getSetting, setSetting } from "./settings";
import { companyNameMap } from "./company-store";
import { companyNameFrom, sectionStyle, FEATURED_STYLE } from "./companies";
import { absolutizeImage } from "./send";
import { researchItem } from "./show-research";
import ShowcaseEmail, {
  type ShowcaseEmailProps,
  type ShowcaseProfile,
  type ShowcaseSection,
} from "../emails/ShowcaseEmail";
import ShowcaseDraftEmail from "../emails/ShowcaseDraftEmail";

/**
 * The Showcase — the presenter and international partner edition, currently
 * in test mode. The daily pipeline classifies show/tour announcements into a
 * draft pool, researches official show pages, and notifies the test list
 * that a draft is ready; nothing is ever sent automatically. Sending happens
 * from admin after review.
 */

const RECIPIENTS_KEY = "presenter_recipients";
const DEFAULT_RECIPIENTS = ["kevin@monkeybaa.com.au"];
const RESEARCH_MAX_PER_RUN = Number(
  process.env.PRESENTER_RESEARCH_MAX_PER_RUN ?? 2,
);
const MAX_PROFILES = 2;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set`);
  return v;
}

function sydneyDateLabel(now = new Date()): string {
  return new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Sydney",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(now);
}

// ---------------------------------------------------------------- recipients

export async function getPresenterRecipients(): Promise<string[]> {
  const raw = (await getSetting(RECIPIENTS_KEY)) ?? "";
  const emails = raw
    .split(/[,;\s]+/)
    .map((s) => s.trim().toLowerCase())
    .filter((s) => EMAIL_RE.test(s));
  return emails.length > 0 ? emails : DEFAULT_RECIPIENTS;
}

export async function setPresenterRecipients(raw: string): Promise<string[]> {
  const emails = [
    ...new Set(
      raw
        .split(/[,;\s\n]+/)
        .map((s) => s.trim().toLowerCase())
        .filter((s) => EMAIL_RE.test(s)),
    ),
  ];
  await setSetting(RECIPIENTS_KEY, emails.join(", "));
  return emails.length > 0 ? emails : DEFAULT_RECIPIENTS;
}

// ------------------------------------------------------------------ pipeline

export interface PresenterPipelineResult {
  researched: number;
  notified: number;
  draftCount: number;
}

/**
 * Post-ingest Showcase step: research a few un-researched drafts, then send
 * one "draft ready" notification covering any items that haven't been
 * announced yet. Both halves are best-effort — a failure here must never
 * break the cron run.
 */
export async function runPresenterPipeline(): Promise<PresenterPipelineResult> {
  const researched = await researchPendingDrafts().catch((err) => {
    console.error("Showcase research step failed:", err);
    return 0;
  });
  const notified = await notifyNewDrafts().catch((err) => {
    console.error("Showcase notify step failed:", err);
    return 0;
  });
  const drafts = await db()
    .select({ id: feedItems.id })
    .from(feedItems)
    .where(eq(feedItems.presenterStatus, "draft"));
  return { researched, notified, draftCount: drafts.length };
}

async function researchPendingDrafts(): Promise<number> {
  const pending = await db()
    .select()
    .from(feedItems)
    .where(
      and(
        eq(feedItems.presenterStatus, "draft"),
        isNull(feedItems.presenterResearchedAt),
      ),
    )
    .orderBy(asc(feedItems.publishedAt))
    .limit(RESEARCH_MAX_PER_RUN);
  if (pending.length === 0) return 0;

  const companyRows = await db().select().from(companies);
  const showsPageByKey = new Map(
    companyRows.map((c) => [c.key, c.showsPageUrl]),
  );

  await Promise.allSettled(
    pending.map(async (item) => {
      // researchItem never throws; researchedAt is set regardless so a
      // site we can't research doesn't get retried on every run.
      const result = await researchItem(
        item.showTitle,
        item.guid,
        showsPageByKey.get(item.companyKey) ?? null,
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
        .where(eq(feedItems.id, item.id));
    }),
  );
  return pending.length;
}

async function notifyNewDrafts(): Promise<number> {
  const fresh = await db()
    .select()
    .from(feedItems)
    .where(
      and(
        eq(feedItems.presenterStatus, "draft"),
        isNull(feedItems.presenterNotifiedAt),
      ),
    )
    .orderBy(desc(feedItems.publishedAt));
  if (fresh.length === 0) return 0;

  const [to, nameByKey, drafts] = await Promise.all([
    getPresenterRecipients(),
    companyNameMap(),
    db()
      .select({ id: feedItems.id })
      .from(feedItems)
      .where(eq(feedItems.presenterStatus, "draft")),
  ]);

  const baseUrl = (process.env.APP_URL ?? "").replace(/\/$/, "");
  const html = await render(
    React.createElement(ShowcaseDraftEmail, {
      baseUrl,
      newItems: fresh.map((it) => ({
        company: companyNameFrom(nameByKey, it.companyKey),
        heading: it.showTitle ?? it.aiHeading,
        reason: it.presenterReason ?? "",
      })),
      draftCount: drafts.length,
    }),
  );

  if (process.env.SEND_DRY_RUN === "1") {
    console.log(
      `[dry-run] would notify ${to.join(", ")} of ${fresh.length} new Showcase drafts`,
    );
  } else {
    const resend = new Resend(env("RESEND_API_KEY"));
    const { error } = await resend.emails.send({
      from: env("EMAIL_FROM"),
      to,
      subject: "The Showcase: new draft items to review",
      html,
    });
    if (error) throw new Error(`Resend send failed: ${error.message}`);
  }

  await db()
    .update(feedItems)
    .set({ presenterNotifiedAt: new Date() })
    .where(
      inArray(
        feedItems.id,
        fresh.map((f) => f.id),
      ),
    );
  return fresh.length;
}

// ------------------------------------------------------------------ assembly

export interface AssembledShowcase {
  props: ShowcaseEmailProps;
  itemCount: number;
  profileCount: number;
}

/**
 * Pure Showcase assembly (exported for tests): draft items newest first,
 * up to two Profiles, the rest grouped by company, plus the active show
 * registry. Null when there is nothing at all to send.
 */
export function buildShowcaseProps(
  items: FeedItem[],
  showList: Show[],
  nameByKey: Map<string, string>,
  baseUrl: string,
  dateLabel: string,
): AssembledShowcase | null {
  if (items.length === 0 && showList.length === 0) return null;

  const profiles: ShowcaseProfile[] = items
    .filter((it) => it.presenterFeatured)
    .slice(0, MAX_PROFILES)
    .map((it) => ({
      company: companyNameFrom(nameByKey, it.companyKey),
      hex: FEATURED_STYLE.hex,
      title: it.showTitle ?? it.aiHeading,
      blurb: it.showBlurb ?? it.aiSummary,
      ageRange: it.showAgeRange,
      showUrl: it.showUrl,
      postUrl: it.postUrl,
      imageUrl: absolutizeImage(it.showImageUrl ?? it.imageUrl, baseUrl),
    }));
  const profiledIds = new Set(
    items
      .filter((it) => it.presenterFeatured)
      .slice(0, MAX_PROFILES)
      .map((it) => it.id),
  );

  const grouped = new Map<string, FeedItem[]>();
  for (const it of items) {
    if (profiledIds.has(it.id)) continue;
    const list = grouped.get(it.companyKey) ?? [];
    list.push(it);
    grouped.set(it.companyKey, list);
  }
  const sections: ShowcaseSection[] = [...grouped.entries()].map(
    ([key, list], i) => {
      const style = sectionStyle(i);
      return {
        name: companyNameFrom(nameByKey, key),
        hex: style.hex,
        colorName: style.colorName,
        shape: style.shape,
        items: list.map((it) => ({
          heading: it.showTitle ?? it.aiHeading,
          summary: it.showBlurb ?? it.aiSummary,
          showUrl: it.showUrl,
          postUrl: it.postUrl,
          imageUrl: absolutizeImage(it.showImageUrl ?? it.imageUrl, baseUrl),
          ageRange: it.showAgeRange,
        })),
      };
    },
  );

  const listings = [...showList]
    .sort(
      (a, b) =>
        companyNameFrom(nameByKey, a.companyKey).localeCompare(
          companyNameFrom(nameByKey, b.companyKey),
        ) || a.title.localeCompare(b.title),
    )
    .map((s) => ({
      title: s.title,
      company: companyNameFrom(nameByKey, s.companyKey),
      blurb: s.blurb,
      url: s.url,
      ageRange: s.ageRange,
    }));

  return {
    props: {
      dateLabel,
      profiles,
      companies: sections,
      shows: listings,
      baseUrl,
    },
    itemCount: items.length,
    profileCount: profiles.length,
  };
}

export async function assembleShowcase(): Promise<AssembledShowcase | null> {
  const baseUrl = env("APP_URL").replace(/\/$/, "");
  const [items, showList, nameByKey] = await Promise.all([
    db()
      .select()
      .from(feedItems)
      .where(eq(feedItems.presenterStatus, "draft"))
      .orderBy(desc(feedItems.publishedAt)),
    db().select().from(shows).where(eq(shows.status, "active")),
    companyNameMap(),
  ]);
  return buildShowcaseProps(items, showList, nameByKey, baseUrl, sydneyDateLabel());
}

export async function renderShowcaseHtml(
  assembled: AssembledShowcase,
): Promise<string> {
  return render(React.createElement(ShowcaseEmail, assembled.props));
}

// --------------------------------------------------------------------- send

export interface ShowcaseSendResult {
  status: "sent" | "skipped";
  itemCount: number;
  recipientCount: number;
}

/**
 * Send The Showcase to the test list. Draft items are claimed atomically
 * (draft → sent) before the send, so a double-click can't dispatch the same
 * items twice; on failure they are reverted to draft.
 */
export async function sendShowcase(): Promise<ShowcaseSendResult> {
  const assembled = await assembleShowcase();
  if (!assembled) return { status: "skipped", itemCount: 0, recipientCount: 0 };

  const recipients = await getPresenterRecipients();
  const [sendRow] = await db()
    .insert(presenterSends)
    .values({
      itemCount: assembled.itemCount,
      profileCount: assembled.profileCount,
      recipientCount: recipients.length,
      recipients: recipients.join(", "),
    })
    .returning({ id: presenterSends.id });

  const claimed = await db()
    .update(feedItems)
    .set({ presenterStatus: "sent", presenterSendId: sendRow.id })
    .where(eq(feedItems.presenterStatus, "draft"))
    .returning({ id: feedItems.id });

  // Items were assembled but another request claimed them first: this is
  // the losing half of a double-click. (A shows-only edition has no items
  // to claim, so it proceeds.)
  if (claimed.length === 0 && assembled.itemCount > 0) {
    await db()
      .update(presenterSends)
      .set({ status: "failed" })
      .where(eq(presenterSends.id, sendRow.id));
    return { status: "skipped", itemCount: 0, recipientCount: 0 };
  }

  try {
    const html = await renderShowcaseHtml(assembled);
    const subject = `The Showcase: shows from the Alliance ready to travel (${sydneyDateLabel()})`;

    if (process.env.SEND_DRY_RUN === "1") {
      console.log(
        `[dry-run] would send The Showcase (${assembled.itemCount} items) to ${recipients.join(", ")}`,
      );
    } else {
      const resend = new Resend(env("RESEND_API_KEY"));
      const { error } = await resend.emails.send({
        from: env("EMAIL_FROM"),
        to: recipients,
        subject,
        html,
      });
      if (error) throw new Error(`Resend send failed: ${error.message}`);
    }

    await db()
      .update(presenterSends)
      .set({ status: "sent", sentAt: new Date() })
      .where(eq(presenterSends.id, sendRow.id));
    return {
      status: "sent",
      itemCount: assembled.itemCount,
      recipientCount: recipients.length,
    };
  } catch (err) {
    // Put the claimed items back in the draft pool and record the failure.
    if (claimed.length > 0) {
      await db()
        .update(feedItems)
        .set({ presenterStatus: "draft", presenterSendId: null })
        .where(
          inArray(
            feedItems.id,
            claimed.map((c) => c.id),
          ),
        );
    }
    await db()
      .update(presenterSends)
      .set({ status: "failed" })
      .where(eq(presenterSends.id, sendRow.id));
    throw err;
  }
}

// ----------------------------------------------------------------- registry

/** Copy a draft item's show details into the "What's happening" registry. */
export async function addShowFromItem(itemId: number): Promise<boolean> {
  const [item] = await db()
    .select()
    .from(feedItems)
    .where(eq(feedItems.id, itemId))
    .limit(1);
  if (!item) return false;
  const inserted = await db()
    .insert(shows)
    .values({
      companyKey: item.companyKey,
      title: item.showTitle ?? item.aiHeading,
      url: item.showUrl,
      blurb: item.showBlurb,
      ageRange: item.showAgeRange,
      imageUrl: item.showImageUrl,
    })
    .onConflictDoNothing()
    .returning({ id: shows.id });
  return inserted.length > 0;
}
