"use client";

import { useState } from "react";

/**
 * The activity log panel for Settings. Collapsed by default; the log rows
 * are fetched from /api/admin/logs only when it is first opened (and on
 * Refresh), so this never touches the Settings page load. Errors, warnings
 * and subscriber lifecycle events only — sends and editions live elsewhere.
 */
interface LogRow {
  id: number;
  createdAt: string;
  level: "error" | "warning" | "info";
  category: string;
  message: string;
}

type Filter = "all" | "error" | "warning" | "info";

const LEVEL_COLOR: Record<LogRow["level"], string> = {
  error: "var(--cta-pink)",
  warning: "var(--cta-yellow)",
  info: "var(--cta-mint)",
};

function stamp(iso: string): string {
  const parts = new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Sydney",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZoneName: "short",
  }).formatToParts(new Date(iso));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const hour = get("hour") === "24" ? "00" : get("hour");
  return `${get("year")}-${get("month")}-${get("day")} ${hour}:${get("minute")} ${get("timeZoneName")}`;
}

export default function LogViewer() {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<LogRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");

  async function load(next: Filter) {
    setLoading(true);
    setError(null);
    try {
      const q = next === "all" ? "" : `?level=${next}`;
      const res = await fetch(`/api/admin/logs${q}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const data = (await res.json()) as { rows: LogRow[] };
      setRows(data.rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load the log.");
    } finally {
      setLoading(false);
    }
  }

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next && rows === null) void load(filter);
  }

  function changeFilter(f: Filter) {
    setFilter(f);
    void load(f);
  }

  const th: React.CSSProperties = {
    textAlign: "left",
    padding: "8px 10px",
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: "var(--text-muted)",
    borderBottom: "2px solid var(--cta-ink)",
    whiteSpace: "nowrap",
  };
  const td: React.CSSProperties = {
    padding: "8px 10px",
    fontSize: 12.5,
    borderBottom: "1px solid rgba(0,0,0,0.08)",
    verticalAlign: "top",
  };
  const chip = (active: boolean): React.CSSProperties => ({
    fontFamily: "var(--font-body)",
    fontSize: 12,
    fontWeight: 700,
    color: "var(--cta-ink)",
    background: active ? "var(--cta-purple)" : "var(--cta-white)",
    border: "2px solid var(--cta-ink)",
    borderRadius: 8,
    padding: "5px 11px",
    cursor: "pointer",
  });

  return (
    <div>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        style={{
          fontFamily: "var(--font-body)",
          fontSize: 13,
          fontWeight: 700,
          color: "var(--cta-ink)",
          background: "var(--cta-white)",
          border: "2px solid var(--cta-ink)",
          borderRadius: 8,
          padding: "8px 14px",
          cursor: "pointer",
        }}
      >
        {open ? "Hide activity log ▴" : "Show activity log ▾"}
      </button>

      {open && (
        <div style={{ marginTop: 16 }}>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              alignItems: "center",
              marginBottom: 14,
            }}
          >
            {(["all", "error", "warning", "info"] as const).map((f) => (
              <button
                key={f}
                type="button"
                style={chip(filter === f)}
                onClick={() => changeFilter(f)}
              >
                {f === "all"
                  ? "All"
                  : f === "error"
                    ? "Errors"
                    : f === "warning"
                      ? "Warnings"
                      : "Info"}
              </button>
            ))}
            <button
              type="button"
              style={{ ...chip(false), marginLeft: "auto" }}
              onClick={() => load(filter)}
            >
              Refresh
            </button>
          </div>

          {loading ? (
            <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>
              Loading…
            </p>
          ) : error ? (
            <p style={{ fontSize: 13, color: "var(--cta-ink)", margin: 0 }}>
              {error}
            </p>
          ) : rows && rows.length > 0 ? (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={th}>When</th>
                    <th style={th}>Level</th>
                    <th style={th}>Category</th>
                    <th style={th}>Message</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <td style={{ ...td, whiteSpace: "nowrap" }}>
                        {stamp(r.createdAt)}
                      </td>
                      <td style={td}>
                        <span
                          style={{
                            display: "inline-block",
                            background: LEVEL_COLOR[r.level],
                            color: "var(--cta-ink)",
                            border: "2px solid var(--cta-ink)",
                            borderRadius: 999,
                            padding: "2px 10px",
                            fontSize: 10.5,
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: "0.04em",
                          }}
                        >
                          {r.level}
                        </span>
                      </td>
                      <td style={{ ...td, whiteSpace: "nowrap" }}>{r.category}</td>
                      <td style={{ ...td, minWidth: 240 }}>{r.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>
              Nothing logged yet.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
