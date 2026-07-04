import { and, asc, desc, eq, sql } from "drizzle-orm";
import {
  db,
  subscribers,
  issues,
  companies,
  feedItems,
  showcaseEditions,
  shows,
  type FeedItem,
  type ShowcaseEdition,
} from "@/lib/db";
import { loadCompanies } from "@/lib/company-store";
import { getAiSpend } from "@/lib/ai-spend";
import { getNotifyEmails } from "@/lib/notify";
import {
  getEdition,
  getEditionCounts,
  getEditionItems,
  getEditionShows,
  getPresenterRecipients,
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
  nextSendAt,
} from "@/lib/cadence";
import Link from "next/link";
import ConfirmSubmit from "@/components/ConfirmSubmit";
import MoveButtons from "@/components/MoveButtons";
import QuickAction from "@/components/QuickAction";
import RatingsForm from "@/components/RatingsForm";

export const dynamic = "force-dynamic";

const CADENCES = ["daily", "weekly", "fortnightly"] as const;

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "sending", label: "Sending" },
  { id: "subscribers", label: "Subscribers" },
  { id: "companies", label: "Companies" },
  { id: "presenters", label: "The Showcase" },
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
const dangerButton: React.CSSProperties = {
  ...smallButton,
  background: "var(--cta-white)",
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
  const { message, tab: rawTab } = sp;
  const tab: Tab = (TABS.find((t) => t.id === rawTab)?.id ?? "overview") as Tab;

  return (
    <main className="admin-main">
      <h1 className="admin-title">Alliance Newsletter Admin</h1>
      <p style={{ color: "var(--text-muted)", margin: "0 0 24px" }}>
        The pipeline runs automatically every morning (Sydney time).
      </p>

      <nav className="admin-tabs">
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={`/admin?tab=${t.id}`}
            className="admin-tab"
            aria-current={tab === t.id}
          >
            {t.label}
          </Link>
        ))}
      </nav>

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

      {tab === "overview" && <OverviewTab />}
      {tab === "sending" && <SendingTab />}
      {tab === "subscribers" && <SubscribersTab />}
      {tab === "companies" && <CompaniesTab />}
      {tab === "presenters" && <ShowcaseTab sp={sp} />}
    </main>
  );
}

async function OverviewTab() {
  const [counts, recentIssues] = await Promise.all([
    db()
      .select({
        cadence: subscribers.cadence,
        count: sql<number>`count(*)::int`,
      })
      .from(subscribers)
      .where(eq(subscribers.status, "active"))
      .groupBy(subscribers.cadence),
    db().select().from(issues).orderBy(desc(issues.id)).limit(20),
  ]);
  const countByCadence = Object.fromEntries(
    counts.map((c) => [c.cadence, c.count]),
  );

  return (
    <>
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
        </div>
        <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "14px 0 0" }}>
          Issues go out with the morning pipeline run — 7:00 am Sydney time
          during winter (AEST) and 8:00 am during daylight saving (AEDT). A
          quiet window is skipped, never sent empty.
        </p>
      </section>

      <AiCreditsCard />

      <section className="admin-card">
        <h2 style={h2}>Recent issues</h2>
        <div className="table-scroll">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th}>Cadence</th>
                <th style={th}>Window</th>
                <th style={th}>Status</th>
                <th style={th}>Items</th>
                <th style={th}>Recipients</th>
                <th style={th}>Sent at</th>
              </tr>
            </thead>
            <tbody>
              {recentIssues.map((i) => (
                <tr key={i.id}>
                  <td style={td}>{i.cadence}</td>
                  <td style={td}>{i.windowKey}</td>
                  <td style={td}>{i.status}</td>
                  <td style={td}>{i.itemCount}</td>
                  <td style={td}>{i.recipientCount}</td>
                  <td style={td}>
                    {i.sentAt
                      ? i.sentAt.toISOString().replace("T", " ").slice(0, 16)
                      : "—"}
                  </td>
                </tr>
              ))}
              {recentIssues.length === 0 && (
                <tr>
                  <td style={td} colSpan={6}>
                    No issues yet — the pipeline hasn&#39;t run.
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
          <button type="submit" style={smallButton}>
            Set budget
          </button>
        </form>
        <form action="/api/admin/ai-budget" method="post">
          <input type="hidden" name="action" value="reset" />
          <ConfirmSubmit
            message="Reset the usage bar to zero? Do this after buying credits so the bar tracks the new balance."
            style={dangerButton}
          >
            Mark as topped up
          </ConfirmSubmit>
        </form>
      </div>
    </section>
  );
}

