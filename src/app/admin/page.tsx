import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import {
  db,
  subscribers,
  issues,
  companies,
  feedItems,
  presenterSends,
  shows,
} from "@/lib/db";
import { loadCompanies } from "@/lib/company-store";
import { getAiSpend } from "@/lib/ai-spend";
import { getNotifyEmails } from "@/lib/notify";
import { compareDrafts, getPresenterRecipients } from "@/lib/presenter";
import {
  SCHEDULE_DESCRIPTION,
  formatSydneyDateTime,
  nextSendAt,
} from "@/lib/cadence";
import ConfirmSubmit from "@/components/ConfirmSubmit";

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
  searchParams: Promise<{ message?: string; tab?: string }>;
}) {
  const { message, tab: rawTab } = await searchParams;
  const tab: Tab = (TABS.find((t) => t.id === rawTab)?.id ?? "overview") as Tab;

  return (
    <main className="admin-main">
      <h1 className="admin-title">Alliance Newsletter Admin</h1>
      <p style={{ color: "var(--text-muted)", margin: "0 0 24px" }}>
        The pipeline runs automatically every morning (Sydney time).
      </p>

      <nav className="admin-tabs">
        {TABS.map((t) => (
          <a
            key={t.id}
            href={`/admin?tab=${t.id}`}
            className="admin-tab"
            aria-current={tab === t.id}
          >
            {t.label}
          </a>
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
      {tab === "presenters" && <ShowcaseTab />}
    </main>
  );
}

async function OverviewTab() {
  const counts = await db()
    .select({
      cadence: subscribers.cadence,
      count: sql<number>`count(*)::int`,
    })
    .from(subscribers)
    .where(eq(subscribers.status, "active"))
    .groupBy(subscribers.cadence);
  const countByCadence = Object.fromEntries(
    counts.map((c) => [c.cadence, c.count]),
  );

  const recentIssues = await db()
    .select()
    .from(issues)
    .orderBy(desc(issues.id))
    .limit(20);

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
  const counts = await db()
    .select({
      cadence: subscribers.cadence,
      count: sql<number>`count(*)::int`,
    })
    .from(subscribers)
    .where(eq(subscribers.status, "active"))
    .groupBy(subscribers.cadence);
  const countByCadence = Object.fromEntries(
    counts.map((c) => [c.cadence, c.count]),
  );

  const recent = await db()
    .select()
    .from(subscribers)
    .orderBy(desc(subscribers.createdAt))
    .limit(200);

  const notifyEmails = await getNotifyEmails();

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
  const companyRows = await db()
    .select()
    .from(companies)
    .orderBy(asc(companies.name));

  const unfiled = await db()
    .select()
    .from(feedItems)
    .where(
      and(
        eq(feedItems.companyKey, "around-the-alliance"),
        eq(feedItems.reviewed, false),
      ),
    )
    .orderBy(desc(feedItems.publishedAt))
    .limit(15);

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

async function ShowcaseTab() {
  const [recipients, companyRows, draftItems, registry, recentSends] =
    await Promise.all([
      getPresenterRecipients(),
      db().select().from(companies).orderBy(asc(companies.name)),
      db()
        .select()
        .from(feedItems)
        .where(inArray(feedItems.presenterStatus, ["draft", "excluded"]))
        .limit(60),
      db().select().from(shows).orderBy(asc(shows.title)),
      db().select().from(presenterSends).orderBy(desc(presenterSends.id)).limit(10),
    ]);
  // Recent posts the classifier left out — promotable by hand.
  const otherPosts = await db()
    .select()
    .from(feedItems)
    .where(sql`${feedItems.presenterStatus} is null`)
    .orderBy(desc(feedItems.publishedAt))
    .limit(25);
  const nameByKey = new Map(companyRows.map((c) => [c.key, c.name]));
  const companyName = (key: string) => nameByKey.get(key) ?? "Around the Alliance";

  // Email order (position, then newest) for drafts; excluded items last.
  const drafts = draftItems
    .filter((i) => i.presenterStatus === "draft")
    .sort(compareDrafts);
  const excludedItems = draftItems
    .filter((i) => i.presenterStatus === "excluded")
    .sort(compareDrafts);
  const orderedItems = [...drafts, ...excludedItems];
  const profileCount = drafts.filter((i) => i.presenterFeatured).length;
  const activeShows = registry.filter((s) => s.status === "active");

  return (
    <>
      <section className="admin-card">
        <h2 style={h2}>The Showcase — test mode</h2>
        <p style={muted}>
          A special edition for presenters and international partners: only
          shows that can tour or be presented elsewhere. The morning pipeline
          files new show and tour announcements into the draft below and
          emails this list when there is something to review. It never sends
          itself — you review, edit and send from here.
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
        <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "10px 0 0" }}>
          Sends and draft notifications go only to these addresses while the
          edition is being tested.
        </p>
      </section>

      <section className="admin-card">
        <h2 style={h2}>Draft</h2>
        <p style={muted}>
          Show and tour announcements waiting for the next Showcase. Pick up
          to two as <strong>profiles</strong> (the big cards at the top),
          tidy the copy, and exclude anything that shouldn&#39;t travel. The
          official show fields are filled by automatic research of the
          company&#39;s shows page where possible — everything is editable.
          Cards are listed in the order they will appear in the email: use
          the ▲ ▼ arrows to reorder, and tap a card to open it for editing.
        </p>
        {draftItems.length === 0 && (
          <p style={{ ...muted, marginBottom: 0 }}>
            Nothing in the draft yet. New show announcements land here after
            each feed fetch; if the classifier missed one, add it below.
          </p>
        )}
        {orderedItems.map((it, i) => {
          const excluded = it.presenterStatus === "excluded";
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
                background: excluded ? "var(--cta-white)" : "var(--cta-cream-warm)",
                opacity: excluded ? 0.6 : 1,
              }}
            >
              <summary style={{ cursor: "pointer", fontSize: 13 }}>
                {!excluded && (
                  <span style={{ color: "var(--text-muted)", fontWeight: 600 }}>
                    {i + 1}.{" "}
                  </span>
                )}
                <strong>
                  {(it.showTitle ?? it.aiHeading).slice(0, 70)}
                  {(it.showTitle ?? it.aiHeading).length > 70 ? "…" : ""}
                </strong>
                {" · "}
                {companyName(it.companyKey)}
                {" · "}
                {it.publishedAt.toISOString().slice(0, 10)}
                {it.presenterFeatured && !excluded && (
                  <span
                    style={{
                      marginLeft: 8,
                      background: "var(--cta-yellow)",
                      border: "2px solid var(--cta-ink)",
                      borderRadius: 999,
                      padding: "2px 9px",
                      fontSize: 11,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                    }}
                  >
                    Profile
                  </span>
                )}
                {excluded && (
                  <span style={{ marginLeft: 8, color: "var(--text-muted)", fontWeight: 600 }}>
                    (excluded)
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
                  <label style={fieldLabel}>Show title</label>
                  <input
                    form={`sc-${it.id}`}
                    name="showTitle"
                    defaultValue={it.showTitle ?? ""}
                    placeholder="e.g. The Peasant Prince"
                    style={{ ...smallInput, width: "100%" }}
                  />
                  <label style={fieldLabel}>Age range</label>
                  <input
                    form={`sc-${it.id}`}
                    name="showAgeRange"
                    defaultValue={it.showAgeRange ?? ""}
                    placeholder="e.g. ages 6 to 12"
                    style={{ ...smallInput, width: "100%" }}
                  />
                </div>
                <div>
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
                {!excluded && (
                  <form action="/api/admin/presenter-item" method="post" style={{ display: "inline" }}>
                    <input
                      type="hidden"
                      name="action"
                      value={it.presenterFeatured ? "unfeature" : "feature"}
                    />
                    <input type="hidden" name="id" value={it.id} />
                    <button
                      type="submit"
                      style={{ ...smallButton, background: "var(--cta-yellow)" }}
                    >
                      {it.presenterFeatured ? "Remove profile" : "Make profile"}
                    </button>
                  </form>
                )}
                <form action="/api/admin/presenter-research" method="post" style={{ display: "inline" }}>
                  <input type="hidden" name="id" value={it.id} />
                  <button
                    type="submit"
                    style={{ ...smallButton, background: "var(--cta-white)" }}
                  >
                    {it.presenterResearchedAt ? "Re-research" : "Research"}
                  </button>
                </form>
                <form action="/api/admin/presenter-item" method="post" style={{ display: "inline" }}>
                  <input type="hidden" name="action" value="add-show" />
                  <input type="hidden" name="id" value={it.id} />
                  <button
                    type="submit"
                    style={{ ...smallButton, background: "var(--cta-white)" }}
                  >
                    Add to What&#39;s happening
                  </button>
                </form>
                <form action="/api/admin/presenter-item" method="post" style={{ display: "inline" }}>
                  <input
                    type="hidden"
                    name="action"
                    value={excluded ? "restore" : "exclude"}
                  />
                  <input type="hidden" name="id" value={it.id} />
                  <button type="submit" style={dangerButton}>
                    {excluded ? "Restore" : "Exclude"}
                  </button>
                </form>
              </div>
            </details>
            {!excluded && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <form action="/api/admin/presenter-item" method="post">
                  <input type="hidden" name="action" value="move-up" />
                  <input type="hidden" name="id" value={it.id} />
                  <button
                    type="submit"
                    aria-label="Move up"
                    style={{ ...smallButton, background: "var(--cta-white)", padding: "6px 10px" }}
                  >
                    ▲
                  </button>
                </form>
                <form action="/api/admin/presenter-item" method="post">
                  <input type="hidden" name="action" value="move-down" />
                  <input type="hidden" name="id" value={it.id} />
                  <button
                    type="submit"
                    aria-label="Move down"
                    style={{ ...smallButton, background: "var(--cta-white)", padding: "6px 10px" }}
                  >
                    ▼
                  </button>
                </form>
              </div>
            )}
            </div>
          );
        })}
        {otherPosts.length > 0 && (
          <form
            action="/api/admin/presenter-item"
            method="post"
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              alignItems: "center",
              marginTop: 6,
              paddingTop: 16,
              borderTop: "2px dashed rgba(30,30,29,0.25)",
            }}
          >
            <input type="hidden" name="action" value="promote" />
            <span style={{ fontSize: 13, fontWeight: 600 }}>
              Classifier missed one?
            </span>
            <select name="id" style={{ ...smallInput, maxWidth: 380 }}>
              {otherPosts.map((p) => (
                <option key={p.id} value={p.id}>
                  {companyName(p.companyKey)}: {p.aiHeading.slice(0, 60)}
                </option>
              ))}
            </select>
            <button type="submit" style={smallButton}>
              Add to draft
            </button>
          </form>
        )}
      </section>

      <section className="admin-card">
        <h2 style={h2}>What&#39;s happening</h2>
        <p style={muted}>
          The curated list of shows available now, shown at the bottom of
          every Showcase. Add shows here by hand or with &quot;Add to
          What&#39;s happening&quot; on a draft item. Archive a show to take
          it out of the email without losing it.
        </p>
        <div className="table-scroll">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th}>Show</th>
                <th style={th}>Company</th>
                <th style={th}>Show page URL</th>
                <th style={th}>Blurb</th>
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
                    {companyName(s.companyKey)}
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
                  <td style={td} colSpan={6}>
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
            name="ageRange"
            placeholder="Ages (optional)"
            style={{ ...inputStyle, width: 130 }}
          />
          <button type="submit" style={buttonStyle}>
            Add show
          </button>
        </form>
      </section>

      <section className="admin-card">
        <h2 style={h2}>Preview and send</h2>
        <p style={muted}>
          The next Showcase holds <strong>{profileCount}</strong> profile
          {profileCount === 1 ? "" : "s"},{" "}
          <strong>{drafts.length - profileCount}</strong> further item
          {drafts.length - profileCount === 1 ? "" : "s"} and{" "}
          <strong>{activeShows.length}</strong> show
          {activeShows.length === 1 ? "" : "s"} in What&#39;s happening.
        </p>
        <div
          style={{
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            alignItems: "center",
            marginBottom: 18,
          }}
        >
          <a
            href="/admin/preview/presenter"
            target="_blank"
            style={{
              ...buttonStyle,
              textDecoration: "none",
              background: "var(--cta-white)",
            }}
          >
            Preview The Showcase ↗
          </a>
          <form action="/api/admin/presenter-send" method="post">
            <ConfirmSubmit
              message={`Send The Showcase to the test list (${recipients.join(", ")}) now? The ${drafts.length} draft item${drafts.length === 1 ? "" : "s"} will be marked as sent.`}
              style={{ ...buttonStyle, background: "var(--cta-yellow)" }}
            >
              Send to test list
            </ConfirmSubmit>
          </form>
        </div>
        <h2 style={{ ...h2, fontSize: 20 }}>Recent Showcase sends</h2>
        <div className="table-scroll">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th}>Sent at</th>
                <th style={th}>Status</th>
                <th style={th}>Items</th>
                <th style={th}>Profiles</th>
                <th style={th}>Recipients</th>
              </tr>
            </thead>
            <tbody>
              {recentSends.map((s) => (
                <tr key={s.id}>
                  <td style={td}>
                    {s.sentAt
                      ? s.sentAt.toISOString().replace("T", " ").slice(0, 16)
                      : "—"}
                  </td>
                  <td style={td}>{s.status}</td>
                  <td style={td}>{s.itemCount}</td>
                  <td style={td}>{s.profileCount}</td>
                  <td style={td}>{s.recipients ?? s.recipientCount}</td>
                </tr>
              ))}
              {recentSends.length === 0 && (
                <tr>
                  <td style={td} colSpan={5}>
                    No Showcase sends yet.
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
