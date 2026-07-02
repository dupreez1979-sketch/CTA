/**
 * Puzzle-shape geometry from the design system's PuzzleShape component
 * (design/_ds/.../PuzzleShape.jsx). Each path is drawn in a 100x100 box.
 * Web UI renders these as inline SVG; emails use pre-rendered PNGs from
 * public/shapes/ (Gmail strips inline SVG) — see scripts/generate-shapes.ts.
 */

export type ShapeName =
  | "square"
  | "arch"
  | "circle"
  | "quarter"
  | "plus"
  | "archCut"
  | "knobLeft"
  | "stairs";

export const SHAPE_NAMES: ShapeName[] = [
  "square",
  "arch",
  "circle",
  "quarter",
  "plus",
  "archCut",
  "knobLeft",
  "stairs",
];

interface ShapeDef {
  d: string;
  fillRule?: "evenodd";
}

export const SHAPE_PATHS: Record<ShapeName, ShapeDef> = {
  // square with a round knob poking out the right side
  square: { d: "M0,0 H100 A15,15 0 0 1 100,30 A15,15 0 0 1 100,60 V100 H0 Z" },
  // rounded-top arch (doorway)
  arch: { d: "M0,100 L0,50 A50,50 0 0 1 100,50 L100,100 Z" },
  circle: { d: "M50,0 A50,50 0 1 1 49.99,0 Z" },
  // quarter circle, corner top-left solid
  quarter: { d: "M0,0 L0,100 A100,100 0 0 0 100,0 Z" },
  plus: { d: "M35,0 H65 V35 H100 V65 H65 V100 H35 V65 H0 V35 H35 Z" },
  // square with an arch bitten out of the top
  archCut: { d: "M0,0 H100 V100 H0 Z M35,0 A15,15 0 0 0 65,0 Z", fillRule: "evenodd" },
  // square with a round knob on the left
  knobLeft: { d: "M0,35 A15,15 0 0 1 0,65 L0,100 H100 V0 H0 Z" },
  stairs: { d: "M0,100 V60 H25 V40 H50 V20 H75 V0 H100 V100 Z" },
};

/** Standalone SVG markup for a shape (used by the PNG generator). */
export function shapeSvg(shape: ShapeName, fill: string, size = 100): string {
  const def = SHAPE_PATHS[shape];
  const fillRule = def.fillRule ? ` fill-rule="${def.fillRule}"` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${size}" height="${size}" preserveAspectRatio="none"><path d="${def.d}" fill="${fill}"${fillRule}/></svg>`;
}
