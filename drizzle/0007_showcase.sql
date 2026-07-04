CREATE TABLE "presenter_sends" (
	"id" serial PRIMARY KEY NOT NULL,
	"sent_at" timestamp with time zone,
	"status" text DEFAULT 'sending' NOT NULL,
	"item_count" integer DEFAULT 0 NOT NULL,
	"profile_count" integer DEFAULT 0 NOT NULL,
	"recipient_count" integer DEFAULT 0 NOT NULL,
	"recipients" text
);
--> statement-breakpoint
CREATE TABLE "shows" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_key" text NOT NULL,
	"title" text NOT NULL,
	"url" text,
	"blurb" text,
	"age_range" text,
	"image_url" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "shows_page_url" text;--> statement-breakpoint
ALTER TABLE "feed_items" ADD COLUMN "presenter_relevant" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "feed_items" ADD COLUMN "presenter_reason" text;--> statement-breakpoint
ALTER TABLE "feed_items" ADD COLUMN "presenter_status" text;--> statement-breakpoint
ALTER TABLE "feed_items" ADD COLUMN "show_title" text;--> statement-breakpoint
ALTER TABLE "feed_items" ADD COLUMN "show_url" text;--> statement-breakpoint
ALTER TABLE "feed_items" ADD COLUMN "show_blurb" text;--> statement-breakpoint
ALTER TABLE "feed_items" ADD COLUMN "show_age_range" text;--> statement-breakpoint
ALTER TABLE "feed_items" ADD COLUMN "show_image_url" text;--> statement-breakpoint
ALTER TABLE "feed_items" ADD COLUMN "presenter_featured" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "feed_items" ADD COLUMN "presenter_researched_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "feed_items" ADD COLUMN "presenter_notified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "feed_items" ADD COLUMN "presenter_send_id" integer;--> statement-breakpoint
CREATE UNIQUE INDEX "shows_company_title_idx" ON "shows" USING btree ("company_key","title");