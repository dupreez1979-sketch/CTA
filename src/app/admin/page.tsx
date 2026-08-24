import { and, asc, desc, eq, gte, inArray, sql } from "drizzle-orm";
import {
  db,
  deliveries,
  subscribers,
  issues,
  companies,
  feedItems,
  showcaseEditions,
  allianceUpdates,
  shows,
  type Delivery,
  type FeedItem,
  type SubscriberCadence,
  type ShowcaseEdition,
  type AllianceUpdate,
  type Subscriber,
} from "@/lib/db";
import { loadCompanies } from "@/lib/company-store";
import { loadFeeds } from "@/lib/feed-store";
import { getBlockedSources } from "@/lib/blocked-sources";
import {
  recentPoolStories,
  duplicateMap,
  similarInPool,
  type DupStory,
} from "@/lib/duplicates";
import { getAiSpend } from "@/lib/ai-spend";
import { getNotifyEmails } from "@/lib/notify";
import { getAllianceRecipients } from "@/lib/alliance";
import {
  getEdition,
  getEditionCounts,
  getEditionItems,
  getEditionShows,
  getPresenterRecipients,
  getShowcaseSubscriberCount,
  getUsedStoryDates,
  hasRelativeTime,
  parseShowcaseListParams,
  queryStoryPool,
  STORY_POOL_GROUP_LIMIT,
  STORY_POOL_PAGE_SIZES,
  type ShowcaseListParams,
  type StoryPoolPage,
} from "@/lib/presenter";
import {
  SCHEDULE_DESCRIPTION,
  formatSydneyDateTime,
  formatSydneyStamp,
  formatWindowLabel,
  issueWindow,
  nextSendAt,
} from "@/lib/cadence";
import Link from "next/link";
import Image from "next/image";
import { CLOUD_PATH } from "@/lib/clouds";
import AdminNav from "@/components/AdminNav";
import ConfirmSubmit from "@/components/ConfirmSubmit";
import SelectAllCheckbox from "@/components/SelectAllCheckbox";
import HelpTip from "@/components/HelpTip";
import TestSendButton from "@/components/TestSendButton";
import ImageUploadButton from "@/components/ImageUploadButton";
import AutoSubmitSelect from "@/components/AutoSubmitSelect";
import AddShowModal from "@/components/AddShowModal";
import ShowcaseAddModal from "@/components/ShowcaseAddModal";
import StoryToolbar from "@/components/StoryToolbar";
import RefreshButton from "@/components/RefreshButton";
import MoveButtons from "@/components/MoveButtons";
import QuickAction from "@/components/QuickAction";
import RatingsForm from "@/components/RatingsForm";
import LogViewer from "@/components/LogViewer";

export const dynamic = "force-dynamic";

/** Australian date: yyyy-mm-dd (UTC, matching how the app stores days). */
function auDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

const CADENCES = ["daily", "weekly", "fortnightly"] as const;

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "editions", label: "Editions" },
  { id: "presenters", label: "The Showcase" },
  { id: "review", label: "Stories" },
  { id: "shows", label: "Shows" },
  { id: "subscribers", label: "Subscribers" },
  { id: "settings", label: "Settings" },
] as const;
type Tab = (typeof TABS)[number]["id"];

const h2: React.CSSProperties = {
  fontFamily: "var(--font-display)",
  textTransform: "uppercase",
  fontSize: 26,
  lineHeight: 0.94,
  margin: "0 0 16px",
};
const th: React.CSSProperties = {
  textAlign: "left",
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "var(--text-muted)",
  padding: "6px 10px",
  borderBottom: "2px solid var(--cta-ink)",
};
const td: React.CSSProperties = {
  fontSize: 13.5,
  padding: "7px 10px",
  borderBottom: "1px solid rgba(30,30,29,0.15)",
};
const muted: React.CSSProperties = {
  fontSize: 13.5,
  color: "var(--text-muted)",
  marginTop: 0,
};
const buttonStyle: React.CSSProperties = {
  fontFamily: "var(--font-body)",
  fontWeight: 700,
  fontSize: 13,
  color: "var(--cta-ink)",
  background: "var(--cta-purple)",
  border: "2px solid var(--cta-ink)",
  borderRadius: 12,
  padding: "10px 16px",
  cursor: "pointer",
  boxShadow: "3px 3px 0 var(--cta-ink)",
};
const smallButton: React.CSSProperties = {
  fontFamily: "var(--font-body)",
  fontWeight: 700,
  fontSize: 12,
  color: "var(--cta-ink)",
  background: "var(--cta-purple)",
  border: "2px solid var(--cta-ink)",
  borderRadius: 8,
  padding: "6px 12px",
  cursor: "pointer",
};
// Button colour semantics, applied everywhere in the admin:
//   purple = constructive (save, add, create)   yellow = emails real people
//   white  = neutral (preview, navigate, copy)  pink   = destructive
const dangerButton: React.CSSProperties = {
  ...smallButton,
  background: "var(--cta-pink)",
};
const inputStyle: React.CSSProperties = {
  fontFamily: "var(--font-body)",
  fontSize: 14,
  padding: "9px 10px",
  border: "2px solid var(--cta-ink)",
  borderRadius: 10,
  background: "var(--cta-white)",
};
const smallInput: React.CSSProperties = {
  fontFamily: "var(--font-body)",
  fontSize: 13,
  padding: "6px 8px",
  border: "2px solid var(--cta-ink)",
  borderRadius: 8,
  background: "var(--cta-white)",
};
const tile: React.CSSProperties = {
  border: "2px solid var(--cta-ink)",
  borderRadius: 14,
  padding: "12px 18px",
  background: "var(--cta-cream-warm)",
  boxShadow: "3px 3px 0 var(--cta-ink)",
};

/**
 * Admin console (behind basic auth via middleware), organised into tabs:
 * Overview (schedule + issue log), Sending (fetch/preview/send),
 * Subscribers, and Companies.
 */
export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const { message, tab: requested } = sp;
  // Renamed tabs ("Sending" became Editions, "Companies" became Settings
  // in July 2026): old links and bookmarks still land in the right place.
  const rawTab =
    requested === "sending"
      ? "editions"
      : requested === "companies"
        ? "settings"
        : requested;
  const tab: Tab = (TABS.find((t) => t.id === rawTab)?.id ?? "overview") as Tab;

  return (
    <>
    <main className="admin-main">
      <AdminNav tabs={TABS} active={tab} />

      {/* Page title, matching the selected menu item. */}
      <h1 className="admin-page-title">
        {TABS.find((t) => t.id === tab)?.label}
      </h1>

      {message && (
        <div
          className="admin-card"
          style={{
            background: "var(--cta-mint)",
            padding: "14px 20px",
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          {message}
        </div>
      )}

      {tab === "overview" && <OverviewTab sp={sp} />}
      {tab === "editions" && <EditionsTab sp={sp} />}
      {tab === "review" && <ReviewTab sp={sp} />}
      {tab === "shows" && <ShowsTab sp={sp} />}
      {tab === "subscribers" && <SubscribersTab sp={sp} />}
      {tab === "settings" && <SettingsTab sp={sp} />}
      {tab === "presenters" && <ShowcaseTab sp={sp} />}
    </main>
    <AdminFooter tab={tab} />
    </>
  );
}

/**
 * Footer styled like the Alliance website: ink clouds rise over the page,
 * then a purple box floats on the ink band with links and the
 * acknowledgement.
 */
function AdminFooter({ tab }: { tab: Tab }) {
  return (
    <footer>
      <svg
        className="admin-footer-cloud"
        viewBox="0 0 1280 104"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path d={CLOUD_PATH} fill="var(--cta-ink)" fillRule="evenodd" />
      </svg>
      <div className="admin-footer-band">
        <div className="admin-footer-box">
          <div className="admin-footer-top">
            <div>
              <Image
                src="/logo-full.png"
                alt="The Children's Theatre Alliance"
                width={173}
                height={55}
                style={{ height: 55, width: "auto" }}
              />
              <p className="admin-footer-name">Newsletter Admin</p>
            </div>
            <nav className="admin-footer-links" aria-label="Admin pages">
              {TABS.map((t) => (
                <Link
                  prefetch={false}
                  key={t.id}
                  href={`/admin?tab=${t.id}`}
                  className="admin-footer-link"
                  aria-current={tab === t.id}
                >
                  {t.label}
                </Link>
              ))}
            </nav>
            <nav className="admin-footer-links" aria-label="The Alliance">
              <a
                href="https://www.childrenstheatrealliance.com.au/"
                className="admin-footer-link"
              >
                The Alliance website
              </a>
              <a
                href="https://www.childrenstheatrealliance.com.au/privacy-policy"
                className="admin-footer-link"
              >
                Privacy Policy
              </a>
              <Link href="/" className="admin-footer-link" prefetch={false}>
                Newsletter sign-up page
              </Link>
            </nav>
          </div>
          <p className="admin-footer-fine">
            Administered by the National Children&#39;s Theatre Initiative.
          </p>
          <p className="admin-footer-fine">
            The Alliance acknowledges the traditional custodians of the lands
            on which we meet, gather, and work. We pay our respects to Elders
            past and present.
          </p>
        </div>
      </div>
    </footer>
  );
}

const SENDS_PAGE = 15;

/** One big-number tile on the Overview dashboard. */
function StatCard({
  label,
  value,
  sub,
  bg,
}: {
  label: string;
  value: number;
  sub?: string;
  bg: string;
}) {
  return (
    <div className="stat-card" style={{ background: bg }}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value.toLocaleString("en-AU")}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

/**
 * "Next editions" tiles: when each cadence newsletter next goes out and
 * to how many subscribers, plus The Showcase Edition. Shown on Overview
 * and on Regular Editions.
 */
function NextEditionsCard({
  countByCadence,
  showcaseCount,
}: {
  countByCadence: Record<string, number>;
  showcaseCount: number;
}) {
  return (
    <section className="admin-card">
      <h2 style={h2}>
        Next editions
        <HelpTip title="Next editions">
          Newsletters go out with the morning pipeline run: 7:00 am Sydney
          time during winter (AEST) and 8:00 am during daylight saving
          (AEDT). A quiet window is skipped, never sent empty.
        </HelpTip>
      </h2>
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
        {CADENCES.map((c) => {
          const next = nextSendAt(
            c,
            new Date(),
            process.env.FORTNIGHT_ANCHOR ?? "2026-07-06",
          );
          return (
            <div key={c} style={{ ...tile, flex: "1 1 200px" }}>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  textTransform: "uppercase",
                  fontSize: 22,
                  lineHeight: 1,
                  marginBottom: 4,
                }}
              >
                {c}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "var(--text-muted)",
                  marginBottom: 8,
                }}
              >
                {SCHEDULE_DESCRIPTION[c]} ·{" "}
                {countByCadence[c] ?? 0} subscriber
                {(countByCadence[c] ?? 0) === 1 ? "" : "s"}
              </div>
              <div style={{ fontSize: 13.5, fontWeight: 600 }}>
                Next: {formatSydneyDateTime(next)}
              </div>
            </div>
          );
        })}
        <div style={{ ...tile, flex: "1 1 200px" }}>
          <div
            style={{
              fontFamily: "var(--font-display)",
              textTransform: "uppercase",
              fontSize: 22,
              lineHeight: 1,
              marginBottom: 4,
            }}
          >
            The Showcase Edition
          </div>
          <div
            style={{
              fontSize: 12,
              color: "var(--text-muted)",
              marginBottom: 8,
            }}
          >
            Sent when there is show news · {showcaseCount} subscriber
            {showcaseCount === 1 ? "" : "s"}
          </div>
          <div style={{ fontSize: 13.5, fontWeight: 600 }}>
            Built and sent from The Showcase tab
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * The shared "History" table used on Overview (both kinds), Editions
 * (regular newsletters only) and The Showcase (Showcase editions only), so
 * all three are identical. Columns: Type, Window, Status, Stories,
 * Recipients, Sent at, Actions. Preview is always present in Actions; each
 * caller can add extra per-row actions (e.g. Duplicate/Delete for the
 * Showcase). Sorting is driven by the caller's sortLink so each tab keeps
 * its own URL params while the columns and layout stay the same.
 */
const HISTORY_COLUMNS = [
  { key: "type", label: "Type" },
  { key: "window", label: "Window" },
  { key: "status", label: "Status" },
  { key: "stories", label: "Stories" },
  { key: "recipients", label: "Recipients" },
  { key: "sent", label: "Sent at" },
] as const;
type HistorySortKey = (typeof HISTORY_COLUMNS)[number]["key"];

interface HistoryRow {
  key: string;
  /** e.g. "daily" or "The Showcase". */
  typeLabel: string;
  /** Show the teal Showcase badge instead of a plain type label. */
  showcase: boolean;
  /** Window key for newsletters, or the sent date for Showcase editions. */
  window: string;
  status: string;
  stories: number;
  recipients: number;
  recipientsHref: string | null;
  sentAt: Date | null;
  previewHref: string;
  /** Extra action buttons after Preview (e.g. Duplicate, Delete). */
  extraActions?: React.ReactNode;
}

function historyStatusColor(status: string): string {
  return status === "sent"
    ? "var(--cta-emerald)"
    : status === "failed"
      ? "var(--cta-pink)"
      : status === "sending"
        ? "var(--cta-yellow)"
        : "var(--cta-white)";
}

function HistoryTable({
  rows,
  sortLink,
  empty,
}: {
  rows: HistoryRow[];
  sortLink: (key: HistorySortKey, label: string) => React.ReactNode;
  empty: React.ReactNode;
}) {
  if (rows.length === 0) {
    return <p style={{ ...muted, marginBottom: 0 }}>{empty}</p>;
  }
  return (
    <div className="table-scroll">
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            {HISTORY_COLUMNS.map((c) => (
              <th key={c.key} style={th}>
                {sortLink(c.key, c.label)}
              </th>
            ))}
            <th style={th}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key}>
              <td style={td}>
                {r.showcase ? (
                  <span style={badge("var(--cta-teal)")}>The Showcase</span>
                ) : (
                  <span style={{ textTransform: "capitalize" }}>{r.typeLabel}</span>
                )}
              </td>
              <td style={{ ...td, whiteSpace: "nowrap" }}>{r.window}</td>
              <td style={td}>
                <span style={badge(historyStatusColor(r.status))}>{r.status}</span>
              </td>
              <td style={td}>{r.stories}</td>
              <td style={td}>
                {r.recipientsHref && r.recipients > 0 ? (
                  <Link
                    prefetch={false}
                    href={r.recipientsHref}
                    style={{ color: "var(--cta-ink)", fontWeight: 600 }}
                  >
                    {r.recipients}
                  </Link>
                ) : (
                  r.recipients
                )}
              </td>
              <td style={{ ...td, whiteSpace: "nowrap" }}>
                {r.sentAt ? formatSydneyDateTime(r.sentAt) : "—"}
              </td>
              <td style={{ ...td, whiteSpace: "nowrap" }}>
                <a
                  href={r.previewHref}
                  target="_blank"
                  style={{
                    ...smallButton,
                    display: "inline-block",
                    textDecoration: "none",
                    background: "var(--cta-white)",
                    marginRight: 6,
                  }}
                >
                  Preview ↗
                </a>
                {r.extraActions}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

async function OverviewTab({
  sp,
}: {
  sp: Record<string, string | undefined>;
}) {
  const opgRaw = Number(sp.opg);
  const opg = Number.isInteger(opgRaw) && opgRaw > 0 ? opgRaw : 1;
  // Sort of the History table. Default: by sent-at, newest first.
  const OSORTS = ["type", "window", "status", "stories", "recipients", "sent"] as const;
  const osort = (OSORTS as readonly string[]).includes(sp.osort ?? "")
    ? (sp.osort as (typeof OSORTS)[number])
    : "sent";
  const odir = sp.odir === "asc" ? "asc" : "desc";
  // Filter the History table by type.
  const OTYPES = ["all", "daily", "weekly", "fortnightly", "showcase"] as const;
  const otype = (OTYPES as readonly string[]).includes(sp.otype ?? "")
    ? (sp.otype as (typeof OTYPES)[number])
    : "all";
  const count = sql<number>`count(*)::int`;
  const dayAgo = new Date(Date.now() - 864e5);
  const weekAgo = new Date(Date.now() - 7 * 864e5);
  const fortnightAgo = new Date(Date.now() - 14 * 864e5);
  // Stories that count: from the feed pipeline, and (for manual-review
  // feeds) approved by a human.
  const usable = inArray(feedItems.reviewStatus, ["auto", "approved"]);
  // Companies that had at least one feed story since the cutoff.
  const companiesPostingSince = (cutoff: Date) =>
    db()
      .select({ count: sql<number>`count(distinct ${companies.key})::int` })
      .from(companies)
      .innerJoin(feedItems, eq(feedItems.companyKey, companies.key))
      .where(
        and(
          eq(feedItems.source, "feed"),
          usable,
          gte(feedItems.publishedAt, cutoff),
        ),
      );
  const storiesSince = (cutoff: Date) =>
    db()
      .select({ count })
      .from(feedItems)
      .where(
        and(
          eq(feedItems.source, "feed"),
          usable,
          gte(feedItems.publishedAt, cutoff),
        ),
      );
  const [
    counts,
    showcaseCount,
    recentIssues,
    sentEditions,
    [storiesWeek],
    [storiesDay],
    [companyTotal],
    [postingFortnight],
    [postingWeek],
    [newSubsWeek],
    [sentWeek],
  ] = await Promise.all([
    db()
      .select({
        cadence: subscribers.cadence,
        count: sql<number>`count(*)::int`,
      })
      .from(subscribers)
      .where(eq(subscribers.status, "active"))
      .groupBy(subscribers.cadence),
    getShowcaseSubscriberCount(),
    db().select().from(issues).orderBy(desc(issues.id)),
    db()
      .select()
      .from(showcaseEditions)
      .where(eq(showcaseEditions.status, "sent"))
      .orderBy(desc(showcaseEditions.sentAt)),
    storiesSince(weekAgo),
    storiesSince(dayAgo),
    db().select({ count }).from(companies),
    companiesPostingSince(fortnightAgo),
    companiesPostingSince(weekAgo),
    db()
      .select({ count })
      .from(subscribers)
      .where(
        and(
          eq(subscribers.status, "active"),
          gte(subscribers.createdAt, weekAgo),
        ),
      ),
    db()
      .select({ count })
      .from(deliveries)
      .where(gte(deliveries.sentAt, weekAgo)),
  ]);
  const countByCadence = Object.fromEntries(
    counts.map((c) => [c.cadence, c.count]),
  );
  const activeTotal = counts.reduce((sum, c) => sum + c.count, 0);
  const quietCompanies = companyTotal.count - postingFortnight.count;

  // One send log: cadence issues and live Showcase sends, newest first.
  const allSends = [
    ...recentIssues.map((i) => ({
      key: `issue-${i.id}`,
      type: i.cadence as string,
      showcase: false,
      label: i.windowKey,
      status: i.status as string,
      items: i.itemCount,
      recipients: i.recipientCount,
      sentAt: i.sentAt,
      // For unsent issues, fall back to the day it was meant to go out
      // (window end) so they sort into the timeline sensibly.
      stamp: (i.sentAt ?? i.windowEnd).getTime(),
      windowStamp: i.windowStart.getTime(),
      previewHref: `/admin/preview/${i.cadence}`,
      href:
        i.status === "sent" && i.recipientCount > 0
          ? `/admin?tab=editions&issue=${i.id}`
          : null,
    })),
    ...sentEditions.map((e) => ({
      key: `edition-${e.id}`,
      type: "The Showcase",
      showcase: true,
      label: auDate(e.sentAt ?? e.createdAt),
      status: e.status as string,
      items: e.itemCount,
      recipients: e.recipientCount,
      sentAt: e.sentAt,
      stamp: (e.sentAt ?? e.createdAt).getTime(),
      windowStamp: (e.sentAt ?? e.createdAt).getTime(),
      previewHref: `/admin/preview/presenter?edition=${e.id}`,
      href: `/admin?tab=presenters&edition=${e.id}`,
    })),
  ];
  allSends.sort((a, b) => {
    let d: number;
    switch (osort) {
      case "type":
        d = a.type.localeCompare(b.type);
        break;
      case "status":
        d = a.status.localeCompare(b.status);
        break;
      case "stories":
        d = a.items - b.items;
        break;
      case "recipients":
        d = a.recipients - b.recipients;
        break;
      case "sent":
        d = a.stamp - b.stamp;
        break;
      default:
        d = a.windowStamp - b.windowStamp;
    }
    // Stable tiebreak so equal keys keep a consistent order (newest first).
    if (d === 0) d = a.stamp - b.stamp;
    return odir === "asc" ? d : -d;
  });
  const typed =
    otype === "all"
      ? allSends
      : otype === "showcase"
        ? allSends.filter((r) => r.showcase)
        : allSends.filter((r) => !r.showcase && r.type === otype);
  const pageSends = typed.slice((opg - 1) * SENDS_PAGE, opg * SENDS_PAGE);
  const hasMoreSends = typed.length > opg * SENDS_PAGE;
  // Carry sort, type filter and page across links.
  const overviewParams = (over: Record<string, string> = {}) => {
    const p = new URLSearchParams({ tab: "overview" });
    if (osort !== "sent") p.set("osort", osort);
    if (odir !== "desc") p.set("odir", odir);
    if (otype !== "all") p.set("otype", otype);
    if (opg > 1) p.set("opg", String(opg));
    for (const [k, v] of Object.entries(over)) {
      if (v) p.set(k, v);
      else p.delete(k);
    }
    return p.toString();
  };
  // Header link that sorts by a column, flipping direction if already active.
  const oSortLink = (key: (typeof OSORTS)[number], label: string) => {
    const nextDir =
      osort === key ? (odir === "asc" ? "desc" : "asc") : key === "sent" ? "desc" : "asc";
    return (
      <Link
        prefetch={false}
        scroll={false}
        href={`/admin?${overviewParams({ osort: key, odir: nextDir, opg: "" })}`}
        style={{ color: "inherit", textDecoration: "none" }}
      >
        {label}
        {osort === key ? (odir === "asc" ? " ↑" : " ↓") : ""}
      </Link>
    );
  };

  return (
    <>
      {/* At-a-glance dashboard: big-number ticker cards, colour-coded by
          group so related numbers read together — Stories (purple),
          Companies (teal), Subscribers (sky), Sending (mint). */}
      <section className="stat-grid">
        <StatCard
          label="Stories this week"
          value={storiesWeek.count}
          sub="new in the last 7 days"
          bg="var(--cta-purple)"
        />
        <StatCard
          label="Stories today"
          value={storiesDay.count}
          sub="new in the last 24 hours"
          bg="var(--cta-purple)"
        />
        <StatCard
          label="Quiet companies"
          value={quietCompanies}
          sub="no stories for 14 days"
          bg="var(--cta-teal)"
        />
        <StatCard
          label="Companies posting"
          value={postingWeek.count}
          sub={`of ${companyTotal.count} in the last 7 days`}
          bg="var(--cta-teal)"
        />
        <StatCard
          label="Active subscribers"
          value={activeTotal}
          sub={`daily ${countByCadence.daily ?? 0} · weekly ${countByCadence.weekly ?? 0} · fortnightly ${countByCadence.fortnightly ?? 0} · Showcase only ${countByCadence.none ?? 0}`}
          bg="var(--cta-sky)"
        />
        <StatCard
          label="New subscribers"
          value={newSubsWeek.count}
          sub="joined in the last 7 days"
          bg="var(--cta-sky)"
        />
        <StatCard
          label="Showcase list"
          value={showcaseCount}
          sub="receive The Showcase Edition"
          bg="var(--cta-sky)"
        />
        <StatCard
          label="Emails sent"
          value={sentWeek.count}
          sub="in the last 7 days"
          bg="var(--cta-mint)"
        />
      </section>

      <NextEditionsCard
        countByCadence={countByCadence}
        showcaseCount={showcaseCount}
      />

      <section className="admin-card">
        <h2 style={h2}>
          History
          <HelpTip title="History">
            Every dispatched edition: the daily, weekly and fortnightly
            newsletters and each live Showcase send. Click a recipient count
            to see exactly who received it, or Preview to open the edition.
          </HelpTip>
        </h2>
        <form method="get" action="/admin" className="filter-bar" style={{ marginBottom: 14 }}>
          <input type="hidden" name="tab" value="overview" />
          {osort !== "sent" && <input type="hidden" name="osort" value={osort} />}
          {odir !== "desc" && <input type="hidden" name="odir" value={odir} />}
          <div className="filter-field">
            <label style={fieldLabel}>Type</label>
            <AutoSubmitSelect name="otype" defaultValue={otype} style={smallInput}>
              <option value="all">All types</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="fortnightly">Fortnightly</option>
              <option value="showcase">The Showcase</option>
            </AutoSubmitSelect>
          </div>
        </form>
        <HistoryTable
          rows={pageSends.map((r) => ({
            key: r.key,
            typeLabel: r.type,
            showcase: r.showcase,
            window: formatWindowLabel(r.label),
            status: r.status,
            stories: r.items,
            recipients: r.recipients,
            recipientsHref: r.href,
            sentAt: r.sentAt,
            previewHref: r.previewHref,
          }))}
          sortLink={oSortLink}
          empty={
            opg > 1 ? (
              "No sends this far back."
            ) : (
              <>
                No sends yet. Fetch posts and send from the{" "}
                <Link
                  prefetch={false}
                  href="/admin?tab=editions"
                  style={{ color: "var(--cta-ink)", fontWeight: 600 }}
                >
                  Editions tab
                </Link>
                .
              </>
            )
          }
        />
        {(opg > 1 || hasMoreSends) && (
          <div
            style={{
              display: "flex",
              gap: 12,
              alignItems: "center",
              marginTop: 12,
            }}
          >
            {opg > 1 && (
              <Link
                prefetch={false}
                scroll={false}
                href={`/admin?${overviewParams({ opg: String(opg - 1) })}`}
                style={{ ...smallButton, textDecoration: "none", background: "var(--cta-white)" }}
              >
                ← Previous
              </Link>
            )}
            <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-muted)" }}>
              Page {opg}
            </span>
            {hasMoreSends && (
              <Link
                prefetch={false}
                scroll={false}
                href={`/admin?${overviewParams({ opg: String(opg + 1) })}`}
                style={{ ...smallButton, textDecoration: "none", background: "var(--cta-white)" }}
              >
                Next →
              </Link>
            )}
          </div>
        )}
      </section>
    </>
  );
}

