/**
 * The scalloped "cloud" edge from the Alliance website, used in the emails
 * as section dividers. The path is lifted verbatim from
 * childrenstheatrealliance.com.au (a 1280x104 strip whose top edge is a run
 * of cloud bumps; the fill sits below the bumps). Emails can't use inline
 * SVG (Gmail strips it), so scripts/generate-shapes.ts pre-renders each
 * colour pair to public/clouds/*.png.
 */

export const CLOUD_WIDTH = 1280;
export const CLOUD_HEIGHT = 104;

export const CLOUD_PATH =
  "M0 104c4.502-47.14 44.433-84 92.5-84 39.895 0 73.89 25.392 86.871 60.979C196.321 67.941 218.817 60 243.5 60c22.905 0 43.926 6.839 60.38 18.24C315.831 38.734 352.185 10 395.178 10c33.559 0 63.074 17.508 80.094 43.981 4.642-.646 9.393-.981 14.228-.981 10.168 0 19.965 1.48 29.155 4.224C533.536 23.504 566.99 0 605.873 0 649.327 0 686 29.354 697.547 69.517 710.944 63.443 726.248 60 742.5 60c6.917 0 13.662.624 20.161 1.808C780.155 41.694 805.798 29 834.374 29c22.959 0 44.025 8.195 60.493 21.848C912.153 26.135 940.642 10 972.859 10c31.191 0 58.891 15.125 76.311 38.518C1062.19 41.793 1076.93 38 1092.55 38c7.66 0 15.1.911 22.23 2.631C1132.2 21.782 1157.01 10 1184.54 10c51.9 0 94.15 41.86 95.46 94z";

/**
 * Standalone SVG for one divider strip (used by the PNG generator).
 * A divider joins two stacked sections: `aboveHex` is the colour of the
 * section above the strip, `belowHex` the section below. Normally the
 * lower colour rises into the upper one in cloud bumps; with `flip` the
 * upper colour hangs down in bumps instead (for the bottom of an email).
 */
export function cloudSvg(
  aboveHex: string,
  belowHex: string,
  flip = false,
  scale = 2,
): string {
  const w = CLOUD_WIDTH * scale;
  const h = CLOUD_HEIGHT * scale;
  const rectFill = flip ? belowHex : aboveHex;
  const pathFill = flip ? aboveHex : belowHex;
  const transform = flip
    ? ` transform="translate(0,${CLOUD_HEIGHT}) scale(1,-1)"`
    : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CLOUD_WIDTH} ${CLOUD_HEIGHT}" width="${w}" height="${h}"><rect width="${CLOUD_WIDTH}" height="${CLOUD_HEIGHT}" fill="${rectFill}"/><path d="${CLOUD_PATH}" fill="${pathFill}" fill-rule="evenodd" clip-rule="evenodd"${transform}/></svg>`;
}

/**
 * The colour pairs the emails actually use, keyed by file basename
 * (cloud-{above}-{below}[-flip].png). Token names are lowercased in
 * filenames: creamWarm -> creamwarm.
 */
export const CLOUD_PAIRS: ReadonlyArray<{
  above: string;
  below: string;
  flip?: boolean;
}> = [
  { above: "creamwarm", below: "cream" }, // under the masthead (tone on tone)
  { above: "sky", below: "cream" }, // leaving the Social Theatre band: cream clouds in a blue sky
  { above: "cream", below: "purple" }, // before the newsletter footer
  { above: "cream", below: "blue" }, // before the Alliance-update footer
  { above: "cream", below: "yellow" }, // entering the Alliance-update Links band
  { above: "yellow", below: "blue" }, // Links band into the Alliance-update footer
];

export function cloudFileName(pair: {
  above: string;
  below: string;
  flip?: boolean;
}): string {
  return `cloud-${pair.above}-${pair.below}${pair.flip ? "-flip" : ""}.png`;
}
