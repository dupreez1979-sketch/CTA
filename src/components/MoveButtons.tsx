"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

/**
 * The ▲▼ reorder buttons in the Showcase builder. Unlike the rest of the
 * admin (plain form posts with full page reloads), reordering is a rapid
 * repeated action, so these post in the background and refresh the page
 * data in place: no reload, no scroll jump, no collapsed cards elsewhere.
 */
export default function MoveButtons({
  editionId,
  itemId,
}: {
  editionId: number;
  itemId: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [pending, startTransition] = useTransition();

  const move = async (action: "move-up" | "move-down") => {
    if (busy || pending) return;
    setBusy(true);
    try {
      await fetch("/api/admin/presenter-item", {
        method: "POST",
        body: new URLSearchParams({
          action,
          id: String(itemId),
          edition: String(editionId),
        }),
        redirect: "manual",
      });
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
        onClick={() => move("move-up")}
        style={style}
      >
        ▲
      </button>
      <button
        type="button"
        aria-label="Move down"
        disabled={busy || pending}
        onClick={() => move("move-down")}
        style={style}
      >
        ▼
      </button>
    </div>
  );
}
