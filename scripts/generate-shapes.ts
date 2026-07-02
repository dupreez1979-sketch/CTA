/**
 * Pre-render the puzzle-shape motif to PNGs in public/shapes/.
 * Emails can't use inline SVG (Gmail strips it), so the masthead and
 * company-section stickers reference these files by absolute URL.
 * Run once via `npm run shapes`; output is committed.
 */
import sharp from "sharp";
import { mkdirSync } from "fs";
import path from "path";
import { SHAPE_NAMES, shapeSvg } from "../src/lib/shapes";
import { COLORS } from "../src/lib/tokens";

const OUT = path.join(process.cwd(), "public", "shapes");
const SIZE = 176; // 2x the largest use (88px masthead circle) for retina

const EMAIL_COLORS: Record<string, string> = {
  purple: COLORS.purple,
  pink: COLORS.pink,
  yellow: COLORS.yellow,
  teal: COLORS.teal,
  mint: COLORS.mint,
  emerald: COLORS.emerald,
  blue: COLORS.blue,
  sky: COLORS.sky,
};

async function main() {
  mkdirSync(OUT, { recursive: true });
  for (const shape of SHAPE_NAMES) {
    for (const [name, hex] of Object.entries(EMAIL_COLORS)) {
      const svg = shapeSvg(shape, hex, SIZE);
      const file = path.join(OUT, `${shape}-${name}.png`);
      await sharp(Buffer.from(svg)).png().toFile(file);
    }
  }
  console.log(
    `Wrote ${SHAPE_NAMES.length * Object.keys(EMAIL_COLORS).length} PNGs to public/shapes/`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
