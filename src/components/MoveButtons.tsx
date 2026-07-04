"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import Toast, { useToast } from "./Toast";

/**
 * The ▲▼ reorder buttons in the Showcase builder. Unlike the rest of the
 * admin (plain form posts with full page reloads), reordering is a rapid
 * repeated action, so these post in the background and refresh the page
 * data in place: no reload, no scroll jump, no collapsed cards elsewhere.
 * A toast confirms each move (and says so at the list's edge).
 */
export default function MoveButtons({
  editionId,
  itemId,
  kind = "story",
}: {
  editionId: number;
  /** The story's feed-item id, or the show's id when kind is "show". */
  itemId: number;
  kind?: "story" | "show";
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const { toast, show } = useToast();
  const [pending, startTransition] = useTransition();

  const move = async (dir: "up" | "down") => {
    if (busy || pending) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/presenter-item", {
        method: "POST",
        headers: { "x-quick": "1" },
        body: new URLSearchParams({
          action: kind === "show" ? `move-show-${dir}` : `move-${dir}`,
          id: String(itemId),
          edition: String(editionId),
        }),
      });
      const data = await res.json().catch(() => null);
      show(data?.message ?? (dir === "up" ? "Moved up" : "Moved down"));
      startTransition(() => router.refresh());
    } finally {
      setBusy(false);
    }
  };

  const style: React.CSSProperties = {
    fontFamily: "var(--font-body)",
    fontWeight: 700,
    fontSize: 12,
    color: "var(--cta-ink)",
    background: "var(--cta-white)",
    border: "2px solid var(--cta-ink)",
    borderRadius: 8,
    padding: "6px 10px",
    cursor: busy || pending ? "wait" : "pointer",
    opacity: busy || pending ? 0.5 : 1,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <button
        type="button"
        aria-label="Move up"
        disabled={busy || pending}
        onClick={() => move("up")}
        style={style}
      >
        ▲
      </button>
      <button
        type="button"
        aria-label="Move down"
        disabled={busy || pending}
        onClick={() => move("down")}
        style={style}
      >
        ▼
      </button>
      <Toast message={toast} />
    </div>
  );
}
