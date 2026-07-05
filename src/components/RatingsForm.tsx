"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import AdminModal from "./AdminModal";
import Toast, { useToast } from "./Toast";

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
 * The show/social relevance pair in the story pool. Each change saves
 * itself in the background (no Save button, no reload), like the review
 * queue's company picker; a brief tick confirms the save.
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
  // When fresh server values arrive (e.g. after a refresh re-rates the
  // story), adopt them — otherwise the selects keep the load-time values.
  const [lastProps, setLastProps] = useState({ show, social });
  if (show !== lastProps.show || social !== lastProps.social) {
    setLastProps({ show, social });
    setShowVal(show);
    setSocialVal(social);
  }
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast, show: showToast } = useToast();
  const [, startTransition] = useTransition();

  const save = async (relevance: string, socialRelevance: string) => {
    const res = await fetch("/api/admin/presenter-item", {
      method: "POST",
      headers: { "x-quick": "1" },
      body: new URLSearchParams({
        action: "ratings",
        id: String(itemId),
        relevance,
        socialRelevance,
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.message ?? "Could not save the ratings.");
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
      showToast("Ratings saved");
    }
    startTransition(() => router.refresh());
  };

  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
      <label style={labelStyle}>
        Show{" "}
        <select
          value={showVal}
          onChange={(e) => {
            setShowVal(e.target.value);
            save(e.target.value, socialVal);
          }}
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
          onChange={(e) => {
            setSocialVal(e.target.value);
            save(showVal, e.target.value);
          }}
          style={{ ...selectStyle, background: "var(--cta-mint)" }}
        >
          <option value="high">high</option>
          <option value="medium">medium</option>
          <option value="low">low</option>
        </select>
      </label>
      <span
        aria-live="polite"
        style={{
          fontSize: 13,
          fontWeight: 700,
          color: "var(--cta-emerald)",
          opacity: saved ? 1 : 0,
          transition: "opacity 0.2s",
          width: 14,
        }}
      >
        ✓
      </span>
      <AdminModal
        open={error !== null}
        title="That didn't work"
        message={error ?? ""}
        onClose={() => setError(null)}
      />
      <Toast message={toast} />
    </div>
  );
}
