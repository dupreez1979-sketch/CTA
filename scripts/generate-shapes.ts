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
import { CLOUD_PAIRS, cloudFileName, cloudSvg } from "../src/lib/clouds";
import { COLORS } from "../src/lib/tokens";

const OUT = path.join(process.cwd(), "public", "shapes");
const CLOUD_OUT = path.join(process.cwd(), "public", "clouds");
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

// Cloud dividers use lowercased token names in filenames.
const CLOUD_COLORS: Record<string, string> = {
  mint: COLORS.mint,
  cream: COLORS.cream,
  creamwarm: COLORS.creamWarm,
  sky: COLORS.sky,
  purple: COLORS.purple,
  blue: COLORS.blue,
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
  mkdirSync(CLOUD_OUT, { recursive: true });
  for (const pair of CLOUD_PAIRS) {
    const svg = cloudSvg(CLOUD_COLORS[pair.above], CLOUD_COLORS[pair.below], pair.flip);
    await sharp(Buffer.from(svg))
      .png()
      .toFile(path.join(CLOUD_OUT, cloudFileName(pair)));
  }
  console.log(
    `Wrote ${SHAPE_NAMES.length * Object.keys(EMAIL_COLORS).length} PNGs to public/shapes/ and ${CLOUD_PAIRS.length} to public/clouds/`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
