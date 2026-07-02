import { desc, eq, sql } from "drizzle-orm";
import { db, subscribers, issues } from "@/lib/db";

export const dynamic = "force-dynamic";

const CADENCES = ["daily", "weekly", "fortnightly"] as const;

/**
 * Admin dashboard (behind basic auth via middleware): subscriber counts
 * and list, issue previews, test sends, manual sends, recent issue log.
 */
export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const { message } = await searchParams;

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

  const recentIssues = await db()
    .select()
    .from(issues)
    .orderBy(desc(issues.id))
    .limit(20);

  const card: React.CSSProperties = {
    background: "var(--cta-white)",
    border: "3px solid var(--cta-ink)",
    borderRadius: 22,
    boxShadow: "10px 10px 0 var(--cta-ink)",
    padding: 26,
    marginBottom: 36,
  };
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
  const buttonStyle: React.CSSProperties = {
    fontFamily: "var(--font-body)",
    fontWeight: 700,
    fontSize: 13,
    color: "var(--cta-ink)",
    background: "var(--cta-purple)",
    border: "2px solid var(--cta-ink)",
    borderRadius: 12,
    padding: "8px 14px",
    cursor: "pointer",
    boxShadow: "3px 3px 0 var(--cta-ink)",
  };
  const inputStyle: React.CSSProperties = {
    fontFamily: "var(--font-body)",
    fontSize: 14,
    padding: "8px 10px",
    border: "2px solid var(--cta-ink)",
    borderRadius: 10,
    background: "var(--cta-white)",
  };

  return (
    <main style={{ maxWidth: 980, margin: "0 auto", padding: "48px 24px 96px" }}>
      <h1
        style={{
          fontFamily: "var(--font-display)",
          textTransform: "uppercase",
          fontSize: 46,
          lineHeight: 0.9,
          margin: "0 0 8px",
        }}
      >
        Alliance Newsletter Admin
      </h1>
      <p style={{ color: "var(--text-muted)", margin: "0 0 32px" }}>
        Subscribers, previews and sends. The daily pipeline runs
        automatically each morning (Sydney time).
      </p>

      {message && (
        <div
          style={{
            ...card,
            background: "var(--cta-mint)",
            padding: "14px 20px",
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          {message}
        </div>
      )}

      <section style={card}>
        <h2 style={h2}>Subscribers</h2>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 20 }}>
          {CADENCES.map((c) => (
            <div
              key={c}
              style={{
                border: "2px solid var(--cta-ink)",
                borderRadius: 14,
                padding: "12px 20px",
                background: "var(--cta-cream-warm)",
                boxShadow: "3px 3px 0 var(--cta-ink)",
              }}
            >
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
            style={{ ...buttonStyle, alignSelf: "center", textDecoration: "none" }}
          >
            Export CSV
          </a>
        </div>
        <div style={{ maxHeight: 340, overflow: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th}>Name</th>
                <th style={th}>Email</th>
                <th style={th}>Cadence</th>
                <th style={th}>Status</th>
                <th style={th}>Joined</th>
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
                        style={{
                          fontFamily: "var(--font-body)",
                          fontSize: 12.5,
                          padding: "4px 6px",
                          border: "2px solid var(--cta-ink)",
                          borderRadius: 8,
                          background: "var(--cta-white)",
                        }}
                      >
                        {CADENCES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                      <button
                        type="submit"
                        style={{
                          fontFamily: "var(--font-body)",
                          fontWeight: 700,
                          fontSize: 11.5,
                          color: "var(--cta-ink)",
                          background: "var(--cta-purple)",
                          border: "2px solid var(--cta-ink)",
                          borderRadius: 8,
                          padding: "4px 10px",
                          cursor: "pointer",
                        }}
                      >
                        Save
                      </button>
                    </form>
                  </td>
                  <td style={td}>{s.status}</td>
                  <td style={td}>{s.createdAt.toISOString().slice(0, 10)}</td>
                </tr>
              ))}
              {recent.length === 0 && (
                <tr>
                  <td style={td} colSpan={5}>
                    No subscribers yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section style={card}>
        <h2 style={h2}>Fetch new posts</h2>
        <p style={{ fontSize: 13.5, color: "var(--text-muted)", marginTop: 0 }}>
          Runs the same feed-ingest step as the daily pipeline: new posts get
          an AI headline and summary and appear in the previews below.
        </p>
        <form action="/api/admin/ingest" method="post">
          <button type="submit" style={buttonStyle}>
            Fetch new posts now
          </button>
        </form>
      </section>

      <section style={card}>
        <h2 style={h2}>Preview the next issue</h2>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {CADENCES.map((c) => (
            <a
              key={c}
              href={`/admin/preview/${c}`}
              target="_blank"
              style={{ ...buttonStyle, textDecoration: "none", background: "var(--cta-white)" }}
            >
              {c[0].toUpperCase() + c.slice(1)} preview ↗
            </a>
          ))}
        </div>
      </section>

      <section style={card}>
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
            style={{ ...inputStyle, minWidth: 240 }}
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

      <section style={card}>
        <h2 style={h2}>Send now</h2>
        <p style={{ fontSize: 13.5, color: "var(--text-muted)", marginTop: 0 }}>
          Sends the current window&#39;s issue to all active subscribers of
          that cadence. Safe to click twice — an already-sent window is never
          re-sent.
        </p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {CADENCES.map((c) => (
            <form key={c} action="/api/admin/send-now" method="post">
              <input type="hidden" name="cadence" value={c} />
              <button type="submit" style={{ ...buttonStyle, background: "var(--cta-yellow)" }}>
                Send {c} now
              </button>
            </form>
          ))}
        </div>
      </section>

      <section style={card}>
        <h2 style={h2}>Recent issues</h2>
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
                <td style={td}>{i.sentAt ? i.sentAt.toISOString().replace("T", " ").slice(0, 16) : "—"}</td>
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
      </section>
    </main>
  );
}
