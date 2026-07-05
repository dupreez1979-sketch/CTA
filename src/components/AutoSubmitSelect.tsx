"use client";

/**
 * A filter select that applies itself: changing the value submits the
 * surrounding GET form, so filter bars need no separate Apply button.
 */
export default function AutoSubmitSelect({
  name,
  defaultValue,
  children,
  style,
}: {
  name: string;
  defaultValue: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <select
      name={name}
      defaultValue={defaultValue}
      style={style}
      onChange={(e) => e.currentTarget.form?.requestSubmit()}
    >
      {children}
    </select>
  );
}
