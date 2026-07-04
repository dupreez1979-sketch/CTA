import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import {
  decodeEntities,
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

describe("decodeEntities", () => {
  it("decodes named entities like curly quotes and dashes", () => {
    expect(
      decodeEntities(
        "Monkey Baa&rsquo;s beloved production for children aged 1&ndash;6",
      ),
    ).toBe("Monkey Baa’s beloved production for children aged 1–6");
    expect(decodeEntities("&ldquo;Bravo&rdquo; &mdash; a hit&hellip;")).toBe(
      "“Bravo” — a hit…",
    );
  });

  it("decodes numeric and hex entities", () => {
    expect(decodeEntities("Li Cunxin&#8217;s story")).toBe("Li Cunxin’s story");
    expect(decodeEntities("caf&#233; &#x2019;tis")).toBe("café ’tis");
    expect(decodeEntities("It&#039;s on")).toBe("It's on");
  });

  it("decodes ampersands last and leaves unknown entities alone", () => {
    expect(decodeEntities("Shake &amp; Stir")).toBe("Shake & Stir");
    expect(decodeEntities("A &unknownthing; here")).toBe(
      "A &unknownthing; here",
    );
    // Double-encoded input stays literal rather than double-decoding
    expect(decodeEntities("1&amp;ndash;6")).toBe("1&ndash;6");
  });

  it("is safe on already-clean text", () => {
    const clean = "Terrapin’s show for ages 4 to 10, touring Australia.";
    expect(decodeEntities(clean)).toBe(clean);
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
