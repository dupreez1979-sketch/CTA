import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  bigint,
  boolean,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const subscribers = pgTable(
  "subscribers",
  {
    id: serial("id").primaryKey(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    email: text("email").notNull(),
    // "none" = The Showcase Edition only, no regular dispatch.
    cadence: text("cadence", {
      enum: ["daily", "weekly", "fortnightly", "none"],
    }).notNull(),
    status: text("status", { enum: ["active", "unsubscribed"] })
      .notNull()
      .default("active"),
    // Opted in to The Showcase Edition (event-driven, not on a cadence).
    // Defaults on, so everyone who signed up before the option existed
    // keeps receiving it unless they opt out.
    showcase: boolean("showcase").notNull().default(true),
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
    // An optional second shows page: some companies list one-off things
    // (installations, activations) separately from their main season. Show
    // research looks through both pages.
    showsPageUrl2: text("shows_page_url_2"),
    // "auto" = the company's social posts are included immediately (as now);
    // "manual" = its posts arrive as "pending" and only become usable once a
    // human approves them in the Review queue.
    inclusionMode: text("inclusion_mode", { enum: ["auto", "manual"] })
      .notNull()
      .default("auto"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("companies_key_idx").on(t.key)],
);

/**
 * RSS feed registry. "automatic" feeds are trusted (company-controlled
 * social posts): their items flow straight into the story stream.
 * "review" feeds (media/news coverage) park items in the review queue
 * until a human approves them; articles can mention the wrong company
 * (Patch Theatre UK is not Patch Theatre Australia).
 */
export const feeds = pgTable(
  "feeds",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    url: text("url").notNull(),
    mode: text("mode", { enum: ["automatic", "review"] })
      .notNull()
      .default("automatic"),
    notes: text("notes"),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("feeds_url_idx").on(t.url)],
);

export const feedItems = pgTable(
  "feed_items",
  {
    id: serial("id").primaryKey(),
    guid: text("guid").notNull(),
    companyKey: text("company_key").notNull(),
    // "feed" rows come from the RSS pipeline; "manual" rows are written by
    // hand in the Showcase builder and stay out of the cadence newsletters.
    source: text("source", { enum: ["feed", "manual"] })
      .notNull()
      .default("feed"),
    postUrl: text("post_url").notNull(),
    rawTitle: text("raw_title"),
    // The feed's page/author name — kept for diagnosing and re-filing
    // posts that couldn't be matched to a company at ingest time.
    creator: text("creator"),
    // Admin pressed "Ignore" in the unfiled-posts panel: hides the item
    // from triage. Does not affect whether it appears in issues.
    reviewed: boolean("reviewed").notNull().default(false),
    // ---- Manual review (media/news feeds) ----
    // Which feeds-table row the item came from (null for legacy rows).
    feedId: integer("feed_id"),
    // "auto" = from a trusted automatic feed, usable immediately. Items
    // from review feeds start "pending" and only "approved" ones join the
    // story stream. Rejected rows are kept so the guid dedup stops the
    // same article resurfacing.
    reviewStatus: text("review_status", {
      enum: ["auto", "pending", "approved", "rejected", "unsure"],
    })
      .notNull()
      .default("auto"),
    // What ingest suggested (companyKey holds the final call after review).
    suggestedCompanyKey: text("suggested_company_key"),
    aiMatchConfidence: text("ai_match_confidence", {
      enum: ["high", "medium", "low"],
    }),
    aiMatchReason: text("ai_match_reason"),
    // Comma-separated registry match fragments that hit the article.
    matchedMarkers: text("matched_markers"),
    // Article text kept for the review queue display (trimmed).
    rawText: text("raw_text"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    reviewedBy: text("reviewed_by"),
    publishedAt: timestamp("published_at", { withTimezone: true }).notNull(),
    aiHeading: text("ai_heading").notNull(),
    aiSummary: text("ai_summary").notNull(),
    imageUrl: text("image_url"),
    // ---- The Showcase (presenter edition) ----
    // Classifier rating: how relevant the post is to The Showcase. High =
    // announces a bookable show/tour; medium = production news that can't
    // be booked yet; low = everything else. Manually overridable in admin.
    presenterRelevance: text("presenter_relevance", {
      enum: ["low", "medium", "high"],
    })
      .notNull()
      .default("low"),
    // Social Theatre rating: theatre embedded in social settings (health,
    // access, community), NOT education/workshops or fundraising.
    socialRelevance: text("social_relevance", {
      enum: ["low", "medium", "high"],
    })
      .notNull()
      .default("low"),
    presenterReason: text("presenter_reason"),
    showTitle: text("show_title"),
    showUrl: text("show_url"),
    showBlurb: text("show_blurb"),
    showAgeRange: text("show_age_range"),
    showImageUrl: text("show_image_url"),
    // Set on any research attempt (success or failure) so the cron never
    // loops on an item whose site can't be researched.
    presenterResearchedAt: timestamp("presenter_researched_at", {
      withTimezone: true,
    }),
    // Set once the item has appeared in a "new stories" notification.
    presenterNotifiedAt: timestamp("presenter_notified_at", {
      withTimezone: true,
    }),
    /** @deprecated superseded by presenterRelevance; kept in the DB for
     * safety, do not read or write. */
    presenterRelevant: boolean("presenter_relevant").notNull().default(false),
    /** @deprecated superseded by showcase_edition_items membership. */
    presenterStatus: text("presenter_status", {
      enum: ["draft", "excluded", "sent"],
    }),
    /** @deprecated superseded by showcase_edition_items.featured. */
    presenterFeatured: boolean("presenter_featured").notNull().default(false),
    /** @deprecated superseded by showcase_edition_items.position. */
    presenterPosition: integer("presenter_position"),
    /** @deprecated superseded by showcase_edition_items.edition_id. */
    presenterSendId: integer("presenter_send_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    // Removed from the story pool via the "ignore" (X) action. Kept so the
    // feed's guid de-duplication stops the article ever coming back.
    ignored: boolean("ignored").notNull().default(false),
    // Set when a media/approved story is manually pushed into the regular
    // newsletters via the pool's Regular "+". Persistent (never cleared) so
    // the button stays greyed and the story can't be added twice, even after
    // the transient newsletter_inclusions rows are cleared on send.
    forcedNewsletterAt: timestamp("forced_newsletter_at", {
      withTimezone: true,
    }),
  },
  (t) => [
    uniqueIndex("feed_items_guid_idx").on(t.guid),
    index("feed_items_review_idx").on(t.reviewStatus, t.publishedAt),
  ],
);

/**
 * A story explicitly pushed into the next regular newsletter of a cadence
 * (the story pool's Regular "+"). assembleIssue includes these regardless
 * of the publishing window; the row is cleared once that cadence sends, so
 * the story appears once then drops off.
 */
export const newsletterInclusions = pgTable(
  "newsletter_inclusions",
  {
    id: serial("id").primaryKey(),
    feedItemId: integer("feed_item_id").notNull(),
    cadence: text("cadence", {
      enum: ["daily", "weekly", "fortnightly"],
    }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("newsletter_inclusion_idx").on(t.feedItemId, t.cadence)],
);

/** Curated show registry powering The Showcase's "Shows in the Spotlight" list. */
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
 * A Showcase edition: one email built in the admin builder. Owns its story
 * selection (showcase_edition_items, with per-edition order and up to two
 * featured "profiles") and its "Shows in the Spotlight" list
 * (showcase_edition_shows). Draft and failed editions are editable; sent
 * editions are history (preview, duplicate, delete only).
 */
export const showcaseEditions = pgTable("showcase_editions", {
  id: serial("id").primaryKey(),
  status: text("status", { enum: ["draft", "sending", "sent", "failed"] })
    .notNull()
    .default("draft"),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  itemCount: integer("item_count").notNull().default(0),
  profileCount: integer("profile_count").notNull().default(0),
  recipientCount: integer("recipient_count").notNull().default(0),
  // Comma-joined audit copy of the (small, test-mode) recipient list.
  recipients: text("recipients"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const showcaseEditionItems = pgTable(
  "showcase_edition_items",
  {
    id: serial("id").primaryKey(),
    editionId: integer("edition_id").notNull(),
    feedItemId: integer("feed_item_id").notNull(),
    // Dense 0..n within the edition; renumbered on every move/remove.
    position: integer("position").notNull().default(0),
    // "Profile" (big card); capped at 2 per edition in the routes.
    featured: boolean("featured").notNull().default(false),
    // "Social Theatre" section: the story through the social lens, no show
    // card. Mutually exclusive with featured (enforced in the routes).
    social: boolean("social").notNull().default(false),
  },
  (t) => [uniqueIndex("sc_edition_item_idx").on(t.editionId, t.feedItemId)],
);

export const showcaseEditionShows = pgTable(
  "showcase_edition_shows",
  {
    id: serial("id").primaryKey(),
    editionId: integer("edition_id").notNull(),
    showId: integer("show_id").notNull(),
    // Order of the Spotlight grid within the edition. Gaps are fine: moves
    // swap with the next row by position order, not by adjacency.
    position: integer("position").notNull().default(0),
    // Frozen snapshot of the registry show, taken when the show is added (and
    // refreshable on demand). Render reads these instead of the live `shows`
    // row so an edition is a fixed record. snapshotAt NULL = a legacy row from
    // before snapshots existed: it falls back to the live show until refreshed.
    title: text("title"),
    companyKey: text("company_key"),
    url: text("url"),
    blurb: text("blurb"),
    ageRange: text("age_range"),
    imageUrl: text("image_url"),
    snapshotAt: timestamp("snapshot_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("sc_edition_show_idx").on(t.editionId, t.showId)],
);

/**
 * @deprecated superseded by showcase_editions (rows were migrated across,
 * preserving ids). Kept in the DB for safety; do not read or write.
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

/**
 * One email delivered to one subscriber: cadence issues and live Showcase
 * editions, written at send time. Powers the per-subscriber history and
 * the per-issue / per-edition recipient lists in admin. Test sends and
 * intro emails are not recorded (intro recipients are never stored).
 */
export const deliveries = pgTable(
  "deliveries",
  {
    id: serial("id").primaryKey(),
    subscriberId: integer("subscriber_id").notNull(),
    kind: text("kind", { enum: ["issue", "showcase"] }).notNull(),
    issueId: integer("issue_id"),
    editionId: integer("edition_id"),
    subject: text("subject").notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("deliveries_subscriber_idx").on(t.subscriberId),
    index("deliveries_issue_idx").on(t.issueId),
    index("deliveries_edition_idx").on(t.editionId),
  ],
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

/**
 * Alliance updates: an internal, manually-composed newsletter sent to a
 * single group email address (set in Settings), kept entirely separate
 * from public subscribers. Content is a flexible markdown-lite box. Rows
 * are drafted, edited, duplicated, deleted, test-sent and sent by hand.
 */
export const allianceUpdates = pgTable("alliance_updates", {
  id: serial("id").primaryKey(),
  status: text("status", { enum: ["draft", "sent"] })
    .notNull()
    .default("draft"),
  subject: text("subject").notNull().default(""),
  content: text("content").notNull().default(""),
  // Comma-joined audit copy of who a sent update went to.
  recipients: text("recipients").notNull().default(""),
  // Frozen HTML of the email as sent, so history previews exactly what
  // recipients received (null until sent, or for rows sent before 0021).
  sentHtml: text("sent_html"),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * A lightweight activity log for the admin: errors, warnings and subscriber
 * lifecycle events (joined, changed preferences, unsubscribed). Deliberately
 * NOT a record of sends or editions (those have their own history). Kept
 * small by capping the row count on write, and only ever read on demand
 * (the Settings log panel), so it never touches the app's normal load path.
 */
export const logs = pgTable(
  "logs",
  {
    id: serial("id").primaryKey(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    level: text("level", { enum: ["error", "warning", "info"] }).notNull(),
    // A short grouping tag, e.g. "subscriber", "feed", "send".
    category: text("category").notNull(),
    message: text("message").notNull(),
  },
  (t) => [index("logs_created_idx").on(t.createdAt)],
);
export type LogRow = typeof logs.$inferSelect;
export type LogLevel = LogRow["level"];

export type Subscriber = typeof subscribers.$inferSelect;
export type Delivery = typeof deliveries.$inferSelect;
export type FeedItem = typeof feedItems.$inferSelect;
export type Feed = typeof feeds.$inferSelect;
export type ReviewStatus = FeedItem["reviewStatus"];
export type MatchConfidence = "high" | "medium" | "low";
export type Issue = typeof issues.$inferSelect;
export type Show = typeof shows.$inferSelect;
export type ShowcaseEdition = typeof showcaseEditions.$inferSelect;
export type ShowcaseEditionItem = typeof showcaseEditionItems.$inferSelect;
export type AllianceUpdate = typeof allianceUpdates.$inferSelect;
export type Cadence = "daily" | "weekly" | "fortnightly";
/** A subscriber's frequency choice: a cadence, or Showcase-only ("none"). */
export type SubscriberCadence = Cadence | "none";
export type PresenterRelevance = "low" | "medium" | "high";
