import { render } from "@react-email/render";
import * as React from "react";
import { writeFileSync } from "fs";
import ShowcaseEmail from "../src/emails/ShowcaseEmail";

async function main() {
  const html = await render(
    React.createElement(ShowcaseEmail, {
      dateLabel: "4 July 2026",
      baseUrl: "",
      profiles: [
        {
          company: "Terrapin",
          hex: "#AC9EFC",
          heading: "The Paper Escaper brings theatre to Taiwan",
          summary:
            "Terrapin's The Paper Escaper has arrived in Taipei for the Children's Art Festival, its first international season for 2026.",
          postUrl: "https://facebook.com/post/1",
          showTitle: "The Paper Escaper",
          showBlurb:
            "A gloriously inventive paper world comes to life as one plucky hero folds, tears and escapes his way to freedom. Compact set, big imagination, ready to tour.",
          ageRange: "ages 4 to 10",
          showUrl: "https://example.com/shows/the-paper-escaper",
          imageUrl: null,
        },
        {
          company: "Monkey Baa Theatre Co",
          hex: "#AC9EFC",
          heading: "The Peasant Prince announces a 2027 national tour",
          summary:
            "Monkey Baa's beloved adaptation returns for a 40-venue national tour across 2027.",
          postUrl: "https://facebook.com/post/2",
          showTitle: null,
          showBlurb: null,
          ageRange: null,
          showUrl: null,
          imageUrl: null,
        },
      ],
      companies: [
        {
          name: "Patch Theatre",
          hex: "#F24A71",
          colorName: "pink",
          shape: "square",
          items: [
            {
              heading: "Zoom announces a national tour for 2027",
              summary:
                "Patch Theatre's light-play adventure Zoom will visit every state and territory across 2027.",
              showUrl: "https://example.com/shows/zoom",
              postUrl: "https://facebook.com/post/3",
              imageUrl: null,
              ageRange: "ages 4 to 8",
            },
          ],
        },
      ],
      shows: [
        {
          title: "The Peasant Prince",
          company: "Monkey Baa Theatre Co",
          blurb: "The true story of Li Cunxin, from village boy to world-class dancer.",
          url: "https://example.com/shows/the-peasant-prince",
          ageRange: "ages 6 to 12",
        },
        {
          title: "A Not So Traditional Story",
          company: "Terrapin",
          blurb: "A shape-shifting tale of story, culture and Country.",
          url: null,
          ageRange: null,
        },
      ],
    }),
  );
  writeFileSync("public/.showcase-sample.html", html);
  console.log("written");
}
main();
