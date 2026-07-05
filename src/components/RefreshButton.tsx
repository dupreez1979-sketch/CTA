"use client";

import { useState } from "react";

/**
 * Refresh with visible progress. Ingest can take a while (AI calls per
 * story), so this posts in the background and shows an indeterminate bar
 * while it runs, then loads the result page (with its banner) once done.
 */
export default function RefreshButton() {
  const [busy, setBusy] = useState(false);
  const run = async () => {
    if (busy) return;
    setBusy(true);
    try {
      // fetch follows the route's 303, so res.url is the final admin page
      // with the result banner in its query.
      const res = await fetch("/api/admin/ingest", { method: "POST" });
      window.location.href = res.url || "/admin?tab=review";
    } catch {
      window.location.href = "/admin?tab=review";
    }
  };
  return (
    <div>
      <button
        type="button"
        onClick={run}
        disabled={busy}
        style={{
          fontFamily: "var(--font-body)",
          fontWeight: 700,
          fontSize: 13,
          color: "var(--cta-ink)",
          background: "var(--cta-purple)",
          border: "2px solid var(--cta-ink)",
          borderRadius: 12,
          padding: "10px 16px",
          cursor: busy ? "wait" : "pointer",
          boxShadow: "3px 3px 0 var(--cta-ink)",
          opacity: busy ? 0.7 : 1,
        }}
      >
        {busy ? "Refreshing…" : "Refresh"}
      </button>
      {busy && (
        <div
          role="progressbar"
          aria-label="Refreshing stories"
          style={{
            marginTop: 10,
            height: 8,
            maxWidth: 260,
            border: "2px solid var(--cta-ink)",
            borderRadius: 999,
            overflow: "hidden",
            background: "var(--cta-white)",
          }}
        >
          <div className="refresh-progress-bar" />
        </div>
      )}
      {busy && (
        <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "6px 0 0" }}>
          Fetching feeds and writing story copy. This can take up to a
          minute; the page reloads when it is done.
        </p>
      )}
    </div>
  );
}
