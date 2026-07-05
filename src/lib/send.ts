import { and, eq, gte, inArray, lt, or, sql } from "drizzle-orm";
import { render } from "@react-email/render";
import { Resend } from "resend";
import * as React from "react";
import {
  db,
  deliveries,
  feedItems,
  issues,
  newsletterInclusions,
  subscribers,
  type FeedItem,
} from "./db";
import type { Cadence } from "./db/schema";
import { companyNameFrom, sectionStyle, FEATURED_STYLE } from "./companies";
import { companyNameMap } from "./company-store";
import { pickFeatured } from "./ai";
import type { IssueWindow } from "./cadence";
import AllianceEmail, {
  type AllianceEmailProps,
  type EmailCompanySection,
  type EmailFeatured,
} from "../emails/AllianceEmail";
import IntroEmail from "../emails/IntroEmail";
import IntroNewsletterEmail from "../emails/IntroNewsletterEmail";

/**
 * Issue assembly + delivery. An issue is idempotent per cadence+window:
 * a row in `issues` is claimed before sending, so a cron retry never
 * double-sends. Per-recipient unsubscribe links are substituted into the
 * rendered HTML via a merge token.
 */

const UNSUB_TOKEN = "%%UNSUBSCRIBE_URL%%";
const PREFS_TOKEN = "%%PREFERENCES_URL%%";
const MAX_ITEMS_PER_COMPANY = 3;
const BATCH_SIZE = 100; // Resend batch API limit

