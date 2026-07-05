import { describe, expect, it } from "vitest";
import {
  buildShowcaseProps,
  hasRelativeTime,
  parseShowcaseListParams,
  swapPositions,
} from "@/lib/presenter";
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
    source: "feed",
    publishedAt: new Date("2026-07-01T00:00:00Z"),
    aiHeading: `Heading ${id}`,
    aiSummary: `Summary ${id}`,
    imageUrl: null,
    presenterRelevance: "high",
    socialRelevance: "low",
    presenterReason: "Announces a new touring show",
    showTitle: null,
    showUrl: null,
    showBlurb: null,
    showAgeRange: null,
    showImageUrl: null,
    presenterResearchedAt: null,
    presenterNotifiedAt: null,
    // Manual-review pipeline columns (defaults for trusted feed rows)
    feedId: null,
    reviewStatus: "auto",
    suggestedCompanyKey: null,
    aiMatchConfidence: null,
    aiMatchReason: null,
    matchedMarkers: null,
    rawText: null,
    reviewedAt: null,
    reviewedBy: null,
    ignored: false,
    // Deprecated columns still present on the row type
    presenterRelevant: false,
    presenterStatus: null,
    presenterFeatured: false,
    presenterPosition: null,
    presenterSendId: null,
    createdAt: new Date("2026-07-01T00:00:00Z"),
    ...overrides,
  };
}

function entry(overrides: Partial<FeedItem>, featured = false) {
  return { item: item(overrides), featured };
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
    const entries = [
      entry({ showTitle: "Show A" }, true),
      entry({ showTitle: "Show B" }, true),
      entry({ showTitle: "Show C" }, true),
      entry({ companyKey: "terrapin" }),
    ];
    const out = buildShowcaseProps(entries, [], NAMES, BASE, "4 July 2026")!;
    expect(out.props.profiles).toHaveLength(2);
    expect(out.profileCount).toBe(2);
    // The third featured entry falls back into the grouped sections
    const sectionItems = out.props.companies.flatMap((c) => c.items);
    expect(sectionItems.map((i) => i.heading)).toContain(
      entries[2].item.aiHeading,
    );
    expect(out.itemCount).toBe(4);
  });

  it("groups non-profile items by company with display names", () => {
    const entries = [
      entry({ companyKey: "monkey-baa" }),
      entry({ companyKey: "terrapin" }),
      entry({ companyKey: "monkey-baa" }),
    ];
    const out = buildShowcaseProps(entries, [], NAMES, BASE, "4 July 2026")!;
    expect(out.props.companies).toHaveLength(2);
    const monkeyBaa = out.props.companies.find(
      (c) => c.name === "Monkey Baa Theatre Co",
    );
    expect(monkeyBaa!.items).toHaveLength(2);
  });

  it("keeps the announcement and the show as separate profile fields", () => {
    const withOfficial = entry(
      { showTitle: "The Peasant Prince", showBlurb: "Official blurb." },
      true,
    );
    const withoutOfficial = entry({}, true);
    const out = buildShowcaseProps(
      [withOfficial, withoutOfficial],
      [],
      NAMES,
      BASE,
      "4 July 2026",
    )!;
    // The announcement is always the AI copy
    expect(out.props.profiles[0].heading).toBe(withOfficial.item.aiHeading);
    expect(out.props.profiles[0].summary).toBe(withOfficial.item.aiSummary);
    // The show block passes official fields through untouched
    expect(out.props.profiles[0].showTitle).toBe("The Peasant Prince");
    expect(out.props.profiles[0].showBlurb).toBe("Official blurb.");
    // No official info: announcement only, show block stays empty
    expect(out.props.profiles[1].heading).toBe(withoutOfficial.item.aiHeading);
    expect(out.props.profiles[1].showTitle).toBeNull();
    expect(out.props.profiles[1].showBlurb).toBeNull();
  });

  it("gives latest-news items the announcement copy plus show details", () => {
    const e = entry({
      showTitle: "Official Title",
      showBlurb: "Official.",
      showAgeRange: "ages 3 to 8",
    });
    const out = buildShowcaseProps([e], [], NAMES, BASE, "4 July 2026")!;
    const listItem = out.props.companies[0].items[0];
    expect(listItem.heading).toBe(e.item.aiHeading);
    expect(listItem.summary).toBe(e.item.aiSummary);
    expect(listItem.showTitle).toBe("Official Title");
    expect(listItem.showBlurb).toBe("Official.");
    expect(listItem.ageRange).toBe("ages 3 to 8");
    expect(listItem.showUrl).toBeNull();
  });

  it("absolutises relative image paths and prefers the show image", () => {
    const entries = [
      entry(
        { showImageUrl: "/api/img/show-key", imageUrl: "/api/img/post-key" },
        true,
      ),
      entry({ imageUrl: "/api/img/post-only" }),
    ];
    const out = buildShowcaseProps(entries, [], NAMES, BASE, "4 July 2026")!;
    expect(out.props.profiles[0].imageUrl).toBe(`${BASE}/api/img/show-key`);
    const section = out.props.companies[0];
    expect(section.items[0].imageUrl).toBe(`${BASE}/api/img/post-only`);
  });

  it("preserves the given entry order in profiles and sections", () => {
    const entries = [
      entry({ showTitle: "First Profile" }, true),
      entry({ showTitle: "Second Profile" }, true),
      entry({ companyKey: "terrapin", showTitle: "T1" }),
      entry({ companyKey: "monkey-baa", showTitle: "M1" }),
      entry({ companyKey: "terrapin", showTitle: "T2" }),
    ];
    const out = buildShowcaseProps(entries, [], NAMES, BASE, "4 July 2026")!;
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
      entries[2].item.aiHeading,
      entries[4].item.aiHeading,
    ]);
  });

  it("keeps Spotlight shows in the given (edition) order", () => {
    const listings = [
      show({ companyKey: "terrapin", title: "Zeb" }),
      show({ companyKey: "monkey-baa", title: "Alpha", imageUrl: "/api/img/alpha" }),
      show({ companyKey: "terrapin", title: "Arc" }),
    ];
    const out = buildShowcaseProps([], listings, NAMES, BASE, "4 July 2026")!;
    // The order set with the builder's arrows wins; no alphabetical re-sort.
    expect(out.props.shows.map((s) => `${s.company}: ${s.title}`)).toEqual([
      "Terrapin: Zeb",
      "Monkey Baa Theatre Co: Alpha",
      "Terrapin: Arc",
    ]);
    // Spotlight card images are absolutised like every other stored image
    expect(out.props.shows[1].imageUrl).toBe(`${BASE}/api/img/alpha`);
    expect(out.props.shows[0].imageUrl).toBeNull();
    expect(out.itemCount).toBe(0);
  });
});

