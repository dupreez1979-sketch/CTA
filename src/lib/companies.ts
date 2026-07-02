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

/** Seed data for the companies table — the Alliance's confirmed member list. */
export const DEFAULT_COMPANIES: Company[] = [
  { key: "arena-theatre", name: "Arena Theatre", match: ["arena theatre", "arenatheatre"] },
  { key: "barking-gecko", name: "Barking Gecko Arts", match: ["barking gecko", "barkinggecko"] },
  { key: "brymore", name: "Brymore Productions", match: ["brymore"] },
  { key: "cdp", name: "CDP Theatre Producers", match: ["cdp theatre", "cdp kids", "cdptheatre"] },
  { key: "dead-puppet-society", name: "Dead Puppet Society", match: ["dead puppet"] },
  { key: "imaginary-theatre", name: "Imaginary Theatre", match: ["imaginary theatre"] },
  { key: "monkey-baa", name: "Monkey Baa Theatre Co", match: ["monkey baa", "monkeybaa"] },
  { key: "patch-theatre", name: "Patch Theatre", match: ["patch theatre", "patchtheatre"] },
  { key: "playable-streets", name: "Playable Streets", match: ["playable streets", "playablestreets"] },
  { key: "polyglot", name: "Polyglot", match: ["polyglot"] },
  { key: "sensorium", name: "Sensorium Theatre", match: ["sensorium"] },
  { key: "shake-and-stir", name: "Shake & Stir", match: ["shake & stir", "shake and stir", "shakeandstir"] },
  { key: "slingsby", name: "Slingsby", match: ["slingsby"] },
  { key: "spare-parts", name: "Spare Parts Puppet Theatre", match: ["spare parts", "sparepartspuppets"] },
  { key: "terrapin", name: "Terrapin", match: ["terrapin"] },
  { key: "the-listies", name: "The Listies", match: ["listies"] },
  { key: "threshold", name: "Threshold", match: ["threshold"] },
  { key: "windmill", name: "Windmill Production Co", match: ["windmill"] },
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
