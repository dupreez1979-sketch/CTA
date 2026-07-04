"use client";

import { useRef, useState } from "react";
import AdminModal from "./AdminModal";

/**
 * Submit button that asks for confirmation first — used for destructive
 * or outward-facing admin actions. Opens the branded modal instead of the
 * browser's native confirm box, then submits the surrounding (or named)
 * form on confirm.
 */
export default function ConfirmSubmit({
  message,
  children,
  style,
  form,
  title = "Just checking",
  confirmLabel = "Yes, go ahead",
}: {
  message: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
  form?: string;
  title?: string;
  confirmLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const submit = () => {
    const target = form
      ? (document.getElementById(form) as HTMLFormElement | null)
      : buttonRef.current?.closest("form");
    target?.requestSubmit();
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        style={style}
        onClick={() => setOpen(true)}
      >
        {children}
      </button>
      <AdminModal
        open={open}
        title={title}
        message={message}
        confirmLabel={confirmLabel}
        onConfirm={submit}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
