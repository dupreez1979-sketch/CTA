/**
 * Export the pull-up banner (design/PullUpBanner.html) as separate high-res
 * PNG layers for rebuilding in Canva. Foreground pieces are transparent; the
 * full composition and the sky swatch are opaque.
 *
 * Vector parts (cloud, puzzle shapes) are rasterised from their SVG geometry
 * with sharp; the type/composited parts (headline, subline, logo card, website
 * pill, full banner) are rendered by headless Chromium so the real Impact and
 * Poppins faces are used. Geometry/colours mirror src/lib/{clouds,shapes,
 * tokens}.ts.
 *
 * Run:  node scripts/export-banner-parts.mjs
 * Needs: sharp (local) + a global Playwright/Chromium.
 */
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const require = createRequire(import.meta.url);
const ROOT = "/home/user/CTA";
const sharp = require(path.join(ROOT, "node_modules/sharp"));
const pwRoot = execSync("npm root -g").toString().trim();
const { chromium } = require(path.join(pwRoot, "playwright"));

const OUT = path.join(ROOT, "design", "banner-parts");
const SHAPES_OUT = path.join(OUT, "shapes");
fs.mkdirSync(SHAPES_OUT, { recursive: true });

// ---- brand tokens (src/lib/tokens.ts) --------------------------------------
const C = {
  pink: "#F24A71",
  yellow: "#FFB83D",
  teal: "#05AEAF",
  purple: "#AC9EFC",
  emerald: "#03DBA4",
  sky: "#48BEFD",
  cream: "#EFEEE4",
  creamWarm: "#FFF8E7",
  ink: "#1E1E1D",
};

// ---- cloud (src/lib/clouds.ts CLOUD_PATH), cream fill, no background -------
const CLOUD_W = 1280;
const CLOUD_H = 104;
const CLOUD_PATH =
  "M0 104c4.502-47.14 44.433-84 92.5-84 39.895 0 73.89 25.392 86.871 60.979C196.321 67.941 218.817 60 243.5 60c22.905 0 43.926 6.839 60.38 18.24C315.831 38.734 352.185 10 395.178 10c33.559 0 63.074 17.508 80.094 43.981 4.642-.646 9.393-.981 14.228-.981 10.168 0 19.965 1.48 29.155 4.224C533.536 23.504 566.99 0 605.873 0 649.327 0 686 29.354 697.547 69.517 710.944 63.443 726.248 60 742.5 60c6.917 0 13.662.624 20.161 1.808C780.155 41.694 805.798 29 834.374 29c22.959 0 44.025 8.195 60.493 21.848C912.153 26.135 940.642 10 972.859 10c31.191 0 58.891 15.125 76.311 38.518C1062.19 41.793 1076.93 38 1092.55 38c7.66 0 15.1.911 22.23 2.631C1132.2 21.782 1157.01 10 1184.54 10c51.9 0 94.15 41.86 95.46 94z";

// ---- puzzle shapes actually used on the banner (src/lib/shapes.ts) ---------
const SHAPE_PATHS = {
  circle: "M50,0 A50,50 0 1 1 49.99,0 Z",
  plus: "M35,0 H65 V35 H100 V65 H65 V100 H35 V65 H0 V35 H35 Z",
  quarter: "M0,0 L0,100 A100,100 0 0 0 100,0 Z",
  arch: "M0,100 L0,50 A50,50 0 0 1 100,50 L100,100 Z",
  square: "M0,0 H100 A15,15 0 0 1 100,30 A15,15 0 0 1 100,60 V100 H0 Z",
  stairs: "M0,100 V60 H25 V40 H50 V20 H75 V0 H100 V100 Z",
  knobLeft: "M0,35 A15,15 0 0 1 0,65 L0,100 H100 V0 H0 Z",
};
const SHAPES_USED = [
  ["circle", "pink"],
  ["plus", "yellow"],
  ["quarter", "purple"],
  ["arch", "purple"],
  ["square", "teal"],
  ["stairs", "emerald"],
  ["knobLeft", "pink"],
  ["circle", "yellow"],
];

const dataUri = (file, mime) =>
  `data:${mime};base64,${fs.readFileSync(file).toString("base64")}`;

async function svgToPng(svg, outFile) {
  await sharp(Buffer.from(svg)).png().toFile(outFile);
}

