"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import AdminModal from "./AdminModal";

const selectStyle: React.CSSProperties = {
  fontFamily: "var(--font-body)",
  fontSize: 13,
  padding: "6px 8px",
  border: "2px solid var(--cta-ink)",
  borderRadius: 8,
  background: "var(--cta-white)",
};
const labelStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  color: "var(--text-muted)",
};

/**
 * The show/social relevance pair in the story pool. Saves in the
 * background (no reload); a brief tick confirms the save.
 */
export default function RatingsForm({
  itemId,
  show,
  social,
}: {
  itemId: number;
  show: string;
  social: string;
}) {
  const router = useRouter();
  const [showVal, setShowVal] = useState(show);
  const [socialVal, setSocialVal] = useState(social);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const save = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/presenter-item", {
        method: "POST",
        headers: { "x-quick": "1" },
        body: new URLSearchParams({
          action: "ratings",
          id: String(itemId),
          relevance: showVal,
          socialRelevance: socialVal,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.message ?? "Could not save the ratings.");
      } else {
        setSaved(true);
        setTimeout(() => setSaved(false), 1500);
      }
      startTransition(() => router.refresh());
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <label style={labelStyle}>
          Show{" "}
          <select
            value={showVal}
            onChange={(e) => setShowVal(e.target.value)}
            style={selectStyle}
          >
            <option value="high">high</option>
            <option value="medium">medium</option>
            <option value="low">low</option>
          </select>
        </label>
        <label style={labelStyle}>
          Social{" "}
          <select
            value={socialVal}
            onChange={(e) => setSocialVal(e.target.value)}
            style={{ ...selectStyle, background: "var(--cta-mint)" }}
          >
            <option value="high">high</option>
            <option value="medium">medium</option>
            <option value="low">low</option>
          </select>
        </label>
      </div>
      <button
        type="button"
        onClick={save}
        disabled={busy}
        style={{
          fontFamily: "var(--font-body)",
          fontWeight: 700,
          fontSize: 12,
          color: "var(--cta-ink)",
          background: saved ? "var(--cta-emerald)" : "var(--cta-white)",
          border: "2px solid var(--cta-ink)",
          borderRadius: 8,
          padding: "6px 12px",
          cursor: busy ? "wait" : "pointer",
          opacity: busy ? 0.5 : 1,
        }}
      >
        {saved ? "✓" : "Save"}
      </button>
      <AdminModal
        open={error !== null}
        title="That didn't work"
        message={error ?? ""}
        onClose={() => setError(null)}
      />
    </div>
  );
}