function SendingTab() {
  return (
    <>
      <section className="admin-card">
        <h2 style={h2}>Fetch new posts</h2>
        <p style={muted}>
          Runs the same feed-ingest step as the daily pipeline: new posts get
          an AI headline and summary and appear in the previews.
        </p>
        <form action="/api/admin/ingest" method="post">
          <button type="submit" style={buttonStyle}>
            Fetch new posts now
          </button>
        </form>
      </section>

      <section className="admin-card">
        <h2 style={h2}>Preview the next issue</h2>
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
        <form
          action="/api/admin/send-test"
          method="post"
          style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}
        >
          <input
            type="email"
            name="to"
            required
            placeholder="you@example.org"
            style={{ ...inputStyle, minWidth: 220, flex: "1 1 220px" }}
          />
          <select name="cadence" style={inputStyle}>
            {CADENCES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <button type="submit" style={buttonStyle}>
            Send test
          </button>
        </form>
      </section>

      <section className="admin-card">
        <h2 style={h2}>Introduce the Alliance</h2>
        <p style={muted}>
          A one-off branded email introducing the Alliance and the
          newsletter, for funders, presenters and friends (including
          international). Paste addresses separated by commas or new lines.
          Recipients are emailed once and <strong>never stored</strong>.
        </p>
        <div style={{ marginBottom: 12 }}>
          <a
            href="/admin/preview/intro"
            target="_blank"
            style={{
              ...buttonStyle,
              textDecoration: "none",
              background: "var(--cta-white)",
            }}
          >
            Preview the introduction ↗
          </a>
        </div>
        <form action="/api/admin/send-intro" method="post">
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
            message="Send the introduction email to everyone in the list now? Each address is emailed once and not saved."
            style={buttonStyle}
          >
            Send introduction
          </ConfirmSubmit>
        </form>
      </section>

      <section className="admin-card">
        <h2 style={h2}>Send now</h2>
        <p style={muted}>
          Sends the current window&#39;s issue to all active subscribers of
          that cadence. Safe to click twice — an already-sent window is never
          re-sent.
        </p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {CADENCES.map((c) => (
            <form key={c} action="/api/admin/send-now" method="post">
              <input type="hidden" name="cadence" value={c} />
              <button
                type="submit"
                style={{ ...buttonStyle, background: "var(--cta-yellow)" }}
              >
                Send {c} now
              </button>
            </form>
          ))}
        </div>
      </section>
    </>
  );
}

