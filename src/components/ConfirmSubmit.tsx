"use client";

/**
 * Submit button that asks for confirmation first — used for destructive
 * admin actions (plain HTML forms can't confirm without a little client
 * code).
 */
export default function ConfirmSubmit({
  message,
  children,
  style,
  form,
}: {
  message: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
  form?: string;
}) {
  return (
    <button
      type="submit"
      form={form}
      style={style}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