async function AiCreditsCard() {
  const spend = await getAiSpend();
  const barColor =
    spend.usedPct >= 85
      ? "var(--cta-pink)"
      : spend.usedPct >= 60
        ? "var(--cta-yellow)"
        : "var(--cta-emerald)";
  const usd = (n: number) => `$${n.toFixed(2)}`;

  return (
    <section className="admin-card">
      <h2 style={h2}>
        AI credits (estimated)
        <HelpTip title="AI credits">
          Estimated Anthropic API spend on headlines and summaries, measured
          from this app&#39;s own usage ({spend.totalCalls.toLocaleString()} AI
          calls so far). Anthropic doesn&#39;t provide a balance API, so check
          the console for the authoritative figure.
        </HelpTip>
      </h2>
      <div
        style={{
          border: "2px solid var(--cta-ink)",
          borderRadius: 999,
          background: "var(--cta-white)",
          overflow: "hidden",
          height: 24,
          marginBottom: 8,
        }}
      >
        <div
          style={{
            width: `${Math.max(spend.usedPct, 1)}%`,
            background: barColor,
            height: "100%",
            borderRight:
              spend.usedPct < 99 ? "2px solid var(--cta-ink)" : "none",
          }}
        />
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>
        ≈ {usd(spend.usedUsd)} used of {usd(spend.budgetUsd)} USD ·{" "}
        {usd(spend.remainingUsd)} left
        {spend.usedPct >= 85 && (
          <span style={{ color: "var(--cta-pink)" }}> — time to top up</span>
        )}
      </div>
      <div
        style={{
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <a
          href="https://platform.claude.com/settings/billing"
          target="_blank"
          rel="noreferrer"
          style={{ ...buttonStyle, textDecoration: "none" }}
        >
          Anthropic billing — buy credits ↗
        </a>
        <form
          action="/api/admin/ai-budget"
          method="post"
          style={{ display: "flex", gap: 8, alignItems: "center" }}
        >
          <input type="hidden" name="action" value="budget" />
          <input
            type="number"
            name="budget"
            min={1}
            step="0.01"
            defaultValue={spend.budgetUsd.toFixed(2)}
            style={{ ...smallInput, width: 110 }}
            aria-label="Credits budget in USD"
          />
          <label style={fieldLabel}>USD budget</label>
          <button type="submit" style={smallButton}>
            Set budget
          </button>
        </form>
        <form action="/api/admin/ai-budget" method="post">
          <input type="hidden" name="action" value="reset" />
          <ConfirmSubmit
            message="Reset the usage bar to zero? Do this after buying credits so the bar tracks the new balance."
            style={{ ...smallButton, background: "var(--cta-white)" }}
          >
            Mark as topped up
          </ConfirmSubmit>
        </form>
      </div>
    </section>
  );
}

async function EditionsTab({ sp }: { sp: Record<string, string | undefined> }) {
  const issueId = Number(sp.issue);
  if (Number.isInteger(issueId) && issueId > 0) {
    return <IssueRecipientsView issueId={issueId} sp={sp} />;
  }
  const HISTORY_PAGE = 15;
  const hpgRaw = Number(sp.hpg);
  const hpg = Number.isInteger(hpgRaw) && hpgRaw > 0 ? hpgRaw : 1;
  // History sort. Default: most recently sent at the top (unsent editions
  // fall back to the day they were meant to go out — window end).
  const HSORTS = ["type", "window", "status", "stories", "recipients", "sent"] as const;
  const hso = (HSORTS as readonly string[]).includes(sp.hso ?? "")
    ? (sp.hso as (typeof HSORTS)[number])
    : "sent";
  const hdr = sp.hdr === "asc" ? "asc" : "desc";
  // Filter the History table by cadence type.
  const HTYPES = ["all", "daily", "weekly", "fortnightly"] as const;
  const htype = (HTYPES as readonly string[]).includes(sp.htype ?? "")
    ? (sp.htype as (typeof HTYPES)[number])
    : "all";
  const hOrderCol =
    hso === "type"
      ? issues.cadence
      : hso === "window"
        ? issues.windowStart
        : hso === "status"
          ? issues.status
          : hso === "stories"
            ? issues.itemCount
            : hso === "recipients"
              ? issues.recipientCount
              : sql`coalesce(${issues.sentAt}, ${issues.windowEnd})`;
  const [cadenceCounts, lastSentRows, history, testRecipients] =
    await Promise.all([
      db()
        .select({
          cadence: subscribers.cadence,
          count: sql<number>`count(*)::int`,
        })
        .from(subscribers)
        .where(eq(subscribers.status, "active"))
        .groupBy(subscribers.cadence),
      db()
        .select({
          cadence: issues.cadence,
          last: sql<string | null>`max(${issues.sentAt})`,
        })
        .from(issues)
        .where(eq(issues.status, "sent"))
        .groupBy(issues.cadence),
      db()
        .select()
        .from(issues)
        .where(htype === "all" ? undefined : eq(issues.cadence, htype))
        .orderBy(hdr === "asc" ? asc(hOrderCol) : desc(hOrderCol), desc(issues.id))
        .limit(HISTORY_PAGE + 1)
        .offset((hpg - 1) * HISTORY_PAGE),
      getPresenterRecipients(),
    ]);
  const subsByCadence = Object.fromEntries(
    cadenceCounts.map((c) => [c.cadence, c.count]),
  );
  const lastByCadence = Object.fromEntries(
    lastSentRows.map((r) => [r.cadence, r.last]),
  );
  const historyPage = history.slice(0, HISTORY_PAGE);
  const hasMoreHistory = history.length > HISTORY_PAGE;
  const now = new Date();
  const defaultTo = testRecipients.join(", ");
  const historyParams = (over: Record<string, string> = {}) => {
    const p = new URLSearchParams({ tab: "editions" });
    if (hso !== "sent") p.set("hso", hso);
    if (hdr !== "desc") p.set("hdr", hdr);
    if (htype !== "all") p.set("htype", htype);
    if (hpg > 1) p.set("hpg", String(hpg));
    for (const [k, v] of Object.entries(over)) {
      if (v) p.set(k, v);
      else p.delete(k);
    }
    return p.toString();
  };
  const hSortLink = (key: (typeof HSORTS)[number], label: string) => {
    const nextDir =
      hso === key ? (hdr === "asc" ? "desc" : "asc") : key === "sent" ? "desc" : "asc";
    return (
      <Link
        prefetch={false}
        scroll={false}
        href={`/admin?${historyParams({ hso: key, hdr: nextDir, hpg: "" })}`}
        style={{ color: "inherit", textDecoration: "none" }}
      >
        {label}
        {hso === key ? (hdr === "asc" ? " ↑" : " ↓") : ""}
      </Link>
    );
  };

  return (
    <>
      <section className="admin-card">
        <h2 style={h2}>
          Next editions
          <HelpTip title="Next editions">
            Newsletters go out with the morning pipeline run: 7:00 am Sydney
            time during winter (AEST) and 8:00 am during daylight saving
            (AEDT). A quiet window is skipped, never sent empty. Preview
            opens the newsletter exactly as it would send right now; Send
            test emails it to addresses you choose, marked [TEST]; Send now
            dispatches the current window to every subscriber of that
            newsletter at once (an already-sent window is never re-sent).
          </HelpTip>
        </h2>
        <div className="table-scroll">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th}>Edition</th>
                <th style={th}>Last sent</th>
                <th style={th}>Next send</th>
                <th style={th}>Subscribers</th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {CADENCES.map((c) => {
                const w = issueWindow(c, now);
                const n = subsByCadence[c] ?? 0;
                const last = lastByCadence[c];
                return (
                  <tr key={c}>
                    <td style={{ ...td, whiteSpace: "nowrap" }}>
                      <div style={{ fontWeight: 700, textTransform: "capitalize" }}>
                        {c}
                      </div>
                      <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
                        {SCHEDULE_DESCRIPTION[c]}
                      </div>
                    </td>
                    <td style={{ ...td, whiteSpace: "nowrap" }}>
                      {last ? auDate(new Date(last)) : "Not yet"}
                    </td>
                    <td style={{ ...td, whiteSpace: "nowrap" }}>
                      {formatSydneyDateTime(
                        nextSendAt(c, now, process.env.FORTNIGHT_ANCHOR ?? "2026-07-06"),
                      )}
                    </td>
                    <td style={td}>{n}</td>
                    <td style={{ ...td, whiteSpace: "nowrap" }}>
                      <a
                        href={`/admin/preview/${c}`}
                        target="_blank"
                        style={{
                          ...smallButton,
                          display: "inline-block",
                          textDecoration: "none",
                          background: "var(--cta-white)",
                          marginRight: 6,
                        }}
                      >
                        Preview ↗
                      </a>
                      <TestSendButton
                        action="/api/admin/send-test"
                        hidden={{ cadence: c }}
                        defaultTo={defaultTo}
                        intro={`The current ${c} newsletter goes to these addresses only, marked [TEST].`}
                        style={{
                          ...smallButton,
                          background: "var(--cta-yellow)",
                          marginRight: 6,
                        }}
                      />
                      <form
                        action="/api/admin/send-now"
                        method="post"
                        style={{ display: "inline" }}
                      >
                        <input type="hidden" name="cadence" value={c} />
                        <ConfirmSubmit
                          title="Sending for real"
                          message={`Send the ${c} newsletter (${w.dateRange}) to ${n} subscriber${n === 1 ? "" : "s"} now? This can't be undone.`}
                          confirmLabel="Yes, send it now"
                          danger
                          style={{ ...smallButton, background: "var(--cta-yellow)" }}
                        >
                          Send now
                        </ConfirmSubmit>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-card">
        <h2 style={h2}>
          History
          <HelpTip title="History">
            Every past newsletter send. Click any column heading to sort;
            click a recipient count to see exactly who received that edition,
            or Preview to open it. The Showcase has its own history on The
            Showcase page.
          </HelpTip>
        </h2>
        <form method="get" action="/admin" className="filter-bar" style={{ marginBottom: 14 }}>
          <input type="hidden" name="tab" value="editions" />
          {hso !== "sent" && <input type="hidden" name="hso" value={hso} />}
          {hdr !== "desc" && <input type="hidden" name="hdr" value={hdr} />}
          <div className="filter-field">
            <label style={fieldLabel}>Type</label>
            <AutoSubmitSelect name="htype" defaultValue={htype} style={smallInput}>
              <option value="all">All types</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="fortnightly">Fortnightly</option>
            </AutoSubmitSelect>
          </div>
        </form>
        <HistoryTable
          rows={historyPage.map((i) => ({
            key: `issue-${i.id}`,
            typeLabel: i.cadence,
            showcase: false,
            window: formatWindowLabel(i.windowKey),
            status: i.status,
            stories: i.itemCount,
            recipients: i.recipientCount,
            recipientsHref: `/admin?tab=editions&issue=${i.id}`,
            sentAt: i.sentAt,
            previewHref: `/admin/preview/${i.cadence}`,
          }))}
          sortLink={hSortLink}
          empty={hpg > 1 ? "No sends this far back." : "Nothing sent yet."}
        />
        {(hpg > 1 || hasMoreHistory) && (
          <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 12 }}>
            {hpg > 1 && (
              <Link
                prefetch={false}
                scroll={false}
                href={`/admin?${historyParams({ hpg: String(hpg - 1) })}`}
                style={{ ...smallButton, textDecoration: "none", background: "var(--cta-white)" }}
              >
                ← Previous
              </Link>
            )}
            <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-muted)" }}>
              Page {hpg}
            </span>
            {hasMoreHistory && (
              <Link
                prefetch={false}
                scroll={false}
                href={`/admin?${historyParams({ hpg: String(hpg + 1) })}`}
                style={{ ...smallButton, textDecoration: "none", background: "var(--cta-white)" }}
              >
                Next →
              </Link>
            )}
          </div>
        )}
      </section>
    </>
  );
}

/**
 * When the daily pipeline will next pull the feeds: the scheduled function
 * runs at 21:00 UTC every day (netlify/functions/daily-pipeline.mts),
 * shown in Sydney time so the label survives daylight saving.
 */
function nextAutoRefresh(now: Date = new Date()): string {
  const next = new Date(now);
  next.setUTCHours(21, 0, 0, 0);
  if (next <= now) next.setUTCDate(next.getUTCDate() + 1);
  const formatted = new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Sydney",
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "numeric",
    minute: "2-digit",
  }).format(next);
  return `${formatted} (Sydney time)`;
}

const REVIEW_PAGE = 20;
const REVIEW_STATUSES = ["pending", "rejected", "approved"] as const;
type ReviewFilterStatus = (typeof REVIEW_STATUSES)[number];

const REVIEW_SORTS = [
  "added",
  "published",
  "story",
  "source",
  "confidence",
] as const;
type ReviewSort = (typeof REVIEW_SORTS)[number];

const CONFIDENCE_COLOURS: Record<string, string> = {
  high: "var(--cta-emerald)",
  medium: "var(--cta-yellow)",
  low: "var(--cta-pink)",
};

