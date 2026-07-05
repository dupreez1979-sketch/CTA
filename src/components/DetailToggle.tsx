"use client";

/**
 * Switches the summary lines in a story table on and off (off by
 * default). Flips a data attribute on the surrounding card; the CSS in
 * globals.css shows or hides every .story-summary inside it.
 */
export default function DetailToggle() {
  return (
    <button
      type="button"
      className="detail-toggle"
      onClick={(e) =>
        e.currentTarget.closest(".admin-card")?.toggleAttribute("data-details")
      }
    >
      Details
    </button>
  );
}
