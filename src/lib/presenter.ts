import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { render } from "@react-email/render";
import { Resend } from "resend";
import * as React from "react";
import {
  db,
  companies,
  feedItems,
  showcaseEditions,
  showcaseEditionItems,
  showcaseEditionShows,
  shows,
  subscribers,
  type FeedItem,
  type PresenterRelevance,
  type Show,
  type ShowcaseEdition,
} from "./db";
import { getSetting, setSetting } from "./settings";
import { companyNameMap } from "./company-store";
import { companyNameFrom, sectionStyle, FEATURED_STYLE } from "./companies";
import { absolutizeImage, recordDeliveries } from "./send";
import { decodeEntities, researchItem } from "./show-research";
import ShowcaseEmail, {
  type ShowcaseEmailProps,
  type ShowcaseProfile,
  type ShowcaseSection,
} from "../emails/ShowcaseEmail";
import ShowcaseDraftEmail from "../emails/ShowcaseDraftEmail";

/**
 * The Showcase — the presenter and international partner edition. Stories
 * are rated low/medium/high for Showcase relevance at ingest; editions are
 * built explicitly in admin ("New Showcase" pre-fills from unused
 * high-relevance stories and the active show registry), then edited,
 * previewed, test-sent to the settings-managed test list, and finally sent
 * live to every active subscriber opted in to The Showcase Edition.
 * Nothing is ever sent automatically.
 */