async function ReviewTab({ sp }: { sp: Record<string, string | undefined> }) {
  const status: ReviewFilterStatus = (
    REVIEW_STATUSES as readonly string[]
  ).includes(sp.rst ?? "")
    ? (sp.rst as ReviewFilterStatus)
    : "pending";
  const conf = ["high", "medium", "low"].includes(sp.rcf ?? "")
    ? (sp.rcf as "high" | "medium" | "low")
    : "all";
  const co = sp.rco ?? "";
  const q = (sp.rq ?? "").trim();
  const pgRaw = Number(sp.rpg);
  const pg = Number.isInteger(pgRaw) && pgRaw > 0 ? pgRaw : 1;
  const rso = (REVIEW_SORTS as readonly string[]).includes(sp.rso ?? "")
    ? (sp.rso as ReviewSort)
    : "added";
  // Dates default newest-first; text and confidence default ascending.
  const rdr =
    sp.rdr === "asc"
      ? "asc"
      : sp.rdr === "desc"
        ? "desc"
        : rso === "added" || rso === "published"
          ? "desc"
          : "asc";

  const blocked = await getBlockedSources();
  const conditions = [eq(feedItems.reviewStatus, status)];
  if (conf !== "all") conditions.push(eq(feedItems.aiMatchConfidence, conf));
  if (co) conditions.push(eq(feedItems.suggestedCompanyKey, co));
  if (q) {
    const like = `%${q}%`;
    conditions.push(
      sql`(${feedItems.rawTitle} ilike ${like} or ${feedItems.aiHeading} ilike ${like} or ${feedItems.creator} ilike ${like} or ${feedItems.postUrl} ilike ${like})`,
    );
  }
  // Blocked sources never appear in the queue (belt-and-braces: ingest
  // also skips them, but this covers anything stored before a term was
  // added). The same terms are applied to the status counts below so the
  // badge matches the list — otherwise a blocked-only queue reads "N
  // pending" while the list is empty.
  const blockedConds = blocked.map((term) => {
    const like = `%${term}%`;
    return sql`not (coalesce(${feedItems.creator}, '') ilike ${like} or ${feedItems.postUrl} ilike ${like} or coalesce(${feedItems.rawTitle}, '') ilike ${like})`;
  });
  conditions.push(...blockedConds);

  const orderExpr =
    rso === "published"
      ? sql`${feedItems.publishedAt}`
      : rso === "story"
        ? sql`lower(coalesce(${feedItems.rawTitle}, ${feedItems.aiHeading}))`
        : rso === "source"
          ? sql`lower(coalesce(${feedItems.creator}, ${feedItems.postUrl}))`
          : rso === "confidence"
            ? sql`case ${feedItems.aiMatchConfidence} when 'high' then 0 when 'medium' then 1 else 2 end`
            : sql`coalesce(${feedItems.reviewedAt}, ${feedItems.createdAt})`;
  const orderBy = sql`${orderExpr} ${rdr === "asc" ? sql`asc` : sql`desc`}`;

  // Group by company folds the queue into collapsible per-company sections;
  // pagination is off then and the whole queue is fetched (capped).
  const rgroup = sp.rgroup === "company";
  const reviewCap = rgroup ? STORY_POOL_GROUP_LIMIT : REVIEW_PAGE;
  const reviewOffset = rgroup ? 0 : (pg - 1) * REVIEW_PAGE;

  const params = parseShowcaseListParams(sp);
  const [companyList, rows, statusCounts, pool, usedDates, feedRows, drafts, recentStories] =
    await Promise.all([
      loadCompanies(),
      db()
        .select()
        .from(feedItems)
        .where(and(...conditions))
        .orderBy(orderBy)
        .limit(reviewCap + 1)
        .offset(reviewOffset),
      db()
        .select({
          status: feedItems.reviewStatus,
          count: sql<number>`count(*)::int`,
        })
        .from(feedItems)
        .where(
          and(
            inArray(feedItems.reviewStatus, [...REVIEW_STATUSES]),
            ...blockedConds,
          ),
        )
        .groupBy(feedItems.reviewStatus),
      queryStoryPool(params),
      getUsedStoryDates(),
      loadFeeds(),
      db()
        .select({
          id: showcaseEditions.id,
          createdAt: showcaseEditions.createdAt,
        })
        .from(showcaseEditions)
        .where(sql`${showcaseEditions.status} in ('draft', 'failed')`)
        .orderBy(desc(showcaseEditions.createdAt)),
      recentPoolStories(),
    ]);
  const nameByKey = new Map(companyList.map((c) => [c.key, c.name]));
  const feedNameById = new Map(feedRows.map((f) => [f.id, f.name]));
  const hasMore = rows.length > reviewCap;
  const pageRows = rows.slice(0, reviewCap);
  // Potential duplicates among recent pool stories (feeds sometimes carry the
  // same story twice); both members of a pair are flagged in the pool.
  const poolDuplicates = duplicateMap(recentStories);
  // Warn on review-queue items that echo a story already in the pool.
  const reviewDupWarnings = new Map<number, DupStory[]>();
  for (const it of pageRows) {
    const matches = similarInPool(
      {
        id: it.id,
        heading: it.aiHeading,
        rawTitle: it.rawTitle,
        companyKey: it.companyKey,
        date: it.reviewedAt ?? it.createdAt,
      },
      recentStories,
    );
    if (matches.length > 0) reviewDupWarnings.set(it.id, matches);
  }
  const countBy = Object.fromEntries(statusCounts.map((c) => [c.status, c.count]));
  const highIdsOnPage = pageRows
    .filter((r) => r.aiMatchConfidence === "high")
    .map((r) => r.id);

  // The current filters, carried through pager links and action redirects.
  const filterParams = (overrides: Record<string, string> = {}) => {
    const params = new URLSearchParams({ tab: "review" });
    if (status !== "pending") params.set("rst", status);
    if (conf !== "all") params.set("rcf", conf);
    if (co) params.set("rco", co);
    if (q) params.set("rq", q);
    if (pg > 1) params.set("rpg", String(pg));
    if (rso !== "added") params.set("rso", rso);
    if (sp.rdr === "asc" || sp.rdr === "desc") params.set("rdr", rdr);
    if (rgroup) params.set("rgroup", "company");
    for (const [k, v] of Object.entries(overrides)) {
      if (v) params.set(k, v);
      else params.delete(k);
    }
    return params;
  };
  // Clickable column header: sorts by `key`, flipping direction if already
  // the active column.
  const reviewSortLink = (key: ReviewSort, label: string) => {
    const dateKey = key === "added" || key === "published";
    const nextDir =
      rso === key ? (rdr === "asc" ? "desc" : "asc") : dateKey ? "desc" : "asc";
    const params = filterParams({ rso: key, rdr: nextDir, rpg: "" });
    return (
      <Link
        prefetch={false}
        scroll={false}
        href={`/admin?${params}`}
        style={{ color: "inherit", textDecoration: "none" }}
      >
        {label}
        {rso === key ? (rdr === "asc" ? " ↑" : " ↓") : ""}
      </Link>
    );
  };
  const filterHidden = (
    <>
      <input type="hidden" name="rst" value={status} />
      {conf !== "all" && <input type="hidden" name="rcf" value={conf} />}
      {co && <input type="hidden" name="rco" value={co} />}
      {q && <input type="hidden" name="rq" value={q} />}
      {pg > 1 && <input type="hidden" name="rpg" value={String(pg)} />}
    </>
  );
  const hasFilters = conf !== "all" || co !== "" || q !== "";

  const companyOptions = [
    ...companyList,
    { key: "around-the-alliance", name: "Around the Alliance (no match)" },
  ];
  const sourceOf = (it: FeedItem) => {
    let host = "";
    try {
      host = new URL(it.postUrl).hostname.replace(/^www\./, "");
    } catch {
      host = "";
    }
    return it.creator && host && it.creator !== host
      ? `${it.creator} · ${host}`
      : it.creator || host || "unknown source";
  };

  const STATUS_LABEL: Record<ReviewFilterStatus, string> = {
    pending: "Pending",
    rejected: "Rejected",
    approved: "Approved",
  };

  // Warn on a review item that echoes a story already in the pool (last 7
  // days). Non-blocking: the admin sees it and decides whether to approve.
  const reviewDupRowStyle = (id: number): React.CSSProperties =>
    reviewDupWarnings.has(id) ? { background: "rgba(245, 197, 66, 0.16)" } : {};
  const reviewDupNote = (it: FeedItem) => {
    const matches = reviewDupWarnings.get(it.id);
    if (!matches || matches.length === 0) return null;
    return (
      <div style={{ marginTop: 6, fontSize: 11.5, color: "var(--cta-ink)" }}>
        <span style={{ ...badge("var(--cta-yellow)"), fontSize: 10, marginRight: 6 }}>
          ⚠ Possible duplicate
        </span>
        A similar story is already in the pool:{" "}
        {matches
          .map((m) => `"${m.heading.slice(0, 70)}${m.heading.length > 70 ? "…" : ""}"`)
          .join(", ")}
        . Approve only if this is genuinely different.
      </div>
    );
  };

  const reviewHead = (
    <tr>
      <th style={th}></th>
      <th style={th}>{reviewSortLink("added", "Added")}</th>
      <th style={th}>{reviewSortLink("published", "Published")}</th>
      <th style={th}>{reviewSortLink("story", "Story")}</th>
      <th style={th}>{reviewSortLink("source", "Source")}</th>
      <th style={th}>{reviewSortLink("confidence", "Suggested match")}</th>
      <th style={th}>Decide</th>
    </tr>
  );

  const reviewRow = (it: FeedItem) => (
    <tr key={it.id} style={reviewDupRowStyle(it.id)}>
      <td style={td}>
        <input
          type="checkbox"
          name="ids"
          value={it.id}
          form="review-bulk"
          style={{ width: 18, height: 18 }}
        />
      </td>
      <td style={{ ...td, whiteSpace: "nowrap" }}>
        {auDate(it.reviewedAt ?? it.createdAt)}
      </td>
      <td style={{ ...td, whiteSpace: "nowrap" }}>{auDate(it.publishedAt)}</td>
      <td style={{ ...td, minWidth: 280, maxWidth: 460 }}>
        <form
          id={`rv-${it.id}`}
          action="/api/admin/review"
          method="post"
          style={{ display: "none" }}
        >
          {filterHidden}
          <input type="hidden" name="ids" value={it.id} />
        </form>
        <a
          href={it.postUrl}
          target="_blank"
          rel="noreferrer"
          style={{
            fontWeight: 700,
            fontSize: 13.5,
            color: "var(--cta-ink)",
            textDecoration: "none",
          }}
        >
          {it.rawTitle || it.aiHeading} ↗
        </a>
        {it.aiMatchReason && (
          <div
            className="story-summary"
            style={{
              fontSize: 12,
              color: "var(--text-muted)",
              marginTop: 4,
            }}
          >
            {it.aiMatchReason}
          </div>
        )}
        {reviewDupNote(it)}
      </td>
      <td
        style={{
          ...td,
          maxWidth: 200,
          overflowWrap: "anywhere",
          wordBreak: "break-word",
        }}
      >
        {sourceOf(it)}
      </td>
      <td style={td}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <select
            form={`rv-${it.id}`}
            name="company"
            defaultValue={it.companyKey}
            style={{ ...smallInput, maxWidth: 190 }}
          >
            {companyOptions.map((c) => (
              <option key={c.key} value={c.key}>
                {c.name}
              </option>
            ))}
          </select>
          {it.aiMatchConfidence && (
            <HelpTip title="AI match confidence">
              <span
                style={{
                  ...badge(
                    CONFIDENCE_COLOURS[it.aiMatchConfidence] ??
                      "var(--cta-white)",
                  ),
                }}
              >
                {it.aiMatchConfidence}
              </span>
              <p style={{ margin: "12px 0 0" }}>
                How sure the AI is that this article is about the suggested
                company. <strong>High</strong> the article clearly names and
                describes that Australian company; <strong>medium</strong>{" "}
                probably, but the evidence is thin; <strong>low</strong> a name
                mention that may be a different organisation. Always your call.
              </p>
            </HelpTip>
          )}
        </div>
      </td>
      <td style={{ ...td, whiteSpace: "nowrap" }}>
        {status !== "approved" && (
          <button
            form={`rv-${it.id}`}
            type="submit"
            name="op"
            value="approve"
            title="Approve: add to the story pool"
            aria-label="Approve"
            style={{ ...smallButton, marginRight: 6 }}
          >
            + Approve
          </button>
        )}
        {status !== "rejected" && (
          <button
            form={`rv-${it.id}`}
            type="submit"
            name="op"
            value="reject"
            title="Reject: keep out for good"
            aria-label="Reject"
            style={dangerButton}
          >
            ✕
          </button>
        )}
      </td>
    </tr>
  );

  // Grouped view: bucket the queue by the suggested company, ordered
  // alphabetically by company name; each is a collapsible section.
  const reviewGroups = (() => {
    if (!rgroup) return [];
    const byKey = new Map<string, FeedItem[]>();
    for (const it of pageRows) {
      const key = it.suggestedCompanyKey ?? it.companyKey;
      const list = byKey.get(key) ?? [];
      list.push(it);
      byKey.set(key, list);
    }
    return [...byKey.entries()]
      .map(([key, list]) => ({
        key,
        name: nameByKey.get(key) ?? "Around the Alliance (no match)",
        list,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  })();

  return (
    <>
    <div style={{ margin: "0 0 26px" }}>
      <div style={{ display: "flex", alignItems: "center" }}>
        <RefreshButton />
        <HelpTip title="What Refresh does">
          Refresh pulls every active feed and files what it finds. Stories
          from the social feed get an AI headline, summary and show and
          Social Theatre ratings, then go straight into the story pool.
          Stories from media feeds are read by the AI (which suggests the
          company and how confident it is) and wait in the review queue
          below for your approval. Nothing is emailed. This runs on its own
          once every morning; press Refresh to pull new stories right now
          rather than wait for the next run.
        </HelpTip>
      </div>
      <p style={{ ...muted, fontSize: 12.5, margin: "8px 0 0" }}>
        Next auto refresh: {nextAutoRefresh()}
      </p>
    </div>

    <section className="admin-card" id="story-pool">
      <h2 style={h2}>
        Story pool
        <HelpTip title="Story pool">
          Every story that has come in, rated by the AI twice: once for show
          relevance and once for Social Theatre (theatre in health, access
          and community settings, not education or fundraising). Use the
          rating filter to narrow to stories rated high on either scale.
          Social feed stories rated High are offered to each New Showcase
          automatically; stories approved from the review queue below join
          this pool too, but are only ever added to a Showcase by hand. Tick
          stories to add them to a draft Showcase in one go, or change a
          rating to promote a missed story or keep one out for good. Rows
          shaded yellow are possible duplicates (a feed sometimes carries the
          same story twice): both are flagged, so delete whichever one you
          don&#39;t want before the edition goes out.
        </HelpTip>
      </h2>
      <StoryPoolTable
        pool={pool}
        usedDates={usedDates}
        nameByKey={nameByKey}
        companyRows={companyList}
        feedNameById={feedNameById}
        params={params}
        anchor="story-pool"
        drafts={drafts}
        duplicates={poolDuplicates}
      />
    </section>

    <section className="admin-card">
      <h2 style={h2}>
        Review queue
        <HelpTip title="Review queue">
          Stories from manual review feeds wait here until you decide.
          Approved stories become available in the Showcase builder, where
          you add them by hand (they never enter the daily or weekly
          newsletters automatically); rejected stories are kept out for good
          (and never resurface, even if the feed repeats them). The AI match
          is only a guide: check the article before approving, and change
          the company if it guessed wrong. Everything is reversible from the
          status filter. Feeds are managed under Settings; approved stories
          keep a record of the feed they came from and when they were
          approved.
        </HelpTip>
      </h2>
      <p style={{ ...muted, marginBottom: 16 }}>
        Waiting: <strong>{countBy.pending ?? 0} pending</strong>
        {" · "}
        {countBy.rejected ?? 0} rejected {" · "}
        {countBy.approved ?? 0} approved
      </p>

      {/* Filters + actions toolbar */}
      <StoryToolbar
        filters={
          <form method="get" action="/admin" className="filter-bar">
            <input type="hidden" name="tab" value="review" />
            <div className="filter-field">
              <label style={fieldLabel}>Status</label>
              <AutoSubmitSelect name="rst" defaultValue={status} style={smallInput}>
                {REVIEW_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </option>
                ))}
              </AutoSubmitSelect>
            </div>
            <div className="filter-field">
              <label style={fieldLabel}>Confidence</label>
              <AutoSubmitSelect name="rcf" defaultValue={conf} style={smallInput}>
                <option value="all">All</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </AutoSubmitSelect>
            </div>
            <div className="filter-field">
              <label style={fieldLabel}>Company</label>
              <AutoSubmitSelect name="rco" defaultValue={co} style={smallInput}>
                <option value="">All companies</option>
                {companyOptions.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.name}
                  </option>
                ))}
              </AutoSubmitSelect>
            </div>
            <div className="filter-field filter-field-grow">
              <label style={fieldLabel}>Search</label>
              <input
                name="rq"
                defaultValue={q}
                placeholder="Title, source or keyword"
                style={{ ...smallInput, width: "100%" }}
              />
            </div>
            <button type="submit" style={smallButton}>
              Search
            </button>
            {hasFilters && (
              <Link
                prefetch={false}
                href={`/admin?tab=review${status !== "pending" ? `&rst=${status}` : ""}`}
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--cta-ink)",
                  alignSelf: "center",
                }}
              >
                Clear
              </Link>
            )}
          </form>
        }
        actions={
          pageRows.length > 0 ? (
            /* Bulk actions. The row checkboxes attach to these forms via
               the form attribute, so they don't wrap the table. */
            <div className="bulk-bar">
              <form
                id="review-bulk"
                action="/api/admin/review"
                method="post"
                style={{ display: "contents" }}
              >
                {filterHidden}
                <SelectAllCheckbox formId="review-bulk" />
                <button type="submit" name="op" value="approve" style={smallButton}>
                  Approve selected
                </button>
                <button type="submit" name="op" value="reject" style={dangerButton}>
                  Reject selected
                </button>
              </form>
              {highIdsOnPage.length > 0 && status === "pending" && (
                <form
                  action="/api/admin/review"
                  method="post"
                  style={{ display: "contents" }}
                >
                  {filterHidden}
                  {highIdsOnPage.map((id) => (
                    <input key={id} type="hidden" name="ids" value={id} />
                  ))}
                  <button type="submit" name="op" value="approve" style={smallButton}>
                    Approve all {highIdsOnPage.length} high confidence
                  </button>
                </form>
              )}
            </div>
          ) : undefined
        }
        extra={
          <Link
            prefetch={false}
            href={`/admin?${filterParams({
              rgroup: rgroup ? "" : "company",
              rpg: "",
            })}`}
            scroll={false}
            style={{
              fontFamily: "var(--font-body)",
              fontSize: 12,
              fontWeight: 700,
              color: "var(--cta-ink)",
              background: rgroup ? "var(--cta-purple)" : "var(--cta-white)",
              border: "2px solid var(--cta-ink)",
              borderRadius: 8,
              padding: "6px 12px",
              textDecoration: "none",
            }}
          >
            {rgroup ? "Grouped by company ✓" : "Group by company"}
          </Link>
        }
      />

      {pageRows.length === 0 ? (
        <p style={{ ...muted, marginBottom: 0 }}>
          {status === "pending" && !hasFilters
            ? "Nothing waiting for review. Stories from manual review feeds land here after the next refresh."
            : "No stories match these filters."}
        </p>
      ) : rgroup ? (
        <>
          {reviewGroups.map((g) => (
            <details key={g.key} style={{ marginBottom: 12 }}>
              <summary
                style={{
                  cursor: "pointer",
                  fontWeight: 700,
                  padding: "8px 0",
                  fontSize: 14,
                }}
              >
                {g.name}{" "}
                <span style={{ color: "var(--text-muted)", fontWeight: 600 }}>
                  ({g.list.length})
                </span>
              </summary>
              <div className="table-scroll">
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>{reviewHead}</thead>
                  <tbody>{g.list.map(reviewRow)}</tbody>
                </table>
              </div>
            </details>
          ))}
          {hasMore && (
            <p style={{ ...muted, marginTop: 10 }}>
              Showing the first {STORY_POOL_GROUP_LIMIT} stories. Narrow with a
              filter to see the rest.
            </p>
          )}
        </>
      ) : (
        <>
          <div className="table-scroll">
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={th}></th>
                  <th style={th}>{reviewSortLink("added", "Added")}</th>
                  <th style={th}>{reviewSortLink("published", "Published")}</th>
                  <th style={th}>{reviewSortLink("story", "Story")}</th>
                  <th style={th}>{reviewSortLink("source", "Source")}</th>
                  <th style={th}>{reviewSortLink("confidence", "Suggested match")}</th>
                  <th style={th}>Decide</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((it) => (
                  <tr key={it.id} style={reviewDupRowStyle(it.id)}>
                    <td style={td}>
                      <input
                        type="checkbox"
                        name="ids"
                        value={it.id}
                        form="review-bulk"
                        style={{ width: 18, height: 18 }}
                      />
                    </td>
                    <td style={{ ...td, whiteSpace: "nowrap" }}>
                      {auDate(it.reviewedAt ?? it.createdAt)}
                    </td>
                    <td style={{ ...td, whiteSpace: "nowrap" }}>
                      {auDate(it.publishedAt)}
                    </td>
                    <td style={{ ...td, minWidth: 280, maxWidth: 460 }}>
                      <form
                        id={`rv-${it.id}`}
                        action="/api/admin/review"
                        method="post"
                        style={{ display: "none" }}
                      >
                        {filterHidden}
                        <input type="hidden" name="ids" value={it.id} />
                      </form>
                      <a
                        href={it.postUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          fontWeight: 700,
                          fontSize: 13.5,
                          color: "var(--cta-ink)",
                          textDecoration: "none",
                        }}
                      >
                        {it.rawTitle || it.aiHeading} ↗
                      </a>
                      {it.aiMatchReason && (
                        <div
                          className="story-summary"
                          style={{
                            fontSize: 12,
                            color: "var(--text-muted)",
                            marginTop: 4,
                          }}
                        >
                          {it.aiMatchReason}
                        </div>
                      )}
                      {reviewDupNote(it)}
                    </td>
                    <td
        style={{
          ...td,
          maxWidth: 200,
          overflowWrap: "anywhere",
          wordBreak: "break-word",
        }}
      >
        {sourceOf(it)}
      </td>
                    <td style={td}>
                      <div style={{ display: "flex", alignItems: "center" }}>
                        <select
                          form={`rv-${it.id}`}
                          name="company"
                          defaultValue={it.companyKey}
                          style={{ ...smallInput, maxWidth: 190 }}
                        >
                          {companyOptions.map((c) => (
                            <option key={c.key} value={c.key}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                        {it.aiMatchConfidence && (
                          <HelpTip title="AI match confidence">
                            <span
                              style={{
                                ...badge(
                                  CONFIDENCE_COLOURS[it.aiMatchConfidence] ??
                                    "var(--cta-white)",
                                ),
                              }}
                            >
                              {it.aiMatchConfidence}
                            </span>
                            <p style={{ margin: "12px 0 0" }}>
                              How sure the AI is that this article is about the
                              suggested company.{" "}
                              <strong>High</strong> the article clearly names
                              and describes that Australian company;{" "}
                              <strong>medium</strong> probably, but the
                              evidence is thin; <strong>low</strong> a name
                              mention that may be a different organisation.
                              Always your call.
                            </p>
                          </HelpTip>
                        )}
                      </div>
                    </td>
                    <td style={{ ...td, whiteSpace: "nowrap" }}>
                      {status !== "approved" && (
                        <button
                          form={`rv-${it.id}`}
                          type="submit"
                          name="op"
                          value="approve"
                          title="Approve: add to the story pool"
                          aria-label="Approve"
                          style={{ ...smallButton, marginRight: 6 }}
                        >
                          + Approve
                        </button>
                      )}
                      {status !== "rejected" && (
                        <button
                          form={`rv-${it.id}`}
                          type="submit"
                          name="op"
                          value="reject"
                          title="Reject: keep out for good"
                          aria-label="Reject"
                          style={dangerButton}
                        >
                          ✕
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {(pg > 1 || hasMore) && (
            <div
              style={{
                display: "flex",
                gap: 12,
                alignItems: "center",
                marginTop: 14,
              }}
            >
              {pg > 1 && (
                <Link
                  prefetch={false}
                  href={`/admin?${filterParams({ rpg: pg - 1 > 1 ? String(pg - 1) : "" })}`}
                  style={smallButton}
                >
                  ← Previous
                </Link>
              )}
              <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
                Page {pg}
              </span>
              {hasMore && (
                <Link
                  prefetch={false}
                  href={`/admin?${filterParams({ rpg: String(pg + 1) })}`}
                  style={smallButton}
                >
                  Next →
                </Link>
              )}
            </div>
          )}
        </>
      )}
    </section>
    </>
  );
}

async function SubscribersTab({
  sp,
}: {
  sp: Record<string, string | undefined>;
}) {
  const subscriberId = Number(sp.subscriber);
  if (Number.isInteger(subscriberId) && subscriberId > 0) {
    return <SubscriberDetailView subscriberId={subscriberId} sp={sp} />;
  }
  // List filters and sort, straight from the query string.
  const scad = ["daily", "weekly", "fortnightly", "none"].includes(sp.scad ?? "")
    ? (sp.scad as SubscriberCadence)
    : "all";
  const sshow = sp.sshow === "yes" || sp.sshow === "no" ? sp.sshow : "all";
  const ssort = ["name", "email", "cadence", "showcase", "status", "joined"].includes(
    sp.ssort ?? "",
  )
    ? (sp.ssort as "name" | "email" | "cadence" | "showcase" | "status" | "joined")
    : "joined";
  const sdir = sp.sdir === "asc" ? "asc" : "desc";
  const listConditions = [
    scad === "all" ? undefined : eq(subscribers.cadence, scad),
    sshow === "all" ? undefined : eq(subscribers.showcase, sshow === "yes"),
  ].filter((c) => c !== undefined);
  const orderCols =
    ssort === "name"
      ? [subscribers.firstName, subscribers.lastName]
      : ssort === "email"
        ? [subscribers.email]
        : ssort === "cadence"
          ? [subscribers.cadence]
          : ssort === "showcase"
            ? [subscribers.showcase]
            : ssort === "status"
              ? [subscribers.status]
              : [subscribers.createdAt];

  const [counts, showcaseCount, recent] = await Promise.all([
    db()
      .select({
        cadence: subscribers.cadence,
        count: sql<number>`count(*)::int`,
      })
      .from(subscribers)
      .where(eq(subscribers.status, "active"))
      .groupBy(subscribers.cadence),
    getShowcaseSubscriberCount(),
    db()
      .select()
      .from(subscribers)
      .where(listConditions.length > 0 ? and(...listConditions) : undefined)
      .orderBy(
        ...orderCols.map((c) => (sdir === "asc" ? asc(c) : desc(c))),
        desc(subscribers.createdAt),
      )
      .limit(500),
  ]);
  const countByCadence = Object.fromEntries(
    counts.map((c) => [c.cadence, c.count]),
  );

  const subSortLink = (key: string, label: string) => {
    const firstDir = key === "joined" ? "desc" : "asc";
    const nextDir =
      ssort === key ? (sdir === "asc" ? "desc" : "asc") : firstDir;
    const params = new URLSearchParams({
      tab: "subscribers",
      ssort: key,
      sdir: nextDir,
    });
    if (scad !== "all") params.set("scad", scad);
    if (sshow !== "all") params.set("sshow", sshow);
    return (
      <Link
        prefetch={false}
        scroll={false}
        href={`/admin?${params.toString()}`}
        style={{ color: "inherit", textDecoration: "none" }}
      >
        {label}
        {ssort === key ? (sdir === "asc" ? " ↑" : " ↓") : ""}
      </Link>
    );
  };

  return (
    <>
    <section className="admin-card">
      <h2 style={h2}>
        Audience list
        <HelpTip title="Audience list">
          Everyone signed up, with what they receive. Click a name for
          everything that person has received. Setting someone to
          &quot;Showcase only&quot; always includes The Showcase Edition.
        </HelpTip>
      </h2>
      <div
        style={{
          display: "flex",
          gap: 14,
          flexWrap: "wrap",
          marginBottom: 20,
          alignItems: "center",
        }}
      >
        {CADENCES.map((c) => (
          <div key={c} style={tile}>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 30,
                lineHeight: 1,
              }}
            >
              {countByCadence[c] ?? 0}
            </div>
            <div
              style={{
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                color: "var(--text-muted)",
              }}
            >
              {c}
            </div>
          </div>
        ))}
        <div style={tile}>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 30,
              lineHeight: 1,
            }}
          >
            {countByCadence["none"] ?? 0}
          </div>
          <div
            style={{
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: "var(--text-muted)",
            }}
          >
            Showcase only
          </div>
        </div>
        <div style={{ ...tile, background: "var(--cta-mint)" }}>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 30,
              lineHeight: 1,
            }}
          >
            {showcaseCount}
          </div>
          <div
            style={{
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: "var(--text-muted)",
            }}
          >
            Showcase Edition
          </div>
        </div>
        <a
          href="/api/admin/subscribers.csv"
          style={{ ...buttonStyle, textDecoration: "none" }}
        >
          Export CSV
        </a>
      </div>
      <form
        method="get"
        action="/admin"
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          alignItems: "center",
          marginBottom: 14,
        }}
      >
        <input type="hidden" name="tab" value="subscribers" />
        <select name="scad" defaultValue={scad} style={smallInput}>
          <option value="all">All newsletter types</option>
          <option value="daily">daily</option>
          <option value="weekly">weekly</option>
          <option value="fortnightly">fortnightly</option>
          <option value="none">Showcase only</option>
        </select>
        <select name="sshow" defaultValue={sshow} style={smallInput}>
          <option value="all">Showcase: everyone</option>
          <option value="yes">Receives the Showcase</option>
          <option value="no">No Showcase</option>
        </select>
        <button type="submit" style={smallButton}>
          Filter
        </button>
        {(scad !== "all" || sshow !== "all") && (
          <Link
            prefetch={false}
            href="/admin?tab=subscribers"
            style={{ fontSize: 13, fontWeight: 600, color: "var(--cta-ink)" }}
          >
            Clear
          </Link>
        )}
      </form>
      <div className="table-scroll" style={{ maxHeight: 480, overflowY: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={th}>{subSortLink("name", "Name")}</th>
              <th style={th}>{subSortLink("email", "Email")}</th>
              <th style={th}>
                {subSortLink("cadence", "Receives")}
                {" · "}
                {subSortLink("showcase", "Showcase")}
              </th>
              <th style={th}>{subSortLink("status", "Status")}</th>
              <th style={th}>{subSortLink("joined", "Joined")}</th>
              <th style={th}></th>
            </tr>
          </thead>
          <tbody>
            {recent.map((s) => (
              <tr key={s.id}>
                <td style={td}>
                  <Link
                    prefetch={false}
                    href={`/admin?tab=subscribers&subscriber=${s.id}`}
                    style={{
                      color: "var(--cta-ink)",
                      fontWeight: 600,
                      textDecorationThickness: 2,
                    }}
                  >
                    {s.firstName} {s.lastName}
                  </Link>
                </td>
                <td style={td}>{s.email}</td>
                <td style={td}>
                  <form
                    action="/api/admin/set-cadence"
                    method="post"
                    style={{
                      display: "flex",
                      gap: 6,
                      alignItems: "center",
                      flexWrap: "wrap",
                    }}
                  >
                    <input type="hidden" name="id" value={s.id} />
                    <select
                      name="cadence"
                      defaultValue={s.cadence}
                      style={smallInput}
                    >
                      {CADENCES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                      <option value="none">Showcase only</option>
                    </select>
                    <select
                      name="showcase"
                      defaultValue={s.showcase ? "1" : "0"}
                      title="The Showcase Edition"
                      style={{ ...smallInput, background: "var(--cta-mint)" }}
                    >
                      <option value="1">+ Showcase</option>
                      <option value="0">no Showcase</option>
                    </select>
                    <button type="submit" style={smallButton}>
                      Save
                    </button>
                  </form>
                </td>
                <td style={td}>
                  <span
                    style={badge(
                      s.status === "active"
                        ? "var(--cta-emerald)"
                        : "var(--cta-pink)",
                    )}
                  >
                    {s.status}
                  </span>
                </td>
                <td style={td}>{auDate(s.createdAt)}</td>
                <td style={td}>
                  <form action="/api/admin/delete-subscriber" method="post">
                    <input type="hidden" name="id" value={s.id} />
                    <ConfirmSubmit
                      message={`Delete ${s.email} permanently? They will stop receiving every email from us and their record is removed.`}
                      danger
                      style={dangerButton}
                    >
                      Delete
                    </ConfirmSubmit>
                  </form>
                </td>
              </tr>
            ))}
            {recent.length === 0 && (
              <tr>
                <td style={td} colSpan={6}>
                  {scad !== "all" || sshow !== "all"
                    ? "No subscribers match the filter."
                    : "No subscribers yet."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>

    <section className="admin-card">
      <h2 style={h2}>
        New audience
        <HelpTip title="New audience">
          Adds someone directly, exactly as if they signed up themselves. If
          the address is already subscribed, their details and choices are
          updated instead. Choosing &quot;Showcase only&quot; always
          includes The Showcase Edition.
        </HelpTip>
      </h2>
      <form
        action="/api/admin/add-subscriber"
        method="post"
        style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}
      >
        <div style={{ flex: "1 1 130px" }}>
          <label style={fieldLabel}>First name</label>
          <input
            type="text"
            name="firstName"
            required
            style={{ ...inputStyle, width: "100%" }}
          />
        </div>
        <div style={{ flex: "1 1 130px" }}>
          <label style={fieldLabel}>Last name</label>
          <input
            type="text"
            name="lastName"
            required
            style={{ ...inputStyle, width: "100%" }}
          />
        </div>
        <div style={{ flex: "2 1 200px" }}>
          <label style={fieldLabel}>Email</label>
          <input
            type="email"
            name="email"
            required
            placeholder="them@example.org"
            style={{ ...inputStyle, width: "100%" }}
          />
        </div>
        <div>
          <label style={fieldLabel}>Receives</label>
          <select name="cadence" defaultValue="weekly" style={inputStyle}>
            {CADENCES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
            <option value="none">Showcase only</option>
          </select>
        </div>
        <div>
          <label style={fieldLabel}>Showcase Edition</label>
          <select
            name="showcase"
            defaultValue="1"
            style={{ ...inputStyle, background: "var(--cta-mint)" }}
          >
            <option value="1">+ Showcase</option>
            <option value="0">no Showcase</option>
          </select>
        </div>
        <button type="submit" style={buttonStyle}>
          Add subscriber
        </button>
      </form>
    </section>

    </>
  );
}

async function SettingsTab({
  sp,
}: {
  sp: Record<string, string | undefined>;
}) {
  // Alliance-update editor sub-view: composing/editing one internal update.
  const updateId = Number(sp.update);
  if (Number.isInteger(updateId) && updateId > 0) {
    return <AllianceUpdateEditor id={updateId} />;
  }
  // Seeds the table on first load, then read the raw rows for editing
  await loadCompanies();
  const [companyRows, notifyEmails, feedRows, blockedSources, allianceRows, allianceTo] =
    await Promise.all([
      db().select().from(companies).orderBy(asc(companies.name)),
      getNotifyEmails(),
      loadFeeds(),
      getBlockedSources(),
      db().select().from(allianceUpdates),
      getAllianceRecipients(),
    ]);

  // Alliance updates history: sort (aso/adr, default sent newest-first with
  // createdAt fallback for drafts) + Status filter (astatus) + page (apg).
  const ASORTS = ["subject", "status", "sent"] as const;
  const aso = (ASORTS as readonly string[]).includes(sp.aso ?? "")
    ? (sp.aso as (typeof ASORTS)[number])
    : "sent";
  const adr = sp.adr === "asc" ? "asc" : "desc";
  const astatus =
    sp.astatus === "draft" || sp.astatus === "sent" ? sp.astatus : "all";
  const ALLIANCE_PAGE = 10;
  const apgRaw = Number(sp.apg);
  const apg = Number.isInteger(apgRaw) && apgRaw > 0 ? apgRaw : 1;
  const aStamp = (u: AllianceUpdate) => (u.sentAt ?? u.createdAt).getTime();
  const allianceFiltered = allianceRows.filter((u) =>
    astatus === "all" ? true : u.status === astatus,
  );
  allianceFiltered.sort((a, b) => {
    let d: number;
    if (aso === "subject")
      d = (a.subject || "").localeCompare(b.subject || "");
    else if (aso === "status") d = a.status.localeCompare(b.status);
    else d = aStamp(a) - aStamp(b);
    if (d === 0) d = aStamp(a) - aStamp(b);
    return adr === "asc" ? d : -d;
  });
  const alliancePage = allianceFiltered.slice(
    (apg - 1) * ALLIANCE_PAGE,
    apg * ALLIANCE_PAGE,
  );
  const allianceHasMore = allianceFiltered.length > apg * ALLIANCE_PAGE;
  const allianceParams = (over: Record<string, string> = {}) => {
    const p = new URLSearchParams({ tab: "settings" });
    if (aso !== "sent") p.set("aso", aso);
    if (adr !== "desc") p.set("adr", adr);
    if (astatus !== "all") p.set("astatus", astatus);
    if (apg > 1) p.set("apg", String(apg));
    for (const [k, v] of Object.entries(over)) {
      if (v) p.set(k, v);
      else p.delete(k);
    }
    return `${p.toString()}#alliance`;
  };
  const aSortLink = (key: (typeof ASORTS)[number], label: string) => {
    const nextDir =
      aso === key ? (adr === "asc" ? "desc" : "asc") : key === "sent" ? "desc" : "asc";
    return (
      <Link
        prefetch={false}
        scroll={false}
        href={`/admin?${allianceParams({ aso: key, adr: nextDir, apg: "" })}`}
        style={{ color: "inherit", textDecoration: "none" }}
      >
        {label}
        {aso === key ? (adr === "asc" ? " ↑" : " ↓") : ""}
      </Link>
    );
  };

  return (
    <>
      <section className="admin-card">
        <h2 style={h2}>
          Introductions
          <HelpTip title="Introductions">
            Two one-off branded emails for funders, presenters and friends
            (including international). <strong>Introduce the Alliance</strong>{" "}
            leads with who we are; <strong>Introduce the newsletter</strong>{" "}
            leads with the editions and how to sign up, with the Alliance as
            the secondary story. Paste addresses separated by commas or new
            lines. Recipients are emailed once and{" "}
            <strong>never stored</strong>.
          </HelpTip>
        </h2>
        <div
          style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12 }}
        >
          <a
            href="/admin/preview/intro"
            target="_blank"
            style={{
              ...buttonStyle,
              textDecoration: "none",
              background: "var(--cta-white)",
            }}
          >
            Preview: the Alliance ↗
          </a>
          <a
            href="/admin/preview/intro?kind=newsletter"
            target="_blank"
            style={{
              ...buttonStyle,
              textDecoration: "none",
              background: "var(--cta-white)",
            }}
          >
            Preview: the newsletter ↗
          </a>
        </div>
        <form action="/api/admin/send-intro" method="post">
          <div
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <div>
              <label style={fieldLabel}>Which introduction</label>
              <select name="kind" style={inputStyle}>
                <option value="alliance">Introduce the Alliance</option>
                <option value="newsletter">Introduce the newsletter</option>
              </select>
            </div>
          </div>
          <label style={fieldLabel}>Recipient addresses</label>
          <textarea
            name="emails"
            required
            rows={4}
            placeholder={"jane@presenter.org, funder@example.org\nfriend@theatre.com"}
            style={{
              ...inputStyle,
              width: "100%",
              resize: "vertical",
              marginBottom: 12,
              fontSize: 13.5,
            }}
          />
          <ConfirmSubmit
            title="Sending for real"
            message="Send the chosen introduction email to everyone in the list now? Each address is emailed once and not saved."
            confirmLabel="Yes, send it"
            danger
            style={{ ...buttonStyle, background: "var(--cta-yellow)" }}
          >
            Send introduction
          </ConfirmSubmit>
        </form>
      </section>

      <AiCreditsCard />

    <section className="admin-card">
      <h2 style={h2}>
        Notifications
        <HelpTip title="Notifications">
          These addresses get a short branded email every time someone new
          subscribes. Separate several with commas. Leave empty to turn
          notifications off. Cadence changes and re-subscribes do not
          trigger one.
        </HelpTip>
      </h2>
      <form
        action="/api/admin/notify-emails"
        method="post"
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <div style={{ flex: "1 1 280px" }}>
          <label style={fieldLabel}>Notification addresses</label>
          <input
            type="text"
            name="emails"
            defaultValue={notifyEmails.join(", ")}
            placeholder="you@example.com, colleague@example.com"
            style={{ ...inputStyle, width: "100%" }}
          />
        </div>
        <button type="submit" style={buttonStyle}>
          Save
        </button>
      </form>
    </section>

    <section className="admin-card">
      <h2 style={h2}>
        Blocked sources
        <HelpTip title="Blocked sources">
          Media outlets whose articles should never reach the review queue
          (for example an aggregator that only ever means the overseas
          company of the same name). Separate terms with commas or new
          lines; each is matched against a story&#39;s author, link and
          title. Use a domain like australianstage.com.au or a name like
          Australian Stage. Existing queue items matching a new term drop
          out on save; future ones are skipped at the source.
        </HelpTip>
      </h2>
      <form
        action="/api/admin/blocked-sources"
        method="post"
        style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-start" }}
      >
        <div style={{ flex: "1 1 320px" }}>
          <label style={fieldLabel}>Blocked terms</label>
          <textarea
            name="terms"
            rows={3}
            defaultValue={blockedSources.join(", ")}
            placeholder="australianstage.com.au, Australian Stage"
            style={{ ...inputStyle, width: "100%", resize: "vertical" }}
          />
        </div>
        <button type="submit" style={{ ...buttonStyle, marginTop: 22 }}>
          Save blocked sources
        </button>
      </form>
    </section>

    <section className="admin-card">
      <h2 style={h2}>
        RSS feeds
        <HelpTip title="RSS feeds">
          Where stories come from. <strong>Automatic</strong> feeds are
          trusted (the companies&#39; own social posts): their stories join
          the stream straight away. <strong>Manual review</strong> feeds
          (media and news coverage) park every story on the Stories page
          until you approve it, because articles can mention the wrong
          company. Unticking Active pauses a feed without deleting it.
        </HelpTip>
      </h2>
      <div className="table-scroll">
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={th}>Name</th>
              <th style={th}>Feed URL</th>
              <th style={th}>Type</th>
              <th style={th}>Notes</th>
              <th style={th}>Active</th>
              <th style={th}></th>
            </tr>
          </thead>
          <tbody>
            {feedRows.map((f) => (
              <tr key={f.id}>
                <td style={{ ...td, whiteSpace: "nowrap" }}>
                  <form action="/api/admin/feeds" method="post" id={`feed-${f.id}`}>
                    <input type="hidden" name="action" value="update" />
                    <input type="hidden" name="id" value={f.id} />
                    <input
                      name="name"
                      defaultValue={f.name}
                      required
                      style={{ ...smallInput, width: 170 }}
                    />
                  </form>
                </td>
                <td style={td}>
                  <input
                    form={`feed-${f.id}`}
                    name="url"
                    type="url"
                    required
                    defaultValue={f.url}
                    style={{ ...smallInput, width: "100%", minWidth: 230 }}
                  />
                </td>
                <td style={td}>
                  <select
                    form={`feed-${f.id}`}
                    name="mode"
                    defaultValue={f.mode}
                    style={smallInput}
                  >
                    <option value="automatic">Automatic</option>
                    <option value="review">Manual review</option>
                  </select>
                </td>
                <td style={td}>
                  <input
                    form={`feed-${f.id}`}
                    name="notes"
                    defaultValue={f.notes ?? ""}
                    style={{ ...smallInput, width: "100%", minWidth: 160 }}
                  />
                </td>
                <td style={{ ...td, textAlign: "center" }}>
                  <input
                    form={`feed-${f.id}`}
                    type="checkbox"
                    name="active"
                    defaultChecked={f.active}
                    style={{ width: 18, height: 18 }}
                  />
                </td>
                <td style={{ ...td, whiteSpace: "nowrap" }}>
                  <button
                    form={`feed-${f.id}`}
                    type="submit"
                    style={{ ...smallButton, marginRight: 6 }}
                  >
                    Save
                  </button>
                  <form action="/api/admin/feeds" method="post" style={{ display: "inline" }}>
                    <input type="hidden" name="action" value="delete" />
                    <input type="hidden" name="id" value={f.id} />
                    <ConfirmSubmit
                      message={`Delete the "${f.name}" feed? Stories already ingested from it stay; no new ones will arrive. To pause it instead, untick Active.`}
                      danger
                      style={dangerButton}
                    >
                      Delete
                    </ConfirmSubmit>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <form
        action="/api/admin/feeds"
        method="post"
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          alignItems: "flex-end",
          marginTop: 18,
          paddingTop: 16,
          borderTop: "2px dashed rgba(30,30,29,0.25)",
        }}
      >
        <input type="hidden" name="action" value="add" />
        <div style={{ minWidth: 170, flex: "1 1 170px" }}>
          <label style={fieldLabel}>Feed name</label>
          <input name="name" required style={{ ...inputStyle, width: "100%" }} />
        </div>
        <div style={{ minWidth: 240, flex: "2 1 240px" }}>
          <label style={fieldLabel}>Feed URL</label>
          <input
            name="url"
            type="url"
            required
            placeholder="https://rss.app/feeds/…"
            style={{ ...inputStyle, width: "100%" }}
          />
        </div>
        <div style={{ minWidth: 150 }}>
          <label style={fieldLabel}>Type</label>
          <select name="mode" defaultValue="review" style={{ ...inputStyle }}>
            <option value="automatic">Automatic</option>
            <option value="review">Manual review</option>
          </select>
        </div>
        <div style={{ minWidth: 180, flex: "1 1 180px" }}>
          <label style={fieldLabel}>Notes (optional)</label>
          <input name="notes" style={{ ...inputStyle, width: "100%" }} />
        </div>
        <button type="submit" style={buttonStyle}>
          Add feed
        </button>
      </form>
    </section>

    <section className="admin-card">
      <h2 style={h2}>
        Alliance companies
        <HelpTip title="Alliance companies">
          Posts are matched to a company when its page name, post title or
          link contains one of the <strong>match words</strong> (separate
          several with commas). Unmatched posts appear under &quot;Around
          the Alliance&quot;: if you spot one there, add the company here.
          Changes apply to posts fetched from then on.{" "}
          <strong>Inclusion</strong>: <strong>Auto</strong> adds a company&#39;s
          posts straight away; <strong>Manual</strong> holds them in the Review
          queue (Stories tab) until someone approves them.
        </HelpTip>
      </h2>
      <details>
        <summary
          style={{
            cursor: "pointer",
            fontFamily: "var(--font-body)",
            fontWeight: 700,
            fontSize: 13,
            color: "var(--cta-ink)",
            padding: "8px 12px",
            border: "2px solid var(--cta-ink)",
            borderRadius: 10,
            background: "var(--cta-white)",
            display: "inline-block",
            marginBottom: 12,
          }}
        >
          Show the {companyRows.length} companies
        </summary>
        <div className="table-scroll">
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={th}>Company</th>
              <th style={th}>Match words</th>
              <th style={th}>Shows page (for The Showcase)</th>
              <th style={th}>Second shows page (optional)</th>
              <th style={th}>Inclusion</th>
              <th style={th}></th>
            </tr>
          </thead>
          <tbody>
            {companyRows.map((c) => (
              <tr key={c.id}>
                <td style={{ ...td, whiteSpace: "nowrap" }}>
                  <form action="/api/admin/companies" method="post" id={`co-${c.id}`}>
                    <input type="hidden" name="action" value="update" />
                    <input type="hidden" name="id" value={c.id} />
                    <input
                      name="name"
                      defaultValue={c.name}
                      required
                      style={{ ...smallInput, width: 200 }}
                    />
                  </form>
                </td>
                <td style={td}>
                  <input
                    form={`co-${c.id}`}
                    name="match"
                    defaultValue={c.match}
                    style={{ ...smallInput, width: "100%", minWidth: 220 }}
                  />
                </td>
                <td style={td}>
                  <input
                    form={`co-${c.id}`}
                    name="showsPageUrl"
                    type="url"
                    defaultValue={c.showsPageUrl ?? ""}
                    placeholder="https://company.com.au/shows"
                    style={{ ...smallInput, width: "100%", minWidth: 200 }}
                  />
                </td>
                <td style={td}>
                  <input
                    form={`co-${c.id}`}
                    name="showsPageUrl2"
                    type="url"
                    defaultValue={c.showsPageUrl2 ?? ""}
                    placeholder="e.g. installations page (optional)"
                    style={{ ...smallInput, width: "100%", minWidth: 200 }}
                  />
                </td>
                <td style={{ ...td, whiteSpace: "nowrap" }}>
                  <select
                    form={`co-${c.id}`}
                    name="inclusionMode"
                    defaultValue={c.inclusionMode}
                    style={smallInput}
                  >
                    <option value="auto">Auto</option>
                    <option value="manual">Manual</option>
                  </select>
                </td>
                <td style={{ ...td, whiteSpace: "nowrap" }}>
                  <button
                    form={`co-${c.id}`}
                    type="submit"
                    style={{ ...smallButton, marginRight: 6 }}
                  >
                    Save
                  </button>
                  <form action="/api/admin/companies" method="post" style={{ display: "inline" }}>
                    <input type="hidden" name="action" value="delete" />
                    <input type="hidden" name="id" value={c.id} />
                    <ConfirmSubmit
                      message={`Remove ${c.name} from the Alliance's companies? Their future posts will file under "Around the Alliance".`}
                      danger
                      style={dangerButton}
                    >
                      Remove
                    </ConfirmSubmit>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </details>
      <form
        action="/api/admin/companies"
        method="post"
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          alignItems: "center",
          marginTop: 18,
          paddingTop: 16,
          borderTop: "2px dashed rgba(30,30,29,0.25)",
        }}
      >
        <input type="hidden" name="action" value="add" />
        <div style={{ minWidth: 200, flex: "1 1 200px" }}>
          <label style={fieldLabel}>Company name</label>
          <input name="name" required style={{ ...inputStyle, width: "100%" }} />
        </div>
        <div style={{ minWidth: 240, flex: "2 1 240px" }}>
          <label style={fieldLabel}>Match words</label>
          <input
            name="match"
            placeholder="e.g. brymore, brymoreproductions"
            style={{ ...inputStyle, width: "100%" }}
          />
        </div>
        <div style={{ minWidth: 200, flex: "1 1 200px" }}>
          <label style={fieldLabel}>Shows page URL (optional)</label>
          <input
            name="showsPageUrl"
            type="url"
            placeholder="https://…"
            style={{ ...inputStyle, width: "100%" }}
          />
        </div>
        <div style={{ minWidth: 200, flex: "1 1 200px" }}>
          <label style={fieldLabel}>Second shows page (optional)</label>
          <input
            name="showsPageUrl2"
            type="url"
            placeholder="https://…"
            style={{ ...inputStyle, width: "100%" }}
          />
        </div>
        <div style={{ minWidth: 140, flex: "0 1 140px" }}>
          <label style={fieldLabel}>Inclusion</label>
          <select
            name="inclusionMode"
            defaultValue="auto"
            style={{ ...inputStyle, width: "100%" }}
          >
            <option value="auto">Auto</option>
            <option value="manual">Manual</option>
          </select>
        </div>
        <button type="submit" style={buttonStyle}>
          Add company
        </button>
      </form>
      <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "10px 0 0" }}>
        The shows page URL is where The Showcase looks up official show
        pages, copy and images for that company. Add a second page if a
        company lists some work (like installations or activations)
        separately; research looks through both.
      </p>
    </section>

    <section className="admin-card" id="alliance">
      <h2 style={h2}>
        Alliance updates
        <HelpTip title="Alliance updates">
          An internal, hand-written update sent to the Alliance member
          companies at the one group email address below. It uses the same
          branded email as the newsletters but in a different colour, and is
          kept entirely separate from public subscribers. Compose one with{" "}
          <strong>New update</strong>, drop your content into the big box
          (use <strong>## Heading</strong> for a section,{" "}
          <strong>### Sub heading</strong> beneath it, and{" "}
          <strong>-</strong> for bullet points), send a test to yourself,
          then send it to the group. Every update is kept here to edit,
          duplicate or delete.
        </HelpTip>
      </h2>
      <form
        action="/api/admin/alliance-update"
        method="post"
        style={{ marginBottom: 16 }}
      >
        <input type="hidden" name="action" value="save-recipients" />
        <label style={fieldLabel}>Group email address(es)</label>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <input
            type="text"
            name="recipients"
            defaultValue={allianceTo.join(", ")}
            style={{ ...inputStyle, minWidth: 320, flex: 1 }}
            aria-label="Alliance group email addresses"
          />
          <button type="submit" style={buttonStyle}>
            Save address
          </button>
        </div>
        <p style={{ ...muted, fontSize: 12, marginTop: 6 }}>
          Updates are sent here. Separate several addresses with commas.
        </p>
      </form>

      <div
        style={{
          display: "flex",
          gap: 12,
          alignItems: "flex-end",
          flexWrap: "wrap",
          marginBottom: 14,
        }}
      >
        <form action="/api/admin/alliance-update" method="post">
          <input type="hidden" name="action" value="create" />
          <button type="submit" style={buttonStyle}>
            + New update
          </button>
        </form>
        <form method="get" action="/admin" className="filter-bar">
          <input type="hidden" name="tab" value="settings" />
          {aso !== "sent" && <input type="hidden" name="aso" value={aso} />}
          {adr !== "desc" && <input type="hidden" name="adr" value={adr} />}
          <div className="filter-field">
            <label style={fieldLabel}>Status</label>
            <AutoSubmitSelect name="astatus" defaultValue={astatus} style={smallInput}>
              <option value="all">All</option>
              <option value="draft">Drafts</option>
              <option value="sent">Sent</option>
            </AutoSubmitSelect>
          </div>
        </form>
      </div>

      {alliancePage.length === 0 ? (
        <p style={muted}>
          {allianceFiltered.length === 0 && allianceRows.length > 0
            ? "No updates match this filter."
            : "No Alliance updates yet. Click + New update to write one."}
        </p>
      ) : (
        <div className="table-scroll">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th}>{aSortLink("subject", "Subject")}</th>
                <th style={th}>{aSortLink("status", "Status")}</th>
                <th style={th}>{aSortLink("sent", "Sent at")}</th>
                <th style={{ ...th, textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {alliancePage.map((u) => (
                <tr key={u.id}>
                  <td style={td}>
                    <span style={{ fontWeight: 600 }}>
                      {u.subject.trim() || "(no subject)"}
                    </span>
                  </td>
                  <td style={td}>
                    <span
                      style={badge(
                        u.status === "sent"
                          ? "var(--cta-emerald)"
                          : "var(--cta-yellow)",
                      )}
                    >
                      {u.status === "sent" ? "Sent" : "Draft"}
                    </span>
                  </td>
                  <td style={{ ...td, whiteSpace: "nowrap" }}>
                    {u.status === "sent" && u.sentAt
                      ? formatSydneyDateTime(u.sentAt)
                      : "—"}
                  </td>
                  <td style={{ ...td, textAlign: "right", whiteSpace: "nowrap" }}>
                    <div
                      style={{
                        display: "inline-flex",
                        gap: 8,
                        flexWrap: "wrap",
                        justifyContent: "flex-end",
                      }}
                    >
                      <Link
                        prefetch={false}
                        href={`/admin?tab=settings&update=${u.id}`}
                        style={{ ...smallButton, textDecoration: "none" }}
                      >
                        {u.status === "sent" ? "View" : "Edit"}
                      </Link>
                      <a
                        href={`/admin/preview/alliance-update?update=${u.id}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          ...smallButton,
                          textDecoration: "none",
                          background: "var(--cta-white)",
                        }}
                      >
                        Preview ↗
                      </a>
                      <form action="/api/admin/alliance-update" method="post">
                        <input type="hidden" name="action" value="duplicate" />
                        <input type="hidden" name="id" value={u.id} />
                        <button
                          type="submit"
                          style={{ ...smallButton, background: "var(--cta-white)" }}
                        >
                          Duplicate
                        </button>
                      </form>
                      <form action="/api/admin/alliance-update" method="post">
                        <input type="hidden" name="action" value="delete" />
                        <input type="hidden" name="id" value={u.id} />
                        <ConfirmSubmit
                          message={`Delete "${u.subject.trim() || "(no subject)"}"? This can't be undone.`}
                          confirmLabel="Delete"
                          danger
                          style={dangerButton}
                        >
                          Delete
                        </ConfirmSubmit>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {(apg > 1 || allianceHasMore) && (
        <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 12 }}>
          {apg > 1 && (
            <Link
              prefetch={false}
              scroll={false}
              href={`/admin?${allianceParams({ apg: String(apg - 1) })}`}
              style={{ ...smallButton, textDecoration: "none", background: "var(--cta-white)" }}
            >
              ← Previous
            </Link>
          )}
          <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-muted)" }}>
            Page {apg}
          </span>
          {allianceHasMore && (
            <Link
              prefetch={false}
              scroll={false}
              href={`/admin?${allianceParams({ apg: String(apg + 1) })}`}
              style={{ ...smallButton, textDecoration: "none", background: "var(--cta-white)" }}
            >
              Next →
            </Link>
          )}
        </div>
      )}
    </section>

    <section className="admin-card">
      <h2 style={h2}>
        Activity log
        <HelpTip title="Activity log">
          A short record of the things not shown elsewhere: errors and
          warnings (like a failed send or a feed that could not be read) and
          subscriber activity (new sign-ups, preference changes and
          unsubscribes). Newsletters and Showcase sends are not here, they
          have their own History. The log is loaded only when you open it, so
          it never slows the page, and it keeps just the most recent entries.
        </HelpTip>
      </h2>
      <LogViewer />
    </section>
    </>
  );
}

/**
 * The Alliance-update editor: compose or edit one internal update. Preview
 * and both send actions operate on the SAVED row (same model as the
 * Showcase builder), so the box is saved first, then acted on.
 */
async function AllianceUpdateEditor({ id }: { id: number }) {
  const [[update], to] = await Promise.all([
    db().select().from(allianceUpdates).where(eq(allianceUpdates.id, id)).limit(1),
    getAllianceRecipients(),
  ]);

  const backLink = (
    <Link
      prefetch={false}
      href="/admin?tab=settings#alliance"
      style={{
        display: "inline-block",
        fontFamily: "var(--font-body)",
        fontWeight: 700,
        fontSize: 13,
        color: "var(--cta-ink)",
        textDecoration: "none",
        marginBottom: 14,
      }}
    >
      ← Back to Settings
    </Link>
  );

  if (!update) {
    return (
      <section className="admin-card">
        {backLink}
        <h2 style={h2}>That update is gone</h2>
        <p style={muted}>
          This Alliance update no longer exists. It may have been deleted.
        </p>
      </section>
    );
  }

  const sent = update.status === "sent";
  const yellowButton: React.CSSProperties = {
    ...buttonStyle,
    background: "var(--cta-yellow)",
  };

  // A sent update is a locked archive: read-only, with Preview (the frozen
  // copy) and Duplicate to make a new draft. Nothing here can change it.
  if (sent) {
    return (
      <section className="admin-card">
        {backLink}
        <h2 style={h2}>Alliance update</h2>
        <p style={{ ...muted, marginBottom: 14 }}>
          Sent {update.sentAt ? formatSydneyDateTime(update.sentAt) : ""}
          {update.recipients ? ` to ${update.recipients}` : ""}. This is a
          locked record of what went out — Duplicate it to make a new version.
        </p>
        <label style={fieldLabel}>Subject</label>
        <p style={{ fontSize: 15, fontWeight: 600, margin: "0 0 14px" }}>
          {update.subject.trim() || "(no subject)"}
        </p>
        <label style={fieldLabel}>Content</label>
        <pre
          style={{
            ...inputStyle,
            width: "100%",
            display: "block",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            fontFamily: "var(--font-body)",
            fontSize: 14,
            lineHeight: 1.5,
            background: "var(--cta-cream-warm)",
            margin: 0,
          }}
        >
          {update.content || "(empty)"}
        </pre>
        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            alignItems: "center",
            marginTop: 18,
            paddingTop: 16,
            borderTop: "2px dashed rgba(30,30,29,0.25)",
          }}
        >
          <a
            href={`/admin/preview/alliance-update?update=${update.id}`}
            target="_blank"
            rel="noreferrer"
            style={{ ...buttonStyle, background: "var(--cta-white)", textDecoration: "none" }}
          >
            Preview ↗
          </a>
          <form action="/api/admin/alliance-update" method="post">
            <input type="hidden" name="action" value="duplicate" />
            <input type="hidden" name="id" value={update.id} />
            <button type="submit" style={buttonStyle}>
              Duplicate to edit
            </button>
          </form>
        </div>
      </section>
    );
  }

  return (
    <section className="admin-card">
      {backLink}
      <h2 style={h2}>Compose Alliance update</h2>

      <form action="/api/admin/alliance-update" method="post">
        <input type="hidden" name="action" value="save" />
        <input type="hidden" name="id" value={update.id} />
        <label style={fieldLabel}>Subject</label>
        <input
          type="text"
          name="subject"
          defaultValue={update.subject}
          placeholder="e.g. Alliance update — July"
          style={{ ...inputStyle, width: "100%", maxWidth: 560, display: "block" }}
        />
        <label style={fieldLabel}>Content</label>
        <textarea
          id="au-content"
          name="content"
          defaultValue={update.content}
          rows={18}
          placeholder={
            "## Children's Investment Fund\nA short note about where things are up to.\n### Grants\n- A point worth calling out\n- Another one\n\n## Next gatherings\nWhat's coming up.\n\n## What we need from you\n- An action to take"
          }
          style={{
            ...inputStyle,
            width: "100%",
            display: "block",
            resize: "vertical",
            lineHeight: 1.5,
            fontFamily: "var(--font-body)",
          }}
        />
        <div style={{ margin: "8px 0 0" }}>
          <ImageUploadButton
            targetId="au-content"
            style={{ ...smallButton, background: "var(--cta-white)" }}
          />
        </div>
        <p style={{ ...muted, fontSize: 12, margin: "6px 0 14px" }}>
          <strong>## Heading</strong> starts a section;{" "}
          <strong>### Sub heading</strong> is a smaller sub heading beneath it.
          Use <strong>-</strong> at the start of a line for bullet points, and
          leave a blank line between paragraphs. Add a picture with{" "}
          <strong>Add image</strong> above, or paste one as{" "}
          <strong>![caption](image url)</strong> on its own line. To make it
          smaller, add a width: <strong>![](image url =50%)</strong> (100% is
          full width). Align it with <strong>left</strong>,{" "}
          <strong>center</strong> or <strong>right</strong>, or wrap text around
          it with <strong>wrap-left</strong> / <strong>wrap-right</strong>, e.g.{" "}
          <strong>![](image url =40% wrap-left)</strong>. Add a link inside a
          paragraph or bullet with{" "}
          <strong>[link text](https://url)</strong>.
        </p>
        <button type="submit" style={buttonStyle}>
          Save draft
        </button>
      </form>

      <div
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          alignItems: "center",
          marginTop: 18,
          paddingTop: 16,
          borderTop: "2px dashed rgba(30,30,29,0.25)",
        }}
      >
        <a
          href={`/admin/preview/alliance-update?update=${update.id}`}
          target="_blank"
          rel="noreferrer"
          style={{ ...buttonStyle, background: "var(--cta-white)", textDecoration: "none" }}
        >
          Preview ↗
        </a>
        <TestSendButton
          action="/api/admin/alliance-update"
          hidden={{ action: "send-test", id: String(update.id) }}
          defaultTo={to.join(", ")}
          intro="Send yourself a test copy of this update."
          style={yellowButton}
        />
        <form action="/api/admin/alliance-update" method="post">
          <input type="hidden" name="action" value="send" />
          <input type="hidden" name="id" value={update.id} />
          <ConfirmSubmit
            title="Send to the alliance?"
            message={`This emails the saved version of this update to ${to.join(", ")}. Preview it first if you're not sure.`}
            confirmLabel="Yes, send it"
            danger
            style={yellowButton}
          >
            Send to alliance
          </ConfirmSubmit>
        </form>
      </div>
      <p style={{ ...muted, fontSize: 12, marginTop: 10 }}>
        Preview and both send buttons use the last saved version — save first
        if you have unsaved changes.
      </p>
    </section>
  );
}

const fieldLabel: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "var(--text-muted)",
  fontWeight: 600,
  margin: "10px 0 4px",
};

const badge = (bg: string): React.CSSProperties => ({
  display: "inline-block",
  background: bg,
  border: "2px solid var(--cta-ink)",
  borderRadius: 999,
  padding: "2px 10px",
  fontSize: 11,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
});

function StatusBadge({ status }: { status: ShowcaseEdition["status"] }) {
  const bg =
    status === "sent"
      ? "var(--cta-emerald)"
      : status === "failed"
        ? "var(--cta-pink)"
        : status === "sending"
          ? "var(--cta-yellow)"
          : "var(--cta-white)";
  return <span style={badge(bg)}>{status}</span>;
}

type ShowcaseParams = Record<string, string | undefined>;

async function ShowcaseTab({ sp }: { sp: ShowcaseParams }) {
  const editionId = Number(sp.edition);
  if (Number.isInteger(editionId) && editionId > 0) {
    const edition = await getEdition(editionId);
    if (edition) return <EditionBuilder edition={edition} sp={sp} />;
    return (
      <>
        <section className="admin-card">
          <p style={{ ...muted, marginBottom: 0 }}>
            That Showcase no longer exists. Here are all editions.
          </p>
        </section>
        <EditionListView sp={sp} />
      </>
    );
  }
  return <EditionListView sp={sp} />;
}

/**
 * The Showcase home: editions table (New / Edit / Preview / Duplicate /
 * Send / Delete), test recipients, the story pool with relevance controls,
 * and the "Shows in the Spotlight" registry.
 */
async function EditionListView({ sp }: { sp: ShowcaseParams }) {
  const [editions, counts, recipients, subscriberCount] = await Promise.all([
    db().select().from(showcaseEditions),
    getEditionCounts(),
    getPresenterRecipients(),
    getShowcaseSubscriberCount(),
  ]);

  const itemsOf = (e: ShowcaseEdition) =>
    e.status === "sent" ? e.itemCount : (counts.get(e.id)?.items ?? 0);
  const profilesOf = (e: ShowcaseEdition) =>
    e.status === "sent" ? e.profileCount : (counts.get(e.id)?.profiles ?? 0);
  const stampOf = (e: ShowcaseEdition) => (e.sentAt ?? e.createdAt).getTime();

  const epgRaw = Number(sp.epg);
  const epg = Number.isInteger(epgRaw) && epgRaw > 0 ? epgRaw : 1;
  const EDITIONS_PAGE = 15;
  // History sort. Default: most recently sent at the top.
  const ESORTS = ["type", "window", "status", "stories", "recipients", "sent"] as const;
  const eso = (ESORTS as readonly string[]).includes(sp.eso ?? "")
    ? (sp.eso as (typeof ESORTS)[number])
    : "sent";
  const edr = sp.edr === "asc" ? "asc" : "desc";
  const sentCmp = (a: ShowcaseEdition, b: ShowcaseEdition) => {
    let d: number;
    switch (eso) {
      case "stories":
        d = itemsOf(a) - itemsOf(b);
        break;
      case "recipients":
        d = a.recipientCount - b.recipientCount;
        break;
      // Type and Status are the same for every Showcase; fall through to the
      // sent date (which is also what Window shows here).
      case "type":
      case "status":
        d = 0;
        break;
      default:
        d = stampOf(a) - stampOf(b);
    }
    if (d === 0) d = stampOf(a) - stampOf(b);
    return edr === "asc" ? d : -d;
  };
  // Two sections, same shape as Regular Editions: what's in progress on
  // top, everything sent below.
  const drafts = editions
    .filter((e) => e.status !== "sent")
    .sort((a, b) => stampOf(b) - stampOf(a));
  const sentEditions = editions.filter((e) => e.status === "sent").sort(sentCmp);
  const pageSent = sentEditions.slice(
    (epg - 1) * EDITIONS_PAGE,
    epg * EDITIONS_PAGE,
  );
  const hasMoreSent = sentEditions.length > epg * EDITIONS_PAGE;
  const defaultTo = recipients.join(", ");
  const sentParams = (over: Record<string, string> = {}) => {
    const p = new URLSearchParams({ tab: "presenters" });
    if (eso !== "sent") p.set("eso", eso);
    if (edr !== "desc") p.set("edr", edr);
    if (epg > 1) p.set("epg", String(epg));
    for (const [k, v] of Object.entries(over)) {
      if (v) p.set(k, v);
      else p.delete(k);
    }
    return p.toString();
  };
  const eSortLink = (key: (typeof ESORTS)[number], label: string) => {
    const nextDir =
      eso === key ? (edr === "asc" ? "desc" : "asc") : key === "sent" ? "desc" : "asc";
    return (
      <Link
        prefetch={false}
        scroll={false}
        href={`/admin?${sentParams({ eso: key, edr: nextDir, epg: "" })}`}
        style={{ color: "inherit", textDecoration: "none" }}
      >
        {label}
        {eso === key ? (edr === "asc" ? " ↑" : " ↓") : ""}
      </Link>
    );
  };

  return (
    <>
      <section className="admin-card">
        <h2 style={h2}>
          Drafts
          <HelpTip title="Drafts">
            The Showcase is built one edition at a time. New Showcase starts
            a draft pre-filled with the latest high-relevance stories and
            the current Shows in the Spotlight list; edit it, preview it,
            send a test, then send it live to the {subscriberCount}{" "}
            subscriber{subscriberCount === 1 ? "" : "s"} who receive The
            Showcase Edition. Sent editions move to the history below.
          </HelpTip>
        </h2>
        <form
          action="/api/admin/showcase-edition"
          method="post"
          style={{ marginBottom: 16 }}
        >
          <input type="hidden" name="action" value="create" />
          <button type="submit" style={buttonStyle}>
            New Showcase
          </button>
        </form>
        {drafts.length === 0 ? (
          <p style={{ ...muted, marginBottom: 0 }}>
            No drafts right now. Press New Showcase to start one.
          </p>
        ) : (
          <div className="table-scroll">
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={th}>Created</th>
                  <th style={th}>Stories</th>
                  <th style={th}>Profiles</th>
                  <th style={th}>Status</th>
                  <th style={th}></th>
                </tr>
              </thead>
              <tbody>
                {drafts.map((e) => {
                  const editable = e.status === "draft" || e.status === "failed";
                  return (
                    <tr key={e.id}>
                      <td style={{ ...td, whiteSpace: "nowrap" }}>
                        {auDate(e.createdAt)}
                      </td>
                      <td style={td}>{itemsOf(e)}</td>
                      <td style={td}>{profilesOf(e)}</td>
                      <td style={td}>
                        <StatusBadge status={e.status} />
                      </td>
                      <td style={{ ...td, whiteSpace: "nowrap" }}>
                        {editable && (
                          <Link
                            prefetch={false}
                            href={`/admin?tab=presenters&edition=${e.id}`}
                            style={{
                              ...smallButton,
                              display: "inline-block",
                              textDecoration: "none",
                              marginRight: 6,
                            }}
                          >
                            Edit
                          </Link>
                        )}
                        <a
                          href={`/admin/preview/presenter?edition=${e.id}`}
                          target="_blank"
                          style={{
                            ...smallButton,
                            display: "inline-block",
                            textDecoration: "none",
                            background: "var(--cta-white)",
                            marginRight: 6,
                          }}
                        >
                          Preview ↗
                        </a>
                        {editable && (
                          <>
                            <TestSendButton
                              action="/api/admin/presenter-send"
                              hidden={{ edition: String(e.id), mode: "test" }}
                              defaultTo={defaultTo}
                              intro="This Showcase draft goes to these addresses only. The draft stays a draft."
                              style={{
                                ...smallButton,
                                background: "var(--cta-yellow)",
                                marginRight: 6,
                              }}
                            />
                            <form
                              action="/api/admin/presenter-send"
                              method="post"
                              style={{ display: "inline", marginRight: 6 }}
                            >
                              <input type="hidden" name="edition" value={e.id} />
                              <input type="hidden" name="mode" value="live" />
                              <ConfirmSubmit
                                title="Sending for real"
                                message={`Send this Showcase to all ${subscriberCount} subscriber${subscriberCount === 1 ? "" : "s"} who receive The Showcase Edition? This can't be undone.`}
                                confirmLabel="Yes, send it live"
                                danger
                                style={{ ...smallButton, background: "var(--cta-yellow)" }}
                              >
                                Send live
                              </ConfirmSubmit>
                            </form>
                          </>
                        )}
                        <form
                          action="/api/admin/showcase-edition"
                          method="post"
                          style={{ display: "inline" }}
                        >
                          <input type="hidden" name="action" value="delete" />
                          <input type="hidden" name="id" value={e.id} />
                          <ConfirmSubmit
                            message="Delete this Showcase draft?"
                            danger
                            style={dangerButton}
                          >
                            Delete
                          </ConfirmSubmit>
                        </form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="admin-card">
        <h2 style={h2}>
          History
          <HelpTip title="History">
            Every Showcase that has been sent live. Click any column heading
            to sort; click a recipient count to see exactly who received it,
            Preview to open it, or Duplicate to copy an edition into a fresh
            draft to reuse it.
          </HelpTip>
        </h2>
        <HistoryTable
          rows={pageSent.map((e) => ({
            key: `edition-${e.id}`,
            typeLabel: "The Showcase",
            showcase: true,
            window: formatWindowLabel(auDate(e.sentAt ?? e.createdAt)),
            status: e.status,
            stories: itemsOf(e),
            recipients: e.recipientCount,
            recipientsHref: `/admin?tab=presenters&edition=${e.id}`,
            sentAt: e.sentAt ?? e.createdAt,
            previewHref: `/admin/preview/presenter?edition=${e.id}`,
            extraActions: (
              <>
                <form
                  action="/api/admin/showcase-edition"
                  method="post"
                  style={{ display: "inline", marginRight: 6 }}
                >
                  <input type="hidden" name="action" value="duplicate" />
                  <input type="hidden" name="id" value={e.id} />
                  <button
                    type="submit"
                    style={{ ...smallButton, background: "var(--cta-white)" }}
                  >
                    Duplicate
                  </button>
                </form>
                <form
                  action="/api/admin/showcase-edition"
                  method="post"
                  style={{ display: "inline" }}
                >
                  <input type="hidden" name="action" value="delete" />
                  <input type="hidden" name="id" value={e.id} />
                  <ConfirmSubmit
                    message="Delete this sent Showcase from the history? Its stories become available to future editions again."
                    danger
                    style={dangerButton}
                  >
                    Delete
                  </ConfirmSubmit>
                </form>
              </>
            ),
          }))}
          sortLink={eSortLink}
          empty={epg > 1 ? "No Showcases this far back." : "Nothing sent yet."}
        />
        {(epg > 1 || hasMoreSent) && (
          <div
            style={{
              display: "flex",
              gap: 12,
              alignItems: "center",
              marginTop: 12,
            }}
          >
            {epg > 1 && (
              <Link
                prefetch={false}
                scroll={false}
                href={`/admin?${sentParams({ epg: String(epg - 1) })}`}
                style={{ ...smallButton, textDecoration: "none", background: "var(--cta-white)" }}
              >
                ← Previous
              </Link>
            )}
            <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-muted)" }}>
              Page {epg}
            </span>
            {hasMoreSent && (
              <Link
                prefetch={false}
                scroll={false}
                href={`/admin?${sentParams({ epg: String(epg + 1) })}`}
                style={{ ...smallButton, textDecoration: "none", background: "var(--cta-white)" }}
              >
                Next →
              </Link>
            )}
          </div>
        )}
      </section>

    </>
  );
}

const SHOW_SORTS = ["title", "company", "status"] as const;
type ShowSort = (typeof SHOW_SORTS)[number];

/** The Shows tab: the sortable show registry, with adding in a popup. */
async function ShowsTab({ sp }: { sp: Record<string, string | undefined> }) {
  const ssort: ShowSort = (SHOW_SORTS as readonly string[]).includes(
    sp.shs ?? "",
  )
    ? (sp.shs as ShowSort)
    : "title";
  const sdir = sp.shd === "desc" ? "desc" : "asc";
  // Filters (shared by the table and the card grid below it).
  const shco = (sp.shco ?? "").trim();
  const shst = sp.shst === "active" || sp.shst === "archived" ? sp.shst : "all";
  // Spotlight grid: group by company, page size and page.
  const SHOW_CARD_SIZES = [25, 50, 100] as const;
  const shg = sp.shg === "company" ? "company" : "none";
  const shps = SHOW_CARD_SIZES.find((n) => n === Number(sp.shps)) ?? 25;
  const shpgRaw = Number(sp.shpg);
  const shpg = Number.isInteger(shpgRaw) && shpgRaw > 0 ? shpgRaw : 1;
  const [registry, companyRows] = await Promise.all([
    db().select().from(shows).orderBy(asc(shows.title)),
    db().select().from(companies).orderBy(asc(companies.name)),
  ]);
  const nameByKey = new Map(companyRows.map((c) => [c.key, c.name]));
  const companyName = (key: string) =>
    nameByKey.get(key) ?? "Around the Alliance";
  const filtered = registry.filter(
    (s) =>
      (!shco || s.companyKey === shco) && (shst === "all" || s.status === shst),
  );
  const sorted = [...filtered].sort((a, b) => {
    const cmp =
      ssort === "company"
        ? companyName(a.companyKey).localeCompare(companyName(b.companyKey))
        : ssort === "status"
          ? a.status.localeCompare(b.status)
          : a.title.localeCompare(b.title);
    return sdir === "asc" ? cmp : -cmp;
  });
  // Keep the active filters on the sort links so sorting doesn't clear them.
  const showParams = (over: Record<string, string> = {}) => {
    const p = new URLSearchParams({ tab: "shows" });
    if (ssort !== "title") p.set("shs", ssort);
    if (sdir !== "asc") p.set("shd", sdir);
    if (shco) p.set("shco", shco);
    if (shst !== "all") p.set("shst", shst);
    if (shg !== "none") p.set("shg", shg);
    if (shps !== 25) p.set("shps", String(shps));
    if (shpg > 1) p.set("shpg", String(shpg));
    for (const [k, v] of Object.entries(over)) {
      if (v) p.set(k, v);
      else p.delete(k);
    }
    return p.toString();
  };
  const sortLink = (key: ShowSort, label: string) => {
    const nextDir = ssort === key && sdir === "asc" ? "desc" : "asc";
    return (
      <Link
        prefetch={false}
        scroll={false}
        href={`/admin?${showParams({ shs: key, shd: nextDir })}#registry`}
        style={{ color: "inherit", textDecoration: "none" }}
      >
        {label}
        {ssort === key ? (sdir === "asc" ? " ↑" : " ↓") : ""}
      </Link>
    );
  };
  // Accent colours cycled across the Spotlight cards, mirroring the email.
  const GRID_ACCENTS = [
    "var(--cta-teal)",
    "var(--cta-pink)",
    "var(--cta-yellow)",
    "var(--cta-sky)",
    "var(--cta-emerald)",
    "var(--cta-purple)",
  ];
  const isFiltered = shco !== "" || shst !== "all";

  // ---- Spotlight card grid: group / paginate / render ----
  const cardGrouped = shg === "company";
  const cardGroups = (() => {
    if (!cardGrouped) return [];
    const byKey = new Map<string, typeof sorted>();
    for (const s of sorted) {
      const list = byKey.get(s.companyKey);
      if (list) list.push(s);
      else byKey.set(s.companyKey, [s]);
    }
    return [...byKey.entries()]
      .map(([key, list]) => ({ key, name: companyName(key), list }))
      .sort((a, b) => a.name.localeCompare(b.name));
  })();
  const totalCardPages = Math.max(1, Math.ceil(sorted.length / shps));
  const cardPage = Math.min(shpg, totalCardPages);
  const pageCards = cardGrouped
    ? sorted
    : sorted.slice((cardPage - 1) * shps, cardPage * shps);

  const gridStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
    gap: 16,
  };
  const showCard = (s: (typeof registry)[number], accent: string) => (
    <div
      key={s.id}
      style={{
        border: "2px solid var(--cta-ink)",
        borderRadius: 14,
        background: "var(--cta-white)",
        boxShadow: "4px 4px 0 var(--cta-ink)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        opacity: s.status === "archived" ? 0.55 : 1,
      }}
    >
      {s.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={s.imageUrl}
          alt={s.title}
          loading="lazy"
          style={{
            display: "block",
            width: "100%",
            height: 150,
            objectFit: "cover",
            borderBottom: "2px solid var(--cta-ink)",
          }}
        />
      ) : (
        <div
          style={{
            height: 150,
            background: accent,
            borderBottom: "2px solid var(--cta-ink)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "var(--font-display)",
            fontSize: 40,
            color: "var(--cta-ink)",
          }}
        >
          {s.title.slice(0, 1).toUpperCase()}
        </div>
      )}
      <div
        style={{
          padding: "12px 14px 14px",
          display: "flex",
          flexDirection: "column",
          gap: 6,
          flex: 1,
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 17,
            lineHeight: 1.15,
            color: "var(--cta-ink)",
          }}
        >
          {s.title}
        </div>
        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)" }}>
          {companyName(s.companyKey)}
        </div>
        {s.blurb && (
          <div
            style={{
              fontSize: 12.5,
              color: "var(--text-body)",
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {s.blurb}
          </div>
        )}
        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            flexWrap: "wrap",
            marginTop: "auto",
            paddingTop: 4,
          }}
        >
          {s.ageRange && (
            <span style={{ ...badge("var(--cta-mint)"), fontSize: 10 }}>
              {s.ageRange}
            </span>
          )}
          {s.status === "archived" && (
            <span style={{ ...badge("var(--cta-white)"), fontSize: 10 }}>
              archived
            </span>
          )}
          {s.url && (
            <a
              href={s.url}
              target="_blank"
              style={{
                fontWeight: 700,
                fontSize: 12.5,
                color: "var(--cta-ink)",
                textDecoration: "none",
                borderBottom: `2px solid ${accent}`,
                paddingBottom: 1,
                marginLeft: "auto",
              }}
            >
              Show page →
            </a>
          )}
        </div>
      </div>
    </div>
  );
  const toggleStyle = (active: boolean): React.CSSProperties => ({
    fontFamily: "var(--font-body)",
    fontSize: 12,
    fontWeight: 700,
    color: "var(--cta-ink)",
    background: active ? "var(--cta-purple)" : "var(--cta-white)",
    border: "2px solid var(--cta-ink)",
    borderRadius: 8,
    padding: "6px 12px",
    textDecoration: "none",
  });

  return (
    <section className="admin-card" id="registry">
      <h2 style={h2}>
        Shows in the Spotlight
        <HelpTip title="Shows in the Spotlight">
          The registry of every show, current and past. New Showcases start
          with all active shows; each edition can then drop or re-add them.
          Archive a show to keep it on file without offering it to new
          editions. Shows are added here automatically when you research a
          story in the Showcase builder, or by hand with New show.
        </HelpTip>
      </h2>
      <div className="bulk-bar">
        <AddShowModal companyRows={companyRows} />
      </div>
      <form
        method="get"
        action="/admin#registry"
        className="filter-bar"
        style={{ marginBottom: 14 }}
      >
        <input type="hidden" name="tab" value="shows" />
        {ssort !== "title" && <input type="hidden" name="shs" value={ssort} />}
        {sdir !== "asc" && <input type="hidden" name="shd" value={sdir} />}
        {shg !== "none" && <input type="hidden" name="shg" value={shg} />}
        {shps !== 25 && <input type="hidden" name="shps" value={shps} />}
        <div className="filter-field">
          <label style={fieldLabel}>Company</label>
          <AutoSubmitSelect name="shco" defaultValue={shco} style={smallInput}>
            <option value="">All companies</option>
            {companyRows.map((c) => (
              <option key={c.key} value={c.key}>
                {c.name}
              </option>
            ))}
          </AutoSubmitSelect>
        </div>
        <div className="filter-field">
          <label style={fieldLabel}>Status</label>
          <AutoSubmitSelect name="shst" defaultValue={shst} style={smallInput}>
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </AutoSubmitSelect>
        </div>
        {isFiltered && (
          <Link
            prefetch={false}
            href="/admin?tab=shows#registry"
            style={{
              fontSize: 12.5,
              fontWeight: 600,
              color: "var(--cta-ink)",
              alignSelf: "center",
            }}
          >
            Clear
          </Link>
        )}
        <span
          style={{
            fontSize: 12.5,
            color: "var(--text-muted)",
            alignSelf: "center",
            marginLeft: "auto",
          }}
        >
          {sorted.length} show{sorted.length === 1 ? "" : "s"}
        </span>
      </form>
      <div className="table-scroll">
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={th}>{sortLink("title", "Show")}</th>
              <th style={th}>{sortLink("company", "Company")}</th>
              <th style={th}>Show page URL</th>
              <th style={th}>Blurb</th>
              <th style={th}>Image URL</th>
              <th style={th}>Ages</th>
              <th style={th}>{sortLink("status", "Status")}</th>
              <th style={th}></th>
            </tr>
          </thead>
            <tbody>
              {sorted.map((s) => (
                <tr key={s.id} style={s.status === "archived" ? { opacity: 0.55 } : undefined}>
                  <td style={{ ...td, whiteSpace: "nowrap" }}>
                    <form action="/api/admin/shows" method="post" id={`show-${s.id}`}>
                      <input type="hidden" name="anchor" value="registry" />
                      <input type="hidden" name="action" value="update" />
                      <input type="hidden" name="id" value={s.id} />
                      <input
                        name="title"
                        defaultValue={s.title}
                        required
                        style={{ ...smallInput, width: 170 }}
                      />
                    </form>
                  </td>
                  <td style={{ ...td, whiteSpace: "nowrap" }}>
                    {nameByKey.get(s.companyKey) ?? "Around the Alliance"}
                  </td>
                  <td style={td}>
                    <input
                      form={`show-${s.id}`}
                      name="url"
                      type="url"
                      defaultValue={s.url ?? ""}
                      style={{ ...smallInput, width: "100%", minWidth: 170 }}
                    />
                  </td>
                  <td style={td}>
                    <input
                      form={`show-${s.id}`}
                      name="blurb"
                      defaultValue={s.blurb ?? ""}
                      style={{ ...smallInput, width: "100%", minWidth: 180 }}
                    />
                  </td>
                  <td style={td}>
                    <input
                      form={`show-${s.id}`}
                      name="imageUrl"
                      defaultValue={s.imageUrl ?? ""}
                      placeholder="For the Spotlight card"
                      style={{ ...smallInput, width: "100%", minWidth: 160 }}
                    />
                  </td>
                  <td style={td}>
                    <input
                      form={`show-${s.id}`}
                      name="ageRange"
                      defaultValue={s.ageRange ?? ""}
                      style={{ ...smallInput, width: 90 }}
                    />
                  </td>
                  <td style={td}>
                    <span
                      style={badge(
                        s.status === "archived"
                          ? "var(--cta-white)"
                          : "var(--cta-emerald)",
                      )}
                    >
                      {s.status}
                    </span>
                  </td>
                  <td style={{ ...td, whiteSpace: "nowrap" }}>
                    <button
                      form={`show-${s.id}`}
                      type="submit"
                      style={{ ...smallButton, marginRight: 6 }}
                    >
                      Save
                    </button>
                    <form action="/api/admin/shows" method="post" style={{ display: "inline", marginRight: 6 }}>
                      <input type="hidden" name="anchor" value="registry" />
                      <input
                        type="hidden"
                        name="action"
                        value={s.status === "archived" ? "activate" : "archive"}
                      />
                      <input type="hidden" name="id" value={s.id} />
                      <button type="submit" style={{ ...smallButton, background: "var(--cta-white)" }}>
                        {s.status === "archived" ? "Unarchive" : "Archive"}
                      </button>
                    </form>
                    <form action="/api/admin/shows" method="post" style={{ display: "inline" }}>
                      <input type="hidden" name="anchor" value="registry" />
                      <input type="hidden" name="action" value="delete" />
                      <input type="hidden" name="id" value={s.id} />
                      <ConfirmSubmit
                        message={`Delete ${s.title} from the show list permanently?`}
                        danger
                      style={dangerButton}
                      >
                        Delete
                      </ConfirmSubmit>
                    </form>
                  </td>
                </tr>
              ))}
              {sorted.length === 0 && (
                <tr>
                  <td style={td} colSpan={8}>
                    {isFiltered
                      ? "No shows match these filters."
                      : "No shows listed yet. Press New show to add the first one."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Spotlight preview: the same list above, as the branded cards that
            appear in the Showcase email. Honours the filter and sort. */}
        <h3
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 20,
            textTransform: "uppercase",
            letterSpacing: "0.01em",
            margin: "30px 0 4px",
          }}
        >
          Spotlight preview
        </h3>
        <p style={{ ...muted, fontSize: 12.5, margin: "0 0 14px" }}>
          How these shows look as cards in the Showcase email. Uses the filter
          and sort below.
        </p>

        {/* Card controls: filters (also here, by the cards), group by company,
            and page size. All drive the same URL params as the table. */}
        <form
          method="get"
          action="/admin#spotlight"
          className="filter-bar"
          style={{ marginBottom: 14 }}
        >
          <input type="hidden" name="tab" value="shows" />
          {ssort !== "title" && <input type="hidden" name="shs" value={ssort} />}
          {sdir !== "asc" && <input type="hidden" name="shd" value={sdir} />}
          {shg !== "none" && <input type="hidden" name="shg" value={shg} />}
          {shps !== 25 && <input type="hidden" name="shps" value={shps} />}
          <div className="filter-field">
            <label style={fieldLabel}>Company</label>
            <AutoSubmitSelect name="shco" defaultValue={shco} style={smallInput}>
              <option value="">All companies</option>
              {companyRows.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.name}
                </option>
              ))}
            </AutoSubmitSelect>
          </div>
          <div className="filter-field">
            <label style={fieldLabel}>Status</label>
            <AutoSubmitSelect name="shst" defaultValue={shst} style={smallInput}>
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </AutoSubmitSelect>
          </div>
          <Link
            prefetch={false}
            scroll={false}
            href={`/admin?${showParams({ shg: cardGrouped ? "" : "company", shpg: "" })}#spotlight`}
            style={{ ...toggleStyle(cardGrouped), alignSelf: "flex-end" }}
          >
            {cardGrouped ? "Grouped by company ✓" : "Group by company"}
          </Link>
        </form>

        <div id="spotlight" />
        {sorted.length === 0 ? (
          <p style={{ ...muted, marginBottom: 0 }}>
            {isFiltered
              ? "No shows match these filters."
              : "No shows to preview yet."}
          </p>
        ) : cardGrouped ? (
          <>
            {cardGroups.map((g) => (
              <div key={g.key} style={{ marginBottom: 22 }}>
                <h4
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 16,
                    margin: "0 0 10px",
                  }}
                >
                  {g.name}{" "}
                  <span style={{ color: "var(--text-muted)", fontWeight: 600 }}>
                    ({g.list.length})
                  </span>
                </h4>
                <div style={gridStyle}>
                  {g.list.map((s, i) => showCard(s, GRID_ACCENTS[i % GRID_ACCENTS.length]))}
                </div>
              </div>
            ))}
          </>
        ) : (
          <>
            <div style={gridStyle}>
              {pageCards.map((s, i) => showCard(s, GRID_ACCENTS[i % GRID_ACCENTS.length]))}
            </div>
            <div
              style={{
                display: "flex",
                gap: 12,
                alignItems: "center",
                flexWrap: "wrap",
                marginTop: 14,
                fontSize: 12.5,
                fontWeight: 600,
              }}
            >
              {cardPage > 1 && (
                <Link
                  prefetch={false}
                  scroll={false}
                  href={`/admin?${showParams({ shpg: String(cardPage - 1) })}#spotlight`}
                  style={{ ...smallButton, textDecoration: "none", background: "var(--cta-white)" }}
                >
                  ← Previous
                </Link>
              )}
              {totalCardPages > 1 && (
                <span style={{ color: "var(--text-muted)" }}>
                  Page {cardPage} of {totalCardPages}
                </span>
              )}
              {cardPage < totalCardPages && (
                <Link
                  prefetch={false}
                  scroll={false}
                  href={`/admin?${showParams({ shpg: String(cardPage + 1) })}#spotlight`}
                  style={{ ...smallButton, textDecoration: "none", background: "var(--cta-white)" }}
                >
                  Next →
                </Link>
              )}
              <span style={{ color: "var(--text-muted)", marginLeft: "auto" }}>
                View{" "}
                {SHOW_CARD_SIZES.map((size, i) => (
                  <span key={size}>
                    {i > 0 && " · "}
                    {shps === size ? (
                      <strong>{size}</strong>
                    ) : (
                      <Link
                        prefetch={false}
                        scroll={false}
                        href={`/admin?${showParams({ shps: String(size), shpg: "" })}#spotlight`}
                        style={{ color: "var(--cta-ink)" }}
                      >
                        {size}
                      </Link>
                    )}
                  </span>
                ))}
              </span>
            </div>
          </>
        )}
      </section>
  );
}

