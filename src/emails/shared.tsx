import * as React from "react";
import { Img } from "@react-email/components";
import { COLORS } from "../lib/tokens";
import type { ShapeName } from "../lib/shapes";

/**
 * Brand pieces shared by the email templates (Alliance newsletter, The
 * Showcase, internal notifications): font stacks, display type helper,
 * shape asset URLs, company banner and the image-or-colour slot.
 */

// Impact ships with Windows and macOS, so most desktop clients render the
// real brand font; Haettenschweiler / Arial Narrow Bold are the intended
// fallbacks per the design handoff.
export const FONT_DISPLAY =
  "'Impact','Haettenschweiler','Arial Narrow Bold',sans-serif";
export const FONT_BODY = "'Poppins',Helvetica,Arial,sans-serif";

const INK = COLORS.ink;

export const display = (
  size: number,
  lineHeight = 0.95,
): React.CSSProperties => ({
  fontFamily: FONT_DISPLAY,
  textTransform: "uppercase" as const,
  fontSize: size,
  lineHeight: String(lineHeight),
  letterSpacing: "0.01em",
  color: INK,
  margin: 0,
});

export function shapeUrl(baseUrl: string, shape: ShapeName, colorName: string) {
  return `${baseUrl}/shapes/${shape}-${colorName}.png`;
}

export function CompanyBanner({
  name,
  hex,
  size = 22,
}: {
  name: string;
  hex: string;
  size?: number;
}) {
  return (
    <span
      className="banner-h"
      style={{
        ...display(size, 1),
        display: "inline-block",
        backgroundColor: hex,
        padding: "5px 13px 4px",
        border: `2px solid ${INK}`,
        borderRadius: 10,
        boxShadow: `3px 3px 0 ${INK}`,
      }}
    >
      {name}
    </span>
  );
}

export function ImageSlot({
  imageUrl,
  hex,
  width,
  height,
  radius,
  alt,
  cls,
}: {
  imageUrl: string | null;
  hex: string;
  width: number | string;
  height: number;
  radius: number;
  alt: string;
  /** Class targeted by the mobile media queries. */
  cls?: string;
}) {
  if (imageUrl) {
    return (
      <Img
        src={imageUrl}
        alt={alt}
        className={cls}
        width={typeof width === "number" ? width : undefined}
        height={height}
        style={{
          display: "block",
          width,
          height,
          objectFit: "cover",
          borderRadius: radius,
        }}
      />
    );
  }
  return (
    <table
      role="presentation"
      cellPadding={0}
      cellSpacing={0}
      width={typeof width === "number" ? width : "100%"}
      style={{ borderCollapse: "separate", width: "100%" }}
    >
      <tbody>
        <tr>
          <td
            className={cls}
            style={{
              width,
              height,
              backgroundColor: hex,
              borderRadius: radius,
            }}
          />
        </tr>
      </tbody>
    </table>
  );
}
