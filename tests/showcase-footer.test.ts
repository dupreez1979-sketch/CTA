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
