import { describe, expect, it } from "vitest";
import { buildShowcaseProps } from "@/lib/presenter";
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
    expect(sectionItems.map((i) => i.heading)).toContain("Show C");
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

  it("prefers official show copy and falls back to AI copy", () => {
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
    expect(out.props.profiles[0].title).toBe("The Peasant Prince");
    expect(out.props.profiles[0].blurb).toBe("Official blurb.");
    expect(out.props.profiles[1].title).toBe(withoutOfficial.aiHeading);
    expect(out.props.profiles[1].blurb).toBe(withoutOfficial.aiSummary);
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