/**
 * Where a story came from, as a small badge: the feed's name for RSS
 * stories (yellow when it arrived through the Review queue, so media
 * stories stand out from the trusted social feed), "Manual" for stories
 * written by hand. Legacy rows from before the feeds registry carry no
 * feed link and get no badge (they are all from the social feed).
 */
/**
 * The actual publication a story came from, shown under the feed badge so
 * the origin is concrete: the feed's author/creator, or the article URL's
 * host. Hand-written stories have no publication.
 */
function sourcePublication(it: FeedItem): string {
  if (it.source === "manual") return "";
  let host = "";
  try {
    host = new URL(it.postUrl).hostname.replace(/^www\./, "");
  } catch {
    host = "";
  }
  if (it.creator && host && it.creator !== host) return `${it.creator} · ${host}`;
  return it.creator || host || "";
}

function feedOriginBadge(
  it: FeedItem,
  feedNameById: Map<number, string>,
  /** True when the badge follows text (adds a left margin). */
  inline = false,
): React.ReactNode {
  const marginLeft = inline ? 8 : 0;
  if (it.source === "manual") {
    return (
      <span
        style={{ ...badge("var(--cta-white)"), marginLeft, fontSize: 10 }}
        title="Written by hand in the Showcase builder"
      >
        Manual
      </span>
    );
  }
  const name = it.feedId == null ? undefined : feedNameById.get(it.feedId);
  if (!name) return null;
  const fromReview = it.reviewStatus !== "auto";
  return (
    <span
      style={{
        ...badge(fromReview ? "var(--cta-yellow)" : "var(--cta-white)"),
        marginLeft,
        fontSize: 10,
      }}
      title={
        fromReview
          ? `From the "${name}" feed, approved in the Review queue`
          : `From the "${name}" feed`
      }
    >
      {name}
    </span>
  );
}

