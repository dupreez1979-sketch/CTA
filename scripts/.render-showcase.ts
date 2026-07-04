import { render } from "@react-email/render";
import * as React from "react";
import { writeFileSync } from "fs";
import ShowcaseEmail from "../src/emails/ShowcaseEmail";

async function main() {
  const html = await render(
    React.createElement(ShowcaseEmail, {
      dateLabel: "5 July 2026",
      baseUrl: "",
      profiles: [],
      companies: [],
      social: [
        {
          company: "Sensorium Theatre",
          heading: "Bringing theatre to children in hospital wards",
          summary: "Sensorium's ward visits programme reached 400 children in Perth hospitals in the first half of 2026.",
          postUrl: "https://facebook.com/post/9",
          imageUrl: null,
        },
      ],
      shows: [
        { title: "Zoom", company: "Patch Theatre", blurb: null, url: "https://example.com/3", ageRange: "ages 4 to 8", imageUrl: null },
        { title: "What's in the Woods?", company: "Brymore Productions", blurb: null, url: "https://example.com/1", ageRange: "ages 0 to 3", imageUrl: null },
      ],
    }),
  );
  writeFileSync("public/.showcase-swap.html", html);
  console.log("written");
}
main();
