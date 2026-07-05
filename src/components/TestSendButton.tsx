"use client";

import { useId, useState } from "react";
import AdminModal from "./AdminModal";

/**
 * "Send test" as a popup: type one or several addresses (prefilled with
 * the last-used test list), confirm, and the hidden form posts to the
 * given route. The route remembers the addresses for next time.
 */
export default function TestSendButton({
  action,
  hidden,
  defaultTo,
  intro,
  style,
  children = "Send test",
}: {
  /** Route to post to (send-test or presenter-send). */
  action: string;
  /** Hidden fields, e.g. { cadence: "weekly" } or { edition: "3", mode: "test" }. */
  hidden: Record<string, string>;
  /** Last-used test addresses, prefilled and editable. */
  defaultTo: string;
  /** One line above the address box. */
  intro: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const formId = useId();
  return (
    <>
      <form id={formId} action={action} method="post" style={{ display: "none" }}>
        {Object.entries(hidden).map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={v} />
        ))}
      </form>
      <button type="button" style={style} onClick={() => setOpen(true)}>
        {children}
      </button>
      <AdminModal
        open={open}
        title="Send a test"
        confirmLabel="Send test"
        onConfirm={() => {
          (document.getElementById(formId) as HTMLFormElement | null)?.requestSubmit();
        }}
        onClose={() => setOpen(false)}
        message={
          <>
            <span style={{ display: "block", marginBottom: 10 }}>
              {intro} Separate several addresses with commas or new lines.
              The addresses are remembered for the next test.
            </span>
            <textarea
              name="to"
              form={formId}
              rows={3}
              defaultValue={defaultTo}
              placeholder="you@example.org, colleague@example.org"
              style={{
                width: "100%",
                fontFamily: "var(--font-body)",
                fontSize: 14,
                padding: "10px 12px",
                border: "2px solid var(--cta-ink)",
                borderRadius: 12,
                background: "var(--cta-white)",
                resize: "vertical",
              }}
            />
          </>
        }
      />
    </>
  );
}
