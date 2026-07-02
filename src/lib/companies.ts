import { COLORS } from "./tokens";
import type { ShapeName } from "./shapes";

/**
 * Member-company matching. The live registry is managed in the admin
 * console and stored in the `companies` table (see company-store.ts);
 * DEFAULT_COMPANIES below seeds it on first use. Feed items are matched
 * against `match` fragments (checked case-insensitively against the
 * item's creator, title and link). Items that match nothing land in the
 * "Around the Alliance" bucket rather than being dropped.
 */

export interface Company {
  key: string;
  name: string;
  match: string[];
}

export const FALLBACK_COMPANY_KEY = "around-the-alliance";
export const FALLBACK_COMPANY_NAME = "Around the Alliance";

/** Seed data for the companies table (from the design handoff + website). */
export const DEFAULT_COMPANIES: Company[] = [
  { key: "spare-parts", name: "Spare Parts Puppet Theatre", match: ["spare parts", "sparepartspuppets"] },
  { key: "windmill", name: "Windmill", match: ["windmill"] },
  { key: "shake-and-stir", name: "Shake & Stir", match: ["shake & stir", "shake and stir", "shakeandstir"] },
  { key: "terrapin", name: "Terrapin", match: ["terrapin"] },
  { key: "awesome-arts", name: "AWESOME Arts", match: ["awesome arts", "awesome festival", "awesomearts"] },
  { key: "monkey-baa", name: "Monkey Baa", match: ["monkey baa", "monkeybaa"] },
  { key: "patch-theatre", name: "Patch Theatre", match: ["patch theatre", "patchtheatre"] },
  { key: "barking-gecko", name: "Barking Gecko", match: ["barking gecko", "barkinggecko"] },
  { key: "slingsby", name: "Slingsby", match: ["slingsby"] },
  { key: "polyglot", name: "Polyglot", match: ["polyglot"] },
  { key: "playable-streets", name: "Playable Streets", match: ["playable streets", "playablestreets"] },
  { key: "arena-theatre", name: "Arena Theatre", match: ["arena theatre", "arenatheatre"] },
  { key: "bighart", name: "Big hART", match: ["big hart", "bighart"] },
  { key: "flying-fruit-fly", name: "Flying Fruit Fly Circus", match: ["fruit fly", "flyingfruitfly"] },
  { key: "imaginary-theatre", name: "Imaginary Theatre", match: ["imaginary theatre"] },
  { key: "little-wing", name: "Little Wing Puppets", match: ["little wing"] },
  { key: "sensorium", name: "Sensorium Theatre", match: ["sensorium"] },
  { key: "the-last-great-hunt", name: "The Last Great Hunt", match: ["last great hunt"] },
  { key: "dead-puppet-society", name: "Dead Puppet Society", match: ["dead puppet"] },
  { key: "cdp", name: "CDP Kids", match: ["cdp kids", "cdp theatre"] },
  { key: "brymore", name: "Brymore Productions", match: ["brymore"] },
  { key: "bunk-puppets", name: "Bunk Puppets", match: ["bunk puppets", "bunkpuppets"] },
  { key: "critical-stages", name: "Critical Stages Touring", match: ["critical stages"] },
  { key: "little-match", name: "Little Match Productions", match: ["little match"] },
  { key: "erth", name: "Erth Visual & Physical", match: ["erth visual", "erthphysical", "erth "] },
];

/**
 * Match a feed item to a company by its creator/author, title, and link.
 */
export function matchCompany(
  fields: { creator?: string; title?: string; link?: string },
  companies: Company[],
): string {
  const haystacks = [fields.creator, fields.title, fields.link]
    .filter(Boolean)
    .map((s) => (s as string).toLowerCase());
  // Creator (the Facebook page name) is the most reliable signal, then
  // title, then link — haystacks are already in that order.
  for (const hay of haystacks) {
    for (const c of companies) {
      if (c.match.some((frag) => frag && hay.includes(frag))) return c.key;
    }
  }
  return FALLBACK_COMPANY_KEY;
}

/** Display name for a company key, given a key→name map. */
export function companyNameFrom(
  nameByKey: Map<string, string>,
  key: string,
): string {
  return nameByKey.get(key) ?? FALLBACK_COMPANY_NAME;
}

/**
 * Colour + shape rotation from the design handoff: "rotates so no two
 * adjacent sections match; avoid ocean navy for banners so ink text stays
 * legible ... Featured company uses purple."
 */
export interface CompanyStyle {
  hex: string;
  colorName: string;
  shape: ShapeName;
}

const ROTATION: CompanyStyle[] = [
  { hex: COLORS.pink, colorName: "pink", shape: "square" },
  { hex: COLORS.teal, colorName: "teal", shape: "arch" },
  { hex: COLORS.yellow, colorName: "yellow", shape: "plus" },
  { hex: COLORS.sky, colorName: "sky", shape: "circle" },
  { hex: COLORS.emerald, colorName: "emerald", shape: "quarter" },
  { hex: COLORS.blue, colorName: "blue", shape: "archCut" },
  { hex: COLORS.mint, colorName: "mint", shape: "knobLeft" },
  // teal (not pink) so the rotation doesn't repeat a colour when it wraps
  { hex: COLORS.teal, colorName: "teal", shape: "stairs" },
];

export const FEATURED_STYLE: CompanyStyle = {
  hex: COLORS.purple,
  colorName: "purple",
  shape: "circle",
};

/** Style for the Nth company section in an issue (stable per render order). */
export function sectionStyle(index: number): CompanyStyle {
  return ROTATION[index % ROTATION.length];
}
