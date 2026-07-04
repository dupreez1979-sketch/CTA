import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import {
  extractAgeRange,
  extractLinks,
  extractShowMeta,
  matchLinkByTitle,
} from "@/lib/show-research";

const fixture = (name: string) =>
  readFileSync(path.join(__dirname, "..", "fixtures", name), "utf-8");

const BASE = "https://sampletheatre.com.au/shows";

describe("extractLinks", () => {
  const links = extractLinks(fixture("shows-page.html"), BASE);

  it("absolutises relative hrefs against the page URL", () => {
    expect(links.map((l) => l.url)).toContain(
      "https://sampletheatre.com.au/shows/the-peasant-prince",
    );
  });

  it("keeps absolute URLs and strips markup from anchor text", () => {
    const space = links.find((l) => l.url.endsWith("/space-neighbours"));
    expect(space).toBeDefined();
    expect(space!.text).toBe("Space Neighbours");
  });

  it("drops mailto, tel, javascript and fragment-only links", () => {
    const urls = links.map((l) => l.url).join(" ");
    expect(urls).not.toMatch(/mailto|tel:|javascript/);
    expect(links.some((l) => l.url.endsWith("#booking"))).toBe(false);
  });

  it("dedupes repeated URLs", () => {
    const peasant = links.filter((l) =>
      l.url.endsWith("/the-peasant-prince"),
    );
    expect(peasant).toHaveLength(1);
  });
});

describe("matchLinkByTitle", () => {
  const links = extractLinks(fixture("shows-page.html"), BASE);

  it("matches a title against link text", () => {
    expect(matchLinkByTitle(links, "The Peasant Prince")).toBe(
      "https://sampletheatre.com.au/shows/the-peasant-prince",
    );
  });

  it("is tolerant of case and punctuation", () => {
    expect(matchLinkByTitle(links, "the peasant prince!")).toBe(
      "https://sampletheatre.com.au/shows/the-peasant-prince",
    );
  });

  it("matches via the URL slug when anchor text differs", () => {
    expect(matchLinkByTitle(links, "Possum Magic")).toBe(
      "https://sampletheatre.com.au/shows/possum-magic",
    );
  });

  it("returns null when more than one distinct URL matches", () => {
    // "Big Dreams" appears in two different show URLs
    expect(matchLinkByTitle(links, "Big Dreams")).toBeNull();
  });

  it("returns null when nothing matches", () => {
    expect(matchLinkByTitle(links, "Completely Unknown Show")).toBeNull();
    expect(matchLinkByTitle(links, "")).toBeNull();
  });
});

describe("extractShowMeta", () => {
  it("prefers og tags and absolutises the og:image", () => {
    const meta = extractShowMeta(
      fixture("show-page.html"),
      "https://sampletheatre.com.au/shows/the-peasant-prince",
    );
    expect(meta.blurb).toMatch(/^Based on Li Cunxin's beloved picture book/);
    expect(meta.imageUrl).toBe(
      "https://sampletheatre.com.au/images/peasant-prince-hero.jpg",
    );
    expect(meta.ageRange).toBe("ages 6 to 12");
  });

  it("falls back to the first substantial paragraph when og tags are absent", () => {
    const meta = extractShowMeta(
      fixture("show-page-bare.html"),
      "https://sampletheatre.com.au/shows/possum-magic",
    );
    expect(meta.blurb).toMatch(/^From the moment Grandma Poss/);
    expect(meta.imageUrl).toBeNull();
    expect(meta.ageRange).toBeNull();
  });
});

describe("extractAgeRange", () => {
  it("normalises common phrasings to dash-free copy", () => {
    expect(extractAgeRange("Perfect for ages 3-8.")).toBe("ages 3 to 8");
    expect(extractAgeRange("For age 5 to 12")).toBe("ages 5 to 12");
    expect(extractAgeRange("Suitable for 4–104 years")).toBe("ages 4 to 104");
    expect(extractAgeRange("ages 8+")).toBe("ages 8 and up");
    expect(extractAgeRange("great for 10+ years")).toBe("ages 10 and up");
    expect(extractAgeRange("no age info here")).toBeNull();
  });
});
