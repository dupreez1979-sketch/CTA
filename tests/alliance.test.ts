import { describe, expect, it } from "vitest";
import * as React from "react";
import { render } from "@react-email/render";
import { parseAllianceContent } from "@/lib/alliance-content";
import AllianceUpdateEmail from "../src/emails/AllianceUpdateEmail";

describe("parseAllianceContent", () => {
  it("returns nothing for empty input", () => {
    expect(parseAllianceContent("")).toEqual([]);
    expect(parseAllianceContent("   \n\n  ")).toEqual([]);
  });

  it("reads # and ## as Heading 1, ### (or deeper) as Heading 2", () => {
    expect(parseAllianceContent("## Next gatherings")).toEqual([
      { type: "heading", level: 1, text: "Next gatherings" },
    ]);
    expect(parseAllianceContent("#Solo")).toEqual([
      { type: "heading", level: 1, text: "Solo" },
    ]);
    expect(parseAllianceContent("### Grants")).toEqual([
      { type: "heading", level: 2, text: "Grants" },
    ]);
    expect(parseAllianceContent("#### Deeper")).toEqual([
      { type: "heading", level: 2, text: "Deeper" },
    ]);
  });

  it("groups consecutive bullets into one list", () => {
    const blocks = parseAllianceContent("- one\n- two\n* three\n• four");
    expect(blocks).toEqual([
      { type: "list", items: ["one", "two", "three", "four"] },
    ]);
  });

  it("joins wrapped lines into a paragraph and splits on blank lines", () => {
    const blocks = parseAllianceContent("first line\nsame para\n\nsecond para");
    expect(blocks).toEqual([
      { type: "para", text: "first line same para" },
      { type: "para", text: "second para" },
    ]);
  });

  it("handles a mixed, grouped update", () => {
    const blocks = parseAllianceContent(
      "## Fund\nIntro sentence.\n### Detail\n- point a\n- point b\n\n## Actions\nDo the thing.",
    );
    expect(blocks).toEqual([
      { type: "heading", level: 1, text: "Fund" },
      { type: "para", text: "Intro sentence." },
      { type: "heading", level: 2, text: "Detail" },
      { type: "list", items: ["point a", "point b"] },
      { type: "heading", level: 1, text: "Actions" },
      { type: "para", text: "Do the thing." },
    ]);
  });

  it("tolerates CRLF line endings", () => {
    expect(parseAllianceContent("## H\r\n- a\r\n- b")).toEqual([
      { type: "heading", level: 1, text: "H" },
      { type: "list", items: ["a", "b"] },
    ]);
  });

  it("reads a markdown image line as an image block", () => {
    expect(parseAllianceContent("![A caption](/api/img/abc)")).toEqual([
      { type: "image", alt: "A caption", url: "/api/img/abc" },
    ]);
    expect(
      parseAllianceContent("## Heading\n![](https://x.test/p.jpg)\nAfter"),
    ).toEqual([
      { type: "heading", level: 1, text: "Heading" },
      { type: "image", alt: "", url: "https://x.test/p.jpg" },
      { type: "para", text: "After" },
    ]);
  });
});

describe("AllianceUpdateEmail", () => {
  it("renders subject, headings and bullets without throwing", async () => {
    const html = await render(
      React.createElement(AllianceUpdateEmail, {
        subject: "Alliance update — July",
        baseUrl: "https://example.org",
        groupEmail: "group@example.org",
        blocks: parseAllianceContent(
          "## Children's Investment Fund\nGrants confirmed.\n### Round one\n- Applications open 1 August",
        ),
      }),
    );
    expect(html).toContain("Alliance update — July");
    expect(html).toContain("Alliance Update");
    expect(html).toContain("Investment Fund");
    expect(html).toContain("Round one");
    expect(html).toContain("Applications open 1 August");
    // Never uses the word "member".
    expect(html.toLowerCase()).not.toContain("member");
    // Always-on Links section with website, newsletter and the group email.
    expect(html).toContain("Links");
    expect(html).toContain("childrenstheatrealliance.com.au");
    expect(html).toContain("group@example.org");
    expect(html).toContain("Reminder");
    // Uses the yellow Links band, flowing into the blue footer.
    expect(html).toContain("cloud-cream-yellow.png");
    expect(html).toContain("cloud-yellow-blue.png");
  });

  it("renders inline images, absolutising relative /api/img URLs", async () => {
    const html = await render(
      React.createElement(AllianceUpdateEmail, {
        subject: "With pictures",
        baseUrl: "https://example.org",
        groupEmail: "group@example.org",
        blocks: parseAllianceContent(
          "![](/api/img/abc)\n\n![](https://cdn.test/x.jpg)",
        ),
      }),
    );
    // Relative upload URL is made absolute against baseUrl…
    expect(html).toContain("https://example.org/api/img/abc");
    // …and an external URL is used verbatim.
    expect(html).toContain("https://cdn.test/x.jpg");
  });

  it("falls back to a default heading when the subject is blank", async () => {
    const html = await render(
      React.createElement(AllianceUpdateEmail, {
        subject: "  ",
        baseUrl: "https://example.org",
        groupEmail: "group@example.org",
        blocks: [],
      }),
    );
    expect(html).toContain("Alliance Update");
  });
});
