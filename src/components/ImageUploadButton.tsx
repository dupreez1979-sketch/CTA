"use client";

import { useRef, useState } from "react";

/**
 * "Add image" button for the Alliance-update composer: pick an image file,
 * upload it (hosted on Netlify Blobs via the given route), then insert a
 * markdown image line — `![](<url>)` — into the target textarea at the cursor.
 * The textarea is uncontrolled, so writing its `.value` is enough for the
 * surrounding form to submit the new content.
 */
export default function ImageUploadButton({
  targetId,
  action = "/api/admin/alliance-image",
  style,
}: {
  targetId: string;
  action?: string;
  style?: React.CSSProperties;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow picking the same file again later
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      const data = new FormData();
      data.append("file", file);
      const res = await fetch(action, { method: "POST", body: data });
      const body = (await res.json().catch(() => null)) as
        | { url?: string; error?: string }
        | null;
      if (!res.ok || !body?.url)
        throw new Error(body?.error ?? "Upload failed");
      insertIntoTextarea(targetId, `\n![](${body.url})\n`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={onPick}
        style={{ display: "none" }}
      />
      <button
        type="button"
        disabled={busy}
        style={{ ...style, opacity: busy ? 0.6 : 1 }}
        onClick={() => inputRef.current?.click()}
      >
        {busy ? "Uploading…" : "Add image"}
      </button>
      {error && (
        <span style={{ color: "var(--cta-pink)", fontSize: 12, fontWeight: 600 }}>
          {error}
        </span>
      )}
    </span>
  );
}

function insertIntoTextarea(id: string, text: string) {
  const el = document.getElementById(id) as HTMLTextAreaElement | null;
  if (!el) return;
  const start = el.selectionStart ?? el.value.length;
  const end = el.selectionEnd ?? el.value.length;
  el.value = el.value.slice(0, start) + text + el.value.slice(end);
  const pos = start + text.length;
  el.focus();
  el.setSelectionRange(pos, pos);
}