describe("buildShowcaseProps Social Theatre", () => {
  it("puts social stories in their own section, out of news and profiles", () => {
    const entries = [
      { ...entry({ showTitle: "Big Show" }, true) },
      { ...entry({ companyKey: "patch-theatre" }), social: true },
      { ...entry({ companyKey: "terrapin" }) },
    ];
    const out = buildShowcaseProps(entries, [], NAMES, BASE, "4 July 2026")!;
    expect(out.props.social).toHaveLength(1);
    expect(out.props.social[0].company).toBe("Patch Theatre");
    expect(out.props.social[0].heading).toBe(entries[1].item.aiHeading);
    // Not duplicated into the company sections
    expect(out.props.companies.map((c) => c.name)).toEqual(["Terrapin"]);
    expect(out.profileCount).toBe(1);
  });

  it("social wins when a story is somehow flagged both ways", () => {
    const both = { ...entry({}, true), social: true };
    const out = buildShowcaseProps([both], [], NAMES, BASE, "4 July 2026")!;
    expect(out.props.profiles).toHaveLength(0);
    expect(out.props.social).toHaveLength(1);
  });

  it("is empty when nothing is tagged", () => {
    const out = buildShowcaseProps([entry({})], [], NAMES, BASE, "4 July 2026")!;
    expect(out.props.social).toEqual([]);
  });
});

