import { describe, expect, it } from "vitest";
import { buildShowcaseProps, compareDrafts } from "@/lib/presenter";
import { COPY_SCHEMA } from "@/lib/ai";
import type { FeedItem, Show } from "@/lib/db/schema";

const BASE = "https://news.example.org";
const NAMES = new Map([
  ["monkey-baa", "Monkey Baa Theatre Co"],
  ["terrapin", "Terrapin"],
  ["patch-theatre", "Patch Theatre"],
]);

let nextId = 1;
function item(overrides: Partial<FeedItem>): FeedItem {
  const id = nextId++;
  return {
    id,
    guid: `guid-${id}`,
    companyKey: "monkey-baa",
    postUrl: `https://facebook.com/post/${id}`,
    rawTitle: null,
    creator: null,
    reviewed: false,
    publishedAt: new Date("2026-07-01T00:00:00Z"),
    aiHeading: `Heading ${id}`,
    aiSummary: `Summary ${id}`,
    imageUrl: null,
    presenterRelevant: true,
    presenterReason: "Announces a new touring show",
    presenterStatus: "draft",
    showTitle: null,
    showUrl: null,
    showBlurb: null,
    showAgeRange: null,
    showImageUrl: null,
    presenterFeatured: false,
    presenterPosition: null,
    presenterResearchedAt: null,
    presenterNotifiedAt: null,
    presenterSendId: null,
    createdAt: new Date("2026-07-01T00:00:00Z"),
    ...overrides,
  };
}

