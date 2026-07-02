import { describe, expect, it } from "vitest";
import {
  FALLBACK_COMPANY_KEY,
  companyName,
  matchCompany,
  sectionStyle,
} from "@/lib/companies";

describe("matchCompany", () => {
  it("matches by creator (Facebook page name)", () => {
    expect(matchCompany({ creator: "Spare Parts Puppet Theatre" })).toBe("spare-parts");
    expect(matchCompany({ creator: "shake & stir theatre co" })).toBe("shake-and-stir");
    expect(matchCompany({ creator: "AWESOME Arts Australia" })).toBe("awesome-arts");
  });

  it("matches by link slug when the creator is missing", () => {
    expect(
      matchCompany({ link: "https://m.facebook.com/sparepartspuppets/posts/1" }),
    ).toBe("spare-parts");
    expect(
      matchCompany({ link: "https://m.facebook.com/monkeybaatheatreco/posts/" }),
    ).toBe("monkey-baa");
  });

  it("matches by title text", () => {
    expect(matchCompany({ title: "Terrapin: The Paper Escaper lands in Taipei" })).toBe(
      "terrapin",
    );
  });

  it("falls back to Around the Alliance for unknown sources", () => {
    const key = matchCompany({ creator: "Some Unknown Page", title: "News" });
    expect(key).toBe(FALLBACK_COMPANY_KEY);
    expect(companyName(key)).toBe("Around the Alliance");
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
