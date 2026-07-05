"use client";

import { useState } from "react";
import AdminModal from "./AdminModal";

/**
 * A small round "i" next to a card title. The card's full explanation
 * lives behind it in the branded popup, keeping the screen itself quiet.
 */
export default function HelpTip({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        aria-label={`About ${title}`}
        title={`About ${title}`}
        onClick={() => setOpen(true)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 22,
          height: 22,
          marginLeft: 10,
          verticalAlign: "middle",
          fontFamily: "var(--font-body)",
          fontSize: 13,
          fontWeight: 800,
          lineHeight: 1,
          textTransform: "none",
          color: "var(--cta-ink)",
          background: "var(--cta-white)",
          border: "2px solid var(--cta-ink)",
          borderRadius: 999,
          cursor: "pointer",
          padding: 0,
        }}
      >
        i
      </button>
      <AdminModal
        open={open}
        title={title}
        message={children}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
