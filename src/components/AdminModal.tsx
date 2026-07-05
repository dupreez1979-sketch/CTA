"use client";

import { useEffect } from "react";

/**
 * Branded replacement for the browser's confirm/alert popups: dimmed
 * backdrop, cream card with the house border and hard shadow, display-type
 * title. With onConfirm it renders Cancel + confirm buttons; without it,
 * a single OK.
 */
export default function AdminModal({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  danger = false,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm?: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const button: React.CSSProperties = {
    fontFamily: "var(--font-body)",
    fontWeight: 700,
    fontSize: 14,
    color: "var(--cta-ink)",
    border: "2px solid var(--cta-ink)",
    borderRadius: 12,
    padding: "10px 18px",
    cursor: "pointer",
    boxShadow: "3px 3px 0 var(--cta-ink)",
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(30,30,29,0.55)",
        zIndex: 1000,
        display: "grid",
        placeItems: "center",
        padding: 20,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--cta-cream-warm)",
          border: "3px solid var(--cta-ink)",
          borderRadius: 18,
          boxShadow: "10px 10px 0 var(--cta-ink)",
          maxWidth: 560,
          width: "100%",
          padding: "26px 26px 22px",
          // Never taller than the visible screen (phone keyboards shrink
          // it further): scroll inside the card instead of clipping.
          maxHeight: "calc(100dvh - 32px)",
          overflowY: "auto",
        }}
      >
        <h2
          style={{
            fontFamily: "var(--font-display)",
            textTransform: "uppercase",
            fontSize: 26,
            lineHeight: 0.94,
            margin: "0 0 12px",
            color: "var(--cta-ink)",
          }}
        >
          {title}
        </h2>
        <div
          style={{
            fontFamily: "var(--font-body)",
            fontSize: 14.5,
            lineHeight: 1.55,
            color: "var(--text-body, var(--cta-ink))",
            margin: "0 0 20px",
            overflowWrap: "break-word",
            whiteSpace: "normal",
          }}
        >
          {message}
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" }}>
          {onConfirm && (
            <button
              type="button"
              onClick={onClose}
              style={{ ...button, background: "var(--cta-white)" }}
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            autoFocus
            onClick={() => {
              if (onConfirm) onConfirm();
              onClose();
            }}
            style={{
              ...button,
              background: onConfirm
                ? danger
                  ? "var(--cta-pink)"
                  : "var(--cta-yellow)"
                : "var(--cta-purple)",
            }}
          >
            {onConfirm ? confirmLabel : "OK"}
          </button>
        </div>
      </div>
    </div>
  );
}