/**
 * Filter form + sortable results table for the story pool (Stories tab).
 * Rows carry tick boxes feeding the bulk "add selected to a Showcase
 * draft" bar above the table.
 */
function StoryPoolTable({
  pool,
  usedDates,
  nameByKey,
  companyRows,
  feedNameById,
  params,
  anchor,
  drafts,
  duplicates,
}: {
  pool: StoryPoolPage;
  usedDates: Map<number, Date | null>;
  nameByKey: Map<string, string>;
  companyRows: { key: string; name: string }[];
  /** Feed id → feed name, for the origin badge on each story. */
  feedNameById: Map<number, string>;
  params: ShowcaseListParams;
  /** Section id to return to after filtering (forms) and paging (links). */
  anchor: string;
  /** Draft Showcases for the bulk "add selected" bar; when given, each row
   * gets a tick box and selected stories can be sent to a draft at once. */
  drafts?: { id: number; createdAt: Date }[];
  /** Story id → other recent stories it may duplicate; both rows are flagged. */
  duplicates?: Map<number, DupStory[]>;
}) {
  const { rows, hasMore } = pool;
  const draftOptions = (drafts ?? []).map((d) => ({
    id: d.id,
    label: `Draft #${d.id} · ${auDate(d.createdAt)}`,
  }));
  // Potential-duplicate flagging: a soft highlight on the row plus a note
  // naming the story it looks like, so the admin can delete one and keep
  // the other before the next edition goes out.
  const dupOf = (id: number) => duplicates?.get(id) ?? [];
  const dupRowStyle = (id: number): React.CSSProperties =>
    dupOf(id).length > 0
      ? { background: "rgba(245, 197, 66, 0.16)" }
      : {};
  const dupNote = (p: FeedItem) => {
    const matches = dupOf(p.id);
    if (matches.length === 0) return null;
    return (
      <div style={{ marginTop: 6, fontSize: 11.5, color: "var(--cta-ink)" }}>
        <span style={{ ...badge("var(--cta-yellow)"), fontSize: 10, marginRight: 6 }}>
          ⚠ Possible duplicate
        </span>
        Looks like{" "}
        {matches
          .map((m) => `"${m.heading.slice(0, 70)}${m.heading.length > 70 ? "…" : ""}"`)
          .join(", ")}
        . Delete whichever one you don&#39;t want.
      </div>
    );
  };
  const href = (over: Partial<ShowcaseListParams>) => {
    // Changing sort or filters implicitly resets to page 1 unless the
    // override sets pg itself.
    const merged = { ...params, pg: 1, ...over };
    const q = new URLSearchParams({ tab: "review" });
    if (merged.rel !== "all") q.set("rel", merged.rel);
    if (merged.co) q.set("co", merged.co);
    if (merged.q) q.set("q", merged.q);
    if (merged.sort !== "date") q.set("sort", merged.sort);
    if (merged.dir !== "desc") q.set("dir", merged.dir);
    if (merged.pg > 1) q.set("pg", String(merged.pg));
    if (merged.ps !== 10) q.set("ps", String(merged.ps));
    if (merged.group === "company") q.set("group", "company");
    if (merged.ignored) q.set("ig", "1");
    return `/admin?${q.toString()}#${anchor}`;
  };
  const grouped = params.group === "company";
  const sortLink = (key: ShowcaseListParams["sort"], label: string) => (
    <Link
            prefetch={false}
      href={href({
        sort: key,
        dir:
          params.sort === key
            ? params.dir === "asc"
              ? "desc"
              : "asc"
            : key === "date"
              ? "desc"
              : "asc",
      })}
      scroll={false}
      style={{ color: "inherit", textDecoration: "none" }}
    >
      {label}
      {params.sort === key ? (params.dir === "asc" ? " ↑" : " ↓") : ""}
    </Link>
  );
  const isFiltered =
    params.rel !== "all" ||
    params.co ||
    params.q ||
    params.sort !== "date" ||
    params.pg > 1;

  // The per-row action buttons. In the "Show ignored" view every row instead
  // offers a single Restore (undo the X) — the add/remove actions make no
  // sense for a story that's been pulled from the pool.
  const actionButtons = (p: FeedItem) => (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      {params.ignored ? (
        <form
          action="/api/admin/presenter-item"
          method="post"
          style={{ display: "inline" }}
        >
          <input type="hidden" name="action" value="restore" />
          <input type="hidden" name="id" value={p.id} />
          <button type="submit" style={{ ...smallButton }}>
            Restore
          </button>
        </form>
      ) : (
        <>
          {(p.source === "feed" && p.reviewStatus === "auto") ||
          p.forcedNewsletterAt ? (
            <span
              title={
                p.source === "feed" && p.reviewStatus === "auto"
                  ? "Always in the newsletters"
                  : "Already added to the newsletters"
              }
              style={{
                ...smallButton,
                background: "var(--cta-white)",
                opacity: 0.4,
                cursor: "default",
              }}
            >
              Regular ✓
            </span>
          ) : (
            <form
              action="/api/admin/presenter-item"
              method="post"
              style={{ display: "inline" }}
            >
              <input type="hidden" name="action" value="force-newsletter" />
              <input type="hidden" name="id" value={p.id} />
              <ConfirmSubmit
                title="Add to the newsletters"
                message={`Add "${p.aiHeading.slice(0, 50)}" to the next daily, weekly and fortnightly newsletter? It appears once in each, then drops off.`}
                confirmLabel="Add"
                style={{ ...smallButton, background: "var(--cta-white)" }}
              >
                Regular +
              </ConfirmSubmit>
            </form>
          )}
          <ShowcaseAddModal
            itemId={p.id}
            drafts={draftOptions}
            style={{ ...smallButton }}
          >
            Showcase +
          </ShowcaseAddModal>
          <form
            action="/api/admin/presenter-item"
            method="post"
            style={{ display: "inline" }}
          >
            <input type="hidden" name="action" value="ignore" />
            <input type="hidden" name="id" value={p.id} />
            <ConfirmSubmit
              danger
              title="Remove from the story pool"
              message={`Remove "${p.aiHeading.slice(0, 50)}" from the story pool for good? It will not come back, even if the feed lists it again.`}
              confirmLabel="Remove for good"
              style={{ ...smallButton, background: "var(--cta-pink)" }}
            >
              ✕
            </ConfirmSubmit>
          </form>
        </>
      )}
    </div>
  );

  const headRow = (
    <tr>
      {drafts && <th style={th}></th>}
      <th style={th}>{sortLink("date", "Added")}</th>
      <th style={th}>Published</th>
      <th style={th}>{sortLink("headline", "Story")}</th>
      <th style={{ ...th, maxWidth: 200 }}>{sortLink("source", "Source")}</th>
      <th style={th}>{sortLink("company", "Company")}</th>
      <th style={th}>
        Rating: {sortLink("relevance", "Show")}
        {" / "}
        {sortLink("social", "Social")}
      </th>
      <th style={th}>Newsletters</th>
    </tr>
  );

  const bodyRow = (p: FeedItem) => (
    <tr key={p.id} style={dupRowStyle(p.id)}>
      {drafts && (
        <td style={td}>
          <input
            type="checkbox"
            name="ids"
            value={p.id}
            form="pool-bulk"
            style={{ width: 18, height: 18 }}
          />
        </td>
      )}
      <td style={{ ...td, whiteSpace: "nowrap" }}>
        {auDate(p.reviewedAt ?? p.createdAt)}
      </td>
      <td style={{ ...td, whiteSpace: "nowrap" }}>{auDate(p.publishedAt)}</td>
      <td style={{ ...td, minWidth: 220, maxWidth: 420 }}>
        <strong style={{ fontSize: 13.5 }}>
          {p.aiHeading.slice(0, 90)}
          {p.aiHeading.length > 90 ? "…" : ""}
        </strong>
        {p.postUrl && (
          <>
            {" "}
            <a
              href={p.postUrl}
              target="_blank"
              style={{ color: "var(--cta-ink)", fontWeight: 600 }}
            >
              ↗
            </a>
          </>
        )}
        {usedDates.has(p.id) && (
          <span
            style={{
              ...badge("var(--cta-mint)"),
              marginLeft: 8,
              fontSize: 10,
            }}
            title="This story has appeared in a sent Showcase"
          >
            Sent
            {usedDates.get(p.id) ? ` ${auDate(usedDates.get(p.id)!)}` : ""}
          </span>
        )}
        {p.aiSummary && (
          <div
            className="story-summary"
            style={{
              fontSize: 12.5,
              color: "var(--text-body)",
              marginTop: 4,
              fontWeight: 400,
            }}
          >
            {p.aiSummary}
          </div>
        )}
        {dupNote(p)}
      </td>
      <td style={{ ...td, maxWidth: 200 }}>
        {feedOriginBadge(p, feedNameById)}
        {sourcePublication(p) && (
          <div
            title={sourcePublication(p)}
            style={{
              fontSize: 11.5,
              color: "var(--text-muted)",
              marginTop: 4,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {sourcePublication(p)}
          </div>
        )}
      </td>
      <td style={{ ...td, whiteSpace: "nowrap" }}>
        {nameByKey.get(p.companyKey) ?? "Around the Alliance"}
      </td>
      <td style={{ ...td, whiteSpace: "nowrap" }}>
        <RatingsForm
          itemId={p.id}
          show={p.presenterRelevance}
          social={p.socialRelevance}
        />
      </td>
      <td style={{ ...td, whiteSpace: "nowrap" }}>{actionButtons(p)}</td>
    </tr>
  );

  // Grouped view: split the rows (already in sort order) into per-company
  // buckets, then order the buckets alphabetically by company name. Each
  // becomes a collapsible section, collapsed by default.
  const companyGroups = (() => {
    if (!grouped) return [];
    const byKey = new Map<string, FeedItem[]>();
    for (const r of rows) {
      const list = byKey.get(r.companyKey) ?? [];
      list.push(r);
      byKey.set(r.companyKey, list);
    }
    return [...byKey.entries()]
      .map(([key, list]) => ({
        key,
        name: nameByKey.get(key) ?? "Around the Alliance",
        list,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  })();

  return (
    <>
      <StoryToolbar
        filters={
          <form method="get" action={`/admin#${anchor}`} className="filter-bar">
            <input type="hidden" name="tab" value="review" />
            {params.ps !== 10 && (
              <input type="hidden" name="ps" value={params.ps} />
            )}
            <div className="filter-field">
              <label style={fieldLabel}>Rating</label>
              <AutoSubmitSelect name="rel" defaultValue={params.rel} style={smallInput}>
                <option value="all">All ratings</option>
                <option value="high">Show: high</option>
                <option value="medium">Show: medium</option>
                <option value="s-high">Social Theatre: high</option>
                <option value="s-medium">Social Theatre: medium</option>
                <option value="other">Rated lower</option>
              </AutoSubmitSelect>
            </div>
            <div className="filter-field">
              <label style={fieldLabel}>Company</label>
              <AutoSubmitSelect name="co" defaultValue={params.co} style={smallInput}>
                <option value="">All companies</option>
                {companyRows.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.name}
                  </option>
                ))}
              </AutoSubmitSelect>
            </div>
            <div className="filter-field filter-field-grow">
              <label style={fieldLabel}>Search</label>
              <input
                name="q"
                defaultValue={params.q}
                placeholder="Headline or show title"
                style={{ ...smallInput, width: "100%" }}
              />
            </div>
            <button type="submit" style={smallButton}>
              Search
            </button>
            {isFiltered && (
              <Link
                prefetch={false}
                href="/admin?tab=review#story-pool"
                scroll={false}
                style={{
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: "var(--cta-ink)",
                  alignSelf: "center",
                }}
              >
                Clear
              </Link>
            )}
          </form>
        }
        actions={
          drafts && rows.length > 0 ? (
            /* Bulk add: tick rows, then this opens the same popup as the
               per-row Showcase +. Row tick boxes carry form="pool-bulk". */
            <div className="bulk-bar">
              <SelectAllCheckbox formId="pool-bulk" />
              <ShowcaseAddModal bulk drafts={draftOptions} style={smallButton}>
                Add selected to Showcase
              </ShowcaseAddModal>
            </div>
          ) : undefined
        }
        extra={
          <>
            <Link
              prefetch={false}
              href={href({ group: grouped ? "none" : "company", pg: 1 })}
              scroll={false}
              style={{
                fontFamily: "var(--font-body)",
                fontSize: 12,
                fontWeight: 700,
                color: "var(--cta-ink)",
                background: grouped ? "var(--cta-purple)" : "var(--cta-white)",
                border: "2px solid var(--cta-ink)",
                borderRadius: 8,
                padding: "6px 12px",
                textDecoration: "none",
              }}
            >
              {grouped ? "Grouped by company ✓" : "Group by company"}
            </Link>
            <Link
              prefetch={false}
              href={href({ ignored: !params.ignored, pg: 1 })}
              scroll={false}
              title="Stories removed with the ✕ are hidden from the pool and newsletters; view them here to restore."
              style={{
                fontFamily: "var(--font-body)",
                fontSize: 12,
                fontWeight: 700,
                color: "var(--cta-ink)",
                background: params.ignored ? "var(--cta-pink)" : "var(--cta-white)",
                border: "2px solid var(--cta-ink)",
                borderRadius: 8,
                padding: "6px 12px",
                textDecoration: "none",
              }}
            >
              {params.ignored ? "Viewing ignored ✓" : "Show ignored"}
            </Link>
          </>
        }
      />
      {rows.length === 0 ? (
        <p style={{ ...muted, marginBottom: 0 }}>
          {params.pg > 1 ? (
            <>
              No more stories this far back.{" "}
              <Link prefetch={false} href={href({})} scroll={false} style={{ color: "var(--cta-ink)", fontWeight: 600 }}>
                Back to the first page
              </Link>
            </>
          ) : params.ignored ? (
            "No ignored stories. Stories you remove with the ✕ appear here so you can restore them."
          ) : (
            "No stories match this view. Try All ratings or a different search."
          )}
        </p>
      ) : grouped ? (
        <>
          {companyGroups.map((g) => (
            <details key={g.key} style={{ marginBottom: 12 }}>
              <summary
                style={{
                  cursor: "pointer",
                  fontWeight: 700,
                  padding: "8px 0",
                  fontSize: 14,
                }}
              >
                {g.name}{" "}
                <span style={{ color: "var(--text-muted)", fontWeight: 600 }}>
                  ({g.list.length})
                </span>
              </summary>
              <div className="table-scroll">
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>{headRow}</thead>
                  <tbody>{g.list.map(bodyRow)}</tbody>
                </table>
              </div>
            </details>
          ))}
          {hasMore && (
            <p style={{ ...muted, marginTop: 10 }}>
              Showing the first {STORY_POOL_GROUP_LIMIT} stories. Narrow with a
              filter to see the rest.
            </p>
          )}
        </>
      ) : (
        <>
          <div className="table-scroll">
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {drafts && <th style={th}></th>}
                  <th style={th}>{sortLink("date", "Added")}</th>
                  <th style={th}>Published</th>
                  <th style={th}>{sortLink("headline", "Story")}</th>
                  <th style={{ ...th, maxWidth: 200 }}>{sortLink("source", "Source")}</th>
                  <th style={th}>{sortLink("company", "Company")}</th>
                  <th style={th}>
                    Rating: {sortLink("relevance", "Show")}
                    {" / "}
                    {sortLink("social", "Social")}
                  </th>
                  <th style={th}>Newsletters</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id} style={dupRowStyle(p.id)}>
                    {drafts && (
                      <td style={td}>
                        <input
                          type="checkbox"
                          name="ids"
                          value={p.id}
                          form="pool-bulk"
                          style={{ width: 18, height: 18 }}
                        />
                      </td>
                    )}
                    <td style={{ ...td, whiteSpace: "nowrap" }}>
                      {auDate(p.reviewedAt ?? p.createdAt)}
                    </td>
                    <td style={{ ...td, whiteSpace: "nowrap" }}>
                      {auDate(p.publishedAt)}
                    </td>
                    <td style={{ ...td, minWidth: 220, maxWidth: 420 }}>
                      <strong style={{ fontSize: 13.5 }}>
                        {p.aiHeading.slice(0, 90)}
                        {p.aiHeading.length > 90 ? "…" : ""}
                      </strong>
                      {p.postUrl && (
                        <>
                          {" "}
                          <a
                            href={p.postUrl}
                            target="_blank"
                            style={{ color: "var(--cta-ink)", fontWeight: 600 }}
                          >
                            ↗
                          </a>
                        </>
                      )}
                      {usedDates.has(p.id) && (
                        <span
                          style={{
                            ...badge("var(--cta-mint)"),
                            marginLeft: 8,
                            fontSize: 10,
                          }}
                          title="This story has appeared in a sent Showcase"
                        >
                          Sent
                          {usedDates.get(p.id)
                            ? ` ${auDate(usedDates.get(p.id)!)}`
                            : ""}
                        </span>
                      )}
                      {p.aiSummary && (
                        <div
                          className="story-summary"
                          style={{
                            fontSize: 12.5,
                            color: "var(--text-body)",
                            marginTop: 4,
                            fontWeight: 400,
                          }}
                        >
                          {p.aiSummary}
                        </div>
                      )}
                      {dupNote(p)}
                    </td>
                    <td style={{ ...td, maxWidth: 200 }}>
                      {feedOriginBadge(p, feedNameById)}
                      {sourcePublication(p) && (
                        <div
                          title={sourcePublication(p)}
                          style={{
                            fontSize: 11.5,
                            color: "var(--text-muted)",
                            marginTop: 4,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {sourcePublication(p)}
                        </div>
                      )}
                    </td>
                    <td style={{ ...td, whiteSpace: "nowrap" }}>
                      {nameByKey.get(p.companyKey) ?? "Around the Alliance"}
                    </td>
                    <td style={{ ...td, whiteSpace: "nowrap" }}>
                      <RatingsForm
                        itemId={p.id}
                        show={p.presenterRelevance}
                        social={p.socialRelevance}
                      />
                    </td>
                    <td style={{ ...td, whiteSpace: "nowrap" }}>
                      {actionButtons(p)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div
            style={{
              display: "flex",
              gap: 12,
              alignItems: "center",
              flexWrap: "wrap",
              marginTop: 10,
              fontSize: 12.5,
              fontWeight: 600,
            }}
          >
            {params.pg > 1 && (
              <Link
                prefetch={false}
                href={href({ pg: params.pg - 1 })}
                scroll={false}
                style={{ ...smallButton, textDecoration: "none", background: "var(--cta-white)" }}
              >
                ← Previous
              </Link>
            )}
            {(hasMore || params.pg > 1) && (
              <span style={{ color: "var(--text-muted)" }}>
                Page {params.pg}
              </span>
            )}
            {hasMore && (
              <Link
                prefetch={false}
                href={href({ pg: params.pg + 1 })}
                scroll={false}
                style={{ ...smallButton, textDecoration: "none", background: "var(--cta-white)" }}
              >
                Next →
              </Link>
            )}
            <span style={{ color: "var(--text-muted)", marginLeft: "auto" }}>
              View{" "}
              {STORY_POOL_PAGE_SIZES.map((size, i) => (
                <span key={size}>
                  {i > 0 && " · "}
                  {params.ps === size ? (
                    <strong>{size}</strong>
                  ) : (
                    <Link
                      prefetch={false}
                      href={href({ ps: size })}
                      scroll={false}
                      style={{ color: "var(--cta-ink)" }}
                    >
                      {size}
                    </Link>
                  )}
                </span>
              ))}
            </span>
          </div>
        </>
      )}
    </>
  );
}

/** The builder for one edition: header, stories, add panel, spotlight shows. */
async function EditionBuilder({
  edition,
  sp,
}: {
  edition: ShowcaseEdition;
  sp: ShowcaseParams;
}) {
  const editable = edition.status === "draft" || edition.status === "failed";
  // One parallel round-trip for everything the builder needs.
  const [
    entries,
    editionShows,
    companyRows,
    recipients,
    subscriberCount,
    registry,
    feedRows,
  ] =
    await Promise.all([
      getEditionItems(edition.id),
      getEditionShows(edition.id),
      db().select().from(companies).orderBy(asc(companies.name)),
      getPresenterRecipients(),
      getShowcaseSubscriberCount(),
      editable
        ? db()
            .select()
            .from(shows)
            .where(eq(shows.status, "active"))
            .orderBy(asc(shows.title))
        : Promise.resolve([]),
      loadFeeds(),
    ]);
  const nameByKey = new Map(companyRows.map((c) => [c.key, c.name]));
  const feedNameById = new Map(feedRows.map((f) => [f.id, f.name]));
  const companyName = (key: string) =>
    nameByKey.get(key) ?? "Around the Alliance";
  const showsPageByKey = new Map(
    companyRows.map((c) => [c.key, c.showsPageUrl ?? c.showsPageUrl2]),
  );
  const newsEntries = entries.filter((e) => !e.social);
  const socialEntries = entries.filter((e) => e.social);
  const profileCount = entries.filter((e) => e.featured && !e.social).length;
  const socialCount = entries.filter((e) => e.social).length;
  const inEditionShowIds = new Set(editionShows.map((s) => s.id));
  const addableShows = registry.filter((s) => !inEditionShowIds.has(s.id));

  return (
    <>
      {/* Show title fields suggest from the registry while still allowing
          new titles; a researched or added show lands on the Shows tab. */}
      {editable && (
        <datalist id="show-titles">
          {registry.map((s) => (
            <option key={s.id} value={s.title} />
          ))}
        </datalist>
      )}
      <section className="admin-card">
        <div
          style={{
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            alignItems: "center",
            marginBottom: 10,
          }}
        >
          <h2 style={{ ...h2, margin: 0 }}>
            {edition.status === "sent" ? "Showcase (sent)" : "Showcase builder"}
            <HelpTip
              title={
                edition.status === "sent" ? "Showcase (sent)" : "Showcase builder"
              }
            >
              {edition.status === "sent"
                ? "Sent editions are read-only; duplicate to reuse one."
                : "New Showcases start pre-filled with every unused story rated high on either scale, plus the active Spotlight shows. The numbered sections walk through the edition top to bottom."}
            </HelpTip>
          </h2>
          <StatusBadge status={edition.status} />
        </div>
        <p style={muted}>
          {edition.status === "sent"
            ? `Sent ${(edition.sentAt ? auDate(edition.sentAt) : "")} to ${edition.recipients ?? `${edition.recipientCount} subscriber${edition.recipientCount === 1 ? "" : "s"}`}.`
            : `Started ${auDate(edition.createdAt)}.`}
        </p>
        {editable && (
          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              alignItems: "center",
              marginBottom: 14,
            }}
          >
            <span style={badge("var(--cta-white)")}>
              {newsEntries.length} news stor{newsEntries.length === 1 ? "y" : "ies"}
            </span>
            <span style={badge("var(--cta-yellow)")}>
              {profileCount}/2 profiles
            </span>
            <span style={badge("var(--cta-mint)")}>
              {socialCount} Social Theatre
            </span>
            <span
              style={badge(
                editionShows.length % 2 === 0
                  ? "var(--cta-emerald)"
                  : "var(--cta-yellow)",
              )}
            >
              {editionShows.length} spotlight show
              {editionShows.length === 1 ? "" : "s"}
              {editionShows.length % 2 === 0 ? " ✓" : ", needs an even number"}
            </span>
            <span style={badge("var(--cta-teal)")}>
              {subscriberCount} will receive it
            </span>
          </div>
        )}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <Link
            prefetch={false}
            href="/admin?tab=presenters"
            style={{ ...buttonStyle, textDecoration: "none", background: "var(--cta-white)" }}
          >
            ← Back to all editions
          </Link>
          <a
            href={`/admin/preview/presenter?edition=${edition.id}`}
            target="_blank"
            style={{ ...buttonStyle, textDecoration: "none", background: "var(--cta-white)" }}
          >
            Preview ↗
          </a>
          {editable && (
            <>
              <TestSendButton
                action="/api/admin/presenter-send"
                hidden={{ edition: String(edition.id), mode: "test" }}
                defaultTo={recipients.join(", ")}
                intro="This Showcase draft goes to these addresses only. The draft stays a draft."
                style={{ ...buttonStyle, background: "var(--cta-yellow)" }}
              />
              <form action="/api/admin/presenter-send" method="post">
                <input type="hidden" name="edition" value={edition.id} />
                <input type="hidden" name="mode" value="live" />
                <ConfirmSubmit
                  title="Sending for real"
                  message={`Send this Showcase to all ${subscriberCount} subscriber${subscriberCount === 1 ? "" : "s"} who receive The Showcase Edition? This can't be undone.`}
                  confirmLabel="Yes, send it live"
                  danger
                  style={{ ...buttonStyle, background: "var(--cta-yellow)" }}
                >
                  Send live
                </ConfirmSubmit>
              </form>
            </>
          )}
          <form action="/api/admin/showcase-edition" method="post">
            <input type="hidden" name="action" value="duplicate" />
            <input type="hidden" name="id" value={edition.id} />
            <button type="submit" style={{ ...buttonStyle, background: "var(--cta-white)" }}>
              Duplicate
            </button>
          </form>
          <form action="/api/admin/showcase-edition" method="post">
            <input type="hidden" name="action" value="delete" />
            <input type="hidden" name="id" value={edition.id} />
            <ConfirmSubmit
              message={
                edition.status === "sent"
                  ? "Delete this sent Showcase from the history? Its stories become available to future editions again."
                  : "Delete this Showcase draft?"
              }
              danger
              style={{ ...buttonStyle, background: "var(--cta-pink)" }}
            >
              Delete
            </ConfirmSubmit>
          </form>
        </div>
        {editable && (
          <p style={{ ...muted, margin: "12px 0 0" }}>
            Send live goes to every subscriber opted in to The Showcase
            Edition.
          </p>
        )}
      </section>

      {edition.status === "sent" && (
        <EditionRecipientsCard editionId={edition.id} sp={sp} />
      )}

      {editable && (
        <p style={{ margin: "0 0 4px" }}>
          <Link
            prefetch={false}
            href="/admin?tab=review#story-pool"
            style={{
              ...buttonStyle,
              display: "inline-block",
              textDecoration: "none",
              background: "var(--cta-white)",
            }}
          >
            Add stories from the Stories tab →
          </Link>
        </p>
      )}

      <section className="admin-card" id="news-stories">
        <h2 style={h2}>
          {editable ? "1 · " : ""}Show stories
          {editable && (
            <HelpTip title="Show stories">
              Listed in the order they will appear in the email: use the ▲ ▼
              arrows to reorder, and tap a card to open it for editing. Pick
              up to two stories as <strong>profiles</strong> (the big cards
              at the top).
            </HelpTip>
          )}
        </h2>
        {!editable && <p style={muted}>As sent, in order.</p>}
        {newsEntries.length === 0 && (
          <p style={{ ...muted, marginBottom: 0 }}>
            No news stories yet. Add some from the Stories tab.
          </p>
        )}
        {!editable &&
          entries.map(({ item: it, featured, social: isSocial }, i) => (
            <div key={it.id} style={{ fontSize: 13.5, padding: "6px 0" }}>
              <span style={{ color: "var(--text-muted)", fontWeight: 600 }}>
                {i + 1}.
              </span>{" "}
              <strong>{it.showTitle ?? it.aiHeading}</strong>
              {" · "}
              {companyName(it.companyKey)}
              {featured && !isSocial && (
                <span style={{ ...badge("var(--cta-yellow)"), marginLeft: 8 }}>
                  Profile
                </span>
              )}
              {isSocial && (
                <span style={{ ...badge("var(--cta-mint)"), marginLeft: 8 }}>
                  Social Theatre
                </span>
              )}
            </div>
          ))}
        {editable &&
          newsEntries.map((e, i) => (
            <BuilderStoryCard
              key={e.item.id}
              it={e.item}
              featured={e.featured}
              isSocial={false}
              index={i}
              editionId={edition.id}
              company={companyName(e.item.companyKey)}
              showsPageUrl={showsPageByKey.get(e.item.companyKey) ?? null}
              origin={feedOriginBadge(e.item, feedNameById, true)}
            />
          ))}
        {editable && (
          <ManualStoryForm
            editionId={edition.id}
            social={false}
            companyRows={companyRows}
            anchor="news-stories"
          />
        )}
      </section>

      {editable && (
        <section className="admin-card" id="social-stories">
          <h2 style={h2}>
            2 · Social stories
            <HelpTip title="Social stories">
              Stories told through the social lens. They appear in the mint
              Social Theatre band of the email, without a show card, in the
              order below. Use Move to Social Theatre on a news story to
              bring it here.
            </HelpTip>
          </h2>
          {socialEntries.length === 0 && (
            <p style={{ ...muted, marginBottom: 0 }}>
              No Social Theatre stories in this Showcase yet. The section
              stays out of the email until you tag one.
            </p>
          )}
          {socialEntries.map((e, i) => (
            <BuilderStoryCard
              key={e.item.id}
              it={e.item}
              featured={e.featured}
              isSocial={true}
              index={i}
              editionId={edition.id}
              company={companyName(e.item.companyKey)}
              showsPageUrl={showsPageByKey.get(e.item.companyKey) ?? null}
              origin={feedOriginBadge(e.item, feedNameById, true)}
            />
          ))}
          <ManualStoryForm
            editionId={edition.id}
            social={true}
            companyRows={companyRows}
            anchor="social-stories"
          />
        </section>
      )}

      <section className="admin-card" id="edition-shows">
        <h2 style={h2}>
          {editable ? "3 · " : ""}Spotlight shows in this Showcase
          <HelpTip title="Spotlight shows">
            The show grid at the bottom of this edition, two cards per row,
            in the order shown.
            {editable &&
              " Use the ▲ ▼ arrows to reorder and Remove to take a show out of this edition."}
          </HelpTip>
        </h2>
        {editable && (
          <p style={{ marginTop: 0, marginBottom: 14 }}>
            <Link
              prefetch={false}
              href="/admin?tab=shows"
              style={{
                ...smallButton,
                display: "inline-block",
                textDecoration: "none",
                background: "var(--cta-white)",
              }}
            >
              Edit show details on the Shows tab →
            </Link>
          </p>
        )}
        {editable && editionShows.length % 2 === 1 && (
          <p
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: "var(--cta-ink)",
              background: "var(--cta-yellow)",
              border: "2px solid var(--cta-ink)",
              borderRadius: 10,
              padding: "10px 14px",
            }}
          >
            {editionShows.length} spotlight show
            {editionShows.length === 1 ? "" : "s"}: the grid needs an even
            number. Add or remove one, or sending will be blocked.
          </p>
        )}
        {editionShows.length === 0 && (
          <p style={{ ...muted, marginBottom: 0 }}>
            No shows in this edition{editable ? " yet" : ""}.
          </p>
        )}
        {editionShows.map((s) => (
          <div
            key={s.id}
            style={{
              display: "flex",
              gap: 10,
              alignItems: "center",
              padding: "7px 0",
              borderBottom: "1px solid rgba(30,30,29,0.15)",
              fontSize: 13.5,
            }}
          >
            <span style={{ flex: 1 }}>
              <strong>{s.title}</strong>
              {" · "}
              {companyName(s.companyKey)}
              {s.ageRange ? ` · ${s.ageRange}` : ""}
            </span>
            {editable && (
              <>
                <MoveButtons editionId={edition.id} itemId={s.id} kind="show" />
                <form action="/api/admin/showcase-edition" method="post">
                  <input type="hidden" name="anchor" value="edition-shows" />
                  <input type="hidden" name="action" value="remove-show" />
                  <input type="hidden" name="id" value={edition.id} />
                  <input type="hidden" name="showId" value={s.id} />
                  <button type="submit" style={dangerButton}>
                    Remove
                  </button>
                </form>
              </>
            )}
          </div>
        ))}
        {editable && addableShows.length > 0 && (
          <form
            action="/api/admin/showcase-edition"
            method="post"
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              alignItems: "center",
              marginTop: 14,
            }}
          >
            <input type="hidden" name="anchor" value="edition-shows" />
            <input type="hidden" name="action" value="add-show" />
            <input type="hidden" name="id" value={edition.id} />
            <select name="showId" style={smallInput}>
              {addableShows.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title} ({companyName(s.companyKey)})
                </option>
              ))}
            </select>
            <button type="submit" style={smallButton}>
              Add to this Showcase
            </button>
          </form>
        )}
      </section>
    </>
  );
}

