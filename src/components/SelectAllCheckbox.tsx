"use client";

/**
 * "Select all" for the review queue: ticks or unticks every checkbox that
 * belongs to the given form (the rows attach via the `form` attribute, so
 * the bulk form needs no wrapping around the table).
 */
export default function SelectAllCheckbox({
  formId,
  label = "Select all",
}: {
  formId: string;
  label?: string;
}) {
  return (
    <label
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        fontFamily: "var(--font-body)",
        fontSize: 13,
        fontWeight: 600,
        cursor: "pointer",
      }}
    >
      <input
        type="checkbox"
        style={{ width: 18, height: 18 }}
        onChange={(e) => {
          const checked = e.currentTarget.checked;
          document
            .querySelectorAll<HTMLInputElement>(
              `input[type="checkbox"][form="${formId}"]`,
            )
            .forEach((cb) => {
              cb.checked = checked;
            });
        }}
      />
      {label}
    </label>
  );
}
