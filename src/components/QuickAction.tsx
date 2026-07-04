"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import AdminModal from "./AdminModal";

/**
 * A button that performs an admin action in the background and refreshes
 * the page data in place: no redirect, no full reload, no scroll jump.
 * Success needs no banner (the UI change is the feedback); genuine
 * problems come back as a pop-up so they are never silently lost.
 */
export default function QuickAction({
  fields,
  children,
  style,
  confirm,
}: {
  fields: Record<string, string | number>;
  children: React.ReactNode;
  style?: React.CSSProperties;
  confirm?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const run = async () => {
    if (busy || pending) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/presenter-item", {
        method: "POST",
        headers: { "x-quick": "1" },
        body: new URLSearchParams(
          Object.fromEntries(
            Object.entries(fields).map(([k, v]) => [k, String(v)]),
          ),
        ),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(
          data?.message ?? "That didn't work. Refresh the page and try again.",
        );
      }
      startTransition(() => router.refresh());
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => (confirm ? setConfirming(true) : run())}
        disabled={busy || pending}
        style={{
          ...style,
          opacity: busy || pending ? 0.5 : 1,
          cursor: busy || pending ? "wait" : "pointer",
        }}
      >
        {children}
      </button>
      {confirm && (
        <AdminModal
          open={confirming}
          title="Just checking"
          message={confirm}
          confirmLabel="Yes, go ahead"
          onConfirm={run}
          onClose={() => setConfirming(false)}
        />
      )}
      <AdminModal
        open={error !== null}
        title="That didn't work"
        message={error ?? ""}
        onClose={() => setError(null)}
      />
    </>
  );
}
