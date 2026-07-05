import { and, asc, desc, eq, gte, inArray, sql } from "drizzle-orm";
import {
  db,
  deliveries,
  subscribers,
  issues,
  companies,
  feedItems,
  showcaseEditions,
  shows,
  type Delivery,
  type FeedItem,
  type SubscriberCadence,
  type ShowcaseEdition,
  type Subscriber,
} from "@/lib/db";
import { loadCompanies } from "@/lib/company-store";
import { loadFeeds } from "@/lib/feed-store";
import { getAiSpend } from "@/lib/ai-spend";
import { getNotifyEmails } from "@/lib/notify";
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
  type ShowcaseListParams,
  type StoryPoolPage,
} from "@/lib/presenter";
import {
  SCHEDULE_DESCRIPTION,
  formatSydneyDateTime,
  issueWindow,
  nextSendAt,
} from "@/lib/cadence";
import Link from "next/link";
import Image from "next/image";
import { CLOUD_PATH } from "@/lib/clouds";
import AdminNav from "@/components/AdminNav";
import ConfirmSubmit from "@/components/ConfirmSubmit";
import SelectAllCheckbox from "@/components/SelectAllCheckbox";
import MoveButtons from "@/components/MoveButtons";
import QuickAction from "@/components/QuickAction";
import RatingsForm from "@/components/RatingsForm";

export const dynamic = "force-dynamic";

const CADENCES = ["daily", "weekly", "fortnightly"] as const;

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "editions", label: "Editions" },
  { id: "review", label: "Review" },
  { id: "presenters", label: "The Showcase" },
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
      {tab === "subscribers" && <SubscribersTab sp={sp} />}
      {tab === "settings" && <SettingsTab />}
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

