# The Children's Theatre Alliance — Design System

A design system recreated from **[childrenstheatrealliance.com.au](https://www.childrenstheatrealliance.com.au/)** — the national platform of Australia's professional theatre companies making work for children.

The brand is loud, warm and unmistakably for kids-and-grown-ups: **Impact** all-caps headlines shouting across the page, friendly **Poppins** body copy, a bright primary-leaning palette on warm cream, hard cut-paper shadows, and a signature motif of **puzzle-piece / geometric building blocks** and **cloud edges**.

## Sources
- **Website (ground truth):** https://www.childrenstheatrealliance.com.au/ — copy, structure, color, layout all lifted from here.
- **Brand assets provided:** `uploads/Children's Theatre Alliance Branding.png` (logo lockup), a 23-piece puzzle-shape library screenshot, and section screenshots (buttons, stats, partners, cloud divider, recommendation card, footer). Copied into `assets/`.
- No production codebase or Figma file was provided; the recreation is built from the live site + the supplied brand images.

## Who it's for
Advocacy and campaign material ("#ForEveryChild"), the marketing website, partner/company communications, and playful public-facing collateral for a children's-arts audience (funders, government, families, member companies).

---

## CONTENT FUNDAMENTALS

**Voice: bold, warm, plain-spoken advocacy.** Confident and campaigning without being corporate. Short declarative sentences. It speaks as a collective **"we"** ("Together we collaborate…") and addresses the reader/child in the third person ("every Australian child").

- **Casing:** Display headlines are **ALL CAPS** in Impact ("THEATRE FOR EVERY CHILD", "WHY CHILDREN'S THEATRE", "20+ COMPANIES PARTNERING FOR IMPACT"). Body and sub-copy are sentence case in Poppins.
- **Tone words:** rights-based, hopeful, urgent. "Every Australian child has the right to take part in cultural life." "Theatre for every child."
- **Rhetoric:** big round stats used as blunt proof points — "Only 1 in 5 children get access to theatre", "1 in 4 children struggle with emotional maturity", "20+ companies". Problem → belief → call to action structure.
- **Headline style:** verb-first or noun-punch. Recommendation cards use two-word imperatives ("REMOVE BARRIERS", "STRONG SECTOR").
- **Hashtag/campaign:** `#ForEveryChild` and "I AM #ForEveryChild" as a rallying line.
- **No emoji.** Warmth comes from color and shape, not emoji or exclamation-spam.
- **Australian spelling** (e.g. "programme"/"program" per site; "theatre" not "theater").
- **Acknowledgement of Country** appears in the footer, sincere and unembellished.

---

## VISUAL FOUNDATIONS

**Overall vibe:** cut-paper collage meets picture-book. Flat solid colors, thick black keylines, hard offset shadows, scattered geometric shapes. Nothing glassy, nothing gradient-heavy.

- **Color:** warm **cream** page (`#EFEEE4`) as the canvas. Five brand colors — **purple `#AC9EFC`** (primary accent / footer), **pink `#F24A71`**, **yellow `#FFB83D`**, **teal `#05AEAF`**, **ocean navy `#053848`** — plus an extended "play palette" (mint, emerald, blue, sky, soft yellow) drawn from the puzzle-shape library. Type and shadows are near-black **ink `#1E1E1D`**. Color is used in big confident blocks (a full yellow panel, a full purple footer), not timid accents.
- **Type:** two voices only. **Impact** (ultra-condensed, heavy, all-caps, `line-height ~0.9`) for every headline; occasionally *italic* on diagonal banners. **Poppins** (300–700) for everything readable. See "Font substitution" below.
- **Spacing/layout:** generous section padding (`clamp(64–128px)`), a ~1200px content column, big airy gutters. Content is often split into bold two-tone panels (yellow ½ / cream ½ on the partners section).
- **Backgrounds:** mostly flat cream or a flat brand color. No photographic hero. **Decorative geometric shapes are scattered** into the margins (puzzle squares, arches, circles). Section transitions use a **bumpy cloud edge** (teal "sky" over cream clouds; a black cloud band above the footer). No repeating textures, no grain, no gradients (a barely-there radial on one shape at most).
- **Shadows:** the signature is a **hard offset shadow** — solid ink, **zero blur**, pushed down-right (`6px 6px 0`, `10px 10px 0`). Reads like a sticker lifted off the page. No soft ambient/elevation shadows anywhere.
- **Borders:** thick **2–3px solid ink** keylines on buttons, cards and inputs.
- **Corner radii:** chunky and friendly — `14px` buttons, `22px` cards, `34px` big panels, full pills where used. Shapes themselves are hard-edged.
- **Animation:** playful and springy. Buttons carry a small **resting tilt (~-1.5°)** that straightens on hover; hover **lifts** (-2px), press **collapses the shadow** and nudges the element down-right into it. Quick durations (120–220ms), a springy `cubic-bezier(0.34,1.56,0.64,1)` pop easing. No long fades, no parallax.
- **Hover state:** lift + straighten (buttons); links stay ink, may bold.
- **Press state:** shadow shrinks to `2px 2px 0`, element translates `+4px,+4px` (pushes "into" the page).
- **Cards:** white fill, 3px ink border, `22px` radius, big `10px 10px 0` ink shadow; some carry a **diagonal colored banner** with an *italic Impact* title (the recommendation cards).
- **Transparency/blur:** essentially none — this is an opaque, flat, printed-poster aesthetic.
- **Imagery vibe:** where production photos appear on the site they are full-color, warm, joyful stage photography (not provided here; use `<image-slot>` or user photos).

---

## ICONOGRAPHY

The brand is **shape-led, not icon-led.** There is no line-icon set and no icon font. The visual "icons" are the **flat colored puzzle/geometric building blocks** from the shape library (squares with knobs, arches, circles, quarter-circles, plus signs, stairs) — reproduced as the **`PuzzleShape`** component. These stand in for bullets, feature markers, stat containers and decorative scatter.

- **No emoji, no Unicode-glyph icons.**
- **Logo mark:** a fixed collage of five colored shapes (purple diamond, pink heart, teal arch, yellow puzzle piece, navy trapezoid) locked to the wordmark. It is a **raster asset** — use `assets/logo-full.png` / `assets/logo-mark.png` via the `Logo` component. **Never redraw the mark.**
- **Partner logos** (Arena, Barking Gecko, Monkey Baa, Patch, Polyglot, etc.) are third-party marks — not included here; the UI kit renders partner names as type placeholders. Supply the real logos if reproducing the partners wall.
- If a UI genuinely needs functional glyphs (menu, arrows, social), substitute a **minimal solid/heavy set** to match the bold aesthetic and flag it — none ships with this system.

---

## FONTS

The brand spec is **Impact + Poppins**, and both are now wired:
- **Impact** is **self-hosted** from the uploaded `fonts/impact.ttf` via an `@font-face` in `tokens/fonts.css` (`--font-display: 'Impact', 'Haettenschweiler', …`). Two extra uploads (`fonts/Impacted.ttf`, `fonts/unicode.impact.ttf`) are alternate Impact cuts kept in `fonts/` but not wired.
- **Poppins** loads from Google Fonts as specified.

---

## INDEX / MANIFEST

**Root**
- `styles.css` — global entry point (import list only). Consumers link this.
- `tokens/` — `fonts.css`, `colors.css`, `typography.css`, `spacing.css`, `effects.css`
- `assets/` — `logo-full.png`, `logo-mark.png`, `shape-library.png`
- `readme.md` (this file), `SKILL.md`

**Components** (`window.DesignSystem_9aa87f`)
- `components/actions/` — **Button** (primary / dark / warm / white / ghost; sm/md/lg; hard shadow + tilt)
- `components/brand/` — **PuzzleShape** (the geometric motif), **Logo** (image lockup / type fallback), **CloudDivider** (bumpy section edge)
- `components/content/` — **SectionHeading** (Impact title + kicker), **BannerCard** (diagonal-banner card), **FeatureCard** (icon + title + copy)
- `components/forms/` — **Input** (underline text field, light/dark)

**Foundation cards** (`guidelines/`) — Colors (Brand Core, Play Palette, Neutrals & Ink), Type (Display, Body), Spacing (Scale, Radii), Effects (Hard Shadows).

**UI kits**
- `ui_kits/website/` — full single-page recreation of the marketing site (`index.html` + `Sections.jsx`): nav, hero, "Why Children's Theatre" stats, benefits, 20+ partners, "We are calling for" recommendations, #ForEveryChild campaign, footer with contact form. Also registered as a **Starting Point**.

**Intentional additions:** none invented beyond what the site/brand defines. `CloudDivider` and `PuzzleShape` are reifications of on-site brand elements; `FeatureCard`/`BannerCard`/`SectionHeading` mirror on-site blocks.