/** One editable story card in the builder (news or Social Theatre). */
function BuilderStoryCard({
  it,
  featured,
  isSocial,
  index,
  editionId,
  company,
  showsPageUrl,
  origin,
}: {
  it: FeedItem;
  featured: boolean;
  isSocial: boolean;
  index: number;
  editionId: number;
  company: string;
  showsPageUrl: string | null;
  /** Feed origin badge (see feedOriginBadge), so the source stays visible. */
  origin?: React.ReactNode;
}) {
  return (
            <div
              key={it.id}
              id={`story-${it.id}`}
              style={{
                display: "flex",
                gap: 8,
                alignItems: "flex-start",
                marginBottom: 12,
              }}
            >
              <details
                style={{
                  flex: 1,
                  minWidth: 0,
                  border: "2px solid var(--cta-ink)",
                  borderRadius: 14,
                  padding: "12px 16px",
                  background: "var(--cta-cream-warm)",
                }}
              >
                <summary style={{ cursor: "pointer", fontSize: 13 }}>
                  <span style={{ color: "var(--text-muted)", fontWeight: 600 }}>
                    {index + 1}.{" "}
                  </span>
                  <strong>
                    {(it.showTitle ?? it.aiHeading).slice(0, 70)}
                    {(it.showTitle ?? it.aiHeading).length > 70 ? "…" : ""}
                  </strong>
                  {" · "}
                  {company}
                  {" · "}
                  {auDate(it.publishedAt)}
                  {featured && !isSocial && (
                    <span style={{ ...badge("var(--cta-yellow)"), marginLeft: 8 }}>
                      Profile
                    </span>
                  )}
                  {isSocial && (
                    <span style={{ ...badge("var(--cta-mint)"), marginLeft: 8 }}>
                      Social Theatre
                    </span>
                  )}
                  {origin}
                  {!it.showTitle && !isSocial && (
                    <span style={{ ...badge("var(--cta-yellow)"), marginLeft: 8 }}>
                      Needs show title
                    </span>
                  )}
                  {hasRelativeTime(`${it.aiHeading} ${it.aiSummary}`) && (
                    <span style={{ ...badge("var(--cta-pink)"), marginLeft: 8 }}>
                      Time words
                    </span>
                  )}
                </summary>
                <div style={{ fontSize: 12, color: "var(--text-muted)", margin: "10px 0 8px" }}>
                  {it.presenterReason ?? "Added by hand"}
                  {" · "}
                  {it.presenterResearchedAt
                    ? `researched ${auDate(it.presenterResearchedAt)}`
                    : "not researched yet"}
                  {it.postUrl && (
                    <>
                      {" · "}
                      <a
                        href={it.postUrl}
                        target="_blank"
                        style={{ color: "var(--cta-ink)", fontWeight: 600 }}
                      >
                        original post ↗
                      </a>
                    </>
                  )}
                  {it.source === "manual" && " · written by hand"}
                </div>

                <form action="/api/admin/presenter-item" method="post" id={`sc-${it.id}`}>
                  <input type="hidden" name="action" value="update" />
                  <input type="hidden" name="id" value={it.id} />
                  <input type="hidden" name="edition" value={editionId} />
                  <input type="hidden" name="anchor" value={`story-${it.id}`} />
                </form>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                    columnGap: 14,
                  }}
                >
                  <div>
                    <label style={fieldLabel}>Heading</label>
                    <input
                      form={`sc-${it.id}`}
                      name="aiHeading"
                      defaultValue={it.aiHeading}
                      required
                      style={{ ...smallInput, width: "100%" }}
                    />
                    <label style={fieldLabel}>Summary</label>
                    <textarea
                      form={`sc-${it.id}`}
                      name="aiSummary"
                      defaultValue={it.aiSummary}
                      required
                      rows={2}
                      style={{ ...smallInput, width: "100%", resize: "vertical" }}
                    />
                    {!isSocial && (
                      <>
                        <label
                          style={
                            it.showTitle
                              ? fieldLabel
                              : {
                                  ...fieldLabel,
                                  color: "var(--cta-ink)",
                                  fontWeight: 700,
                                }
                          }
                        >
                          Show title{!it.showTitle && " (needed for research)"}
                        </label>
                        <input
                          form={`sc-${it.id}`}
                          name="showTitle"
                          list="show-titles"
                          defaultValue={it.showTitle ?? ""}
                          placeholder="e.g. The Peasant Prince"
                          style={
                            it.showTitle
                              ? { ...smallInput, width: "100%" }
                              : {
                                  ...smallInput,
                                  width: "100%",
                                  background: "var(--cta-cream-deep)",
                                  boxShadow: "3px 3px 0 var(--cta-yellow)",
                                }
                          }
                        />
                        {!it.showTitle && (
                          <div
                            style={{
                              fontSize: 12,
                              fontWeight: 600,
                              color: "var(--cta-ink)",
                              margin: "6px 0 2px",
                              lineHeight: 1.4,
                            }}
                          >
                            Type the show&#39;s name here, then press Save +
                            research to fetch the official page, blurb and
                            image.
                          </div>
                        )}
                        <label style={fieldLabel}>Age range</label>
                        <input
                          form={`sc-${it.id}`}
                          name="showAgeRange"
                          defaultValue={it.showAgeRange ?? ""}
                          placeholder="e.g. ages 6 to 12"
                          style={{ ...smallInput, width: "100%" }}
                        />
                      </>
                    )}
                  </div>
                  <div>
                    {!isSocial && (
                      <>
                        <label style={fieldLabel}>Official show page URL</label>
                        <input
                          form={`sc-${it.id}`}
                          name="showUrl"
                          type="url"
                          defaultValue={it.showUrl ?? ""}
                          placeholder="https://company.com.au/shows/…"
                          style={{ ...smallInput, width: "100%" }}
                        />
                        <label style={fieldLabel}>Official blurb</label>
                        <textarea
                          form={`sc-${it.id}`}
                          name="showBlurb"
                          defaultValue={it.showBlurb ?? ""}
                          rows={3}
                          placeholder="Official copy from the show page (falls back to the summary)"
                          style={{ ...smallInput, width: "100%", resize: "vertical" }}
                        />
                      </>
                    )}
                    <label style={fieldLabel}>Image URL</label>
                    <input
                      form={`sc-${it.id}`}
                      name="showImageUrl"
                      defaultValue={it.showImageUrl ?? ""}
                      placeholder="Leave empty to use the post image"
                      style={{ ...smallInput, width: "100%" }}
                    />
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    flexWrap: "wrap",
                    alignItems: "center",
                    marginTop: 12,
                  }}
                >
                  <button form={`sc-${it.id}`} type="submit" style={smallButton}>
                    Save
                  </button>
                  {!isSocial && (
                    <button
                      form={`sc-${it.id}`}
                      type="submit"
                      formAction="/api/admin/presenter-research"
                      style={{ ...smallButton, background: "var(--cta-white)" }}
                    >
                      {it.presenterResearchedAt ? "Save + re-research" : "Save + research"}
                    </button>
                  )}
                  {!isSocial && (
                    <QuickAction
                      fields={{
                        action: featured ? "unfeature" : "feature",
                        id: it.id,
                        edition: editionId,
                      }}
                      style={smallButton}
                    >
                      {featured ? "Remove profile" : "Make profile"}
                    </QuickAction>
                  )}
                  <QuickAction
                    fields={{
                      action: isSocial ? "unsocial" : "social",
                      id: it.id,
                      edition: editionId,
                    }}
                    style={{ ...smallButton, background: "var(--cta-mint)" }}
                  >
                    {isSocial ? "Remove from Social Theatre" : "Move to Social Theatre"}
                  </QuickAction>
                  {hasRelativeTime(`${it.aiHeading} ${it.aiSummary}`) && (
                    <QuickAction
                      fields={{ action: "rewrite-time", id: it.id, edition: editionId }}
                      style={{ ...smallButton, background: "var(--cta-pink)" }}
                    >
                      Fix time words
                    </QuickAction>
                  )}
                  {!isSocial && (
                    <form action="/api/admin/presenter-item" method="post" style={{ display: "inline" }}>
                      <input type="hidden" name="action" value="add-show" />
                      <input type="hidden" name="id" value={it.id} />
                      <input type="hidden" name="edition" value={editionId} />
                      <input type="hidden" name="anchor" value={`story-${it.id}`} />
                      <button
                        type="submit"
                        style={{ ...smallButton, background: "var(--cta-white)" }}
                      >
                        Add to Spotlight shows
                      </button>
                    </form>
                  )}
                  <QuickAction
                    fields={{ action: "remove", id: it.id, edition: editionId }}
                    confirm="Remove this story from this Showcase? It stays in the story pool."
                    style={dangerButton}
                  >
                    Remove
                  </QuickAction>
                </div>
                {!isSocial && !showsPageUrl && (
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 8 }}>
                    To find this show by title, add {company}&#39;s shows page
                    URL on the Settings tab. Or paste the show&#39;s own page
                    URL above and research pulls the details straight from it.
                  </div>
                )}
              </details>
              <MoveButtons editionId={editionId} itemId={it.id} />
            </div>
  );
}

