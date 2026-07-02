/**
 * Render the email template with the design handoff's sample data for all
 * three cadences — used to eyeball the build against the design and for
 * ad-hoc client previews without a database. Output: .samples/*.html
 * (gitignored).
 */
import { mkdirSync, writeFileSync } from "fs";
import path from "path";
import * as React from "react";
import { render } from "@react-email/render";
import AllianceEmail, {
  type AllianceEmailProps,
  type EmailCompanySection,
} from "../src/emails/AllianceEmail";
import { sectionStyle, FEATURED_STYLE } from "../src/lib/companies";

const BASE_URL = process.env.APP_URL ?? "http://localhost:3000";

function co(
  name: string,
  i: number,
  items: { heading: string; summary: string; url?: string }[],
): EmailCompanySection {
  const style = sectionStyle(i);
  return {
    name,
    hex: style.hex,
    colorName: style.colorName,
    shape: style.shape,
    items: items.map((it) => ({
      heading: it.heading,
      summary: it.summary,
      url: it.url ?? "https://www.facebook.com/",
      imageUrl: null,
    })),
  };
}

// Sample data from design/Alliance Newsletter.dc.html
const daily: AllianceEmailProps = {
  cadence: "daily",
  dateRange: "Wednesday 1 July 2026",
  intro: "Today across the Alliance",
  companies: [
    co("Spare Parts Puppet Theatre", 0, [
      {
        heading: "Rules of Summer returns for the holidays",
        summary:
          "A wordless, multi-sensory puppetry show drawn from Shaun Tan's picture book runs 4–18 July at Claremont Showground.",
      },
    ]),
    co("Windmill", 1, [
      {
        heading: "Moss Piglet wraps its national tour",
        summary:
          "Stage manager Taylor takes you behind the scenes as the tour closes at Theatre Royal Hobart this Friday 3 July.",
      },
    ]),
    co("Shake & Stir", 2, [
      {
        heading: "GRIMM keeps delighting audiences",
        summary:
          "The Brothers Grimm retelling tours on nationwide, with venues and dates listed on the company's mainstage page.",
      },
    ]),
    co("Terrapin", 3, [
      {
        heading: "The Paper Escaper lands in Taipei",
        summary:
          "The team has arrived for the Taipei Children's Art Festival, opening at TPAC this week.",
      },
    ]),
    co("AWESOME Arts", 4, [
      {
        heading: "Volunteer sign-ups open for the festival",
        summary:
          "Registrations are now live for anyone keen to join this year's AWESOME Festival crew.",
      },
    ]),
  ],
  baseUrl: BASE_URL,
  unsubscribeUrl: "#",
  preferencesUrl: "#",
};

const weekly: AllianceEmailProps = {
  cadence: "weekly",
  dateRange: "29 Jun – 5 Jul 2026",
  intro: "This week across the Alliance",
  featured: {
    company: "Monkey Baa",
    hex: FEATURED_STYLE.hex,
    heading: "Eva Di Cesare to step down after 30 years",
    summary:
      "The co-founder and Artistic Director will conclude her tenure at the end of 2027, the company's 30th year, having reached more than 1.8 million children and families across the country.",
    url: "https://m.facebook.com/monkeybaatheatreco/posts/",
    imageUrl: null,
  },
  companies: [
    co("Patch Theatre", 0, [
      {
        heading: "Me & My Shadow marks 16 years on stage",
        summary:
          "After 340+ performances worldwide, the show returns to Adelaide this August with original performers Nathan and Astrid.",
      },
    ]),
    co("Spare Parts Puppet Theatre", 1, [
      {
        heading: "Rules of Summer returns for the holidays",
        summary:
          "A wordless puppetry show from Shaun Tan's book runs 4–18 July at Claremont Showground.",
      },
      {
        heading: "Countdown to opening night",
        summary:
          "Blue Hat Boy and Red Hat Boy step onto the stage this week as the season begins.",
      },
    ]),
    co("Barking Gecko", 2, [
      {
        heading: "95,050 children reached in 2025",
        summary:
          "A record touring year across WA, helping 7,493 students attend live theatre through subsidised tickets.",
      },
    ]),
    co("Terrapin", 3, [
      {
        heading: "The Paper Escaper lands in Taipei",
        summary:
          "The team has arrived for the Taipei Children's Art Festival, opening at TPAC this week.",
      },
      {
        heading: "Raising $10,000 to tour Space Neighbours",
        summary:
          "The schools program aims to reach 12,000 Tasmanian children in 2026, including remote communities.",
      },
    ]),
    co("Slingsby", 4, [
      {
        heading: "Slingsby farewells four of its finest",
        summary:
          "The company thanks four long-serving team members as it reshapes for its next chapter.",
      },
    ]),
    co("Windmill", 5, [
      {
        heading: "Moss Piglet wraps its national tour",
        summary:
          "Stage manager Taylor goes behind the scenes as the tour closes at Theatre Royal Hobart this Friday.",
      },
    ]),
  ],
  baseUrl: BASE_URL,
  unsubscribeUrl: "#",
  preferencesUrl: "#",
};

const fortnightly: AllianceEmailProps = {
  ...weekly,
  cadence: "fortnightly",
  dateRange: "22 Jun – 5 Jul 2026",
  intro: "This fortnight across the Alliance",
  indexNames: [
    "Monkey Baa",
    "Patch Theatre",
    "Spare Parts",
    "Shake & Stir",
    "Terrapin",
    "Polyglot",
    "Barking Gecko",
    "Playable Streets",
    "Slingsby",
    "Arena",
    "Windmill",
  ],
  companies: [
    ...weekly.companies,
    co("Polyglot", 6, [
      {
        heading: "Spark a child's play this EOFY",
        summary:
          "Tax-deductible gifts back art made with and for children, from $2 upward.",
      },
    ]),
    co("Playable Streets", 7, [
      {
        heading: "Firefly Night Market lights up Tarneit",
        summary:
          "A free, luminous evening of music, theatre and dance presented with Wyndham City at Penrose Place.",
      },
    ]),
    co("Arena Theatre", 8, [
      {
        heading: "Saltbush moves Bendigo audiences",
        summary:
          "Greater Bendigo primary students experienced the work about Country and belonging at Ulumbarra Theatre.",
      },
    ]),
  ],
};

async function main() {
  const out = path.join(process.cwd(), ".samples");
  mkdirSync(out, { recursive: true });
  for (const [name, props] of Object.entries({ daily, weekly, fortnightly })) {
    const html = await render(React.createElement(AllianceEmail, props));
    writeFileSync(path.join(out, `${name}.html`), html);
    console.log(`Rendered .samples/${name}.html`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
