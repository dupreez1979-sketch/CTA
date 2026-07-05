"use client";

import { useId, useState } from "react";
import AdminModal from "./AdminModal";

const label: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  color: "var(--text-muted)",
  margin: "10px 0 4px",
};

const input: React.CSSProperties = {
  width: "100%",
  fontFamily: "var(--font-body)",
  // 16px minimum so iOS doesn't zoom the page when a field gets focus.
  fontSize: 16,
  padding: "8px 12px",
  border: "2px solid var(--cta-ink)",
  borderRadius: 10,
  background: "var(--cta-white)",
};

/**
 * "New show" as a popup: the add-a-show form in the branded modal. The
 * fields attach to a hidden form via the form attribute and post to the
 * shows route, which refuses duplicates (same company and title).
 */
export default function AddShowModal({
  companyRows,
}: {
  companyRows: { key: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const formId = useId();
  return (
    <>
      <form
        id={formId}
        action="/api/admin/shows"
        method="post"
        style={{ display: "none" }}
      >
        <input type="hidden" name="anchor" value="registry" />
        <input type="hidden" name="action" value="add" />
      </form>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          fontFamily: "var(--font-body)",
          fontWeight: 700,
          fontSize: 13,
          color: "var(--cta-ink)",
          background: "var(--cta-purple)",
          border: "2px solid var(--cta-ink)",
          borderRadius: 12,
          padding: "10px 16px",
          cursor: "pointer",
          boxShadow: "3px 3px 0 var(--cta-ink)",
        }}
      >
        New show
      </button>
      <AdminModal
        open={open}
        title="New show"
        confirmLabel="Add show"
        onConfirm={() => {
          const form = document.getElementById(formId) as HTMLFormElement | null;
          if (form?.reportValidity()) form.requestSubmit();
        }}
        onClose={() => setOpen(false)}
        message={
          <>
            <label style={{ ...label, marginTop: 0 }}>Show title</label>
            <input name="title" form={formId} required style={input} />
            <label style={label}>Company</label>
            <select name="companyKey" form={formId} style={input}>
              {companyRows.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.name}
                </option>
              ))}
            </select>
            <label style={label}>Show page URL (optional)</label>
            <input name="url" type="url" form={formId} style={input} />
            <label style={label}>Image URL (optional)</label>
            <input name="imageUrl" form={formId} style={input} />
            <label style={label}>Ages (optional)</label>
            <input
              name="ageRange"
              form={formId}
              placeholder="e.g. 4-10"
              style={{ ...input, width: 140 }}
            />
          </>
        }
      />
    </>
  );
}