async function OverviewTab({
  sp,
}: {
  sp: Record<string, string | undefined>;
}) {
  const opgRaw = Number(sp.opg);
  const opg = Number.isInteger(opgRaw) && opgRaw > 0 ? opgRaw : 1;
  // Fetch enough of each source to fill the requested page after merging.
  const fetchCount = opg * SENDS_PAGE + 1;
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
    db().select().from(issues).orderBy(desc(issues.id)).limit(fetchCount),
    db()
      .select()
      .from(showcaseEditions)
      .where(eq(showcaseEditions.status, "sent"))
      .orderBy(desc(showcaseEditions.sentAt))
      .limit(fetchCount),
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
      stamp: (i.sentAt ?? i.windowStart).getTime(),
      href:
        i.status === "sent" && i.recipientCount > 0
          ? `/admin?tab=editions&issue=${i.id}`
          : null,
    })),
    ...sentEditions.map((e) => ({
      key: `edition-${e.id}`,
      type: "The Showcase",
      showcase: true,
      label: (e.sentAt ?? e.createdAt).toISOString().slice(0, 10),
      status: e.status as string,
      items: e.itemCount,
      recipients: e.recipientCount,
      sentAt: e.sentAt,
      stamp: (e.sentAt ?? e.createdAt).getTime(),
      href: `/admin?tab=presenters&edition=${e.id}`,
    })),
  ].sort((a, b) => b.stamp - a.stamp);
  const pageSends = allSends.slice((opg - 1) * SENDS_PAGE, opg * SENDS_PAGE);
  const hasMoreSends = allSends.length > opg * SENDS_PAGE;

  return (
    <>
      {/* At-a-glance dashboard: big-number ticker cards. */}
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
          bg="var(--cta-yellow)"
        />
        <StatCard
          label="Quiet companies"
          value={quietCompanies}
          sub="no stories for 14 days"
          bg={quietCompanies > 0 ? "var(--cta-pink)" : "var(--cta-emerald)"}
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
          bg="var(--cta-mint)"
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
          bg="var(--cta-cream-warm)"
        />
        <StatCard
          label="Emails sent"
          value={sentWeek.count}
          sub="in the last 7 days"
          bg="var(--cta-white)"
        />
      </section>

      <section className="admin-card">
        <h2 style={h2}>Next editions</h2>
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
        <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "14px 0 0" }}>
          Newsletters go out with the morning pipeline run: 7:00 am Sydney
          time during winter (AEST) and 8:00 am during daylight saving
          (AEDT). A quiet window is skipped, never sent empty.
        </p>
      </section>

      <section className="admin-card">
        <h2 style={h2}>Recent sends</h2>
        <p style={muted}>
          Every dispatched edition: the daily, weekly and fortnightly
          newsletters and each live Showcase send. Click a recipient count to
          see exactly who received it.
        </p>
        <div className="table-scroll">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th}>Type</th>
                <th style={th}>Window</th>
                <th style={th}>Status</th>
                <th style={th}>Stories</th>
                <th style={th}>Recipients</th>
                <th style={th}>Sent at</th>
              </tr>
            </thead>
            <tbody>
              {pageSends.map((r) => (
                <tr key={r.key}>
                  <td style={td}>
                    {r.showcase ? (
                      <span style={badge("var(--cta-teal)")}>The Showcase</span>
                    ) : (
                      r.type
                    )}
                  </td>
                  <td style={td}>{r.label}</td>
                  <td style={td}>
                    <span
                      style={badge(
                        r.status === "sent"
                          ? "var(--cta-emerald)"
                          : r.status === "failed"
                            ? "var(--cta-pink)"
                            : r.status === "sending"
                              ? "var(--cta-yellow)"
                              : "var(--cta-white)",
                      )}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td style={td}>{r.items}</td>
                  <td style={td}>
                    {r.href ? (
                      <Link
                        prefetch={false}
                        href={r.href}
                        style={{ color: "var(--cta-ink)", fontWeight: 600 }}
                      >
                        {r.recipients}
                      </Link>
                    ) : (
                      r.recipients
                    )}
                  </td>
                  <td style={td}>
                    {r.sentAt
                      ? r.sentAt.toISOString().replace("T", " ").slice(0, 16)
                      : "—"}
                  </td>
                </tr>
              ))}
              {pageSends.length === 0 && (
                <tr>
                  <td style={td} colSpan={6}>
                    {opg > 1 ? (
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
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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
                href={`/admin?tab=overview&opg=${opg - 1}`}
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
                href={`/admin?tab=overview&opg=${opg + 1}`}
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
      <h2 style={h2}>AI credits (estimated)</h2>
      <p style={muted}>
        Estimated Anthropic API spend on headlines and summaries, measured
        from this app&#39;s own usage ({spend.totalCalls.toLocaleString()} AI
        calls so far). Anthropic doesn&#39;t provide a balance API, so check
        the console for the authoritative figure.
      </p>
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
  // What exactly would "Send now" dispatch? Show the window and audience
  // next to the button, so the click is never a mystery.
  const cadenceCounts = await db()
    .select({
      cadence: subscribers.cadence,
      count: sql<number>`count(*)::int`,
    })
    .from(subscribers)
    .where(eq(subscribers.status, "active"))
    .groupBy(subscribers.cadence);
  const subsByCadence = Object.fromEntries(
    cadenceCounts.map((c) => [c.cadence, c.count]),
  );
  const now = new Date();
  return (
    <>
      <section className="admin-card">
        <h2 style={h2}>Refresh stories</h2>
        <p style={muted}>
          Runs the same feed-ingest step as the daily pipeline: new posts get
          an AI headline and summary and appear in the previews.
        </p>
        <form action="/api/admin/ingest" method="post">
          <button type="submit" style={buttonStyle}>
            Refresh stories now
          </button>
        </form>
      </section>

      <section className="admin-card">
        <h2 style={h2}>Preview the next newsletter</h2>
        <p style={muted}>
          Opens the newsletter exactly as it would send right now, using the
          posts currently in each window. Nothing is sent.
        </p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {CADENCES.map((c) => (
            <a
              key={c}
              href={`/admin/preview/${c}`}
              target="_blank"
              style={{
                ...buttonStyle,
                textDecoration: "none",
                background: "var(--cta-white)",
              }}
            >
              {c[0].toUpperCase() + c.slice(1)} preview ↗
            </a>
          ))}
        </div>
      </section>

      <section className="admin-card">
        <h2 style={h2}>Send a test</h2>
        <p style={muted}>
          Emails the chosen newsletter to these addresses only, marked
          [TEST]. Separate several with commas.
        </p>
        <form
          action="/api/admin/send-test"
          method="post"
          style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}
        >
          <div style={{ flex: "1 1 220px" }}>
            <label style={fieldLabel}>Send to</label>
            <input
              type="text"
              name="to"
              required
              placeholder="you@example.org, colleague@example.org"
              style={{ ...inputStyle, width: "100%" }}
            />
          </div>
          <div>
            <label style={fieldLabel}>Newsletter</label>
            <select name="cadence" style={inputStyle}>
              {CADENCES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            style={{ ...buttonStyle, background: "var(--cta-yellow)" }}
          >
            Send test
          </button>
        </form>
      </section>

      <section className="admin-card">
        <h2 style={h2}>Send now</h2>
        <p style={muted}>
          Sends the current window&#39;s newsletter to every active subscriber
          of that cadence. A window with no posts is reported as
          &quot;skipped&quot; and nothing goes out; an already-sent window is
          never re-sent, so the buttons are safe to click twice.
        </p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {CADENCES.map((c) => {
            const w = issueWindow(c, now);
            const n = subsByCadence[c] ?? 0;
            return (
              <form
                key={c}
                action="/api/admin/send-now"
                method="post"
                style={{ ...tile, flex: "1 1 200px" }}
              >
                <input type="hidden" name="cadence" value={c} />
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--text-muted)",
                    marginBottom: 8,
                  }}
                >
                  {w.dateRange} · {n} subscriber{n === 1 ? "" : "s"}
                </div>
                <ConfirmSubmit
                  title="Sending for real"
                  message={`Send the ${c} newsletter (${w.dateRange}) to ${n} subscriber${n === 1 ? "" : "s"} now? This can't be undone.`}
                  confirmLabel="Yes, send it now"
                  danger
                  style={{ ...buttonStyle, background: "var(--cta-yellow)" }}
                >
                  Send {c} now
                </ConfirmSubmit>
              </form>
            );
          })}
        </div>
      </section>
    </>
  );
}

