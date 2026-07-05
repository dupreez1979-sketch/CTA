"use client";

import { useState } from "react";

/**
 * The toolbar above a Stories table. The Details / Filters / Actions
 * buttons stay put in one row; opening Filters or Actions reveals its
 * panel on a line BELOW the buttons, so nothing shifts sideways. Details
 * toggles the card's summary lines (data-details on the card).
 */
export default function StoryToolbar({
  filters,
  actions,
  extra,
}: {
  filters: React.ReactNode;
  actions?: React.ReactNode;
  /** Extra control(s) shown inline in the same button row (e.g. a
   * "Group by company" toggle), not tucked under a panel. */
  extra?: React.ReactNode;
}) {
  const [open, setOpen] = useState<"filters" | "actions" | null>(null);
  const tab = (active: boolean): React.CSSProperties => ({
    fontFamily: "var(--font-body)",
    fontSize: 12,
    fontWeight: 700,
    color: "var(--cta-ink)",
    background: active ? "var(--cta-purple)" : "var(--cta-white)",
    border: "2px solid var(--cta-ink)",
    borderRadius: 8,
    padding: "6px 12px",
    cursor: "pointer",
  });
  return (
    <>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 14,
        }}
      >
        <button
          type="button"
          className="detail-toggle"
          style={{ margin: 0 }}
          onClick={(e) =>
            e.currentTarget
              .closest(".admin-card")
              ?.toggleAttribute("data-details")
          }
        >
          Details
        </button>
        <button
          type="button"
          style={tab(open === "filters")}
          aria-expanded={open === "filters"}
          onClick={() => setOpen((o) => (o === "filters" ? null : "filters"))}
        >
          Filters {open === "filters" ? "▴" : "▾"}
        </button>
        {actions && (
          <button
            type="button"
            style={tab(open === "actions")}
            aria-expanded={open === "actions"}
            onClick={() => setOpen((o) => (o === "actions" ? null : "actions"))}
          >
            Actions {open === "actions" ? "▴" : "▾"}
          </button>
        )}
        {extra}
      </div>
      {/* Panels stay mounted (just hidden) so the bulk form and its row
          checkboxes keep their association while collapsed. */}
      <div hidden={open !== "filters"} style={{ marginBottom: 14 }}>
        {filters}
      </div>
      {actions && (
        <div hidden={open !== "actions"} style={{ marginBottom: 14 }}>
          {actions}
        </div>
      )}
    </>
  );
}