// ------------------------------------------------------- delivery history

const KIND_LABEL: Record<Delivery["kind"], string> = {
  issue: "Newsletter",
  showcase: "The Showcase Edition",
};

const NO_HISTORY_NOTE =
  "Nothing recorded yet. Deliveries are tracked from July 2026 onward, so older sends are not listed.";

/** One subscriber: who they are and every email they have received. */
async function SubscriberDetailView({
  subscriberId,
  sp,
}: {
  subscriberId: number;
  sp: Record<string, string | undefined>;
}) {
  const [[sub], rows] = await Promise.all([
    db()
      .select()
      .from(subscribers)
      .where(eq(subscribers.id, subscriberId))
      .limit(1),
    db()
      .select()
      .from(deliveries)
      .where(eq(deliveries.subscriberId, subscriberId))
      .orderBy(desc(deliveries.sentAt))
      .limit(500),
  ]);

  const backLink = (
    <p style={{ margin: "0 0 14px" }}>
      <Link
        prefetch={false}
        href="/admin?tab=subscribers"
        style={{
          ...smallButton,
          display: "inline-block",
          textDecoration: "none",
          background: "var(--cta-white)",
        }}
      >
        ← Back to all subscribers
      </Link>
    </p>
  );

  if (!sub) {
    return (
      <section className="admin-card">
        <h2 style={h2}>Subscriber not found</h2>
        <p style={muted}>This subscriber no longer exists; they may have been deleted.</p>
        {backLink}
      </section>
    );
  }

  // Filter + sort in memory: capped at the latest 500 deliveries.
  const kind = sp.dkind === "issue" || sp.dkind === "showcase" ? sp.dkind : "all";
  const q = (sp.dq ?? "").trim().toLowerCase();
  const dsort = ["date", "newsletter", "subject"].includes(sp.dsort ?? "")
    ? (sp.dsort as "date" | "newsletter" | "subject")
    : "date";
  const ddir = sp.ddir === "asc" ? "asc" : "desc";
  const filtered = rows
    .filter((d) => (kind === "all" ? true : d.kind === kind))
    .filter((d) => (q ? d.subject.toLowerCase().includes(q) : true))
    .sort((a, b) => {
      const cmp =
        dsort === "newsletter"
          ? KIND_LABEL[a.kind].localeCompare(KIND_LABEL[b.kind])
          : dsort === "subject"
            ? a.subject.localeCompare(b.subject)
            : a.sentAt.getTime() - b.sentAt.getTime();
      return ddir === "asc" ? cmp : -cmp;
    });

  const sortLink = (key: string, label: string) => {
    const firstDir = key === "date" ? "desc" : "asc";
    const nextDir =
      dsort === key ? (ddir === "asc" ? "desc" : "asc") : firstDir;
    const params = new URLSearchParams({
      tab: "subscribers",
      subscriber: String(subscriberId),
      dsort: key,
      ddir: nextDir,
    });
    if (kind !== "all") params.set("dkind", kind);
    if (q) params.set("dq", sp.dq ?? "");
    return (
      <Link
        prefetch={false}
        scroll={false}
        href={`/admin?${params.toString()}`}
        style={{ color: "inherit", textDecoration: "none" }}
      >
        {label}
        {dsort === key ? (ddir === "asc" ? " ↑" : " ↓") : ""}
      </Link>
    );
  };

  const receives =
    sub.cadence === "none"
      ? "The Showcase Edition only"
      : sub.showcase
        ? `${sub.cadence} newsletter plus The Showcase Edition`
        : `${sub.cadence} newsletter`;

  return (
    <>
      <section className="admin-card">
        {backLink}
        <div
          style={{
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            alignItems: "center",
            marginBottom: 10,
          }}
        >
          <h2 style={{ ...h2, margin: 0 }}>
            {sub.firstName} {sub.lastName}
          </h2>
          <span
            style={badge(
              sub.status === "active" ? "var(--cta-emerald)" : "var(--cta-pink)",
            )}
          >
            {sub.status}
          </span>
        </div>
        <p style={muted}>
          {sub.email} · receives the {receives} · joined{" "}
          {auDate(sub.createdAt)}
        </p>
      </section>

      <section className="admin-card">
        <h2 style={h2}>What they have received</h2>
        <form
          method="get"
          action="/admin"
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            alignItems: "center",
            marginBottom: 14,
          }}
        >
          <input type="hidden" name="tab" value="subscribers" />
          <input type="hidden" name="subscriber" value={subscriberId} />
          <select name="dkind" defaultValue={kind} style={smallInput}>
            <option value="all">All emails</option>
            <option value="issue">Newsletter only</option>
            <option value="showcase">The Showcase Edition only</option>
          </select>
          <input
            type="text"
            name="dq"
            defaultValue={sp.dq ?? ""}
            placeholder="Search subjects"
            style={{ ...smallInput, minWidth: 180 }}
          />
          <button type="submit" style={smallButton}>
            Filter
          </button>
          {(kind !== "all" || q) && (
            <Link
              prefetch={false}
              href={`/admin?tab=subscribers&subscriber=${subscriberId}`}
              scroll={false}
              style={{ fontSize: 12.5, fontWeight: 600, color: "var(--cta-ink)" }}
            >
              Clear
            </Link>
          )}
        </form>
        <div className="table-scroll" style={{ maxHeight: 480, overflowY: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th}>{sortLink("date", "Sent")}</th>
                <th style={th}>{sortLink("newsletter", "Type")}</th>
                <th style={th}>{sortLink("subject", "Subject")}</th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d) => (
                <tr key={d.id}>
                  <td style={{ ...td, whiteSpace: "nowrap" }}>
                    {auDate(d.sentAt)}
                  </td>
                  <td style={td}>
                    <span
                      style={badge(
                        d.kind === "showcase" ? "var(--cta-teal)" : "var(--cta-yellow)",
                      )}
                    >
                      {KIND_LABEL[d.kind]}
                    </span>
                  </td>
                  <td style={td}>{d.subject}</td>
                  <td style={{ ...td, whiteSpace: "nowrap" }}>
                    {d.kind === "issue" && d.issueId && (
                      <Link
                        prefetch={false}
                        href={`/admin?tab=editions&issue=${d.issueId}&back=subscriber-${subscriberId}`}
                        style={{ color: "var(--cta-ink)", fontWeight: 600 }}
                      >
                        All recipients
                      </Link>
                    )}
                    {d.kind === "showcase" && d.editionId && (
                      <Link
                        prefetch={false}
                        href={`/admin?tab=presenters&edition=${d.editionId}`}
                        style={{ color: "var(--cta-ink)", fontWeight: 600 }}
                      >
                        Open edition
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td style={td} colSpan={4}>
                    {rows.length === 0
                      ? NO_HISTORY_NOTE
                      : "No deliveries match the filter."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

/**
 * Recipient table shared by the per-issue and per-edition views:
 * sortable by name, email and date, with a search box.
 */
function RecipientTable({
  rows,
  sp,
  baseParams,
}: {
  rows: { delivery: Delivery; subscriber: Subscriber | null }[];
  sp: Record<string, string | undefined>;
  baseParams: Record<string, string>;
}) {
  const q = (sp.rq ?? "").trim().toLowerCase();
  const rsort = ["name", "email", "date"].includes(sp.rsort ?? "")
    ? (sp.rsort as "name" | "email" | "date")
    : "name";
  const rdir = sp.rdir === "desc" ? "desc" : "asc";
  const nameOf = (s: Subscriber | null) =>
    s ? `${s.firstName} ${s.lastName}` : "(deleted subscriber)";
  const filtered = rows
    .filter(({ subscriber: s }) =>
      q
        ? nameOf(s).toLowerCase().includes(q) ||
          (s?.email ?? "").toLowerCase().includes(q)
        : true,
    )
    .sort((a, b) => {
      const cmp =
        rsort === "email"
          ? (a.subscriber?.email ?? "").localeCompare(b.subscriber?.email ?? "")
          : rsort === "date"
            ? a.delivery.sentAt.getTime() - b.delivery.sentAt.getTime()
            : nameOf(a.subscriber).localeCompare(nameOf(b.subscriber));
      return rdir === "asc" ? cmp : -cmp;
    });

  const sortLink = (key: string, label: string) => {
    const firstDir = key === "date" ? "desc" : "asc";
    const nextDir =
      rsort === key ? (rdir === "asc" ? "desc" : "asc") : firstDir;
    const params = new URLSearchParams({ ...baseParams, rsort: key, rdir: nextDir });
    if (q) params.set("rq", sp.rq ?? "");
    return (
      <Link
        prefetch={false}
        scroll={false}
        href={`/admin?${params.toString()}`}
        style={{ color: "inherit", textDecoration: "none" }}
      >
        {label}
        {rsort === key ? (rdir === "asc" ? " ↑" : " ↓") : ""}
      </Link>
    );
  };

  return (
    <>
      <form
        method="get"
        action="/admin"
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          alignItems: "center",
          marginBottom: 14,
        }}
      >
        {Object.entries(baseParams).map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={v} />
        ))}
        <input
          type="text"
          name="rq"
          defaultValue={sp.rq ?? ""}
          placeholder="Search name or email"
          style={{ ...smallInput, minWidth: 200 }}
        />
        <button type="submit" style={smallButton}>
          Filter
        </button>
        {q && (
          <Link
            prefetch={false}
            href={`/admin?${new URLSearchParams(baseParams).toString()}`}
            scroll={false}
            style={{ fontSize: 12.5, fontWeight: 600, color: "var(--cta-ink)" }}
          >
            Clear
          </Link>
        )}
      </form>
      <div className="table-scroll" style={{ maxHeight: 480, overflowY: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={th}>{sortLink("name", "Name")}</th>
              <th style={th}>{sortLink("email", "Email")}</th>
              <th style={th}>{sortLink("date", "Sent")}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(({ delivery: d, subscriber: s }) => (
              <tr key={d.id}>
                <td style={td}>
                  {s ? (
                    <Link
                      prefetch={false}
                      href={`/admin?tab=subscribers&subscriber=${s.id}`}
                      style={{ color: "var(--cta-ink)", fontWeight: 600 }}
                    >
                      {nameOf(s)}
                    </Link>
                  ) : (
                    nameOf(s)
                  )}
                </td>
                <td style={td}>{s?.email ?? ""}</td>
                <td style={{ ...td, whiteSpace: "nowrap" }}>
                  {formatSydneyStamp(d.sentAt)}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td style={td} colSpan={3}>
                  {rows.length === 0
                    ? NO_HISTORY_NOTE
                    : "No recipients match the filter."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

/** One sent newsletter issue: its details and everyone who received it. */
async function IssueRecipientsView({
  issueId,
  sp,
}: {
  issueId: number;
  sp: Record<string, string | undefined>;
}) {
  const [[issue], rows] = await Promise.all([
    db().select().from(issues).where(eq(issues.id, issueId)).limit(1),
    db()
      .select({ delivery: deliveries, subscriber: subscribers })
      .from(deliveries)
      .leftJoin(subscribers, eq(subscribers.id, deliveries.subscriberId))
      .where(eq(deliveries.issueId, issueId))
      .limit(2000),
  ]);

  // Came from a subscriber's history page? Go back there, not to Overview.
  const backSub = /^subscriber-(\d+)$/.exec(sp.back ?? "");
  const backLink = (
    <p style={{ margin: "0 0 14px" }}>
      <Link
        prefetch={false}
        href={
          backSub
            ? `/admin?tab=subscribers&subscriber=${backSub[1]}`
            : "/admin?tab=overview"
        }
        style={{
          ...smallButton,
          display: "inline-block",
          textDecoration: "none",
          background: "var(--cta-white)",
        }}
      >
        {backSub ? "← Back to the subscriber" : "← Back to Overview"}
      </Link>
    </p>
  );

  if (!issue) {
    return (
      <section className="admin-card">
        <h2 style={h2}>Newsletter not found</h2>
        <p style={muted}>This newsletter no longer exists.</p>
        {backLink}
      </section>
    );
  }

  return (
    <>
      <section className="admin-card">
        {backLink}
        <h2 style={h2}>
          {issue.cadence[0].toUpperCase() + issue.cadence.slice(1)} newsletter
          {" · "}
          {issue.windowKey}
        </h2>
        <p style={muted}>
          <span
            style={badge(
              issue.status === "sent"
                ? "var(--cta-emerald)"
                : issue.status === "failed"
                  ? "var(--cta-pink)"
                  : "var(--cta-white)",
            )}
          >
            {issue.status}
          </span>
          {issue.sentAt ? ` · sent ${auDate(issue.sentAt)}` : ""} ·{" "}
          {issue.itemCount} stor{issue.itemCount === 1 ? "y" : "ies"} ·{" "}
          {issue.recipientCount} recipient{issue.recipientCount === 1 ? "" : "s"}
        </p>
      </section>
      <section className="admin-card">
        <h2 style={h2}>
          Who received it
          <HelpTip title="Who received it">
            Everyone this newsletter was delivered to. Click a name for
            everything that person has received.
          </HelpTip>
        </h2>
        <RecipientTable
          rows={rows}
          sp={sp}
          baseParams={{ tab: "editions", issue: String(issueId) }}
        />
      </section>
    </>
  );
}

/** Who received a sent Showcase edition (live sends only). */
async function EditionRecipientsCard({
  editionId,
  sp,
}: {
  editionId: number;
  sp: Record<string, string | undefined>;
}) {
  const rows = await db()
    .select({ delivery: deliveries, subscriber: subscribers })
    .from(deliveries)
    .leftJoin(subscribers, eq(subscribers.id, deliveries.subscriberId))
    .where(eq(deliveries.editionId, editionId))
    .limit(2000);
  return (
    <section className="admin-card">
      <h2 style={h2}>
        Who received it
        <HelpTip title="Who received it">
          Everyone this Showcase went to when it was sent live. Test sends
          are not listed here.
        </HelpTip>
      </h2>
      <RecipientTable
        rows={rows}
        sp={sp}
        baseParams={{
          tab: "presenters",
          edition: String(editionId),
        }}
      />
    </section>
  );
}

/**
 * "Write a story by hand": creates a manual story (outside the RSS
 * pathway) directly in this edition's news or Social Theatre section.
 * Collapsed by default so the card stays tidy.
 */
function ManualStoryForm({
  editionId,
  social,
  companyRows,
  anchor,
}: {
  editionId: number;
  social: boolean;
  companyRows: { key: string; name: string }[];
  anchor: string;
}) {
  const field: React.CSSProperties = { ...inputStyle, width: "100%" };
  return (
    <details
      style={{
        marginTop: 16,
        border: "2px solid var(--cta-ink)",
        borderRadius: 12,
        background: "var(--cta-cream-deep)",
        padding: "10px 14px",
      }}
    >
      <summary
        style={{
          cursor: "pointer",
          fontWeight: 700,
          fontSize: 13.5,
          color: "var(--cta-ink)",
        }}
      >
        + Write a story by hand
      </summary>
      <p style={{ ...muted, marginTop: 10 }}>
        For news that never came through the feed. It lands straight in{" "}
        {social ? "Social Theatre" : "the news stories"} of this Showcase and
        stays fully editable afterwards. Manual stories never appear in the
        daily, weekly or fortnightly newsletters.
      </p>
      <form
        action="/api/admin/manual-story"
        method="post"
        style={{ display: "grid", gap: 10 }}
      >
        <input type="hidden" name="edition" value={editionId} />
        <input type="hidden" name="social" value={social ? "1" : "0"} />
        <input type="hidden" name="anchor" value={anchor} />
        <div>
          <label style={fieldLabel}>Company</label>
          <select name="companyKey" required style={field}>
            <option value="">Pick a company…</option>
            {companyRows.map((c) => (
              <option key={c.key} value={c.key}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={fieldLabel}>Heading</label>
          <input type="text" name="heading" required style={field} />
        </div>
        <div>
          <label style={fieldLabel}>Summary</label>
          <textarea name="summary" required rows={3} style={{ ...field, resize: "vertical" }} />
        </div>
        <div>
          <label style={fieldLabel}>Story link (optional)</label>
          <input
            type="url"
            name="postUrl"
            placeholder="https://… (leave empty for no Read More link)"
            style={field}
          />
        </div>
        {!social && (
          <>
            <div>
              <label style={fieldLabel}>Show title (optional)</label>
              <input
                type="text"
                name="showTitle"
                list="show-titles"
                style={field}
              />
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <div style={{ flex: "1 1 140px" }}>
                <label style={fieldLabel}>Age range (optional)</label>
                <input type="text" name="showAgeRange" placeholder="4 to 8" style={field} />
              </div>
              <div style={{ flex: "2 1 220px" }}>
                <label style={fieldLabel}>Show page link (optional)</label>
                <input type="url" name="showUrl" placeholder="https://…" style={field} />
              </div>
            </div>
            <div>
              <label style={fieldLabel}>Show blurb (optional)</label>
              <textarea name="showBlurb" rows={2} style={{ ...field, resize: "vertical" }} />
            </div>
          </>
        )}
        <div>
          <label style={fieldLabel}>Image link (optional)</label>
          <input type="url" name="imageUrl" placeholder="https://…" style={field} />
        </div>
        <div>
          <button type="submit" style={buttonStyle}>
            Add the story
          </button>
        </div>
      </form>
    </details>
  );
}
