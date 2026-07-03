import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db, subscribers, issues, companies, feedItems } from "@/lib/db";
import { loadCompanies } from "@/lib/company-store";
import { getAiSpend } from "@/lib/ai-spend";
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

  return (
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
        <button type="submit" style={buttonStyle}>
          Add company
        </button>
      </form>
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
