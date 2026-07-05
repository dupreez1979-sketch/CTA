import { describe, it, expect } from "vitest";
import {
  headingSimilarity,
  isPotentialDuplicate,
  duplicateMap,
  similarInPool,
  type DupStory,
} from "../src/lib/duplicates";

const story = (id: number, heading: string, extra: Partial<DupStory> = {}): DupStory => ({
  id,
  heading,
  rawTitle: null,
  companyKey: "co",
  date: new Date("2026-07-05"),
  ...extra,
});

describe("headingSimilarity", () => {
  it("is 1 for identical headings (ignoring case and punctuation)", () => {
    expect(headingSimilarity("Patch Theatre: The Lightning Show", "patch theatre the lightning show")).toBe(1);
  });

  it("stays very high for the same story with a small addition", () => {
    const s = headingSimilarity(
      "Patch Theatre announces The Lightning Show",
      "Patch Theatre announces The Lightning Show for 2026",
    );
    expect(s).toBeGreaterThan(0.85);
  });

  it("is low for genuinely different headings", () => {
    const s = headingSimilarity(
      "Patch Theatre announces The Lightning Show",
      "Windmill Theatre tours Beep to regional halls",
    );
    expect(s).toBeLessThan(0.5);
  });

  it("handles empty strings", () => {
    expect(headingSimilarity("", "anything")).toBe(0);
  });
});

describe("isPotentialDuplicate", () => {
  it("flags near-identical headings", () => {
    expect(
      isPotentialDuplicate(
        story(1, "The Lightning Show opens in July"),
        story(2, "The Lightning Show opens in July!"),
      ),
    ).toBe(true);
  });

  it("does not flag different shows", () => {
    expect(
      isPotentialDuplicate(story(1, "The Lightning Show"), story(2, "The Thunder Play")),
    ).toBe(false);
  });

  it("can match on raw titles when headings differ", () => {
    expect(
      isPotentialDuplicate(
        story(1, "AI headline one", { rawTitle: "Original social post about Beep the tour" }),
        story(2, "A totally different AI headline", { rawTitle: "Original social post about Beep the tour" }),
      ),
    ).toBe(true);
  });
});

describe("duplicateMap", () => {
  it("flags both members of a pair and leaves singletons out", () => {
    const stories = [
      story(1, "The Lightning Show opens in July"),
      story(2, "The Lightning Show opens in July now"),
      story(3, "Unrelated tour announcement"),
    ];
    const map = duplicateMap(stories);
    expect(map.get(1)?.map((s) => s.id)).toEqual([2]);
    expect(map.get(2)?.map((s) => s.id)).toEqual([1]);
    expect(map.has(3)).toBe(false);
  });
});

describe("similarInPool", () => {
  it("finds pool matches and excludes the candidate's own id", () => {
    const pool = [
      story(1, "The Lightning Show opens in July"),
      story(2, "A different production entirely"),
    ];
    const candidate = story(1, "The Lightning Show opens in July");
    expect(similarInPool(candidate, pool).map((s) => s.id)).toEqual([]);
    const fresh = story(9, "The Lightning Show opens in July soon");
    expect(similarInPool(fresh, pool).map((s) => s.id)).toEqual([1]);
  });
});
