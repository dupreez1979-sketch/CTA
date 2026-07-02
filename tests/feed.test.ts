import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { parseFeed } from "@/lib/feed";

const xml = readFileSync(
  path.join(__dirname, "..", "fixtures", "feed-sample.xml"),
  "utf-8",
);

describe("parseFeed", () => {
  it("parses all items with guid, link and date", async () => {
    const items = await parseFeed(xml);
    expect(items).toHaveLength(6);
    for (const it of items) {
      expect(it.guid).toBeTruthy();
      expect(it.link).toMatch(/^https:\/\//);
      expect(it.publishedAt.getTime()).toBeGreaterThan(0);
    }
  });

  it("maps items to member companies", async () => {
    const items = await parseFeed(xml);
    const byGuid = Object.fromEntries(items.map((i) => [i.guid, i]));
    expect(byGuid["fb-reel-1004189352204656"].companyKey).toBe("spare-parts");
    expect(byGuid["fb-reel-1004232785650336"].companyKey).toBe("windmill");
    expect(byGuid["fb-post-1541263274222672"].companyKey).toBe("shake-and-stir");
    expect(byGuid["fb-post-unknown-42"].companyKey).toBe("around-the-alliance");
  });

  it("extracts images from media:content or embedded img tags", async () => {
    const items = await parseFeed(xml);
    const byGuid = Object.fromEntries(items.map((i) => [i.guid, i]));
    expect(byGuid["fb-reel-1004189352204656"].imageUrl).toBe(
      "https://scontent.example.com/v/spareparts.jpg",
    );
    // img tag inside description, no media:content
    expect(byGuid["fb-post-terrapin-9912345"].imageUrl).toBe(
      "https://scontent.example.com/v/terrapin.jpg",
    );
    // no image at all
    expect(byGuid["fb-post-1541263274222672"].imageUrl).toBeNull();
  });

  it("strips HTML from the post text", async () => {
    const items = await parseFeed(xml);
    const spare = items.find((i) => i.guid === "fb-reel-1004189352204656")!;
    expect(spare.text).not.toContain("<img");
    expect(spare.text).toContain("Rules of Summer");
  });
});