const REVIEW_PAGE = 20;
const REVIEW_STATUSES = ["pending", "unsure", "rejected", "approved"] as const;
type ReviewFilterStatus = (typeof REVIEW_STATUSES)[number];

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

  const conditions = [eq(feedItems.reviewStatus, status)];
  if (conf !== "all") conditions.push(eq(feedItems.aiMatchConfidence, conf));
  if (co) conditions.push(eq(feedItems.suggestedCompanyKey, co));
  if (q) {
    const like = `%${q}%`;
    conditions.push(
      sql`(${feedItems.rawTitle} ilike ${like} or ${feedItems.aiHeading} ilike ${like} or ${feedItems.creator} ilike ${like} or ${feedItems.postUrl} ilike ${like})`,
    );
  }

  const [companyList, rows, statusCounts] = await Promise.all([
    loadCompanies(),
    db()
      .select()
      .from(feedItems)
      .where(and(...conditions))
      .orderBy(desc(feedItems.publishedAt))
      .limit(REVIEW_PAGE + 1)
      .offset((pg - 1) * REVIEW_PAGE),
    db()
      .select({
        status: feedItems.reviewStatus,
        count: sql<number>`count(*)::int`,
      })
      .from(feedItems)
      .where(inArray(feedItems.reviewStatus, [...REVIEW_STATUSES]))
      .groupBy(feedItems.reviewStatus),
  ]);
  const hasMore = rows.length > REVIEW_PAGE;
  const pageRows = rows.slice(0, REVIEW_PAGE);
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
    for (const [k, v] of Object.entries(overrides)) {
      if (v) params.set(k, v);
      else params.delete(k);
    }
    return params;
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
    unsure: "Unsure",
    rejected: "Rejected",
    approved: "Approved",
  };

  return (
    <section className="admin-card">
      <h2 style={h2}>Review queue</h2>
      <p style={muted}>
        Stories from manual review feeds wait here until you decide.
        Approved stories become available in the Showcase builder, where
        you add them by hand (they never enter the daily or weekly
        newsletters automatically); rejected stories are kept out for good
        (and never resurface, even if the feed repeats them). The AI match
        is only a guide: check the article before approving, and change the
        company if it guessed wrong. Everything is reversible from the
        status filter.
      </p>
      <p style={{ ...muted, marginBottom: 16 }}>
        Waiting: <strong>{countBy.pending ?? 0} pending</strong>
        {" · "}
        {countBy.unsure ?? 0} unsure {" · "}
        {countBy.rejected ?? 0} rejected {" · "}
        {countBy.approved ?? 0} approved
      </p>

      {/* Filters */}
      <form
        method="get"
        action="/admin"
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          alignItems: "flex-end",
          marginBottom: 16,
        }}
      >
        <input type="hidden" name="tab" value="review" />
        <div>
          <label style={fieldLabel}>Status</label>
          <select name="rst" defaultValue={status} style={smallInput}>
            {REVIEW_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={fieldLabel}>Confidence</label>
          <select name="rcf" defaultValue={conf} style={smallInput}>
            <option value="all">All</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
        <div>
          <label style={fieldLabel}>Suggested company</label>
          <select name="rco" defaultValue={co} style={smallInput}>
            <option value="">All companies</option>
            {companyOptions.map((c) => (
              <option key={c.key} value={c.key}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div style={{ minWidth: 180, flex: "1 1 180px" }}>
          <label style={fieldLabel}>Search</label>
          <input
            name="rq"
            defaultValue={q}
            placeholder="Title, source or keyword"
            style={{ ...smallInput, width: "100%" }}
          />
        </div>
        <button type="submit" style={{ ...smallButton }}>
          Apply
        </button>
        {hasFilters && (
          <Link
            prefetch={false}
            href={`/admin?tab=review${status !== "pending" ? `&rst=${status}` : ""}`}
            style={{ fontSize: 13, fontWeight: 600, color: "var(--cta-ink)" }}
          >
            Clear
          </Link>
        )}
      </form>

      {pageRows.length === 0 ? (
        <p style={{ ...muted, marginBottom: 0 }}>
          {status === "pending" && !hasFilters
            ? "Nothing waiting for review. Stories from manual review feeds land here after the next refresh."
            : "No stories match these filters."}
        </p>
      ) : (
        <>
          {/* Bulk actions. The row checkboxes attach to this form via the
              form attribute, so it doesn't wrap the table. */}
          <form
            id="review-bulk"
            action="/api/admin/review"
            method="post"
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            {filterHidden}
            <SelectAllCheckbox formId="review-bulk" />
            <button
              type="submit"
              name="op"
              value="approve"
              style={smallButton}
            >
              Approve selected
            </button>
            <button
              type="submit"
              name="op"
              value="unsure"
              style={{ ...smallButton, background: "var(--cta-white)" }}
            >
              Mark unsure
            </button>
            <button type="submit" name="op" value="reject" style={dangerButton}>
              Reject selected
            </button>
          </form>
          {highIdsOnPage.length > 0 && status === "pending" && (
            <form
              action="/api/admin/review"
              method="post"
              style={{ marginBottom: 12 }}
            >
              {filterHidden}
              {highIdsOnPage.map((id) => (
                <input key={id} type="hidden" name="ids" value={id} />
              ))}
              <button
                type="submit"
                name="op"
                value="approve"
                style={smallButton}
              >
                Approve all {highIdsOnPage.length} high-confidence stories on
                this page
              </button>
            </form>
          )}

          <div className="table-scroll">
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={th}></th>
                  <th style={th}>Published</th>
                  <th style={th}>Story</th>
                  <th style={th}>Source</th>
                  <th style={th}>Suggested match</th>
                  <th style={th}>Decide</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((it) => (
                  <tr key={it.id}>
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
                      {it.publishedAt.toISOString().slice(0, 10)}
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
                        }}
                      >
                        {it.rawTitle || it.aiHeading} ↗
                      </a>
                      <div
                        style={{
                          fontSize: 12.5,
                          color: "var(--text-body)",
                          marginTop: 4,
                        }}
                      >
                        {it.aiSummary}
                      </div>
                      {(it.aiMatchReason || it.matchedMarkers) && (
                        <div
                          style={{
                            fontSize: 12,
                            color: "var(--text-muted)",
                            marginTop: 4,
                          }}
                        >
                          {it.aiMatchReason}
                          {it.matchedMarkers
                            ? ` (matched: ${it.matchedMarkers})`
                            : ""}
                        </div>
                      )}
                    </td>
                    <td style={{ ...td, maxWidth: 160 }}>{sourceOf(it)}</td>
                    <td style={td}>
                      {it.aiMatchConfidence && (
                        <span
                          style={{
                            ...badge(
                              CONFIDENCE_COLOURS[it.aiMatchConfidence] ??
                                "var(--cta-white)",
                            ),
                            marginBottom: 6,
                          }}
                        >
                          {it.aiMatchConfidence}
                        </span>
                      )}
                      <div style={{ marginTop: 6 }}>
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
                      </div>
                    </td>
                    <td style={{ ...td, whiteSpace: "nowrap" }}>
                      {status !== "approved" && (
                        <button
                          form={`rv-${it.id}`}
                          type="submit"
                          name="op"
                          value="approve"
                          style={{ ...smallButton, marginRight: 6 }}
                        >
                          Approve
                        </button>
                      )}
                      {status !== "unsure" && (
                        <button
                          form={`rv-${it.id}`}
                          type="submit"
                          name="op"
                          value="unsure"
                          style={{
                            ...smallButton,
                            background: "var(--cta-white)",
                            marginRight: 6,
                          }}
                        >
                          Unsure
                        </button>
                      )}
                      {status !== "rejected" && (
                        <button
                          form={`rv-${it.id}`}
                          type="submit"
                          name="op"
                          value="reject"
                          style={dangerButton}
                        >
                          Reject
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
      <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "14px 0 0" }}>
        Feeds are managed under Settings. Approved stories keep a record of
        the feed they came from and when they were approved.
      </p>
    </section>
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
      <h2 style={h2}>Audience list</h2>
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
                <td style={td}>{s.createdAt.toISOString().slice(0, 10)}</td>
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
      <p style={{ ...muted, margin: "12px 0 0", fontSize: 12.5 }}>
        Click a name for everything that person has received. Setting someone
        to &quot;Showcase only&quot; always includes The Showcase Edition.
      </p>
    </section>

    <section className="admin-card">
      <h2 style={h2}>New audience</h2>
      <p style={muted}>
        Adds someone directly, exactly as if they signed up themselves. If
        the address is already subscribed, their details and choices are
        updated instead. Choosing &quot;Showcase only&quot; always includes
        The Showcase Edition.
      </p>
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

async function SettingsTab() {
  // Seeds the table on first load, then read the raw rows for editing
  await loadCompanies();
  const [companyRows, unfiled, notifyEmails, feedRows] = await Promise.all([
    db().select().from(companies).orderBy(asc(companies.name)),
    db()
      .select()
      .from(feedItems)
      .where(
        and(
          eq(feedItems.companyKey, "around-the-alliance"),
          eq(feedItems.reviewed, false),
          // Review-feed items are triaged in the Review queue, not here.
          inArray(feedItems.reviewStatus, ["auto", "approved"]),
        ),
      )
      .orderBy(desc(feedItems.publishedAt))
      .limit(15),
    getNotifyEmails(),
    loadFeeds(),
  ]);

  return (
    <>
      <section className="admin-card">
        <h2 style={h2}>Introductions</h2>
        <p style={muted}>
          Two one-off branded emails for funders, presenters and friends
          (including international). <strong>Introduce the Alliance</strong>{" "}
          leads with who we are; <strong>Introduce the newsletter</strong>{" "}
          leads with the editions and how to sign up, with the Alliance as
          the secondary story. Paste addresses separated by commas or new
          lines. Recipients are emailed once and <strong>never stored</strong>.
        </p>
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
      <h2 style={h2}>Notifications</h2>
      <p style={muted}>
        These addresses get a short branded email every time someone new
        subscribes. Separate several with commas. Leave empty to turn
        notifications off. Cadence changes and re-subscribes do not trigger
        one.
      </p>
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
      <h2 style={h2}>RSS feeds</h2>
      <p style={muted}>
        Where stories come from. <strong>Automatic</strong> feeds are
        trusted (the companies&#39; own social posts): their stories join
        the stream straight away. <strong>Manual review</strong> feeds
        (media and news coverage) park every story on the Review page
        until you approve it, because articles can mention the wrong
        company. Unticking Active pauses a feed without deleting it.
      </p>
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
      <h2 style={h2}>Alliance companies</h2>
      <p style={muted}>
        Posts are matched to a company when its page name, post title or link
        contains one of the <strong>match words</strong> (separate several
        with commas). Unmatched posts appear under &quot;Around the
        Alliance&quot; — if you spot one there, add the company here. Changes
        apply to posts fetched from then on.
      </p>
      <div className="table-scroll">
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={th}>Company</th>
              <th style={th}>Match words</th>
              <th style={th}>Shows page (for The Showcase)</th>
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
        <button type="submit" style={buttonStyle}>
          Add company
        </button>
      </form>
      <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "10px 0 0" }}>
        The shows page URL is where The Showcase looks up official show
        pages, copy and images for that company.
      </p>
    </section>

    <section className="admin-card">
      <h2 style={h2}>Unfiled posts</h2>
      <p style={muted}>
        Recent posts that couldn&#39;t be matched to a company (they appear
        under &quot;Around the Alliance&quot; in issues). The page name and
        text below are what the feed provided — if you can tell who posted
        it, add a match word to that company above (show titles work well),
        then click re-file.
      </p>
      {unfiled.length === 0 ? (
        <p style={{ ...muted, marginBottom: 0 }}>
          Nothing unfiled — every post is matched to a company.
        </p>
      ) : (
        <>
          <div className="table-scroll" style={{ marginBottom: 14 }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={th}>Posted</th>
                  <th style={th}>Page name (from feed)</th>
                  <th style={th}>Post text</th>
                  <th style={th}>Link</th>
                  <th style={th}></th>
                </tr>
              </thead>
              <tbody>
                {unfiled.map((it) => (
                  <tr key={it.id}>
                    <td style={{ ...td, whiteSpace: "nowrap" }}>
                      {it.publishedAt.toISOString().slice(0, 10)}
                    </td>
                    <td style={td}>{it.creator ?? "(not provided)"}</td>
                    <td style={td}>
                      {(it.rawTitle ?? "").slice(0, 90) || "(no text)"}
                      {(it.rawTitle ?? "").length > 90 ? "…" : ""}
                    </td>
                    <td style={{ ...td, whiteSpace: "nowrap" }}>
                      <a
                        href={it.postUrl}
                        target="_blank"
                        style={{ color: "var(--cta-ink)", fontWeight: 600 }}
                      >
                        open ↗
                      </a>
                    </td>
                    <td style={{ ...td, whiteSpace: "nowrap" }}>
                      <form action="/api/admin/ignore-item" method="post">
                        <input type="hidden" name="id" value={it.id} />
                        <button type="submit" style={dangerButton}>
                          Ignore
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <form action="/api/admin/rematch" method="post">
            <button type="submit" style={buttonStyle}>
              Re-file unfiled posts
            </button>
          </form>
        </>
      )}
    </section>
    </>
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
  const params = parseShowcaseListParams(sp);
  const [
    editions,
    counts,
    recipients,
    subscriberCount,
    companyRows,
    registry,
    pool,
    usedDates,
    feedRows,
  ] = await Promise.all([
    db().select().from(showcaseEditions),
    getEditionCounts(),
    getPresenterRecipients(),
    getShowcaseSubscriberCount(),
    db().select().from(companies).orderBy(asc(companies.name)),
    db().select().from(shows).orderBy(asc(shows.title)),
    queryStoryPool(params),
    getUsedStoryDates(),
    loadFeeds(),
  ]);
  const nameByKey = new Map(companyRows.map((c) => [c.key, c.name]));
  const feedNameById = new Map(feedRows.map((f) => [f.id, f.name]));

  const itemsOf = (e: ShowcaseEdition) =>
    e.status === "sent" ? e.itemCount : (counts.get(e.id)?.items ?? 0);
  const profilesOf = (e: ShowcaseEdition) =>
    e.status === "sent" ? e.profileCount : (counts.get(e.id)?.profiles ?? 0);
  const stampOf = (e: ShowcaseEdition) => (e.sentAt ?? e.createdAt).getTime();

  const esort = ["date", "status", "stories"].includes(sp.esort ?? "")
    ? (sp.esort as "date" | "status" | "stories")
    : "date";
  const edir = sp.edir === "asc" ? "asc" : "desc";
  const epgRaw = Number(sp.epg);
  const epg = Number.isInteger(epgRaw) && epgRaw > 0 ? epgRaw : 1;
  const EDITIONS_PAGE = 15;
  const sorted = [...editions].sort((a, b) => {
    const cmp =
      esort === "status"
        ? a.status.localeCompare(b.status)
        : esort === "stories"
          ? itemsOf(a) - itemsOf(b)
          : stampOf(a) - stampOf(b);
    return edir === "asc" ? cmp : -cmp;
  });
  const pageEditions = sorted.slice(
    (epg - 1) * EDITIONS_PAGE,
    epg * EDITIONS_PAGE,
  );
  const hasMoreEditions = sorted.length > epg * EDITIONS_PAGE;

  const eSortLink = (key: string, label: string) => {
    const firstDir = key === "status" ? "asc" : "desc";
    const nextDir =
      esort === key ? (edir === "asc" ? "desc" : "asc") : firstDir;
    return (
      <Link
            prefetch={false}
        scroll={false}
        href={`/admin?tab=presenters&esort=${key}&edir=${nextDir}`}
        style={{ color: "inherit", textDecoration: "none" }}
      >
        {label}
        {esort === key ? (edir === "asc" ? " ↑" : " ↓") : ""}
      </Link>
    );
  };

  return (
    <>
      <section className="admin-card">
        <h2 style={h2}>Editions</h2>
        <p style={muted}>
          The Showcase is built one edition at a time. New Showcase starts a
          draft pre-filled with the latest high-relevance stories and the
          current Shows in the Spotlight list; edit it, preview it, send a
          test, then send it live to the {subscriberCount} subscriber
          {subscriberCount === 1 ? "" : "s"} who receive The Showcase
          Edition. Sent editions stay here as history.
        </p>
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
        <div className="table-scroll">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th}>{eSortLink("date", "Date")}</th>
                <th style={th}>{eSortLink("status", "Status")}</th>
                <th style={th}>{eSortLink("stories", "Stories")}</th>
                <th style={th}>Profiles</th>
                <th style={th}>Recipients</th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {pageEditions.map((e) => {
                const editable = e.status === "draft" || e.status === "failed";
                return (
                  <tr key={e.id}>
                    <td style={{ ...td, whiteSpace: "nowrap" }}>
                      {(e.sentAt ?? e.createdAt).toISOString().slice(0, 10)}
                    </td>
                    <td style={td}>
                      <StatusBadge status={e.status} />
                    </td>
                    <td style={td}>{itemsOf(e)}</td>
                    <td style={td}>{profilesOf(e)}</td>
                    <td style={td}>
                      {e.recipients ??
                        (e.status === "sent" ? (
                          <Link
                            prefetch={false}
                            href={`/admin?tab=presenters&edition=${e.id}`}
                            style={{ color: "var(--cta-ink)", fontWeight: 600 }}
                          >
                            {`${e.recipientCount} recipient${e.recipientCount === 1 ? "" : "s"}`}
                          </Link>
                        ) : (
                          ""
                        ))}
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
                      {editable && (
                        <>
                          <form
                            action="/api/admin/presenter-send"
                            method="post"
                            style={{ display: "inline", marginRight: 6 }}
                          >
                            <input type="hidden" name="edition" value={e.id} />
                            <input type="hidden" name="mode" value="test" />
                            <ConfirmSubmit
                              message={`Send a test of this Showcase to ${recipients.join(", ")}? The draft stays a draft.`}
                              style={{ ...smallButton, background: "var(--cta-yellow)" }}
                            >
                              Send test
                            </ConfirmSubmit>
                          </form>
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
                          message={
                            e.status === "sent"
                              ? "Delete this sent Showcase from the history? Its stories become available to future editions again."
                              : "Delete this Showcase draft?"
                          }
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
              {pageEditions.length === 0 && (
                <tr>
                  <td style={td} colSpan={6}>
                    {epg > 1
                      ? "No Showcases this far back."
                      : "No Showcases yet. Press New Showcase to build the first one."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {(epg > 1 || hasMoreEditions) && (
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
                href={`/admin?tab=presenters&esort=${esort}&edir=${edir}&epg=${epg - 1}`}
                style={{ ...smallButton, textDecoration: "none", background: "var(--cta-white)" }}
              >
                ← Previous
              </Link>
            )}
            <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-muted)" }}>
              Page {epg}
            </span>
            {hasMoreEditions && (
              <Link
                prefetch={false}
                scroll={false}
                href={`/admin?tab=presenters&esort=${esort}&edir=${edir}&epg=${epg + 1}`}
                style={{ ...smallButton, textDecoration: "none", background: "var(--cta-white)" }}
              >
                Next →
              </Link>
            )}
          </div>
        )}
      </section>

      <section className="admin-card" id="test-recipients">
        <h2 style={h2}>Test recipients</h2>
        <p style={muted}>
          Send test delivers a draft to this list only, and new-story
          notifications go here too. Live sends go to every subscriber who
          receives The Showcase Edition (see the Subscribers tab).
        </p>
        <form
          action="/api/admin/presenter-recipients"
          method="post"
          style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}
        >
          <div style={{ flex: "1 1 280px" }}>
            <label style={fieldLabel}>Test addresses</label>
            <input
              type="text"
              name="emails"
              defaultValue={recipients.join(", ")}
              placeholder="kevin@monkeybaa.com.au"
              style={{ ...inputStyle, width: "100%" }}
            />
          </div>
          <button type="submit" style={buttonStyle}>
            Save test list
          </button>
        </form>
      </section>

      <section className="admin-card" id="story-pool">
        <h2 style={h2}>Story pool</h2>
        <p style={muted}>
          Every story the feed has brought in, rated by the AI twice: once
          for show relevance and once for Social Theatre (theatre in health,
          access and community settings, not education or fundraising).
          Stories rated <strong>High</strong> on either scale are offered to
          each New Showcase automatically, in the matching section, and are
          what this list shows by default; switch the rating filter to see
          medium and low rated stories. Change a rating here to promote a
          missed story or keep one out for good.
        </p>
        <StoryPoolTable
          pool={pool}
          usedDates={usedDates}
          nameByKey={nameByKey}
          companyRows={companyRows}
          feedNameById={feedNameById}
          mode="browse"
          params={params}
          anchor="story-pool"
        />
      </section>

      <section className="admin-card" id="registry">
        <h2 style={h2}>Shows in the Spotlight</h2>
        <p style={muted}>
          The registry of shows available now. New Showcases start with all
          active shows; each edition can then drop or re-add them. Archive a
          show to keep it on file without offering it to new editions.
        </p>
        <div className="table-scroll">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th}>Show</th>
                <th style={th}>Company</th>
                <th style={th}>Show page URL</th>
                <th style={th}>Blurb</th>
                <th style={th}>Image URL</th>
                <th style={th}>Ages</th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {registry.map((s) => (
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
              {registry.length === 0 && (
                <tr>
                  <td style={td} colSpan={7}>
                    No shows listed yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <form
          action="/api/admin/shows"
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
          <input type="hidden" name="anchor" value="registry" />
          <input type="hidden" name="action" value="add" />
          <div style={{ minWidth: 180, flex: "1 1 180px" }}>
            <label style={fieldLabel}>Show title</label>
            <input name="title" required style={{ ...inputStyle, width: "100%" }} />
          </div>
          <div>
            <label style={fieldLabel}>Company</label>
            <select name="companyKey" style={inputStyle}>
              {companyRows.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div style={{ minWidth: 180, flex: "1 1 180px" }}>
            <label style={fieldLabel}>Show page URL (optional)</label>
            <input name="url" type="url" style={{ ...inputStyle, width: "100%" }} />
          </div>
          <div style={{ minWidth: 160, flex: "1 1 160px" }}>
            <label style={fieldLabel}>Image URL (optional)</label>
            <input name="imageUrl" style={{ ...inputStyle, width: "100%" }} />
          </div>
          <div style={{ width: 130 }}>
            <label style={fieldLabel}>Ages (optional)</label>
            <input name="ageRange" style={{ ...inputStyle, width: "100%" }} />
          </div>
          <button type="submit" style={buttonStyle}>
            Add show
          </button>
        </form>
      </section>
    </>
  );
}

/**
 * Filter form + sortable results table for the story pool. In "add" mode
 * every row also gets an Add button targeting the given edition, and
 * stories already used are excluded by the query upstream.
 */
/**
 * Where a story came from, as a small badge: the feed's name for RSS
 * stories (yellow when it arrived through the Review queue, so media
 * stories stand out from the trusted social feed), "Manual" for stories
 * written by hand. Legacy rows from before the feeds registry carry no
 * feed link and get no badge (they are all from the social feed).
 */
function feedOriginBadge(
  it: FeedItem,
  feedNameById: Map<number, string>,
): React.ReactNode {
  if (it.source === "manual") {
    return (
      <span
        style={{ ...badge("var(--cta-white)"), marginLeft: 8, fontSize: 10 }}
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
        marginLeft: 8,
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

function StoryPoolTable({
  pool,
  usedDates,
  nameByKey,
  companyRows,
  feedNameById,
  mode,
  editionId,
  params,
  anchor,
}: {
  pool: StoryPoolPage;
  usedDates: Map<number, Date | null>;
  nameByKey: Map<string, string>;
  companyRows: { key: string; name: string }[];
  /** Feed id → feed name, for the origin badge on each story. */
  feedNameById: Map<number, string>;
  mode: "browse" | "add";
  editionId?: number;
  params: ShowcaseListParams;
  /** Section id to return to after filtering (forms) and paging (links). */
  anchor: string;
}) {
  const { rows, hasMore } = pool;
  const href = (over: Partial<ShowcaseListParams>) => {
    // Changing sort or filters implicitly resets to page 1 unless the
    // override sets pg itself.
    const merged = { ...params, pg: 1, ...over };
    const q = new URLSearchParams({ tab: "presenters" });
    if (editionId) q.set("edition", String(editionId));
    if (merged.rel !== "highs") q.set("rel", merged.rel);
    if (merged.co) q.set("co", merged.co);
    if (merged.q) q.set("q", merged.q);
    if (merged.sort !== "date") q.set("sort", merged.sort);
    if (merged.dir !== "desc") q.set("dir", merged.dir);
    if (merged.pg > 1) q.set("pg", String(merged.pg));
    return `/admin?${q.toString()}`;
  };
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
    params.rel !== "highs" ||
    params.co ||
    params.q ||
    params.sort !== "date" ||
    params.pg > 1;

  return (
    <>
      <form
        method="get"
        action={`/admin#${anchor}`}
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <input type="hidden" name="tab" value="presenters" />
        {editionId ? (
          <input type="hidden" name="edition" value={editionId} />
        ) : null}
        <select name="rel" defaultValue={params.rel} style={smallInput}>
          <option value="highs">High: show or social</option>
          <option value="high">Show: high</option>
          <option value="medium">Show: medium</option>
          <option value="low">Show: low</option>
          <option value="s-high">Social Theatre: high</option>
          <option value="s-medium">Social Theatre: medium</option>
          <option value="s-low">Social Theatre: low</option>
          <option value="all">All ratings</option>
        </select>
        <select name="co" defaultValue={params.co} style={smallInput}>
          <option value="">All companies</option>
          {companyRows.map((c) => (
            <option key={c.key} value={c.key}>
              {c.name}
            </option>
          ))}
        </select>
        <input
          name="q"
          defaultValue={params.q}
          placeholder="Search headline or show title"
          style={{ ...smallInput, flex: "1 1 200px", minWidth: 160 }}
        />
        <button type="submit" style={smallButton}>
          Filter
        </button>
        {isFiltered && (
          <Link
            prefetch={false}
            href={
              editionId
                ? `/admin?tab=presenters&edition=${editionId}`
                : "/admin?tab=presenters"
            }
            scroll={false}
            style={{ fontSize: 12.5, fontWeight: 600, color: "var(--cta-ink)" }}
          >
            Clear
          </Link>
        )}
      </form>
      {rows.length === 0 ? (
        <p style={{ ...muted, marginBottom: 0 }}>
          {params.pg > 1 ? (
            <>
              No more stories this far back.{" "}
              <Link prefetch={false} href={href({})} scroll={false} style={{ color: "var(--cta-ink)", fontWeight: 600 }}>
                Back to the first page
              </Link>
            </>
          ) : (
            "No stories match this view. Try All ratings or a different search."
          )}
        </p>
      ) : (
        <>
          <div className="table-scroll">
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={th}>{sortLink("date", "Date")}</th>
                  <th style={th}>{sortLink("company", "Company")}</th>
                  <th style={th}>{sortLink("headline", "Headline")}</th>
                  <th style={th}>{sortLink("relevance", "Relevance")}</th>
                  <th style={th}></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id}>
                    <td style={{ ...td, whiteSpace: "nowrap" }}>
                      {p.publishedAt.toISOString().slice(0, 10)}
                    </td>
                    <td style={{ ...td, whiteSpace: "nowrap" }}>
                      {nameByKey.get(p.companyKey) ?? "Around the Alliance"}
                    </td>
                    <td style={td}>
                      {p.aiHeading.slice(0, 70)}
                      {p.aiHeading.length > 70 ? "…" : ""}
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
                      {feedOriginBadge(p, feedNameById)}
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
                            ? ` ${usedDates.get(p.id)!.toISOString().slice(0, 10)}`
                            : ""}
                        </span>
                      )}
                    </td>
                    <td style={{ ...td, whiteSpace: "nowrap" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <RatingsForm
                          itemId={p.id}
                          show={p.presenterRelevance}
                          social={p.socialRelevance}
                        />
                        <QuickAction
                          fields={{ action: "reassess", id: p.id }}
                          announce
                          style={{ ...smallButton, background: "var(--cta-white)" }}
                        >
                          AI re-rate
                        </QuickAction>
                      </div>
                    </td>
                    <td style={{ ...td, whiteSpace: "nowrap" }}>
                      {mode === "add" && editionId && (
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 6,
                          }}
                        >
                          <QuickAction
                            fields={{ action: "add", id: p.id, edition: editionId }}
                            style={{ ...smallButton, width: "100%" }}
                          >
                            Add to news
                          </QuickAction>
                          <QuickAction
                            fields={{
                              action: "add",
                              social: "1",
                              id: p.id,
                              edition: editionId,
                            }}
                            style={{
                              ...smallButton,
                              width: "100%",
                              background: "var(--cta-mint)",
                            }}
                          >
                            Add to Social Theatre
                          </QuickAction>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {(hasMore || params.pg > 1) && (
            <div
              style={{
                display: "flex",
                gap: 12,
                alignItems: "center",
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
              <span style={{ color: "var(--text-muted)" }}>
                Page {params.pg}
              </span>
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
            </div>
          )}
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
  const params = parseShowcaseListParams(sp);
  // One parallel round-trip for everything the builder needs.
  const [
    entries,
    editionShows,
    companyRows,
    recipients,
    subscriberCount,
    pool,
    usedDates,
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
        ? queryStoryPool(params, { excludeEditionId: edition.id })
        : Promise.resolve({ rows: [], hasMore: false }),
      editable
        ? getUsedStoryDates()
        : Promise.resolve(new Map<number, Date | null>()),
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
    companyRows.map((c) => [c.key, c.showsPageUrl]),
  );
  const newsEntries = entries.filter((e) => !e.social);
  const socialEntries = entries.filter((e) => e.social);
  const profileCount = entries.filter((e) => e.featured && !e.social).length;
  const socialCount = entries.filter((e) => e.social).length;
  const inEditionShowIds = new Set(editionShows.map((s) => s.id));
  const addableShows = registry.filter((s) => !inEditionShowIds.has(s.id));

  return (
    <>
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
          </h2>
          <StatusBadge status={edition.status} />
        </div>
        <p style={muted}>
          {edition.status === "sent"
            ? `Sent ${edition.sentAt?.toISOString().slice(0, 10) ?? ""} to ${edition.recipients ?? `${edition.recipientCount} subscriber${edition.recipientCount === 1 ? "" : "s"}`}. Sent editions are read-only; duplicate to reuse it.`
            : `Started ${edition.createdAt.toISOString().slice(0, 10)}. New Showcases start pre-filled with every unused story rated high on either scale, plus the active Spotlight shows; the numbered sections below walk through the edition top to bottom.`}
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
              <form action="/api/admin/presenter-send" method="post">
                <input type="hidden" name="edition" value={edition.id} />
                <input type="hidden" name="mode" value="test" />
                <ConfirmSubmit
                  message={`Send a test of this Showcase to ${recipients.join(", ")}? The draft stays a draft.`}
                  style={{ ...buttonStyle, background: "var(--cta-yellow)" }}
                >
                  Send test
                </ConfirmSubmit>
              </form>
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
            Send test goes to {recipients.join(", ")} ·{" "}
            <Link
              prefetch={false}
              href="/admin?tab=presenters#test-recipients"
              style={{ color: "var(--cta-ink)", fontWeight: 600 }}
            >
              change the test list
            </Link>
            . Send live goes to every subscriber opted in to The Showcase
            Edition.
          </p>
        )}
      </section>

      {edition.status === "sent" && (
        <EditionRecipientsCard editionId={edition.id} sp={sp} />
      )}

      {editable && (
        <section
          className="admin-card"
          id="add-stories"
          style={{ background: "var(--cta-cream-deep)" }}
        >
          <h2 style={h2}>1 · Add stories</h2>
          <p style={muted}>
            Stories not yet in this Showcase, ready to add to the sections
            below. Stories rated high for shows or for Social Theatre are
            shown by default; medium and low rated stories are hidden until
            you change the rating filter. Search, or page further back, to
            dig deeper. Stories
            marked <strong>Sent</strong> have already appeared in a past
            Showcase but can be added again on purpose. A badge on each
            story shows the feed it came from; yellow means it arrived
            through the Review queue.
          </p>
          <StoryPoolTable
            pool={pool}
            usedDates={usedDates}
            nameByKey={nameByKey}
            companyRows={companyRows}
            feedNameById={feedNameById}
            mode="add"
            editionId={edition.id}
            params={params}
            anchor="add-stories"
          />
        </section>
      )}

      <section className="admin-card" id="news-stories">
        <h2 style={h2}>{editable ? "2 · " : ""}Show stories</h2>
        {editable ? (
          <p style={muted}>
            Listed in the order they will appear in the email: use the ▲ ▼
            arrows to reorder, and tap a card to open it for editing. Pick up
            to two stories as <strong>profiles</strong> (the big cards at the
            top).
          </p>
        ) : (
          <p style={muted}>As sent, in order.</p>
        )}
        {newsEntries.length === 0 && (
          <p style={{ ...muted, marginBottom: 0 }}>
            No news stories yet. Add some from the list above.
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
              origin={feedOriginBadge(e.item, feedNameById)}
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
          <h2 style={h2}>3 · Social stories</h2>
          <p style={muted}>
            Stories told through the social lens. They appear in the mint
            Social Theatre band of the email, without a show card, in the
            order below. Use Move to Social Theatre on a news story to bring
            it here.
          </p>
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
              origin={feedOriginBadge(e.item, feedNameById)}
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
          {editable ? "4 · " : ""}Spotlight shows in this Showcase
        </h2>
        <p style={muted}>
          The show grid at the bottom of this edition, two cards per row, in
          the order below.
          {editable &&
            " Use the ▲ ▼ arrows to reorder and Remove to take a show out of this edition."}
        </p>
        {editable && (
          <p style={{ marginTop: 0, marginBottom: 14 }}>
            <Link
              prefetch={false}
              href="/admin?tab=presenters#registry"
              style={{
                ...smallButton,
                display: "inline-block",
                textDecoration: "none",
                background: "var(--cta-white)",
              }}
            >
              Edit show details in Shows in the Spotlight →
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
                  {it.publishedAt.toISOString().slice(0, 10)}
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
                    ? `researched ${it.presenterResearchedAt.toISOString().slice(0, 10)}`
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
                    Research needs {company}&#39;s shows
                    page URL before it can find this show. Add it on the
                    Settings tab.
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
          {sub.createdAt.toISOString().slice(0, 10)}
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
                    {d.sentAt.toISOString().slice(0, 10)}
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
                  {d.sentAt.toISOString().slice(0, 16).replace("T", " ")}
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
          {issue.sentAt ? ` · sent ${issue.sentAt.toISOString().slice(0, 10)}` : ""} ·{" "}
          {issue.itemCount} stor{issue.itemCount === 1 ? "y" : "ies"} ·{" "}
          {issue.recipientCount} recipient{issue.recipientCount === 1 ? "" : "s"}
        </p>
      </section>
      <section className="admin-card">
        <h2 style={h2}>Who received it</h2>
        <p style={muted}>
          Everyone this newsletter was delivered to. Click a name for
          everything that person has received.
        </p>
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
      <h2 style={h2}>Who received it</h2>
      <p style={muted}>
        Everyone this Showcase went to when it was sent live. Test sends are
        not listed here.
      </p>
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
              <input type="text" name="showTitle" style={field} />
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