function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set`);
  return v;
}

export interface AssembledIssue {
  props: Omit<AllianceEmailProps, "unsubscribeUrl">;
  itemCount: number;
}

/**
 * Turn a stored image reference into an absolute URL against the current
 * APP_URL. Handles relative "/api/img/<key>" paths (how new rows are
 * stored) and legacy rows that baked in a full origin at ingest time.
 */
export function absolutizeImage(url: string | null, baseUrl: string): string | null {
  if (!url) return null;
  if (url.startsWith("/")) return `${baseUrl}${url}`;
  const legacy = url.match(/\/api\/img\/[A-Za-z0-9_-]+$/);
  if (legacy) return `${baseUrl}${legacy[0]}`;
  return url;
}

/** Group window items into the email's data shape (featured, sections). */
export async function assembleIssue(
  window: IssueWindow,
): Promise<AssembledIssue | null> {
  const baseUrl = env("APP_URL").replace(/\/$/, "");
  const nameByKey = await companyNameMap();
  // Stories explicitly pushed into this cadence via the pool's Regular "+"
  // are included regardless of their publishing window.
  const forced = db()
    .select({ id: newsletterInclusions.feedItemId })
    .from(newsletterInclusions)
    .where(eq(newsletterInclusions.cadence, window.cadence));
  // "Our" date: when the story entered the system (a media story's
  // approval date, otherwise the feed-ingest date), not the article's
  // original publish date. This is what the newsletter window uses.
  const ourDate = sql`coalesce(${feedItems.reviewedAt}, ${feedItems.createdAt})`;
  const items = await db()
    .select()
    .from(feedItems)
    .where(
      and(
        eq(feedItems.ignored, false),
        or(
          // Trusted automatic-feed stories within the window (the default).
          // Hand-written and review-feed stories never enter here on their
          // own; they arrive only when explicitly forced in (below).
          and(
            gte(ourDate, window.start),
            lt(ourDate, window.end),
            eq(feedItems.source, "feed"),
            eq(feedItems.reviewStatus, "auto"),
          ),
          inArray(feedItems.id, forced),
        ),
      ),
    )
    .orderBy(ourDate);
  if (items.length === 0) return null;

  // Newest first within the window
  items.reverse();

  let featured: EmailFeatured | null = null;
  let sectionItems: FeedItem[] = items;
  if (window.cadence !== "daily" && items.length >= 2) {
    const idx = await pickFeatured(
      items.map((it) => ({
        company: companyNameFrom(nameByKey, it.companyKey),
        heading: it.aiHeading,
        summary: it.aiSummary,
      })),
    ).catch(() => 0);
    const pick = items[idx];
    featured = {
      company: companyNameFrom(nameByKey, pick.companyKey),
      hex: FEATURED_STYLE.hex,
      heading: pick.aiHeading,
      summary: pick.aiSummary,
      url: pick.postUrl,
      imageUrl: absolutizeImage(pick.imageUrl, baseUrl),
    };
    sectionItems = items.filter((it) => it.id !== pick.id);
  }

  // Group by company, preserving newest-first order of first appearance
  const grouped = new Map<string, FeedItem[]>();
  for (const it of sectionItems) {
    const list = grouped.get(it.companyKey) ?? [];
    if (list.length < MAX_ITEMS_PER_COMPANY) list.push(it);
    grouped.set(it.companyKey, list);
  }

  const companies: EmailCompanySection[] = [...grouped.entries()].map(
    ([key, list], i) => {
      const style = sectionStyle(i);
      return {
        name: companyNameFrom(nameByKey, key),
        hex: style.hex,
        colorName: style.colorName,
        shape: style.shape,
        items: list.map((it) => ({
          heading: it.aiHeading,
          summary: it.aiSummary,
          url: it.postUrl,
          imageUrl: absolutizeImage(it.imageUrl, baseUrl),
        })),
      };
    },
  );

  const indexNames =
    window.cadence === "fortnightly"
      ? [
          ...(featured ? [featured.company] : []),
          ...companies.map((c) => c.name).filter((n) => n !== featured?.company),
        ]
      : undefined;

  return {
    props: {
      cadence: window.cadence,
      dateRange: window.dateRange,
      intro: window.intro,
      indexNames,
      featured,
      companies,
      baseUrl,
    },
    itemCount: items.length,
  };
}

export async function renderIssueHtml(
  assembled: AssembledIssue,
  unsubscribeUrl: string = UNSUB_TOKEN,
  preferencesUrl: string = PREFS_TOKEN,
): Promise<string> {
  return render(
    React.createElement(AllianceEmail, {
      ...assembled.props,
      unsubscribeUrl,
      preferencesUrl,
    }),
  );
}

const SUBJECT: Record<Cadence, string> = {
  daily: "Today across the Alliance",
  weekly: "This week across the Alliance",
  fortnightly: "This fortnight across the Alliance",
};

export interface SendResult {
  status: "sent" | "skipped" | "already-sent";
  itemCount: number;
  recipientCount: number;
}

/**
 * Write one delivery row per recipient after a successful live send. The
 * emails are already out, so a bookkeeping failure must never fail the
 * send: log and move on.
 */
export async function recordDeliveries(
  rows: (typeof deliveries.$inferInsert)[],
): Promise<void> {
  try {
    for (let i = 0; i < rows.length; i += 1000) {
      await db().insert(deliveries).values(rows.slice(i, i + 1000));
    }
  } catch (err) {
    console.error("Recording deliveries failed:", err);
  }
}

/**
 * Send the issue for a cadence window to all its active subscribers.
 * Claims the issues row first (unique on cadence+window) for idempotency.
 */
export async function sendIssue(window: IssueWindow): Promise<SendResult> {
  const claimed = await db()
    .insert(issues)
    .values({
      cadence: window.cadence,
      windowKey: window.key,
      windowStart: window.start,
      windowEnd: window.end,
    })
    .onConflictDoNothing()
    .returning({ id: issues.id });
  if (claimed.length === 0) {
    return { status: "already-sent", itemCount: 0, recipientCount: 0 };
  }
  const issueId = claimed[0].id;

  const finish = async (
    status: "sent" | "skipped" | "failed",
    itemCount: number,
    recipientCount: number,
  ) => {
    await db()
      .update(issues)
      .set({
        status,
        itemCount,
        recipientCount,
        sentAt: status === "sent" ? new Date() : null,
      })
      .where(eq(issues.id, issueId));
    // Forced stories are "for the next send" of this cadence: once it has
    // actually gone out, clear them so they appear once then drop off. A
    // skipped send keeps them waiting for the next real one.
    if (status === "sent") {
      await db()
        .delete(newsletterInclusions)
        .where(eq(newsletterInclusions.cadence, window.cadence));
    }
  };

  try {
    const assembled = await assembleIssue(window);
    if (!assembled) {
      await finish("skipped", 0, 0);
      return { status: "skipped", itemCount: 0, recipientCount: 0 };
    }

    const recipients = await db()
      .select()
      .from(subscribers)
      .where(
        and(
          eq(subscribers.cadence, window.cadence),
          eq(subscribers.status, "active"),
        ),
      );
    if (recipients.length === 0) {
      await finish("skipped", assembled.itemCount, 0);
      return { status: "skipped", itemCount: assembled.itemCount, recipientCount: 0 };
    }

    const html = await renderIssueHtml(assembled);
    const subject = `${SUBJECT[window.cadence]} — ${window.dateRange}`;
    const appUrl = env("APP_URL").replace(/\/$/, "");
    const from = env("EMAIL_FROM");

    if (process.env.SEND_DRY_RUN === "1") {
      console.log(
        `[dry-run] would send ${window.cadence} issue (${assembled.itemCount} items) to ${recipients.length} subscribers`,
      );
      await finish("sent", assembled.itemCount, recipients.length);
      return {
        status: "sent",
        itemCount: assembled.itemCount,
        recipientCount: recipients.length,
      };
    }

    const resend = new Resend(env("RESEND_API_KEY"));
    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      const batch = recipients.slice(i, i + BATCH_SIZE).map((r) => {
        const unsubUrl = `${appUrl}/unsubscribe?token=${r.unsubscribeToken}`;
        const prefsUrl = `${appUrl}/preferences?token=${r.unsubscribeToken}`;
        return {
          from,
          to: r.email,
          subject,
          html: html
            .replaceAll(UNSUB_TOKEN, unsubUrl)
            .replaceAll(PREFS_TOKEN, prefsUrl),
          headers: {
            // One-click POST target (RFC 8058) — mail clients POST here
            "List-Unsubscribe": `<${appUrl}/api/unsubscribe?token=${r.unsubscribeToken}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          },
        };
      });
      const { error } = await resend.batch.send(batch);
      if (error) throw new Error(`Resend batch failed: ${error.message}`);
    }

    await recordDeliveries(
      recipients.map((r) => ({
        subscriberId: r.id,
        kind: "issue" as const,
        issueId,
        subject,
      })),
    );

    await finish("sent", assembled.itemCount, recipients.length);
    return {
      status: "sent",
      itemCount: assembled.itemCount,
      recipientCount: recipients.length,
    };
  } catch (err) {
    await finish("failed", 0, 0);
    throw err;
  }
}

