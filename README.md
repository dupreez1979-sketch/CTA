# Children's Theatre Alliance — Newsletter App

An automated email newsletter for the [Children's Theatre Alliance](https://www.childrenstheatrealliance.com.au/). It turns the Alliance's RSS feed (aggregated Facebook posts from member companies) into a branded email: every post gets an **AI-written headline and one-sentence summary**, posts are **grouped by company** — each in its own brand colour with a puzzle-shape sticker — and the newsletter ships in **three cadences** (Daily / Weekly / Fortnightly) from one template. People subscribe through a **sign-up popup** hosted here and embeddable on the Alliance website.

Built from the design handoff in [`design/`](design/README.md).

## How it works

```
                     ┌──────────────────────────────────────────────┐
 rss.app feed ──────▶│ /api/cron/daily  (Vercel Cron, 7am Sydney)   │
                     │  1. ingest: new items → Claude headline +    │
                     │     summary → re-host image → Postgres       │
                     │  2. send daily issue (last 24h)              │
                     │  3. Mondays: send weekly (last 7d)           │
                     │  4. alternate Mondays: send fortnightly      │
                     └───────────────┬──────────────────────────────┘
                                     ▼
                     Resend (batch, per-recipient unsubscribe link)
```

- **Sign-up**: `/` hosts the sign-up page; `/embed.js` provides a popup for the existing Wix site. Instant subscribe (no confirmation email); re-subscribing updates cadence and reactivates.
- **Unsubscribe**: one-click link in every footer + RFC 8058 `List-Unsubscribe` headers.
- **Idempotent sends**: each cadence+window claims a row in `issues` before sending — a cron retry or double-click in admin never double-sends.
- **Featured story** (weekly/fortnightly): Claude picks the most newsworthy post of the window; fortnightly adds the "in this issue" company index.
- **Images**: the feed's Facebook image URLs expire, so each image is copied to Vercel Blob at ingest; items without an image get a brand-coloured placeholder slot.
- **Admin** (`/admin`, basic auth): subscriber counts/list + CSV export, live issue previews, "send test to me", manual send, issue log.

## Stack

Next.js (App Router, TypeScript) · Postgres (Neon) + Drizzle ORM · Resend · Claude Haiku 4.5 (`@anthropic-ai/sdk`) · Vercel Blob · React Email · Vercel Cron.

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

To run the pipeline manually:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/daily
```

## Deploying (Vercel)

1. **Create the Vercel project** from this repo. The included `vercel.json` schedules `/api/cron/daily` at `0 21 * * *` UTC (= 7am AEST / 8am AEDT — adjust if you prefer a fixed local hour year-round).
2. **Postgres**: create a Neon (or Vercel Postgres) database; set `DATABASE_URL`. Run `npm run db:migrate` once against it (locally or via a one-off script).
3. **Blob**: enable Vercel Blob on the project; set `BLOB_READ_WRITE_TOKEN`.
4. **Resend**: create an account, **verify the sending domain** (add the DKIM/SPF DNS records Resend shows — this is what keeps issues out of spam), then set `RESEND_API_KEY` and `EMAIL_FROM` (an address on the verified domain).
5. **Anthropic**: create an API key at platform.claude.com; set `ANTHROPIC_API_KEY`.
6. Set the remaining env vars from `.env.example`: `APP_URL` (the deployed origin), `FEED_URL`, `CRON_SECRET`, `ADMIN_PASSWORD`, `FORTNIGHT_ANCHOR` (any Monday that fortnightly issues should go out on).

### Post-deploy smoke test

1. Open `/` and subscribe with your own email (row appears in `/admin`).
2. Trigger the pipeline once: `curl -H "Authorization: Bearer $CRON_SECRET" https://<app>/api/cron/daily` — check the JSON response for ingest counts.
3. In `/admin`, open the **daily preview**, then **send a test** to yourself; check rendering in Gmail + Outlook (and Litmus/Email on Acid if available).
4. Click the unsubscribe link in the test email and confirm the status flips in `/admin`.

### Embedding the popup on the Alliance website

Add one embed block (Wix: **Add → Embed code → Embed HTML**) containing:

```html
<script src="https://<app-domain>/embed.js" async></script>
```

The popup auto-opens once per visitor after 4 seconds and stays away after being dismissed or after subscribing. Any element with a `data-cta-newsletter-open` attribute (e.g. a "Newsletter" button) reopens it on click.

## Project layout

```
design/                     # the original design handoff (reference, not shipped)
drizzle/                    # generated SQL migrations
fixtures/feed-sample.xml    # feed fixture for tests/dev
public/shapes/              # pre-rendered puzzle-shape PNGs used in emails
scripts/                    # generate-shapes.ts, render-samples.ts
src/
  app/                      # pages + API routes (signup, popup, embed, admin, cron)
  components/               # SignupPopup, PuzzleShape (web)
  emails/AllianceEmail.tsx  # the email template (all three cadences)
  lib/                      # db, feed, companies, cadence, ai, images, ingest, send
tests/                      # vitest unit tests
```

## Operational notes

- **Adding a member company**: append an entry to `COMPANIES` in `src/lib/companies.ts` (display name + match fragments). Unmatched posts fall into an "Around the Alliance" section rather than being dropped.
- **Cadence timing** lives in `src/lib/cadence.ts`; weekly issues go out on Sydney Mondays, fortnightly on alternate Mondays anchored by `FORTNIGHT_ANCHOR`.
- **Email fonts**: Impact doesn't load in most email clients by design — the fallback stack (`Haettenschweiler` / `Arial Narrow Bold`) is intentional per the design handoff.
- Vercel Hobby allows one daily cron; everything (ingest + all sends) runs inside the single `/api/cron/daily` invocation.
