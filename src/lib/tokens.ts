/**
 * Design tokens from the Children's Theatre Alliance design system.
 * Source: design/_ds/.../tokens/*.css (kept as TS constants so the email
 * template, web UI, and asset scripts share one palette).
 */

export const COLORS = {
  purple: "#AC9EFC",
  pink: "#F24A71",
  yellow: "#FFB83D",
  teal: "#05AEAF",
  ocean: "#053848",
  mint: "#85F1E6",
  emerald: "#03DBA4",
  blue: "#00A0C5",
  sky: "#48BEFD",
  yellowSoft: "#FFCF67",
  creamDeep: "#FFECCA",
  ink: "#1E1E1D",
  ink2: "#14252D",
  cream: "#EFEEE4",
  creamWarm: "#FFF8E7",
  white: "#FFFFFF",
  textBody: "#2C2C2B",
  textMuted: "#5A5A57",
} as const;

export const FONT_DISPLAY =
  "'Impact','Haettenschweiler','Arial Narrow Bold',sans-serif";
export const FONT_BODY =
  "'Poppins',system-ui,-apple-system,'Segoe UI',sans-serif";

/** Hard offset shadows — solid ink, zero blur. */
export const SHADOW = {
  sm: `3px 3px 0 ${COLORS.ink}`,
  md: `6px 6px 0 ${COLORS.ink}`,
  lg: `10px 10px 0 ${COLORS.ink}`,
  popup: `14px 14px 0 ${COLORS.ink}`,
  pressed: `2px 2px 0 ${COLORS.ink}`,
} as const;