async function SubscribersTab() {
  const [counts, recent, notifyEmails] = await Promise.all([
    db()
      .select({
        cadence: subscribers.cadence,
        count: sql<number>`count(*)::int`,
      })
      .from(subscribers)
      .where(eq(subscribers.status, "active"))
      .groupBy(subscribers.cadence),
    db()
      .select()
      .from(subscribers)
      .orderBy(desc(subscribers.createdAt))
      .limit(200),
    getNotifyEmails(),
  ]);
  const countByCadence = Object.fromEntries(
    counts.map((c) => [c.cadence, c.count]),
  );

  return (
    <>
    <section className="admin-card">
      <h2 style={h2}>Subscribers</h2>
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
        <a
          href="/api/admin/subscribers.csv"
          style={{ ...buttonStyle, textDecoration: "none" }}
        >
          Export CSV
        </a>
      </div>
      <div className="table-scroll" style={{ maxHeight: 480, overflowY: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={th}>Name</th>
              <th style={th}>Email</th>
              <th style={th}>Cadence</th>
              <th style={th}>Status</th>
              <th style={th}>Joined</th>
              <th style={th}></th>
            </tr>
          </thead>
          <tbody>
            {recent.map((s) => (
              <tr key={s.id}>
                <td style={td}>
                  {s.firstName} {s.lastName}
                </td>
                <td style={td}>{s.email}</td>
                <td style={td}>
                  <form
                    action="/api/admin/set-cadence"
                    method="post"
                    style={{ display: "flex", gap: 6, alignItems: "center" }}
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
                    </select>
                    <button type="submit" style={smallButton}>
                      Save
                    </button>
                  </form>
                </td>
                <td style={td}>{s.status}</td>
                <td style={td}>{s.createdAt.toISOString().slice(0, 10)}</td>
                <td style={td}>
                  <form action="/api/admin/delete-subscriber" method="post">
                    <input type="hidden" name="id" value={s.id} />
                    <ConfirmSubmit
                      message={`Delete ${s.email} permanently? They will stop receiving all dispatches and their record is removed.`}
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
                  No subscribers yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>

    <section className="admin-card">
      <h2 style={h2}>New-subscriber notifications</h2>
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
        <input
          type="text"
          name="emails"
          defaultValue={notifyEmails.join(", ")}
          placeholder="you@example.com, colleague@example.com"
          style={{ ...inputStyle, flex: "1 1 280px", minWidth: 220 }}
        />
        <button type="submit" style={buttonStyle}>
          Save
        </button>
      </form>
    </section>
    </>
  );
}

async function CompaniesTab() {
  // Seeds the table on first load, then read the raw rows for editing
  await loadCompanies();
  const [companyRows, unfiled] = await Promise.all([
    db().select().from(companies).orderBy(asc(companies.name)),
    db()
      .select()
      .from(feedItems)
      .where(
        and(
          eq(feedItems.companyKey, "around-the-alliance"),
          eq(feedItems.reviewed, false),
        ),
      )
      .orderBy(desc(feedItems.publishedAt))
      .limit(15),
  ]);

  return (
    <>
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
        <input
          name="name"
          required
          placeholder="Company name"
          style={{ ...inputStyle, minWidth: 200, flex: "1 1 200px" }}
        />
        <input
          name="match"
          placeholder="Match words (e.g. brymore, brymoreproductions)"
          style={{ ...inputStyle, minWidth: 240, flex: "2 1 240px" }}
        />
        <input
          name="showsPageUrl"
          type="url"
          placeholder="Shows page URL (optional)"
          style={{ ...inputStyle, minWidth: 200, flex: "1 1 200px" }}
        />
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
  const [editions, counts, recipients, companyRows, registry, pool, usedDates] =
    await Promise.all([
      db().select().from(showcaseEditions),
      getEditionCounts(),
      getPresenterRecipients(),
      db().select().from(companies).orderBy(asc(companies.name)),
      db().select().from(shows).orderBy(asc(shows.title)),
      queryStoryPool(params),
      getUsedStoryDates(),
    ]);
  const nameByKey = new Map(companyRows.map((c) => [c.key, c.name]));

  const itemsOf = (e: ShowcaseEdition) =>
    e.status === "sent" ? e.itemCount : (counts.get(e.id)?.items ?? 0);
  const profilesOf = (e: ShowcaseEdition) =>
    e.status === "sent" ? e.profileCount : (counts.get(e.id)?.profiles ?? 0);
  const stampOf = (e: ShowcaseEdition) => (e.sentAt ?? e.createdAt).getTime();

  const esort = ["date", "status", "stories"].includes(sp.esort ?? "")
    ? (sp.esort as "date" | "status" | "stories")
    : "date";
  const edir = sp.edir === "asc" ? "asc" : "desc";
  const sorted = [...editions].sort((a, b) => {
    const cmp =
      esort === "status"
        ? a.status.localeCompare(b.status)
        : esort === "stories"
          ? itemsOf(a) - itemsOf(b)
          : stampOf(a) - stampOf(b);
    return edir === "asc" ? cmp : -cmp;
  });

  const eSortLink = (key: string, label: string) => {
    const nextDir = esort === key && edir === "desc" ? "asc" : "desc";
    return (
      <Link
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
        <h2 style={h2}>Showcase editions</h2>
        <p style={muted}>
          The Showcase is built one edition at a time. New Showcase starts a
          draft pre-filled with the latest high-relevance stories and the
          current Shows in the Spotlight list; edit it, preview it, then send it to
          the test list. Sent editions stay here as history.
        </p>
        <form
          action="/api/admin/showcase-edition"
          method="post"
          style={{ marginBottom: 16 }}
        >
          <input type="hidden" name="action" value="create" />
          <button
            type="submit"
            style={{ ...buttonStyle, background: "var(--cta-yellow)" }}
          >
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
              {sorted.map((e) => {
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
                    <td style={td}>{e.recipients ?? ""}</td>
                    <td style={{ ...td, whiteSpace: "nowrap" }}>
                      {editable && (
                        <Link
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
                        <form
                          action="/api/admin/presenter-send"
                          method="post"
                          style={{ display: "inline", marginRight: 6 }}
                        >
                          <input type="hidden" name="edition" value={e.id} />
                          <ConfirmSubmit
                            message={`Send this Showcase to the test list (${recipients.join(", ")}) now?`}
                            style={{ ...smallButton, background: "var(--cta-yellow)" }}
                          >
                            Send
                          </ConfirmSubmit>
                        </form>
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
                          style={dangerButton}
                        >
                          Delete
                        </ConfirmSubmit>
                      </form>
                    </td>
                  </tr>
                );
              })}
              {sorted.length === 0 && (
                <tr>
                  <td style={td} colSpan={6}>
                    No Showcases yet. Press New Showcase to build the first
                    one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-card">
        <h2 style={h2}>Test recipients</h2>
        <p style={muted}>
          The Showcase is in test mode. Sends and new-story notifications go
          only to this list.
        </p>
        <form
          action="/api/admin/presenter-recipients"
          method="post"
          style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}
        >
          <input
            type="text"
            name="emails"
            defaultValue={recipients.join(", ")}
            placeholder="kevin@monkeybaa.com.au"
            style={{ ...inputStyle, flex: "1 1 280px", minWidth: 220 }}
          />
          <button type="submit" style={buttonStyle}>
            Save test list
          </button>
        </form>
      </section>

      <section className="admin-card">
        <h2 style={h2}>Story pool</h2>
        <p style={muted}>
          Every story the feed has brought in, rated by the AI twice: once
          for show relevance and once for Social Theatre (theatre in health,
          access and community settings, not education or fundraising).
          Stories rated <strong>High</strong> on either scale are offered to
          each New Showcase automatically, in the matching section. Change a
          rating here to promote a missed story or keep one out for good.
        </p>
        <StoryPoolTable
          pool={pool}
          usedDates={usedDates}
          nameByKey={nameByKey}
          companyRows={companyRows}
          mode="browse"
          params={params}
        />
      </section>

      <section className="admin-card">
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
                      <input type="hidden" name="action" value="delete" />
                      <input type="hidden" name="id" value={s.id} />
                      <ConfirmSubmit
                        message={`Delete ${s.title} from the show list permanently?`}
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
          <input type="hidden" name="action" value="add" />
          <input
            name="title"
            required
            placeholder="Show title"
            style={{ ...inputStyle, minWidth: 180, flex: "1 1 180px" }}
          />
          <select name="companyKey" style={inputStyle}>
            {companyRows.map((c) => (
              <option key={c.key} value={c.key}>
                {c.name}
              </option>
            ))}
          </select>
          <input
            name="url"
            type="url"
            placeholder="Show page URL (optional)"
            style={{ ...inputStyle, minWidth: 180, flex: "1 1 180px" }}
          />
          <input
            name="imageUrl"
            placeholder="Image URL (optional)"
            style={{ ...inputStyle, minWidth: 160, flex: "1 1 160px" }}
          />
          <input
            name="ageRange"
            placeholder="Ages (optional)"
            style={{ ...inputStyle, width: 130 }}
          />
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
function StoryPoolTable({
  pool,
  usedDates,
  nameByKey,
  companyRows,
  mode,
  editionId,
  params,
}: {
  pool: StoryPoolPage;
  usedDates: Map<number, Date | null>;
  nameByKey: Map<string, string>;
  companyRows: { key: string; name: string }[];
  mode: "browse" | "add";
  editionId?: number;
  params: ShowcaseListParams;
}) {
  const { rows, hasMore } = pool;
  const href = (over: Partial<ShowcaseListParams>) => {
    // Changing sort or filters implicitly resets to page 1 unless the
    // override sets pg itself.
    const merged = { ...params, pg: 1, ...over };
    const q = new URLSearchParams({ tab: "presenters" });
    if (editionId) q.set("edition", String(editionId));
    if (merged.rel !== "high") q.set("rel", merged.rel);
    if (merged.co) q.set("co", merged.co);
    if (merged.q) q.set("q", merged.q);
    if (merged.sort !== "date") q.set("sort", merged.sort);
    if (merged.dir !== "desc") q.set("dir", merged.dir);
    if (merged.pg > 1) q.set("pg", String(merged.pg));
    return `/admin?${q.toString()}`;
  };
  const sortLink = (key: ShowcaseListParams["sort"], label: string) => (
    <Link
      href={href({
        sort: key,
        dir: params.sort === key && params.dir === "desc" ? "asc" : "desc",
      })}
      style={{ color: "inherit", textDecoration: "none" }}
    >
      {label}
      {params.sort === key ? (params.dir === "asc" ? " ↑" : " ↓") : ""}
    </Link>
  );
  const isFiltered =
    params.rel !== "high" ||
    params.co ||
    params.q ||
    params.sort !== "date" ||
    params.pg > 1;

  return (
    <>
      <form
        method="get"
        action="/admin"
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
            href={
              editionId
                ? `/admin?tab=presenters&edition=${editionId}`
                : "/admin?tab=presenters"
            }
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
              <Link href={href({})} style={{ color: "var(--cta-ink)", fontWeight: 600 }}>
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
                      {p.aiHeading.length > 70 ? "…" : ""}{" "}
                      <a
                        href={p.postUrl}
                        target="_blank"
                        style={{ color: "var(--cta-ink)", fontWeight: 600 }}
                      >
                        ↗
                      </a>
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
                      <RatingsForm
                        itemId={p.id}
                        show={p.presenterRelevance}
                        social={p.socialRelevance}
                      />
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
                  href={href({ pg: params.pg - 1 })}
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
                  href={href({ pg: params.pg + 1 })}
                  style={{ ...smallButton, textDecoration: "none", background: "var(--cta-white)" }}
                >
                  Further back →
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
  const [entries, editionShows, companyRows, recipients, pool, usedDates, registry] =
    await Promise.all([
      getEditionItems(edition.id),
      getEditionShows(edition.id),
      db().select().from(companies).orderBy(asc(companies.name)),
      getPresenterRecipients(),
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
    ]);
  const nameByKey = new Map(companyRows.map((c) => [c.key, c.name]));
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
            ? `Sent ${edition.sentAt?.toISOString().slice(0, 10) ?? ""} to ${edition.recipients ?? ""}. Sent editions are read-only; duplicate to reuse it.`
            : `Started ${edition.createdAt.toISOString().slice(0, 10)}. ${profileCount} profile${profileCount === 1 ? "" : "s"}, ${socialCount} Social Theatre stor${socialCount === 1 ? "y" : "ies"}, ${entries.length - profileCount - socialCount} more stor${entries.length - profileCount - socialCount === 1 ? "y" : "ies"}, ${editionShows.length} spotlight show${editionShows.length === 1 ? "" : "s"}.`}
        </p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <Link
            href="/admin?tab=presenters"
            style={{ ...buttonStyle, textDecoration: "none", background: "var(--cta-white)" }}
          >
            ← All editions
          </Link>
          <a
            href={`/admin/preview/presenter?edition=${edition.id}`}
            target="_blank"
            style={{ ...buttonStyle, textDecoration: "none", background: "var(--cta-white)" }}
          >
            Preview ↗
          </a>
          {editable && (
            <form action="/api/admin/presenter-send" method="post">
              <input type="hidden" name="edition" value={edition.id} />
              <ConfirmSubmit
                message={`Send this Showcase to the test list (${recipients.join(", ")}) now?`}
                style={{ ...buttonStyle, background: "var(--cta-yellow)" }}
              >
                Send to test list
              </ConfirmSubmit>
            </form>
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
              style={{ ...buttonStyle, background: "var(--cta-white)" }}
            >
              Delete
            </ConfirmSubmit>
          </form>
        </div>
      </section>

      <section className="admin-card">
        <h2 style={h2}>News stories in this Showcase</h2>
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
            No news stories yet. Add some from the list below.
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
            />
          ))}
      </section>

      {editable && (
        <section className="admin-card">
          <h2 style={h2}>Social Theatre</h2>
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
            />
          ))}
        </section>
      )}

      {editable && (
        <section className="admin-card">
          <h2 style={h2}>Add stories</h2>
          <p style={muted}>
            Stories not yet in this Showcase. High relevance is shown by
            default; switch the rating filter, search, or page further back
            to dig deeper. Stories marked <strong>Sent</strong> have already
            appeared in a past Showcase but can be added again on purpose.
          </p>
          <StoryPoolTable
            pool={pool}
            usedDates={usedDates}
            nameByKey={nameByKey}
            companyRows={companyRows}
            mode="add"
            editionId={edition.id}
            params={params}
          />
        </section>
      )}

      <section className="admin-card">
        <h2 style={h2}>Spotlight shows in this Showcase</h2>
        <p style={muted}>
          The show grid at the bottom of this edition, two cards per row.
          {editable &&
            " Remove a show from this edition here; manage the full registry on the main Showcase page."}
        </p>
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
              <form action="/api/admin/showcase-edition" method="post">
                <input type="hidden" name="action" value="remove-show" />
                <input type="hidden" name="id" value={edition.id} />
                <input type="hidden" name="showId" value={s.id} />
                <button type="submit" style={dangerButton}>
                  Remove
                </button>
              </form>
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
}: {
  it: FeedItem;
  featured: boolean;
  isSocial: boolean;
  index: number;
  editionId: number;
  company: string;
  showsPageUrl: string | null;
}) {
  return (
            <div
              key={it.id}
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
                  {" · "}
                  <a
                    href={it.postUrl}
                    target="_blank"
                    style={{ color: "var(--cta-ink)", fontWeight: 600 }}
                  >
                    original post ↗
                  </a>
                </div>

                <form action="/api/admin/presenter-item" method="post" id={`sc-${it.id}`}>
                  <input type="hidden" name="action" value="update" />
                  <input type="hidden" name="id" value={it.id} />
                  <input type="hidden" name="edition" value={editionId} />
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
                                  background: "#FFECCA",
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
                      style={{ ...smallButton, background: "var(--cta-yellow)" }}
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
                    Companies tab.
                  </div>
                )}
              </details>
              <MoveButtons editionId={editionId} itemId={it.id} />
            </div>
  );
}