function show(overrides: Partial<Show>): Show {
  const id = nextId++;
  return {
    id,
    companyKey: "terrapin",
    title: `Show ${id}`,
    url: null,
    blurb: null,
    ageRange: null,
    imageUrl: null,
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("buildShowcaseProps", () => {
  it("returns null when there is nothing to send", () => {
    expect(buildShowcaseProps([], [], NAMES, BASE, "4 July 2026")).toBeNull();
  });

  it("caps profiles at two and keeps the rest in company sections", () => {
    const items = [
      item({ presenterFeatured: true, showTitle: "Show A" }),
      item({ presenterFeatured: true, showTitle: "Show B" }),
      item({ presenterFeatured: true, showTitle: "Show C" }),
      item({ companyKey: "terrapin" }),
    ];
    const out = buildShowcaseProps(items, [], NAMES, BASE, "4 July 2026")!;
    expect(out.props.profiles).toHaveLength(2);
    expect(out.profileCount).toBe(2);
    // The third featured item falls back into the grouped sections
    const sectionItems = out.props.companies.flatMap((c) => c.items);
    expect(sectionItems.map((i) => i.heading)).toContain(items[2].aiHeading);
    expect(out.itemCount).toBe(4);
  });

  it("groups non-profile items by company with display names", () => {
    const items = [
      item({ companyKey: "monkey-baa" }),
      item({ companyKey: "terrapin" }),
      item({ companyKey: "monkey-baa" }),
    ];
    const out = buildShowcaseProps(items, [], NAMES, BASE, "4 July 2026")!;
    expect(out.props.companies).toHaveLength(2);
    const monkeyBaa = out.props.companies.find(
      (c) => c.name === "Monkey Baa Theatre Co",
    );
    expect(monkeyBaa!.items).toHaveLength(2);
  });

  it("keeps the announcement and the show as separate profile fields", () => {
    const withOfficial = item({
      presenterFeatured: true,
      showTitle: "The Peasant Prince",
      showBlurb: "Official blurb.",
    });
    const withoutOfficial = item({ presenterFeatured: true });
    const out = buildShowcaseProps(
      [withOfficial, withoutOfficial],
      [],
      NAMES,
      BASE,
      "4 July 2026",
    )!;
    // The announcement is always the AI copy
    expect(out.props.profiles[0].heading).toBe(withOfficial.aiHeading);
    expect(out.props.profiles[0].summary).toBe(withOfficial.aiSummary);
    // The show block passes official fields through untouched
    expect(out.props.profiles[0].showTitle).toBe("The Peasant Prince");
    expect(out.props.profiles[0].showBlurb).toBe("Official blurb.");
    // No official info: announcement only, show block stays empty
    expect(out.props.profiles[1].heading).toBe(withoutOfficial.aiHeading);
    expect(out.props.profiles[1].showTitle).toBeNull();
    expect(out.props.profiles[1].showBlurb).toBeNull();
  });

  it("uses announcement copy for The latest news items", () => {
    const it1 = item({
      showTitle: "Official Title",
      showBlurb: "Official blurb.",
    });
    const out = buildShowcaseProps([it1], [], NAMES, BASE, "4 July 2026")!;
    const listItem = out.props.companies[0].items[0];
    expect(listItem.heading).toBe(it1.aiHeading);
    expect(listItem.summary).toBe(it1.aiSummary);
    expect(listItem.showUrl).toBeNull();
  });

  it("absolutises relative image paths and prefers the show image", () => {
    const items = [
      item({
        presenterFeatured: true,
        showImageUrl: "/api/img/show-key",
        imageUrl: "/api/img/post-key",
      }),
      item({ imageUrl: "/api/img/post-only" }),
    ];
    const out = buildShowcaseProps(items, [], NAMES, BASE, "4 July 2026")!;
    expect(out.props.profiles[0].imageUrl).toBe(`${BASE}/api/img/show-key`);
    const section = out.props.companies[0];
    expect(section.items[0].imageUrl).toBe(`${BASE}/api/img/post-only`);
  });

  it("lists registry shows sorted by company then title", () => {
    const listings = [
      show({ companyKey: "terrapin", title: "Zeb" }),
      show({ companyKey: "monkey-baa", title: "Alpha" }),
      show({ companyKey: "terrapin", title: "Arc" }),
    ];
    const out = buildShowcaseProps([], listings, NAMES, BASE, "4 July 2026")!;
    expect(out.props.shows.map((s) => `${s.company}: ${s.title}`)).toEqual([
      "Monkey Baa Theatre Co: Alpha",
      "Terrapin: Arc",
      "Terrapin: Zeb",
    ]);
    expect(out.itemCount).toBe(0);
  });
});

describe("compareDrafts", () => {
  it("orders positioned items first, ascending", () => {
    const items = [
      item({ presenterPosition: 2 }),
      item({ presenterPosition: 0 }),
      item({ presenterPosition: 1 }),
    ];
    const sorted = [...items].sort(compareDrafts);
    expect(sorted.map((i) => i.presenterPosition)).toEqual([0, 1, 2]);
  });

  it("puts unpositioned items after positioned ones, newest first", () => {
    const older = item({
      presenterPosition: null,
      publishedAt: new Date("2026-06-01T00:00:00Z"),
    });
    const newer = item({
      presenterPosition: null,
      publishedAt: new Date("2026-07-01T00:00:00Z"),
    });
    const positioned = item({ presenterPosition: 5 });
    const sorted = [older, newer, positioned].sort(compareDrafts);
    expect(sorted[0].id).toBe(positioned.id);
    expect(sorted[1].id).toBe(newer.id);
    expect(sorted[2].id).toBe(older.id);
  });
});

describe("buildShowcaseProps ordering", () => {
  it("preserves the given item order in profiles and sections", () => {
    const items = [
      item({ presenterFeatured: true, showTitle: "First Profile" }),
      item({ presenterFeatured: true, showTitle: "Second Profile" }),
      item({ companyKey: "terrapin", showTitle: "T1" }),
      item({ companyKey: "monkey-baa", showTitle: "M1" }),
      item({ companyKey: "terrapin", showTitle: "T2" }),
    ];
    const out = buildShowcaseProps(items, [], NAMES, BASE, "4 July 2026")!;
    expect(out.props.profiles.map((p) => p.showTitle)).toEqual([
      "First Profile",
      "Second Profile",
    ]);
    // Sections follow first appearance; items keep order within a company
    expect(out.props.companies.map((c) => c.name)).toEqual([
      "Terrapin",
      "Monkey Baa Theatre Co",
    ]);
    expect(out.props.companies[0].items.map((i) => i.heading)).toEqual([
      items[2].aiHeading,
      items[4].aiHeading,
    ]);
  });
});

describe("COPY_SCHEMA showcase classification", () => {
  it("requires the classifier fields alongside the copy fields", () => {
    expect(COPY_SCHEMA.required).toEqual(
      expect.arrayContaining([
        "heading",
        "summary",
        "presenterRelevant",
        "showTitle",
        "presenterReason",
      ]),
    );
    expect(COPY_SCHEMA.additionalProperties).toBe(false);
    expect(COPY_SCHEMA.properties.showTitle.type).toEqual(["string", "null"]);
  });
});
