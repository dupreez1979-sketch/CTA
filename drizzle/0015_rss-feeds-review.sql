CREATE TABLE "feeds" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"url" text NOT NULL,
	"mode" text DEFAULT 'automatic' NOT NULL,
	"notes" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "feeds_url_idx" ON "feeds" ("url");--> statement-breakpoint
ALTER TABLE "feed_items" ADD COLUMN "feed_id" integer;--> statement-breakpoint
ALTER TABLE "feed_items" ADD COLUMN "review_status" text DEFAULT 'auto' NOT NULL;--> statement-breakpoint
ALTER TABLE "feed_items" ADD COLUMN "suggested_company_key" text;--> statement-breakpoint
ALTER TABLE "feed_items" ADD COLUMN "ai_match_confidence" text;--> statement-breakpoint
ALTER TABLE "feed_items" ADD COLUMN "ai_match_reason" text;--> statement-breakpoint
ALTER TABLE "feed_items" ADD COLUMN "matched_markers" text;--> statement-breakpoint
ALTER TABLE "feed_items" ADD COLUMN "raw_text" text;--> statement-breakpoint
ALTER TABLE "feed_items" ADD COLUMN "reviewed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "feed_items" ADD COLUMN "reviewed_by" text;--> statement-breakpoint
CREATE INDEX "feed_items_review_idx" ON "feed_items" ("review_status","published_at");
