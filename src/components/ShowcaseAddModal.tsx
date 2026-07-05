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
  margin: "12px 0 4px",
};

const field: React.CSSProperties = {
  width: "100%",
  fontFamily: "var(--font-body)",
  fontSize: 16,
  padding: "8px 12px",
  border: "2px solid var(--cta-ink)",
  borderRadius: 10,
  background: "var(--cta-white)",
};

/**
 * "Add to a Showcase" popup, used two ways: per story (pass `itemId`) and
 * for the pool's bulk bar (pass `bulk`, so the row tick boxes that carry
 * `form="pool-bulk"` are the selection). Pick the draft (or a new one) and
 * whether it lands as a show story or a Social Theatre story, then confirm.
 * Posts the existing add-many action.
 */
export default function ShowcaseAddModal({
  drafts,
  itemId,
  bulk = false,
  style,
  children = "Add to Showcase",
}: {
  drafts: { id: number; label: string }[];
  itemId?: number;
  bulk?: boolean;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const generatedId = useId();
  const formId = bulk ? "pool-bulk" : generatedId;
  return (
    <>
      <form
        id={formId}
        action="/api/admin/presenter-item"
        method="post"
        style={{ display: "none" }}
      >
        <input type="hidden" name="action" value="add-many" />
        {!bulk && itemId != null && (
          <input type="hidden" name="ids" value={itemId} />
        )}
      </form>
      <button type="button" style={style} onClick={() => setOpen(true)}>
        {children}
      </button>
      <AdminModal
        open={open}
        title="Add to a Showcase"
        confirmLabel="Add"
        onConfirm={() =>
          (document.getElementById(formId) as HTMLFormElement | null)?.requestSubmit()
        }
        onClose={() => setOpen(false)}
        message={
          <>
            {drafts.length === 0 && (
              <p style={{ margin: "0 0 4px" }}>
                No drafts yet, so a new Showcase draft will be created.
              </p>
            )}
            <label style={{ ...label, marginTop: 0 }}>Showcase draft</label>
            <select name="edition" form={formId} style={field}>
              {drafts.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
              <option value="new">New Showcase draft</option>
            </select>
            <label style={label}>Add as</label>
            <div style={{ display: "flex", gap: 18, fontSize: 14 }}>
              <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input
                  type="radio"
                  name="social"
                  value="0"
                  form={formId}
                  defaultChecked
                />
                Show story
              </label>
              <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input type="radio" name="social" value="1" form={formId} />
                Social Theatre story
              </label>
            </div>
          </>
        }
      />
    </>
  );
}
