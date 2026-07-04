# Children's Theatre Alliance — Newsletter App

An automated email newsletter for the [Children's Theatre Alliance](https://www.childrenstheatrealliance.com.au/). It turns the Alliance's RSS feed (aggregated Facebook posts from the Alliance's companies) into a branded email: every post gets an **AI-written headline and one-sentence summary**, posts are **grouped by company** — each in its own brand colour with a puzzle-shape sticker — and the newsletter ships in **three cadences** (Daily / Weekly / Fortnightly) from one template. People subscribe through a **sign-up popup** hosted here and embeddable on the Alliance website.

Built from the design handoff in [`design/`](design/README.md). Runs on **Netlify** with **Supabase** (Postgres), **Resend** (email), **Netlify Blobs** (image hosting) and the **Anthropic API** (headlines/summaries).

## How it works

```
                     ┌──────────────────────────────────────────────┐
 rss.app feed ──────▶│ Netlify scheduled function (7am Sydney)      │
                     │ → /api/cron/daily                            │
                     │  1. ingest: new items → Claude headline +    │
                     │     summary → re-host image → Supabase       │
                     │  2. send daily issue (last 24h)              │
                     │  3. Mondays: send weekly (last 7d)           │
                     │  4. alternate Mondays: send fortnightly      │
                     └───────────────┬──────────────────────────────┘
                                     ▼
                     Resend (batch, per-recipient unsubscribe link)
```

- **Sign-up**: `/` hosts the sign-up page; `/embed.js` provides a popup for the existing Wix site. Instant subscribe (no confirmation email); re-subscribing updates choices and reactivates. Besides the Daily/Weekly/Fortnightly cadence there is a "Showcase only" option, and a default-ticked tick box opts every subscriber in to **The Showcase Edition** (event-driven show news, no fixed frequency) unless they untick it. The same choices are on `/preferences`.
- **Unsubscribe**: one-click link in every footer + RFC 8058 `List-Unsubscribe` headers.
- **Idempotent sends**: each cadence+window claims a row in `issues` before sending — a retry or double-click in admin never double-sends.
- **Featured story** (weekly/fortnightly): Claude picks the most newsworthy post of the window; fortnightly adds the "in this issue" company index.
- **Images**: the feed's Facebook image URLs expire, so each image is copied to Netlify Blobs at ingest and served from `/api/img/[key]`; items without an image get a brand-coloured placeholder slot.
- **Admin** (`/admin`, branded login at `/admin/login`, password from `ADMIN_PASSWORD`, 30-day session cookie): tabs for Overview, Editions, The Showcase, Subscribers and Settings (introduction emails, AI credits, new-subscriber notifications, the company registry). Subscribers: filterable, sortable counts/list + CSV export, add a subscriber directly, and click any subscriber for their full delivery history (sortable, filterable). Editions: fetch-posts button, live issue previews, test sends, manual send, and two one-off introduction emails (Alliance-first and newsletter-first). Every live send writes a `deliveries` row per recipient, so each sent issue and Showcase edition lists exactly who received it.
- **Function limits**: ingest is capped per run (`INGEST_MAX_PER_RUN`, default 10, processed in parallel) so each invocation fits Netlify's function time limit; leftovers are picked up by the next run.
- **The Showcase**: a separate edition for presenters and international partners covering only shows that can tour, sent when there is show news rather than on a cadence. The per-item Claude call also classifies each post; show/tour announcements enter a draft pool, official show pages are researched automatically from each company's "shows page URL" (Settings tab), and the test list (default `kevin@monkeybaa.com.au`, editable on The Showcase tab) gets a "draft ready" email. Nothing sends automatically — review and edit in the builder, **Send test** (test list only, the draft stays a draft), then **Send live** to every active subscriber opted in to The Showcase Edition, with per-recipient unsubscribe links. A "Shows in the Spotlight" registry of available shows (`shows` table) rounds out each edition. Research per pipeline run is capped by `PRESENTER_RESEARCH_MAX_PER_RUN` (default 2).

## Local development

```bash
npm install
cp .env.example .env    # fill in values
npm run db:migrate      # apply drizzle/ migrations to DATABASE_URL
npm run dev
```

- `npm test` — unit tests (cadence windows, company matching, feed parsing against `fixtures/feed-sample.xml`)
- `npm run build` / `npm run lint`
- `npx tsx scripts/render-samples.ts` — renders all three cadences with the design's sample data to `.samples/*.html` (no DB needed)
- `npm run shapes` — regenerates `public/shapes/*.png` (only needed if the palette or shape set changes)
- Set `SEND_DRY_RUN=1` to exercise the whole pipeline without emailing anyone.
- Netlify Blobs needs the Netlify context — use `npx netlify dev` for image re-hosting locally, or ignore it (items fall back to coloured placeholder slots).

To run the pipeline manually:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/daily
```

(or click **Fetch new posts now** + **Send now** in `/admin`).

## Deploying (Netlify + Supabase + Resend)

1. **Supabase**: create a project at supabase.com → **Connect** → copy the **Session pooler** URI (`...pooler.supabase.com:5432`) and substitute your database password. That's `DATABASE_URL`. Also copy the **Transaction pooler** URI (same host, port `6543`) as `DATABASE_POOL_URL` — the running app prefers it, and it shares the database's small connection pool across serverless instances so busy moments can't hit Supabase's "max clients reached in session mode" limit. Migrations run automatically during each Netlify build (`netlify.toml` runs `npm run db:migrate` before `next build`, using `DATABASE_URL`), so there's nothing to apply by hand.
2. **Netlify**: **Add new project → Import from Git** → pick this repo and branch. The Next.js runtime is auto-detected and `netlify.toml` supplies the build command. Before the first deploy, add all environment variables from `.env.example` (Site configuration → Environment variables). Netlify Blobs works out of the box — no token needed.
3. **Resend**: create an account, **verify the sending domain** (Domains → Add domain → add the DKIM/SPF DNS records it shows at your DNS host — this is what keeps issues out of spam), then create an API key. Set `RESEND_API_KEY` and `EMAIL_FROM` (an address on the verified domain).
4. **Anthropic**: create an API key at platform.claude.com (add a small amount of credit); set `ANTHROPIC_API_KEY`.
5. Set `APP_URL` to the site's final origin (the `*.netlify.app` URL or your custom domain) and redeploy if you change it later — emails embed absolute URLs built from it.
6. The **scheduled function** (`netlify/functions/daily-pipeline.mts`) is registered automatically on deploy and fires at 21:00 UTC daily (7am AEST / 8am AEDT).

### Post-deploy smoke test

1. Open `/` and subscribe with your own email (row appears in `/admin` — log in with `ADMIN_PASSWORD`).
2. In `/admin`, click **Fetch new posts now** — new feed items get AI copy and appear in the previews.
3. Open the **daily preview**, then **send a test** to yourself; check rendering in Gmail + Outlook.
4. Click **Send daily now** to send for real, and click the unsubscribe link in the email to confirm the status flips in `/admin`.

### Embedding the popup on the Alliance website

Add one embed block (Wix: **Add → Embed code → Embed HTML**) containing:

```html
<script src="https://<your-site>/embed.js" async></script>
```

The popup auto-opens once per visitor after 4 seconds and stays away after being dismissed or after subscribing. Any element with a `data-cta-newsletter-open` attribute (e.g. a "Newsletter" button) reopens it on click.

## Project layout

```
design/                     # the original design handoff (reference, not shipped)
drizzle/                    # generated SQL migrations (applied at build time)
fixtures/feed-sample.xml    # feed fixture for tests/dev
netlify/functions/          # daily-pipeline.mts (scheduled trigger)
public/shapes/              # pre-rendered puzzle-shape PNGs used in emails
scripts/                    # generate-shapes.ts, render-samples.ts
src/
  app/                      # pages + API routes (signup, popup, embed, admin, cron, img)
  components/               # SignupPopup, PuzzleShape (web)
  emails/AllianceEmail.tsx  # the email template (all three cadences)
  lib/                      # db, feed, companies, cadence, ai, images, ingest, send
tests/                      # vitest unit tests
```

## Operational notes

- **Adding a company**: use the "Alliance companies" section in `/admin` (name + comma-separated match words). Note: the Alliance doesn't use the word "member" — keep it out of user-facing copy. The registry lives in the `companies` table, seeded from `DEFAULT_COMPANIES` in `src/lib/companies.ts` on first use. Unmatched posts fall into an "Around the Alliance" section rather than being dropped.
- **Cadence timing** lives in `src/lib/cadence.ts`; weekly issues go out on Sydney Mondays, fortnightly on alternate Mondays anchored by `FORTNIGHT_ANCHOR`.
- **Email fonts**: Impact doesn't load in most email clients by design — the fallback stack (`Haettenschweiler` / `Arial Narrow Bold`) is intentional per the design handoff.
- **Big backlogs**: the first ingest of a full feed may need a few pipeline runs (or a few clicks of "Fetch new posts now") because of the per-run cap.
