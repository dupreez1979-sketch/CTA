import { describe, expect, it } from "vitest";
import * as React from "react";
import { render } from "@react-email/render";
import ShowcaseEmail, {
  type ShowcaseEmailProps,
} from "../src/emails/ShowcaseEmail";

const baseProps: ShowcaseEmailProps = {
  dateLabel: "4 July 2026",
  profiles: [],
  companies: [],
  social: [],
  shows: [],
  baseUrl: "https://example.org",
};

describe("ShowcaseEmail manual stories", () => {
  it("hides Read More links when a story has no post URL", async () => {
    const html = await render(
      React.createElement(ShowcaseEmail, {
        ...baseProps,
        companies: [
          {
            name: "Monkey Baa",
            hex: "#FFB83D",
            colorName: "yellow",
            shape: "plus",
            items: [
              {
                heading: "A hand-written story",
                summary: "Written directly in the builder.",
                postUrl: "",
                showTitle: null,
                showBlurb: null,
                showUrl: null,
                imageUrl: null,
                ageRange: null,
              },
            ],
          },
        ],
        social: [
          {
            company: "Monkey Baa",
            heading: "Social by hand",
            summary: "Also written directly.",
            postUrl: "",
            imageUrl: null,
          },
        ],
      }),
    );
    expect(html).toContain("A hand-written story");
    expect(html).toContain("Social by hand");
    expect(html).not.toContain("Read More");
  });

  it("keeps Read More links for stories with a post URL", async () => {
    const html = await render(
      React.createElement(ShowcaseEmail, {
        ...baseProps,
        companies: [
          {
            name: "Monkey Baa",
            hex: "#FFB83D",
            colorName: "yellow",
            shape: "plus",
            items: [
              {
                heading: "A feed story",
                summary: "Came in from the feed.",
                postUrl: "https://example.org/post",
                showTitle: null,
                showBlurb: null,
                showUrl: null,
                imageUrl: null,
                ageRange: null,
              },
            ],
          },
        ],
      }),
    );
    expect(html).toContain("Read More");
    expect(html).toContain("https://example.org/post");
  });
});

describe("ShowcaseEmail footer", () => {
  it("shows the test-list copy and no unsubscribe link on test sends", async () => {
    const html = await render(React.createElement(ShowcaseEmail, baseProps));
    expect(html).toContain("test edition of The Showcase");
    expect(html).not.toContain("Unsubscribe");
    expect(html).not.toContain("Change what you receive");
  });

  it("shows subscriber copy with unsubscribe and preferences links on live sends", async () => {
    const html = await render(
      React.createElement(ShowcaseEmail, {
        ...baseProps,
        unsubscribeUrl: "%%UNSUBSCRIBE_URL%%",
        preferencesUrl: "%%PREFERENCES_URL%%",
      }),
    );
    expect(html).toContain("You are receiving The Showcase Edition");
    expect(html).not.toContain("test edition of The Showcase");
    expect(html).toContain("Unsubscribe");
    expect(html).toContain("%%UNSUBSCRIBE_URL%%");
    expect(html).toContain("Change what you receive");
    expect(html).toContain("%%PREFERENCES_URL%%");
  });
});