describe("hasRelativeTime", () => {
  it("flags relative time words", () => {
    expect(hasRelativeTime("We open tomorrow night at the Playhouse")).toBe(true);
    expect(hasRelativeTime("Catch the final shows this weekend")).toBe(true);
    expect(hasRelativeTime("Auditions were held yesterday")).toBe(true);
    expect(hasRelativeTime("Tickets on sale next week")).toBe(true);
    expect(hasRelativeTime("TODAY is the day")).toBe(true);
  });

  it("leaves absolute dates and ordinary copy alone", () => {
    expect(hasRelativeTime("Opens on Saturday 12 July at the Playhouse")).toBe(false);
    expect(hasRelativeTime("A three week national tour across 2027")).toBe(false);
    expect(hasRelativeTime("The last performance sold out")).toBe(false);
  });
});

describe("swapPositions", () => {
  it("swaps with the neighbour in the given direction", () => {
    expect(swapPositions([10, 20, 30], 20, "up")).toEqual([20, 10, 30]);
    expect(swapPositions([10, 20, 30], 20, "down")).toEqual([10, 30, 20]);
  });

  it("returns null at the edges", () => {
    expect(swapPositions([10, 20, 30], 10, "up")).toBeNull();
    expect(swapPositions([10, 20, 30], 30, "down")).toBeNull();
  });

  it("returns null for an unknown id and does not mutate the input", () => {
    const ids = [10, 20, 30];
    expect(swapPositions(ids, 99, "up")).toBeNull();
    expect(swapPositions(ids, 20, "up")).toEqual([20, 10, 30]);
    expect(ids).toEqual([10, 20, 30]);
  });
});

describe("parseShowcaseListParams", () => {
  it("defaults to newest-first, all ratings, page 1, 10 per page", () => {
    expect(parseShowcaseListParams({})).toEqual({
      sort: "date",
      dir: "desc",
      rel: "all",
      co: "",
      q: "",
      pg: 1,
      ps: 10,
    });
  });

  it("accepts valid values and rejects junk", () => {
    expect(
      parseShowcaseListParams({
        sort: "relevance",
        dir: "asc",
        rel: "high",
        co: "terrapin",
        q: " tour ",
        pg: "3",
        ps: "50",
      }),
    ).toEqual({
      sort: "relevance",
      dir: "asc",
      rel: "high",
      co: "terrapin",
      q: "tour",
      pg: 3,
      ps: 50,
    });
    expect(
      parseShowcaseListParams({
        sort: "bogus",
        dir: "sideways",
        rel: "nah",
        pg: "-2",
        ps: "33",
      }),
    ).toEqual({
      sort: "date",
      dir: "desc",
      rel: "all",
      co: "",
      q: "",
      pg: 1,
      ps: 10,
    });
    expect(parseShowcaseListParams({ pg: "abc" }).pg).toBe(1);
    expect(parseShowcaseListParams({ rel: "s-high" }).rel).toBe("s-high");
    expect(parseShowcaseListParams({ rel: "s-bogus" }).rel).toBe("all");
    expect(parseShowcaseListParams({ rel: "other" }).rel).toBe("other");
    // Old bookmarked links with the retired combined value fall back.
    expect(parseShowcaseListParams({ rel: "highs" }).rel).toBe("all");
    expect(parseShowcaseListParams({ ps: "20" }).ps).toBe(20);
  });
});

describe("COPY_SCHEMA showcase classification", () => {
  it("requires the relevance rating alongside the copy fields", () => {
    expect(COPY_SCHEMA.required).toEqual(
      expect.arrayContaining([
        "heading",
        "summary",
        "presenterRelevance",
        "showTitle",
        "presenterReason",
      ]),
    );
    expect(COPY_SCHEMA.additionalProperties).toBe(false);
    expect(COPY_SCHEMA.properties.presenterRelevance.enum).toEqual([
      "low",
      "medium",
      "high",
    ]);
    expect(COPY_SCHEMA.required).toContain("socialRelevance");
    expect(COPY_SCHEMA.properties.socialRelevance.enum).toEqual([
      "low",
      "medium",
      "high",
    ]);
    expect(COPY_SCHEMA.properties.showTitle.type).toEqual(["string", "null"]);
  });
});
