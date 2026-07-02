# Handoff: Children's Theatre Alliance — RSS Newsletter & Sign-up Popup

## Overview
An automated email newsletter that turns the Alliance's daily RSS feed (aggregated Facebook posts from member companies) into a branded email. Each post gets an **AI-written headline** and a **one-sentence summary**, and posts are **grouped by the company that posted them**, each company in its own brand colour with its own puzzle-shape sticker. The newsletter ships in **three cadences** — Daily, Weekly, Fortnightly — driven from the same template. A separate **sign-up popup** lets people subscribe and choose their cadence.

Source feed: `https://rss.app/feeds/_VmsmgpgoDUUOVAkD.xml`

## About the Design Files
The files in this bundle are **design references created in HTML** — prototypes showing the intended look and behaviour, **not production code to copy directly**. The task is to **recreate these designs in your target environment** (email-template engine for the newsletter; your web app's framework for the popup) using its established patterns. The HTML uses a lightweight custom component runtime (`.dc.html` + `support.js`) purely for the prototype — do not port that runtime; port the *design*.

Two distinct deliverables:
1. **The newsletter email** (`AllianceEmail.dc.html`) — must become a real, email-client-safe HTML template (table-based, inline styles). See "Email build notes" below.
2. **The sign-up popup** (`SignupPopup.dc.html`) — a modal form for the website/app.

## Fidelity
**High-fidelity.** Final colours, typography, spacing, and interactions. Recreate pixel-accurately using the values in Design Tokens below.

---

## Screens / Views

### 1. Newsletter Email (`AllianceEmail.dc.html`)
Single-column email, **600px content width**, cream page (`#EFEEE4`).

**Structure top→bottom:**
- **Masthead** — warm-cream band (`#FFF8E7`), 3px ink bottom border, 28px 34px padding. Logo lockup (`assets/logo-full.png`, height 52px) top-left. Two decorative puzzle shapes bleed off the right edge (teal circle top, pink plus bottom). Below the logo: a **cadence pill** ("DAILY DISPATCH" / "WEEKLY DISPATCH" / "FORTNIGHTLY DISPATCH") — purple `#AC9EFC` fill, 2px ink border, pill radius, 3px hard shadow, uppercase Poppins 600 11px, 0.12em tracking — followed by a **date range** in Poppins 600 12px muted.
- **Intro line** — Impact uppercase 26px, e.g. "TODAY ACROSS THE ALLIANCE" / "THIS WEEK…" / "THIS FORTNIGHT…". 22px 34px padding.
- **In-this-issue index** *(Fortnightly only)* — small uppercase muted label, then a wrapping row of company-name chips (white fill, 2px ink border, pill radius, Poppins 600 11px).
- **Featured story** *(Weekly + Fortnightly only)* — white card, 3px ink border, 22px radius, 10px hard shadow. Full-width lead image (image slot, height 330px, 3px ink bottom border). Body padding 20–22px: a "FEATURED" pill (yellow `#FFB83D`) beside a filled company-name banner; then Impact 30px headline; Poppins 15px summary; a purple "Read the post →" button (2px ink border, 12px radius, 3px hard shadow).
- **Company sections** (repeated) — each:
  - **Company header row**: filled name banner — Impact uppercase 22px on the company's brand colour, 2px ink border, 10px radius, 3px hard shadow, left-aligned; a small (28px) puzzle-shape sticker in the same colour trails the name. `margin-bottom:18px`.
  - **Item rows** (repeated): a 2-column CSS grid `126px 1fr`, 16px gap, 16px vertical padding, separated by a **2px dashed** top border (`rgba(30,30,29,0.18)`). Left = square image slot (126×126, 14px radius, 2px ink border, 3px hard shadow). Right = Impact uppercase 20px headline, Poppins 13.5px summary, and a "Read the post →" text link underlined in the company colour (2px).
- **Footer** — purple `#AC9EFC` band, 3px ink top border. Logo (height 34px), then Poppins 500 12px: *"You're receiving this as part of the Children's Theatre Alliance. We acknowledge the Traditional Custodians of the lands on which we make and share stories."* Then an underlined **Unsubscribe** link. (Unsubscribe is the only footer action by request.)

**Cadence differences:**
- *Daily* — no index, no featured; ~5 companies, one item each.
- *Weekly* — featured lead + ~6 companies (some with 2 items).
- *Fortnightly* — index chips + featured + ~9 companies (fuller digest).

### 2. Sign-up Popup (`SignupPopup.dc.html`)
Modal over a dimmed backdrop (`rgba(30,30,29,0.55)`), centred.

**Card**: white, 24px radius, **14px hard offset shadow** (`14px 14px 0 #1E1E1D`), no border, padding 44–46px. A yellow "plus" puzzle shape (58px, rotated −10°) peeks behind the top-left corner. A circular close button (×) top-right — 34px, white, 2px ink border, 3px hard shadow, hover fill pink `#F24A71`.

**Form state:**
- Impact uppercase 42px title: **"SIGN UP TO THE ALLIANCE NEWSLETTER"**.
- Poppins 14px muted subtitle: "Get the next Alliance dispatch delivered straight to your inbox."
- Three **underline fields** (label Poppins 500 14px above; input transparent, 2px ink bottom border, Poppins 17px, 7px 2px padding, no box; **focus** → bottom border turns purple): **First name \***, **Last name \***, **Email \*** (type=email).
- **How often? \*** — three segmented pill buttons: **Daily / Weekly / Fortnightly**. Each `flex:1`, 2px ink border, 12px radius, Poppins 600 14px. **Selected** = purple fill + 3px hard shadow; **unselected** = white, no shadow. Default selected: **Weekly**.
- **Submit** — full-width button, white fill, 2px ink border, 14px radius, Poppins 700 15px, 6px hard shadow. Hover → purple fill, lift (−1px,−1px), 7px shadow. Active → press into shadow (translate +4,+4; 2px shadow).
- **Disclaimer** (below submit, centred, Poppins 12px muted): "By signing up you agree to receive updates from us and accept our **privacy policy**." ("privacy policy" is an underlined link.)

**Confirmation state** (after submit): replaces the form — a teal circle puzzle shape (40px) beside Impact 48px **"YOU'RE IN!"**; Poppins 16px: "Thanks for signing up. Your first *{chosen cadence}* dispatch will land in your inbox soon."; a text link "Sign up another address" (underlined purple) resets to the form.

---

## Interactions & Behavior
- **Popup submit**: native form validation (all fields + a cadence required). On valid submit → swap to confirmation state; the confirmation echoes the selected cadence (lower-cased). "Sign up another address" resets to the empty form.
- **Cadence pills**: single-select; clicking sets the active cadence and restyles (purple + shadow on the selected one only).
- **Field focus**: bottom border colour transitions ink → purple `#AC9EFC`.
- **Button motion**: hover lift + shadow grow; active press collapses shadow and nudges down-right. Durations 120ms; easing pop `cubic-bezier(0.34,1.56,0.64,1)` (transform) / out `cubic-bezier(0.22,0.61,0.36,1)`.
- **Newsletter links**: every item has a "Read the post →" that opens the original post URL from the feed item.
- **Image slots**: in the prototype these are drag-and-drop placeholders. In production, see Email build notes.

## State Management
Popup only:
- `submitted: boolean` — toggles form vs. confirmation view.
- `freq: 'Daily' | 'Weekly' | 'Fortnightly'` — selected cadence (default `'Weekly'`); echoed in the confirmation copy.
The newsletter email is static output — all state lives in the generation pipeline (see below), not the rendered email.

---

## Design Tokens

**Brand core colours**
- Purple `#AC9EFC` (primary accent, buttons, footer, cadence pill)
- Pink `#F24A71`
- Yellow `#FFB83D`
- Teal `#05AEAF`
- Ocean navy `#053848`

**Extended play palette** (used to differentiate companies): mint `#85F1E6`, emerald `#03DBA4`, blue `#00A0C5`, sky `#48BEFD`, soft yellow `#FFCF67`, deep cream `#FFECCA`.

**Neutrals / ink**
- Ink (type + all shadows) `#1E1E1D`
- Body text `#2C2C2B`, muted `#5A5A57`
- Page cream `#EFEEE4`, warm cream `#FFF8E7`, white `#FFFFFF`

**Typography**
- Display: **Impact** (self-hosted `impact.ttf`), fallback `'Haettenschweiler','Arial Narrow Bold',sans-serif`. Always UPPERCASE, line-height ~0.9–0.95, tracking 0.01em.
- Body: **Poppins** (Google Fonts, weights 300–700). Line-height 1.5–1.6.
- Sizes in use — Impact: 48 (confirm / featured big), 42 (popup title), 30 (featured headline), 26 (email intro), 22 (company banner), 20 (item headline). Poppins: 17 (inputs), 16, 15, 14, 13.5, 12.

**Radii**: buttons 12–14px, cards 22–24px, chips/pills full (999px), item images 14px.

**Shadows** (hard offset, zero blur, colour `#1E1E1D`): sm `3px 3px 0`, md `6px 6px 0`, lg `10px 10px 0`, popup card `14px 14px 0`. Pressed `2px 2px 0`.

**Borders**: standard 2px, bold 3px, solid ink. Item divider: 2px dashed `rgba(30,30,29,0.18)`.

**Company → colour/shape assignment** (rotates so no two adjacent sections match; avoid ocean navy for banners so ink text stays legible): pink/square, teal/arch, yellow/plus, sky/circle, emerald/quarter, blue/archCut, mint/knobLeft, plus stairs. Featured company uses purple.

## Assets
- `assets/logo-full.png` — official Children's Theatre Alliance logo lockup (raster; **never redraw the mark**). Used in masthead (52px) and footer (34px).
- **Puzzle shapes** — the brand motif, rendered as flat SVG building blocks (square, arch, circle, quarter, plus, archCut, knobLeft, stairs), recolourable. Reproduce as inline SVG or a small icon set; see `_ds/.../` PuzzleShape in the design system.
- **Impact font** — `impact.ttf` (self-hosted via `@font-face`).
- Everything comes from the bound **Children's Theatre Alliance design system** (colours, type, effects tokens + Button / Input / PuzzleShape / Logo / SectionHeading / BannerCard components). Prefer your codebase's version of these if it exists.

## Email build notes (important)
- **Feed images expire.** The Facebook image URLs in the RSS feed are signed and short-lived. The generation pipeline must **download and re-host** each post image (CDN/S3) before embedding it in the email. In the prototype these are drag-and-drop "image slots"; in production they become `<img src="{re-hosted-url}">` sized to the slot (126×126 items; full-width 330px featured).
- **AI copy.** The headlines and summaries shown are **sample AI copy** in the Alliance voice (bold, warm, plain-spoken; sentence-case summaries ≤ ~1 sentence). Production generates one headline + one summary per feed item at build time.
- **Email-safe HTML.** Rebuild as table-based layout with fully inline styles (no external CSS, no fl,ex/grid in the final email — use tables/`align`/`width`). Impact won't load in most email clients: the fallback stack (`Haettenschweiler`/`Arial Narrow Bold`) is intentional and must look acceptable. Test in Litmus/Email on Acid.
- **Grouping logic**: parse feed → map each item to its company → sort/group by company → assign each company a stable colour+shape → render sections. Cadence selects the date window (24h / 7d / 14d) and whether the index + featured blocks appear.

## Files
- `AllianceEmail.dc.html` — the newsletter email template (all three cadences share it; props: cadence, dateRange, intro, companies[], featured, indexNames, hasIndex).
- `Alliance Newsletter.dc.html` — the design-doc canvas showing all three cadences (1a/1b/1c) + the popup (2a) with sample data. The `Component` logic class holds the sample feed data and the company→colour/shape mapping — a good reference for the data shape.
- `SignupPopup.dc.html` — the sign-up popup (form + confirmation).
- `assets/logo-full.png` — logo lockup.