const RECIPIENTS_KEY = "presenter_recipients";
const DEFAULT_RECIPIENTS = ["kevin@monkeybaa.com.au"];
const RESEARCH_MAX_PER_RUN = Number(
  process.env.PRESENTER_RESEARCH_MAX_PER_RUN ?? 2,
);
const PREFILL_MAX = Number(process.env.PRESENTER_PREFILL_MAX ?? 12);
const SOCIAL_PREFILL_MAX = Number(process.env.PRESENTER_SOCIAL_PREFILL_MAX ?? 4);
const MAX_PROFILES = 2;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Per-recipient merge tokens + Resend batch limit (same scheme as the
// cadence dispatch in send.ts).
const UNSUB_TOKEN = "%%UNSUBSCRIBE_URL%%";
const PREFS_TOKEN = "%%PREFERENCES_URL%%";
const BATCH_SIZE = 100;

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

/** SQL fragment: rated high for the Showcase or for Social Theatre. */
function highOrSocialHigh() {
  return sql`(${feedItems.presenterRelevance} = 'high' or ${feedItems.socialRelevance} = 'high')`;
}

/**
 * SQL fragment: the story may be used in newsletters and Showcase
 * editions. Items from manual-review feeds only qualify once a human has
 * approved them; trusted automatic feeds pass immediately ("auto").
 */
function usableStory() {
  return sql`${feedItems.reviewStatus} in ('auto', 'approved')`;
}

/**
 * SQL fragment: stories from trusted automatic feeds only. Used where a
 * story would be picked up without a human choosing it (edition prefill):
 * approved review-feed stories stay in the pool for manual adding but are
 * never auto-selected.
 */
function autoStory() {
  return sql`${feedItems.reviewStatus} = 'auto'`;
}

/** SQL fragment: the feed item is not part of any SENT edition. */
function notInSentEdition() {
  return sql`not exists (
    select 1 from ${showcaseEditionItems} ei
    join ${showcaseEditions} e on e.id = ei.edition_id
    where ei.feed_item_id = ${feedItems.id} and e.status = 'sent'
  )`;
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

/** Active subscribers who are opted in to The Showcase Edition. */
export async function getShowcaseSubscribers() {
  return db()
    .select()
    .from(subscribers)
    .where(
      and(eq(subscribers.status, "active"), eq(subscribers.showcase, true)),
    );
}

export async function getShowcaseSubscriberCount(): Promise<number> {
  const [row] = await db()
    .select({ count: sql<number>`count(*)::int` })
    .from(subscribers)
    .where(
      and(eq(subscribers.status, "active"), eq(subscribers.showcase, true)),
    );
  return row?.count ?? 0;
}

// ------------------------------------------------------------------ editions

export interface EditionEntry {
  item: FeedItem;
  featured: boolean;
  social: boolean;
  position: number;
}

/**
 * Copy that mentions relative time reads wrong days later ("we open
 * tomorrow"). Used to flag stories in the builder for a rewrite.
 */
export function hasRelativeTime(text: string): boolean {
  return /\b(today|tonight|tomorrow|yesterday|this (week|weekend|month|morning|afternoon|evening)|next (week|weekend|month)|last (night|week|weekend))\b/i.test(
    text,
  );
}

export async function getEdition(id: number): Promise<ShowcaseEdition | null> {
  const [edition] = await db()
    .select()
    .from(showcaseEditions)
    .where(eq(showcaseEditions.id, id))
    .limit(1);
  return edition ?? null;
}

export async function getEditionItems(
  editionId: number,
): Promise<EditionEntry[]> {
  const rows = await db()
    .select({
      item: feedItems,
      featured: showcaseEditionItems.featured,
      social: showcaseEditionItems.social,
      position: showcaseEditionItems.position,
    })
    .from(showcaseEditionItems)
    .innerJoin(feedItems, eq(showcaseEditionItems.feedItemId, feedItems.id))
    .where(eq(showcaseEditionItems.editionId, editionId))
    .orderBy(asc(showcaseEditionItems.position));
  return rows;
}

/** Live story/profile counts per edition (drafts have no stored counts). */
export async function getEditionCounts(): Promise<
  Map<number, { items: number; profiles: number }>
> {
  const rows = await db()
    .select({
      editionId: showcaseEditionItems.editionId,
      items: sql<number>`count(*)::int`,
      profiles: sql<number>`count(*) filter (where ${showcaseEditionItems.featured})::int`,
    })
    .from(showcaseEditionItems)
    .groupBy(showcaseEditionItems.editionId);
  return new Map(
    rows.map((r) => [r.editionId, { items: r.items, profiles: r.profiles }]),
  );
}

export async function getEditionShows(editionId: number): Promise<Show[]> {
  const rows = await db()
    .select({ show: shows })
    .from(showcaseEditionShows)
    .innerJoin(shows, eq(showcaseEditionShows.showId, shows.id))
    .where(eq(showcaseEditionShows.editionId, editionId))
    .orderBy(asc(showcaseEditionShows.position), asc(shows.title));
  return rows.map((r) => r.show);
}

/**
 * "New Showcase": a draft edition pre-filled with the newest unused
 * high-relevance stories and the active show registry.
 */
export async function createEditionFromPool(): Promise<{
  id: number;
  itemCount: number;
  showCount: number;
}> {
  const [edition] = await db()
    .insert(showcaseEditions)
    .values({})
    .returning({ id: showcaseEditions.id });

  const [pool, socialPool] = await Promise.all([
    db()
      .select({ id: feedItems.id })
      .from(feedItems)
      .where(
        and(
          eq(feedItems.presenterRelevance, "high"),
          notInSentEdition(),
          autoStory(),
        ),
      )
      .orderBy(desc(feedItems.publishedAt))
      .limit(PREFILL_MAX),
    db()
      .select({ id: feedItems.id })
      .from(feedItems)
      .where(
        and(
          eq(feedItems.socialRelevance, "high"),
          notInSentEdition(),
          autoStory(),
        ),
      )
      .orderBy(desc(feedItems.publishedAt))
      .limit(SOCIAL_PREFILL_MAX),
  ]);
  const newsIds = new Set(pool.map((p) => p.id));
  const socialOnly = socialPool.filter((p) => !newsIds.has(p.id));
  const rows = [
    ...pool.map((p, i) => ({
      editionId: edition.id,
      feedItemId: p.id,
      position: i,
    })),
    ...socialOnly.map((p, i) => ({
      editionId: edition.id,
      feedItemId: p.id,
      position: pool.length + i,
      social: true,
    })),
  ];
  if (rows.length > 0) {
    await db().insert(showcaseEditionItems).values(rows);
  }

  // Snapshot the active registry in the order the email always used
  // (company, then title); the builder can reorder from there.
  const activeShows = await db()
    .select({ id: shows.id })
    .from(shows)
    .leftJoin(companies, eq(companies.key, shows.companyKey))
    .where(eq(shows.status, "active"))
    .orderBy(asc(companies.name), asc(shows.title));
  if (activeShows.length > 0) {
    await db()
      .insert(showcaseEditionShows)
      .values(
        activeShows.map((s, i) => ({
          editionId: edition.id,
          showId: s.id,
          position: i,
        })),
      );
  }

  return { id: edition.id, itemCount: rows.length, showCount: activeShows.length };
}

/** Copy an edition (any status) into a fresh draft. */
export async function duplicateEdition(id: number): Promise<number | null> {
  const source = await getEdition(id);
  if (!source) return null;
  const [copy] = await db()
    .insert(showcaseEditions)
    .values({})
    .returning({ id: showcaseEditions.id });
  const items = await db()
    .select()
    .from(showcaseEditionItems)
    .where(eq(showcaseEditionItems.editionId, id));
  if (items.length > 0) {
    await db()
      .insert(showcaseEditionItems)
      .values(
        items.map((it) => ({
          editionId: copy.id,
          feedItemId: it.feedItemId,
          position: it.position,
          featured: it.featured,
          social: it.social,
        })),
      );
  }
  const showRows = await db()
    .select()
    .from(showcaseEditionShows)
    .where(eq(showcaseEditionShows.editionId, id));
  if (showRows.length > 0) {
    await db()
      .insert(showcaseEditionShows)
      .values(
        showRows.map((s) => ({
          editionId: copy.id,
          showId: s.showId,
          position: s.position,
        })),
      );
  }
  return copy.id;
}

export async function deleteEdition(id: number): Promise<boolean> {
  const edition = await getEdition(id);
  if (!edition) return false;
  await db()
    .delete(showcaseEditionItems)
    .where(eq(showcaseEditionItems.editionId, id));
  await db()
    .delete(showcaseEditionShows)
    .where(eq(showcaseEditionShows.editionId, id));
  await db().delete(showcaseEditions).where(eq(showcaseEditions.id, id));
  return true;
}

// --------------------------------------------------------- edition contents

/**
 * Pure reorder rule (exported for tests): swap `id` with its neighbour in
 * the given ordered id list. Returns the new order, or null when the id is
 * unknown or already at the edge.
 */
export function swapPositions(
  ids: number[],
  id: number,
  dir: "up" | "down",
): number[] | null {
  const idx = ids.indexOf(id);
  if (idx === -1) return null;
  const target = dir === "up" ? idx - 1 : idx + 1;
  if (target < 0 || target >= ids.length) return null;
  const next = [...ids];
  [next[idx], next[target]] = [next[target], next[idx]];
  return next;
}

async function renumberEdition(editionId: number, orderedItemIds: number[]) {
  if (orderedItemIds.length === 0) return;
  // One statement instead of N updates — reordering stays snappy even on
  // a big edition.
  const pairs = orderedItemIds
    .map((id, i) => `(${Number(id)}, ${i})`)
    .join(", ");
  await db().execute(
    sql`update showcase_edition_items as ei
        set position = v.pos
        from (values ${sql.raw(pairs)}) as v(feed_item_id, pos)
        where ei.edition_id = ${editionId}
          and ei.feed_item_id = v.feed_item_id`,
  );
}

/** Returns false when the story was already in the edition. */
export async function addItemToEdition(
  editionId: number,
  feedItemId: number,
): Promise<boolean> {
  const existing = await getEditionItems(editionId);
  const inserted = await db()
    .insert(showcaseEditionItems)
    .values({ editionId, feedItemId, position: existing.length })
    .onConflictDoNothing()
    .returning({ id: showcaseEditionItems.id });
  return inserted.length > 0;
}

export async function removeItemFromEdition(
  editionId: number,
  feedItemId: number,
): Promise<void> {
  await db()
    .delete(showcaseEditionItems)
    .where(
      and(
        eq(showcaseEditionItems.editionId, editionId),
        eq(showcaseEditionItems.feedItemId, feedItemId),
      ),
    );
  const remaining = await getEditionItems(editionId);
  await renumberEdition(
    editionId,
    remaining.map((r) => r.item.id),
  );
}

/**
 * Swap a story with its neighbour in the same group (news vs Social
 * Theatre) in ONE statement: the CTE finds the target (only in editable
 * editions) and its group neighbour, then both rows trade positions.
 * Returns false at the group's edge, for unknown items, and for sent
 * editions (zero rows updated in each case).
 */
export async function moveEditionItem(
  editionId: number,
  feedItemId: number,
  dir: "up" | "down",
): Promise<boolean> {
  const cmp = dir === "up" ? sql`<` : sql`>`;
  const ord = dir === "up" ? sql`desc` : sql`asc`;
  const rows = await db().execute(sql`
    with target as (
      select ei.feed_item_id, ei.position, ei.social
      from ${showcaseEditionItems} ei
      join ${showcaseEditions} e
        on e.id = ei.edition_id and e.status in ('draft', 'failed')
      where ei.edition_id = ${editionId} and ei.feed_item_id = ${feedItemId}
    ),
    neighbour as (
      select ei.feed_item_id, ei.position
      from ${showcaseEditionItems} ei, target t
      where ei.edition_id = ${editionId}
        and ei.social = t.social
        and ei.position ${cmp} t.position
      order by ei.position ${ord}
      limit 1
    )
    update ${showcaseEditionItems} ei
    set position = case
      when ei.feed_item_id = t.feed_item_id then n.position
      else t.position
    end
    from target t, neighbour n
    where ei.edition_id = ${editionId}
      and ei.feed_item_id in (t.feed_item_id, n.feed_item_id)
    returning ei.feed_item_id
  `);
  return rows.length === 2;
}

/** Returns false when a third profile was attempted. */
export async function setEditionItemFeatured(
  editionId: number,
  feedItemId: number,
  featured: boolean,
): Promise<boolean> {
  if (featured) {
    const entries = await getEditionItems(editionId);
    const others = entries.filter(
      (e) => e.featured && e.item.id !== feedItemId,
    );
    if (others.length >= MAX_PROFILES) return false;
  }
  await db()
    .update(showcaseEditionItems)
    // A profile can't also sit in Social Theatre.
    .set(featured ? { featured, social: false } : { featured })
    .where(
      and(
        eq(showcaseEditionItems.editionId, editionId),
        eq(showcaseEditionItems.feedItemId, feedItemId),
      ),
    );
  return true;
}

/** Tag a story into (or out of) the Social Theatre section. */
export async function setEditionItemSocial(
  editionId: number,
  feedItemId: number,
  social: boolean,
): Promise<void> {
  await db()
    .update(showcaseEditionItems)
    // A Social Theatre story can't also be a profile.
    .set(social ? { social, featured: false } : { social })
    .where(
      and(
        eq(showcaseEditionItems.editionId, editionId),
        eq(showcaseEditionItems.feedItemId, feedItemId),
      ),
    );
}

export async function addShowToEdition(
  editionId: number,
  showId: number,
): Promise<void> {
  await db().execute(sql`
    insert into ${showcaseEditionShows} (edition_id, show_id, position)
    select ${editionId}, ${showId},
      coalesce((select max(position) + 1 from ${showcaseEditionShows}
                where edition_id = ${editionId}), 0)
    on conflict do nothing
  `);
}

/**
 * Swap a Spotlight show with its neighbour in ONE statement, mirroring
 * moveEditionItem: the CTE finds the target (only in editable editions)
 * and the next show by position, then both rows trade positions.
 */
export async function moveEditionShow(
  editionId: number,
  showId: number,
  dir: "up" | "down",
): Promise<boolean> {
  const cmp = dir === "up" ? sql`<` : sql`>`;
  const ord = dir === "up" ? sql`desc` : sql`asc`;
  const rows = await db().execute(sql`
    with target as (
      select es.show_id, es.position
      from ${showcaseEditionShows} es
      join ${showcaseEditions} e
        on e.id = es.edition_id and e.status in ('draft', 'failed')
      where es.edition_id = ${editionId} and es.show_id = ${showId}
    ),
    neighbour as (
      select es.show_id, es.position
      from ${showcaseEditionShows} es, target t
      where es.edition_id = ${editionId}
        and (es.position ${cmp} t.position
             or (es.position = t.position and es.show_id ${cmp} t.show_id))
      order by es.position ${ord}, es.show_id ${ord}
      limit 1
    )
    update ${showcaseEditionShows} es
    set position = case
      when es.show_id = t.show_id then n.position
      else t.position
    end
    from target t, neighbour n
    where es.edition_id = ${editionId}
      and es.show_id in (t.show_id, n.show_id)
    returning es.show_id
  `);
  return rows.length === 2;
}

export async function removeShowFromEdition(
  editionId: number,
  showId: number,
): Promise<void> {
  await db()
    .delete(showcaseEditionShows)
    .where(
      and(
        eq(showcaseEditionShows.editionId, editionId),
        eq(showcaseEditionShows.showId, showId),
      ),
    );
}

// ------------------------------------------------------------------ pipeline

export interface PresenterPipelineResult {
  researched: number;
  notified: number;
  availableCount: number;
}

/**
 * Post-ingest Showcase step: research a few un-researched high-relevance
 * stories, then send one "new stories" notification covering any that
 * haven't been announced yet. Both halves are best-effort — a failure here
 * must never break the cron run. Editions are never created or sent here.
 */
export async function runPresenterPipeline(): Promise<PresenterPipelineResult> {
  const researched = await researchPendingStories().catch((err) => {
    console.error("Showcase research step failed:", err);
    return 0;
  });
  const notified = await notifyNewStories().catch((err) => {
    console.error("Showcase notify step failed:", err);
    return 0;
  });
  const available = await db()
    .select({ id: feedItems.id })
    .from(feedItems)
    .where(and(highOrSocialHigh(), notInSentEdition(), usableStory()));
  return { researched, notified, availableCount: available.length };
}

async function researchPendingStories(): Promise<number> {
  const pending = await db()
    .select()
    .from(feedItems)
    .where(
      and(
        eq(feedItems.presenterRelevance, "high"),
        isNull(feedItems.presenterResearchedAt),
        usableStory(),
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

async function notifyNewStories(): Promise<number> {
  const fresh = await db()
    .select()
    .from(feedItems)
    .where(
      and(
        highOrSocialHigh(),
        isNull(feedItems.presenterNotifiedAt),
        usableStory(),
      ),
    )
    .orderBy(desc(feedItems.publishedAt));
  if (fresh.length === 0) return 0;

  const [to, nameByKey, available] = await Promise.all([
    getPresenterRecipients(),
    companyNameMap(),
    db()
      .select({ id: feedItems.id })
      .from(feedItems)
      .where(and(highOrSocialHigh(), notInSentEdition(), usableStory())),
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
      draftCount: available.length,
    }),
  );

  if (process.env.SEND_DRY_RUN === "1") {
    console.log(
      `[dry-run] would notify ${to.join(", ")} of ${fresh.length} new Showcase stories`,
    );
  } else {
    const resend = new Resend(env("RESEND_API_KEY"));
    const { error } = await resend.emails.send({
      from: env("EMAIL_FROM"),
      to,
      subject: "The Showcase: new stories to review",
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
 * Pure Showcase assembly (exported for tests): edition entries in edition
 * order, up to two profiles (featured flag from the edition), Social
 * Theatre stories in their own section, the rest grouped by company, plus
 * the edition's show list. Null when there is nothing at all to send.
 */
export function buildShowcaseProps(
  entries: { item: FeedItem; featured: boolean; social?: boolean }[],
  showList: Show[],
  nameByKey: Map<string, string>,
  baseUrl: string,
  dateLabel: string,
): AssembledShowcase | null {
  if (entries.length === 0 && showList.length === 0) return null;

  // Website copy can carry HTML entities (stored before decoding was
  // comprehensive, or pasted by hand) — decode once more at assembly.
  const clean = (s: string | null) => (s === null ? null : decodeEntities(s));

  const featuredEntries = entries
    .filter((e) => e.featured && !e.social)
    .slice(0, MAX_PROFILES);
  const profiledIds = new Set(featuredEntries.map((e) => e.item.id));

  // Social Theatre: the announcement through the social lens, no show card.
  const socialItems = entries
    .filter((e) => e.social)
    .map(({ item: it }) => ({
      company: companyNameFrom(nameByKey, it.companyKey),
      heading: it.aiHeading,
      summary: it.aiSummary,
      postUrl: it.postUrl,
      // The admin Image URL field overrides the post image here too.
      imageUrl: absolutizeImage(it.showImageUrl ?? it.imageUrl, baseUrl),
    }));
  const socialIds = new Set(
    entries.filter((e) => e.social).map((e) => e.item.id),
  );

  const profiles: ShowcaseProfile[] = featuredEntries.map(({ item: it }) => ({
    company: companyNameFrom(nameByKey, it.companyKey),
    hex: FEATURED_STYLE.hex,
    // The announcement (the news itself)
    heading: it.aiHeading,
    summary: it.aiSummary,
    postUrl: it.postUrl,
    // The show (evergreen official info, rendered as a distinct block)
    showTitle: clean(it.showTitle),
    showBlurb: clean(it.showBlurb),
    ageRange: it.showAgeRange,
    showUrl: it.showUrl,
    imageUrl: absolutizeImage(it.showImageUrl ?? it.imageUrl, baseUrl),
  }));

  const grouped = new Map<string, FeedItem[]>();
  for (const { item: it } of entries) {
    if (profiledIds.has(it.id) || socialIds.has(it.id)) continue;
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
        // Each item carries the announcement (AI copy) and, separately,
        // the official show info for the "About the show" block.
        items: list.map((it) => ({
          heading: it.aiHeading,
          summary: it.aiSummary,
          postUrl: it.postUrl,
          showTitle: clean(it.showTitle),
          showBlurb: clean(it.showBlurb),
          showUrl: it.showUrl,
          imageUrl: absolutizeImage(it.showImageUrl ?? it.imageUrl, baseUrl),
          ageRange: it.showAgeRange,
        })),
      };
    },
  );

  // Spotlight cards render in the order given (the edition's own order,
  // set with the ▲ ▼ arrows in the builder).
  const listings = showList.map((s) => ({
      title: decodeEntities(s.title),
      company: companyNameFrom(nameByKey, s.companyKey),
      blurb: clean(s.blurb),
      url: s.url,
      ageRange: s.ageRange,
      imageUrl: absolutizeImage(s.imageUrl, baseUrl),
    }));

  return {
    props: {
      dateLabel,
      profiles,
      companies: sections,
      social: socialItems,
      shows: listings,
      baseUrl,
    },
    itemCount: entries.length,
    profileCount: profiles.length,
  };
}

export async function assembleEdition(
  editionId: number,
): Promise<AssembledShowcase | null> {
  const baseUrl = env("APP_URL").replace(/\/$/, "");
  const [entries, showList, nameByKey] = await Promise.all([
    getEditionItems(editionId),
    getEditionShows(editionId),
    companyNameMap(),
  ]);
  return buildShowcaseProps(
    entries,
    showList,
    nameByKey,
    baseUrl,
    sydneyDateLabel(),
  );
}

export async function renderShowcaseHtml(
  assembled: AssembledShowcase,
  urls?: { unsubscribeUrl: string; preferencesUrl: string },
): Promise<string> {
  return render(
    React.createElement(ShowcaseEmail, { ...assembled.props, ...urls }),
  );
}

// --------------------------------------------------------------------- send

export interface ShowcaseSendResult {
  status: "sent" | "skipped" | "blocked";
  itemCount: number;
  recipientCount: number;
  /** Human-readable reason when status is "blocked". */
  reason?: string;
}

/** The even-Spotlight rule, shared by test and live sends. */
function spotlightBlockReason(assembled: AssembledShowcase): string | null {
  const spotlightCount = assembled.props.shows.length;
  if (spotlightCount % 2 === 0) return null;
  return `This Showcase has ${spotlightCount} show${spotlightCount === 1 ? "" : "s"} in the Spotlight. The grid shows two per row, so add or remove one to make it an even number, then send again`;
}

function showcaseSubject(): string {
  return `The Showcase: Australia's Children's Theatre Alliance (${sydneyDateLabel()})`;
}

/**
 * Send an edition to the test list. Leaves the edition's status untouched:
 * a test send is a rendering check, not a dispatch, so the draft stays a
 * draft and can be test-sent as often as needed.
 */
export async function sendEditionTest(
  editionId: number,
): Promise<ShowcaseSendResult> {
  const assembled = await assembleEdition(editionId);
  if (!assembled) {
    return { status: "skipped", itemCount: 0, recipientCount: 0 };
  }
  const blocked = spotlightBlockReason(assembled);
  if (blocked) {
    return { status: "blocked", itemCount: 0, recipientCount: 0, reason: blocked };
  }

  const recipients = await getPresenterRecipients();
  const html = await renderShowcaseHtml(assembled);

  if (process.env.SEND_DRY_RUN === "1") {
    console.log(
      `[dry-run] would send Showcase edition ${editionId} test to ${recipients.join(", ")}`,
    );
  } else {
    const resend = new Resend(env("RESEND_API_KEY"));
    const { error } = await resend.emails.send({
      from: env("EMAIL_FROM"),
      to: recipients,
      subject: `[TEST] ${showcaseSubject()}`,
      html,
    });
    if (error) throw new Error(`Resend send failed: ${error.message}`);
  }
  return {
    status: "sent",
    itemCount: assembled.itemCount,
    recipientCount: recipients.length,
  };
}

/**
 * Send an edition to every active subscriber opted in to The Showcase
 * Edition, with per-recipient unsubscribe and preferences links. The
 * edition row is claimed atomically (draft/failed → sending), so a
 * double-click can't dispatch it twice; on failure it lands in "failed"
 * and stays editable and resendable.
 */
export async function sendEditionLive(
  editionId: number,
): Promise<ShowcaseSendResult> {
  const claimed = await db()
    .update(showcaseEditions)
    .set({ status: "sending", updatedAt: new Date() })
    .where(
      and(
        eq(showcaseEditions.id, editionId),
        sql`${showcaseEditions.status} in ('draft', 'failed')`,
      ),
    )
    .returning({ id: showcaseEditions.id });
  if (claimed.length === 0) {
    return { status: "skipped", itemCount: 0, recipientCount: 0 };
  }
  const revertToDraft = () =>
    db()
      .update(showcaseEditions)
      .set({ status: "draft" })
      .where(eq(showcaseEditions.id, editionId));

  try {
    const assembled = await assembleEdition(editionId);
    if (!assembled) {
      await revertToDraft();
      return { status: "skipped", itemCount: 0, recipientCount: 0 };
    }

    // The Spotlight renders as a two-card grid, so an odd count would
    // leave a hole. Block the send until the count is even.
    const blocked = spotlightBlockReason(assembled);
    if (blocked) {
      await revertToDraft();
      return {
        status: "blocked",
        itemCount: 0,
        recipientCount: 0,
        reason: blocked,
      };
    }

    const recipients = await getShowcaseSubscribers();
    if (recipients.length === 0) {
      await revertToDraft();
      return {
        status: "blocked",
        itemCount: 0,
        recipientCount: 0,
        reason:
          "No active subscribers are opted in to The Showcase Edition yet, so there is no one to send to. The draft is unchanged",
      };
    }

    const appUrl = env("APP_URL").replace(/\/$/, "");
    const html = await renderShowcaseHtml(assembled, {
      unsubscribeUrl: UNSUB_TOKEN,
      preferencesUrl: PREFS_TOKEN,
    });
    const subject = showcaseSubject();
    const from = env("EMAIL_FROM");

    if (process.env.SEND_DRY_RUN === "1") {
      console.log(
        `[dry-run] would send Showcase edition ${editionId} (${assembled.itemCount} items) to ${recipients.length} subscribers`,
      );
    } else {
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
          kind: "showcase" as const,
          editionId,
          subject,
        })),
      );
    }

    await db()
      .update(showcaseEditions)
      .set({
        status: "sent",
        sentAt: new Date(),
        updatedAt: new Date(),
        itemCount: assembled.itemCount,
        profileCount: assembled.profileCount,
        recipientCount: recipients.length,
        recipients: null,
      })
      .where(eq(showcaseEditions.id, editionId));
    return {
      status: "sent",
      itemCount: assembled.itemCount,
      recipientCount: recipients.length,
    };
  } catch (err) {
    await db()
      .update(showcaseEditions)
      .set({ status: "failed", updatedAt: new Date() })
      .where(eq(showcaseEditions.id, editionId));
    throw err;
  }
}

// ----------------------------------------------------------------- registry

/**
 * Copy a story's show details into the show registry (the Shows tab).
 * Deduped: the same company and title (ignoring case) is never added
 * twice. Returns the show's id and whether it was newly created, or null
 * when the story is gone.
 */
export async function addShowFromItem(
  itemId: number,
): Promise<{ id: number; created: boolean } | null> {
  const [item] = await db()
    .select()
    .from(feedItems)
    .where(eq(feedItems.id, itemId))
    .limit(1);
  if (!item) return null;
  const title = item.showTitle ?? item.aiHeading;
  const [existing] = await db()
    .select({ id: shows.id })
    .from(shows)
    .where(
      sql`${shows.companyKey} = ${item.companyKey} and lower(${shows.title}) = ${title.toLowerCase()}`,
    )
    .limit(1);
  if (existing) return { id: existing.id, created: false };
  const inserted = await db()
    .insert(shows)
    .values({
      companyKey: item.companyKey,
      title,
      url: item.showUrl,
      blurb: item.showBlurb,
      ageRange: item.showAgeRange,
      imageUrl: item.showImageUrl,
    })
    .onConflictDoNothing()
    .returning({ id: shows.id });
  if (inserted.length > 0) return { id: inserted[0].id, created: true };
  // Lost a race with a concurrent insert: fetch the winner.
  const [winner] = await db()
    .select({ id: shows.id })
    .from(shows)
    .where(and(eq(shows.companyKey, item.companyKey), eq(shows.title, title)))
    .limit(1);
  return winner ? { id: winner.id, created: false } : null;
}

// ---------------------------------------------------------------- list view

export const STORY_POOL_PAGE_SIZES = [10, 20, 50] as const;
export type StoryPoolPageSize = (typeof STORY_POOL_PAGE_SIZES)[number];

export interface ShowcaseListParams {
  sort: "date" | "company" | "headline" | "relevance" | "source";
  dir: "asc" | "desc";
  /** "all" (the default) shows everything; "high" = rated high for shows,
   * "s-high" = rated high for Social Theatre, "other" = neither. */
  rel: "all" | "high" | "s-high" | "other";
  co: string;
  q: string;
  /** 1-based page through the full history, `ps` stories per page. */
  pg: number;
  /** Stories per page. */
  ps: StoryPoolPageSize;
}

/** Validate/default the story-pool filter, sort and paging query params. */
export function parseShowcaseListParams(
  sp: Record<string, string | undefined>,
): ShowcaseListParams {
  const sorts = ["date", "company", "headline", "relevance", "source"] as const;
  const rels = ["all", "high", "s-high", "other"] as const;
  const pg = Number(sp.pg);
  const ps = Number(sp.ps);
  return {
    sort: sorts.find((s) => s === sp.sort) ?? "date",
    dir: sp.dir === "asc" ? "asc" : "desc",
    rel: rels.find((r) => r === sp.rel) ?? "all",
    co: (sp.co ?? "").trim(),
    q: (sp.q ?? "").trim(),
    pg: Number.isInteger(pg) && pg > 0 ? pg : 1,
    ps: STORY_POOL_PAGE_SIZES.find((s) => s === ps) ?? 10,
  };
}

export const RELEVANCE_OPTIONS: PresenterRelevance[] = [
  "high",
  "medium",
  "low",
];

export interface StoryPoolPage {
  rows: FeedItem[];
  /** True when another page of history exists beyond this one. */
  hasMore: boolean;
}

/**
 * The story pool: feed items filtered/sorted/paged for the admin list. In
 * "add" mode (an editionId is given) stories already in that edition are
 * excluded; stories used in past sent editions still appear (marked in the
 * UI) so they can be deliberately reused.
 */
export async function queryStoryPool(
  p: ShowcaseListParams,
  opts: { excludeEditionId?: number } = {},
): Promise<StoryPoolPage> {
  // Pending/rejected review-feed items live in the Review queue, not here;
  // ignored stories (the X action) are dropped from the pool for good.
  const conditions = [usableStory(), eq(feedItems.ignored, false)];
  if (p.rel === "high") {
    conditions.push(eq(feedItems.presenterRelevance, "high"));
  } else if (p.rel === "s-high") {
    conditions.push(eq(feedItems.socialRelevance, "high"));
  } else if (p.rel === "other") {
    conditions.push(
      sql`not (${feedItems.presenterRelevance} = 'high' or ${feedItems.socialRelevance} = 'high')`,
    );
  }
  if (p.co) conditions.push(eq(feedItems.companyKey, p.co));
  if (p.q) {
    const q = `%${p.q}%`;
    conditions.push(
      sql`(${feedItems.aiHeading} ilike ${q} or ${feedItems.rawTitle} ilike ${q} or ${feedItems.showTitle} ilike ${q})`,
    );
  }
  if (opts.excludeEditionId) {
    conditions.push(
      sql`not exists (
        select 1 from ${showcaseEditionItems} ei
        where ei.edition_id = ${opts.excludeEditionId}
          and ei.feed_item_id = ${feedItems.id}
      )`,
    );
  }

  const relevanceRank = sql`case ${feedItems.presenterRelevance} when 'high' then 0 when 'medium' then 1 else 2 end`;
  // Feed name via a subquery so the row shape stays a plain FeedItem;
  // hand-written stories (no feed) sort together at the end.
  const feedName = sql`coalesce((select f.name from feeds f where f.id = ${feedItems.feedId}), 'zzz-manual')`;
  // "Our" date: approval date for media stories, else the feed-ingest
  // date. This is the effective publish date the pool sorts by.
  const ourDate = sql`coalesce(${feedItems.reviewedAt}, ${feedItems.createdAt})`;
  const orderCol =
    p.sort === "company"
      ? feedItems.companyKey
      : p.sort === "headline"
        ? feedItems.aiHeading
        : p.sort === "relevance"
          ? relevanceRank
          : p.sort === "source"
            ? feedName
            : ourDate;

  // Fetch one extra row to know whether a further page exists.
  const rows = await db()
    .select()
    .from(feedItems)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(
      p.dir === "asc" ? asc(orderCol) : desc(orderCol),
      desc(ourDate),
    )
    .limit(p.ps + 1)
    .offset((p.pg - 1) * p.ps);
  return {
    rows: rows.slice(0, p.ps),
    hasMore: rows.length > p.ps,
  };
}

/**
 * Which stories have appeared in a sent Showcase, and when (latest send).
 * Used to badge the story pool.
 */
export async function getUsedStoryDates(): Promise<Map<number, Date | null>> {
  const rows = await db()
    .select({
      feedItemId: showcaseEditionItems.feedItemId,
      sentAt: showcaseEditions.sentAt,
    })
    .from(showcaseEditionItems)
    .innerJoin(
      showcaseEditions,
      eq(showcaseEditionItems.editionId, showcaseEditions.id),
    )
    .where(eq(showcaseEditions.status, "sent"));
  const map = new Map<number, Date | null>();
  for (const r of rows) {
    const prev = map.get(r.feedItemId);
    if (prev === undefined || (r.sentAt && (!prev || r.sentAt > prev))) {
      map.set(r.feedItemId, r.sentAt);
    }
  }
  return map;
}
