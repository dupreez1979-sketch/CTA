import * as React from "react";
import { Img } from "@react-email/components";

/**
 * Scalloped cloud divider between two email sections, matching the edges
 * on the Alliance website. Pre-rendered two-colour PNGs (Gmail strips
 * inline SVG) live in public/clouds/ — see src/lib/clouds.ts and
 * scripts/generate-shapes.ts. The strip is 1280x104, so at the email's
 * 680px width it renders ~55px tall and scales fluidly on mobile.
 */

export type CloudPair =
  | "creamwarm-cream"
  | "sky-cream"
  | "cream-purple"
  | "cream-blue";

export default function Cloud({
  baseUrl,
  pair,
}: {
  baseUrl: string;
  pair: CloudPair;
}) {
  return (
    <Img
      src={`${baseUrl}/clouds/cloud-${pair}.png`}
      alt=""
      width={680}
      style={{ display: "block", width: "100%", height: "auto" }}
    />
  );
}
