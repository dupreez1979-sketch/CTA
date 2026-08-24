import { describe, expect, it } from "vitest";
import * as React from "react";
import { render } from "@react-email/render";
import { parseAllianceContent, parseInline } from "@/lib/alliance-content";
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

  it("reads an optional width percentage and clamps it to 1–100", () => {
    expect(parseAllianceContent("![c](/api/img/abc =50%)")).toEqual([
      { type: "image", alt: "c", url: "/api/img/abc", width: 50 },
    ]);
    // Out-of-range clamps; no size stays undefined (full width).
    expect(parseAllianceContent("![](/api/img/x =250%)")[0]).toMatchObject({
      type: "image",
      width: 100,
    });
    expect(parseAllianceContent("![](/api/img/x)")[0]).toEqual({
      type: "image",
      alt: "",
      url: "/api/img/x",
    });
  });

  it("reads an alignment keyword (left / center / right)", () => {
    expect(parseAllianceContent("![](/api/img/x center)")[0]).toEqual({
      type: "image",
      alt: "",
      url: "/api/img/x",
      align: "center",
    });
    expect(parseAllianceContent("![](/api/img/x right)")[0]).toMatchObject({
      align: "right",
    });
    // British spelling maps to "center".
    expect(parseAllianceContent("![](/api/img/x centre)")[0]).toMatchObject({
      align: "center",
    });
  });

  it("reads a wrap keyword as a float (inline with text)", () => {
    expect(parseAllianceContent("![](/api/img/x wrap-left)")[0]).toEqual({
      type: "image",
      alt: "",
      url: "/api/img/x",
      float: "left",
    });
    expect(parseAllianceContent("![](/api/img/x wrap-right)")[0]).toMatchObject({
      float: "right",
    });
  });

  it("parses width and alignment together, in any order", () => {
    expect(parseAllianceContent("![](/api/img/x =50% right)")[0]).toEqual({
      type: "image",
      alt: "",
      url: "/api/img/x",
      width: 50,
      align: "right",
    });
    expect(parseAllianceContent("![](/api/img/x right =50%)")[0]).toEqual({
      type: "image",
      alt: "",
      url: "/api/img/x",
      width: 50,
      align: "right",
    });
    expect(
      parseAllianceContent("![c](/api/img/x =40% wrap-left)")[0],
    ).toEqual({
      type: "image",
      alt: "c",
      url: "/api/img/x",
      width: 40,
      float: "left",
    });
  });
});

describe("parseInline", () => {
  it("returns a single text run when there is no link", () => {
    expect(parseInline("just plain text")).toEqual([
      { type: "text", text: "just plain text" },
    ]);
  });

  it("splits a link out of the surrounding text", () => {
    expect(parseInline("See the [website](https://x.test) today")).toEqual([
      { type: "text", text: "See the " },
      { type: "link", text: "website", url: "https://x.test" },
      { type: "text", text: " today" },
    ]);
  });

  it("handles a link at the start and multiple links", () => {
    expect(
      parseInline("[one](https://a.test) and [two](https://b.test)"),
    ).toEqual([
      { type: "link", text: "one", url: "https://a.test" },
      { type: "text", text: " and " },
      { type: "link", text: "two", url: "https://b.test" },
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

  it("renders inline links in paragraphs and bullets", async () => {
    const html = await render(
      React.createElement(AllianceUpdateEmail, {
        subject: "Links",
        baseUrl: "https://example.org",
        groupEmail: "group@example.org",
        blocks: parseAllianceContent(
          "Visit the [our site](https://x.test) page.\n\n- Update your [preferences](/preferences)",
        ),
      }),
    );
    // External link href verbatim, with its visible text.
    expect(html).toContain('href="https://x.test"');
    expect(html).toContain("our site");
    // Relative link is absolutised against baseUrl.
    expect(html).toContain('href="https://example.org/preferences"');
  });

  it("aligns a block image and floats a wrapped image", async () => {
    const centered = await render(
      React.createElement(AllianceUpdateEmail, {
        subject: "Centred",
        baseUrl: "https://example.org",
        groupEmail: "group@example.org",
        blocks: parseAllianceContent("![](/api/img/c center)"),
      }),
    );
    expect(centered).toContain("text-align:center");

    const floated = await render(
      React.createElement(AllianceUpdateEmail, {
        subject: "Wrapped",
        baseUrl: "https://example.org",
        groupEmail: "group@example.org",
        blocks: parseAllianceContent(
          "![](/api/img/w =40% wrap-left)\n\nText that wraps beside the image.",
        ),
      }),
    );
    expect(floated).toContain("float:left");
    expect(floated).toContain("40%");
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
