"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The admin's one lightweight feedback channel for background actions: a
 * small auto-dismissing pill, bottom-centre. Errors still use the modal;
 * this is for quiet confirmations ("Added", "Moved up", "Already first").
 */
export function useToast(ms = 2000) {
  const [toast, setToast] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  const show = (msg: string) => {
    setToast(msg);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), ms);
  };
  return { toast, show };
}

export default function Toast({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div
      role="status"
      style={{
        position: "fixed",
        left: "50%",
        bottom: 24,
        transform: "translateX(-50%)",
        zIndex: 1100,
        background: "var(--cta-ink)",
        color: "var(--cta-cream, #EFEEE4)",
        fontFamily: "var(--font-body)",
        fontWeight: 600,
        fontSize: 13.5,
        padding: "10px 18px",
        borderRadius: 999,
        maxWidth: "90vw",
        pointerEvents: "none",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
      }}
    >
      {message}
    </div>
  );
}