/** The two one-off introduction emails: the Alliance-first original and
 * the newsletter-first variant (how to sign up, with the Alliance as the
 * secondary section). */
export type IntroKind = "alliance" | "newsletter";

const INTRO_SUBJECT: Record<IntroKind, string> = {
  alliance: "Introducing the Children's Theatre Alliance",
  newsletter: "The newsletter of Australia's children's theatre makers",
};
const MAX_INTRO_RECIPIENTS = 200;

export async function renderIntroHtml(
  kind: IntroKind = "alliance",
): Promise<string> {
  const baseUrl = env("APP_URL").replace(/\/$/, "");
  return render(
    React.createElement(
      kind === "newsletter" ? IntroNewsletterEmail : IntroEmail,
      { baseUrl },
    ),
  );
}

export interface IntroSendResult {
  sent: number;
  invalid: string[];
  skipped: number;
}

/**
 * One-off introduction email to a pasted list of addresses (funders,
 * presenters, friends of the Alliance). Recipients are used for this send
 * only and are deliberately never stored.
 */
export async function sendIntro(
  raw: string,
  kind: IntroKind = "alliance",
): Promise<IntroSendResult> {
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const parts = raw
    .split(/[,;\n\r]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const unique = [...new Set(parts)];
  const valid = unique.filter((e) => emailRe.test(e));
  const invalid = unique.filter((e) => !emailRe.test(e));
  const recipients = valid.slice(0, MAX_INTRO_RECIPIENTS);
  const skipped = valid.length - recipients.length;
  if (recipients.length === 0) return { sent: 0, invalid, skipped };

  const html = await renderIntroHtml(kind);
  const from = env("EMAIL_FROM");

  if (process.env.SEND_DRY_RUN === "1") {
    console.log(`[dry-run] would send intro (${kind}) to ${recipients.length} recipients`);
    return { sent: recipients.length, invalid, skipped };
  }

  const resend = new Resend(env("RESEND_API_KEY"));
  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const batch = recipients.slice(i, i + BATCH_SIZE).map((to) => ({
      from,
      to,
      subject: INTRO_SUBJECT[kind],
      html,
    }));
    const { error } = await resend.batch.send(batch);
    if (error) throw new Error(`Resend batch failed: ${error.message}`);
  }
  return { sent: recipients.length, invalid, skipped };
}

/**
 * Send a single test issue to one address (admin "send test" button).
 * If the address belongs to a subscriber, their real unsubscribe and
 * preferences links are used so the footer is fully clickable.
 */
export async function sendTest(
  window: IssueWindow,
  to: string,
): Promise<"sent" | "no-items"> {
  const assembled = await assembleIssue(window);
  if (!assembled) return "no-items";
  const appUrl = env("APP_URL").replace(/\/$/, "");
  const [existing] = await db()
    .select()
    .from(subscribers)
    .where(eq(subscribers.email, to.toLowerCase()))
    .limit(1);
  const tokenSuffix = existing ? `?token=${existing.unsubscribeToken}` : "";
  const html = await renderIssueHtml(
    assembled,
    `${appUrl}/unsubscribe${tokenSuffix}`,
    `${appUrl}/preferences${tokenSuffix}`,
  );
  const resend = new Resend(env("RESEND_API_KEY"));
  const { error } = await resend.emails.send({
    from: env("EMAIL_FROM"),
    to,
    subject: `[TEST] ${SUBJECT[window.cadence]} — ${window.dateRange}`,
    html,
  });
  if (error) throw new Error(`Resend send failed: ${error.message}`);
  return "sent";
}
