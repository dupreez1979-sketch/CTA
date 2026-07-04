import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  bigint,
  boolean,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const subscribers = pgTable(
  "subscribers",
  {
    id: serial("id").primaryKey(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    email: text("email").notNull(),
    cadence: text("cadence", {
      enum: ["daily", "weekly", "fortnightly"],
    }).notNull(),
    status: text("status", { enum: ["active", "unsubscribed"] })
      .notNull()
      .default("active"),
    unsubscribeToken: text("unsubscribe_token").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("subscribers_email_idx").on(t.email),
    uniqueIndex("subscribers_token_idx").on(t.unsubscribeToken),
  ],
);

export const companies = pgTable(
  "companies",
  {
    id: serial("id").primaryKey(),
    key: text("key").notNull(),
    name: text("name").notNull(),
    // Comma-separated lowercase fragments matched against a feed item's
    // creator, title and link.
    match: text("match").notNull(),
    // The company's "our shows" page — the entry point for The Showcase's
    // automatic show research.
    showsPageUrl: text("shows_page_url"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("companies_key_idx").on(t.key)],
);

export const feedItems = pgTable(
  "feed_items",
  {
    id: serial("id").primaryKey(),
    guid: text("guid").notNull(),
    companyKey: text("company_key").notNull(),
    postUrl: text("post_url").notNull(),
    rawTitle: text("raw_title"),
    // The feed's page/author name — kept for diagnosing and re-filing
    // posts that couldn't be matched to a company at ingest time.
    creator: text("creator"),
    // Admin pressed "Ignore" in the unfiled-posts panel: hides the item
    // from triage. Does not affect whether it appears in issues.
    reviewed: boolean("reviewed").notNull().default(false),
    publishedAt: timestamp("published_at", { withTimezone: true }).notNull(),
    aiHeading: text("ai_heading").notNull(),
    aiSummary: text("ai_summary").notNull(),
    imageUrl: text("image_url"),
    // ---- The Showcase (presenter edition) ----
    // Raw classifier verdict: does the post announce a show or tour that
    // presenters elsewhere could book? Kept for audit even after the item
    // is excluded or sent.
    presenterRelevant: boolean("presenter_relevant").notNull().default(false),
    presenterReason: text("presenter_reason"),
    // null = not in the Showcase pipeline at all.
    presenterStatus: text("presenter_status", {
      enum: ["draft", "excluded", "sent"],
    }),
    showTitle: text("show_title"),
    showUrl: text("show_url"),
    showBlurb: text("show_blurb"),
    showAgeRange: text("show_age_range"),
    showImageUrl: text("show_image_url"),
    // "Profile" (featured) in the next Showcase; capped at 2 in the route.
    presenterFeatured: boolean("presenter_featured").notNull().default(false),
    // Set on any research attempt (success or failure) so the cron never
    // loops on an item whose site can't be researched.
    presenterResearchedAt: timestamp("presenter_researched_at", {
      withTimezone: true,
    }),
    // Set once the item has appeared in a "draft ready" notification.
    presenterNotifiedAt: timestamp("presenter_notified_at", {
      withTimezone: true,
    }),
    presenterSendId: integer("presenter_send_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("feed_items_guid_idx").on(t.guid)],
);

/** Curated show registry powering The Showcase's "What's happening" list. */
export const shows = pgTable(
  "shows",
  {
    id: serial("id").primaryKey(),
    companyKey: text("company_key").notNull(),
    title: text("title").notNull(),
    url: text("url"),
    blurb: text("blurb"),
    ageRange: text("age_range"),
    imageUrl: text("image_url"),
    status: text("status", { enum: ["active", "archived"] })
      .notNull()
      .default("active"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("shows_company_title_idx").on(t.companyKey, t.title)],
);

/**
 * Send log for The Showcase. Deliberately separate from `issues`: Showcase
 * sends are ad-hoc (draft-pool based, no cadence window), so they have no
 * natural cadence+window idempotency key.
 */
export const presenterSends = pgTable("presenter_sends", {
  id: serial("id").primaryKey(),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  status: text("status", { enum: ["sending", "sent", "failed"] })
    .notNull()
    .default("sending"),
  itemCount: integer("item_count").notNull().default(0),
  profileCount: integer("profile_count").notNull().default(0),
  recipientCount: integer("recipient_count").notNull().default(0),
  // Comma-joined audit copy of the (small, test-mode) recipient list.
  recipients: text("recipients"),
});

export const issues = pgTable(
  "issues",
  {
    id: serial("id").primaryKey(),
    cadence: text("cadence", {
      enum: ["daily", "weekly", "fortnightly"],
    }).notNull(),
    // Window key like "2026-07-02" (daily) or "2026-06-29_2026-07-05" —
    // the idempotency guard: one issue per cadence+window.
    windowKey: text("window_key").notNull(),
    windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
    windowEnd: timestamp("window_end", { withTimezone: true }).notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    itemCount: integer("item_count").notNull().default(0),
    recipientCount: integer("recipient_count").notNull().default(0),
    status: text("status", { enum: ["sending", "sent", "skipped", "failed"] })
      .notNull()
      .default("sending"),
  },
  (t) => [uniqueIndex("issues_cadence_window_idx").on(t.cadence, t.windowKey)],
);

/** Per-day accumulator of Anthropic API token usage by this app. */
export const aiSpend = pgTable(
  "ai_spend",
  {
    id: serial("id").primaryKey(),
    day: text("day").notNull(), // YYYY-MM-DD (UTC)
    inputTokens: bigint("input_tokens", { mode: "number" }).notNull().default(0),
    outputTokens: bigint("output_tokens", { mode: "number" }).notNull().default(0),
    calls: integer("calls").notNull().default(0),
  },
  (t) => [uniqueIndex("ai_spend_day_idx").on(t.day)],
);

/** Small key/value store for admin-tunable settings. */
export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export type Subscriber = typeof subscribers.$inferSelect;
export type FeedItem = typeof feedItems.$inferSelect;
export type Issue = typeof issues.$inferSelect;
export type Show = typeof shows.$inferSelect;
export type PresenterSend = typeof presenterSends.$inferSelect;
export type Cadence = "daily" | "weekly" | "fortnightly";
export type PresenterStatus = "draft" | "excluded" | "sent";
