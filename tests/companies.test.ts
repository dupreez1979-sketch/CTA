import { describe, expect, it } from "vitest";
import {
  DEFAULT_COMPANIES,
  FALLBACK_COMPANY_KEY,
  FALLBACK_COMPANY_NAME,
  companyNameFrom,
  matchCompany,
  matchCompanyDetailed,
  sectionStyle,
} from "@/lib/companies";
import { seedFeeds } from "@/lib/feed-store";

const REGISTRY = DEFAULT_COMPANIES;

describe("matchCompany", () => {
  it("matches by creator (Facebook page name)", () => {
    expect(matchCompany({ creator: "Spare Parts Puppet Theatre" }, REGISTRY)).toBe("spare-parts");
    expect(matchCompany({ creator: "shake & stir theatre co" }, REGISTRY)).toBe("shake-and-stir");
    expect(matchCompany({ creator: "The Listies" }, REGISTRY)).toBe("the-listies");
  });

  it("matches by link slug when the creator is missing", () => {
    expect(
      matchCompany({ link: "https://m.facebook.com/sparepartspuppets/posts/1" }, REGISTRY),
    ).toBe("spare-parts");
    expect(
      matchCompany({ link: "https://m.facebook.com/monkeybaatheatreco/posts/" }, REGISTRY),
    ).toBe("monkey-baa");
  });

  it("matches by title text", () => {
    expect(
      matchCompany({ title: "Terrapin: The Paper Escaper lands in Taipei" }, REGISTRY),
    ).toBe("terrapin");
  });

  it("falls back to Around the Alliance for unknown sources", () => {
    const key = matchCompany({ creator: "Some Unknown Page", title: "News" }, REGISTRY);
    expect(key).toBe(FALLBACK_COMPANY_KEY);
    expect(companyNameFrom(new Map(), key)).toBe(FALLBACK_COMPANY_NAME);
  });
});

describe("matchCompanyDetailed", () => {
  it("returns the same key as matchCompany plus the fragments that hit", () => {
    const detailed = matchCompanyDetailed(
      { title: "Patch Theatre lights up Adelaide with Windmill" },
      REGISTRY,
    );
    expect(detailed.key).toBe(
      matchCompany({ title: "Patch Theatre lights up Adelaide with Windmill" }, REGISTRY),
    );
    expect(detailed.markers).toContain("patch theatre");
    expect(detailed.markers).toContain("windmill");
  });

  it("reports no markers for unmatched items", () => {
    const detailed = matchCompanyDetailed(
      { creator: "Some Unknown Page", title: "News" },
      REGISTRY,
    );
    expect(detailed.key).toBe(FALLBACK_COMPANY_KEY);
    expect(detailed.markers).toEqual([]);
  });
});

describe("seedFeeds", () => {
  it("always seeds the media feed in review mode", () => {
    const seeds = seedFeeds();
    const media = seeds.find((s) => s.name === "Media coverage");
    expect(media).toBeDefined();
    expect(media?.mode).toBe("review");
    expect(media?.url).toMatch(/^https:\/\/rss\.app\//);
  });
});

describe("sectionStyle rotation", () => {
  it("no two adjacent sections share a colour", () => {
    for (let i = 0; i < 20; i++) {
      expect(sectionStyle(i).hex).not.toBe(sectionStyle(i + 1).hex);
    }
  });

  it("never uses ocean navy for banners", () => {
    for (let i = 0; i < 16; i++) {
      expect(sectionStyle(i).hex.toLowerCase()).not.toBe("#053848");
    }
  });
});
