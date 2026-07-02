import { SHAPE_PATHS, type ShapeName } from "@/lib/shapes";
import { COLORS } from "@/lib/tokens";

/**
 * The brand's puzzle-shape motif as inline SVG (web only — emails use the
 * pre-rendered PNGs in public/shapes/). Ported from the design system's
 * PuzzleShape component.
 */
export default function PuzzleShape({
  shape = "square",
  color = "purple",
  size = 120,
  rotate = 0,
  style,
}: {
  shape?: ShapeName;
  color?: keyof typeof COLORS | string;
  size?: number;
  rotate?: number;
  style?: React.CSSProperties;
}) {
  const fill = (COLORS as Record<string, string>)[color] ?? color;
  const def = SHAPE_PATHS[shape];
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      preserveAspectRatio="none"
      aria-hidden="true"
      style={{
        display: "block",
        transform: rotate ? `rotate(${rotate}deg)` : undefined,
        ...style,
      }}
    >
      <path d={def.d} fill={fill} fillRule={def.fillRule} />
    </svg>
  );
}
