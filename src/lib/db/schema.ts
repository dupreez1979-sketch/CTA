import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
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

export const feedItems = pgTable(
  "feed_items",
  {
    id: serial("id").primaryKey(),
    guid: text("guid").notNull(),
    companyKey: text("company_key").notNull(),
    postUrl: text("post_url").notNull(),
    rawTitle: text("raw_title"),
    publishedAt: timestamp("published_at", { withTimezone: true }).notNull(),
    aiHeading: text("ai_heading").notNull(),
    aiSummary: text("ai_summary").notNull(),
    imageUrl: text("image_url"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("feed_items_guid_idx").on(t.guid)],
);

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

export type Subscriber = typeof subscribers.$inferSelect;
export type FeedItem = typeof feedItems.$inferSelect;
export type Issue = typeof issues.$inferSelect;
export type Cadence = "daily" | "weekly" | "fortnightly";