async function main() {
  // 1. transparent cloud (cream scallop only)
  const cloudW = 6000;
  const cloudH = Math.round((cloudW * CLOUD_H) / CLOUD_W);
  await svgToPng(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CLOUD_W} ${CLOUD_H}" width="${cloudW}" height="${cloudH}"><path d="${CLOUD_PATH}" fill="${C.cream}"/></svg>`,
    path.join(OUT, "06-cloud.png"),
  );

  // 2. transparent shapes at 1500px
  for (const [shape, colour] of SHAPES_USED) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="1500" height="1500"><path d="${SHAPE_PATHS[shape]}" fill="${C[colour]}"/></svg>`;
    await svgToPng(svg, path.join(SHAPES_OUT, `${shape}-${colour}.png`));
  }

  // 3. solid sky swatch (opaque), banner ratio 850:2000
  await sharp({
    create: {
      width: 1700,
      height: 4000,
      channels: 4,
      background: C.sky,
    },
  })
    .png()
    .toFile(path.join(OUT, "01-background-sky.png"));

  // 4. copy raster originals (already transparent, max available res)
  fs.copyFileSync(
    path.join(ROOT, "public/logo-full.png"),
    path.join(OUT, "03-logo.png"),
  );
  fs.copyFileSync(
    path.join(ROOT, "public/ncti-logo.png"),
    path.join(OUT, "08-ncti-logo.png"),
  );

  // 5. Chromium-rendered type/composited parts (transparent) + full banner
  const logoUri = dataUri(path.join(ROOT, "public/logo-full.png"), "image/png");
  const impactUri = dataUri(
    path.join(ROOT, "public/fonts/impact.ttf"),
    "font/ttf",
  );

  const partsHtml = `<!doctype html><html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Poppins:wght@600;700&display=swap">
<style>
  @font-face{font-family:"ImpactCTA";src:url("${impactUri}") format("truetype");font-display:block;}
  html,body{margin:0;background:transparent;}
  .part{display:inline-block;background:transparent;}
  /* generous transparent padding so hard shadows are captured, not clipped */
  #logocard,#pill{padding:26mm;}
  #headline,#subline{padding:6mm 10mm;}
  .card{width:660mm;box-sizing:border-box;padding:52mm 56mm;background:${C.creamWarm};
        border:2.4mm solid ${C.ink};border-radius:30mm;box-shadow:13mm 13mm 0 ${C.ink};}
  .card img{display:block;width:100%;height:auto;}
  h1.hero{margin:0;width:740mm;text-align:center;font-family:"ImpactCTA","Impact",sans-serif;
          text-transform:uppercase;font-size:128mm;line-height:0.92;letter-spacing:0.005em;color:${C.ink};}
  p.sub{margin:0;width:660mm;text-align:center;font-family:"Poppins",system-ui,sans-serif;
        font-weight:600;font-size:27mm;line-height:1.32;color:${C.ink};}
  .pill{font-family:"Poppins",system-ui,sans-serif;font-weight:700;font-size:30mm;letter-spacing:0.01em;
        color:${C.ink};background:${C.yellow};border:2.2mm solid ${C.ink};border-radius:22mm;
        box-shadow:8mm 8mm 0 ${C.ink};padding:15mm 34mm;display:inline-block;}
</style></head><body>
  <div class="part" id="logocard"><div class="card"><img src="${logoUri}" alt=""></div></div>
  <div class="part" id="headline"><h1 class="hero">Theatre for every child</h1></div>
  <div class="part" id="subline"><p class="sub">A national network of companies making theatre for children and young people.</p></div>
  <div class="part" id="pill"><span class="pill">childrenstheatrealliance.com.au</span></div>
</body></html>`;

  const browser = await chromium.launch();
  const ctx = await browser.newContext({ deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.setContent(partsHtml, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
  for (const [id, name] of [
    ["logocard", "02-logo-card.png"],
    ["headline", "04-headline.png"],
    ["subline", "05-subline.png"],
    ["pill", "07-website-pill.png"],
  ]) {
    await page
      .locator(`#${id}`)
      .screenshot({ path: path.join(OUT, name), omitBackground: true });
  }
  await ctx.close();

  // full banner reference (opaque), true 850x2000 with the screen transform off
  const ctx2 = await browser.newContext({ deviceScaleFactor: 1 });
  const page2 = await ctx2.newPage();
  await page2.goto("file://" + path.join(ROOT, "design", "PullUpBanner.html"), {
    waitUntil: "networkidle",
  });
  await page2.evaluate(() => document.fonts.ready);
  await page2.evaluate(() => {
    const b = document.querySelector(".banner");
    b.style.transform = "none";
    const f = document.querySelector(".fit");
    f.style.width = "auto";
    f.style.height = "auto";
  });
  await page2.waitForTimeout(400);
  await page2
    .locator(".banner")
    .screenshot({ path: path.join(OUT, "00-full-banner.png") });
  await ctx2.close();
  await browser.close();

  console.log("Exported to", OUT);
  for (const f of fs.readdirSync(OUT)) console.log("  " + f);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
