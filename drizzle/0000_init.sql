CREATE TABLE "feed_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"guid" text NOT NULL,
	"company_key" text NOT NULL,
	"post_url" text NOT NULL,
	"raw_title" text,
	"published_at" timestamp with time zone NOT NULL,
	"ai_heading" text NOT NULL,
	"ai_summary" text NOT NULL,
	"image_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "issues" (
	"id" serial PRIMARY KEY NOT NULL,
	"cadence" text NOT NULL,
	"window_key" text NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"window_end" timestamp with time zone NOT NULL,
	"sent_at" timestamp with time zone,
	"item_count" integer DEFAULT 0 NOT NULL,
	"recipient_count" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'sending' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscribers" (
	"id" serial PRIMARY KEY NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text NOT NULL,
	"cadence" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"unsubscribe_token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "feed_items_guid_idx" ON "feed_items" USING btree ("guid");--> statement-breakpoint
CREATE UNIQUE INDEX "issues_cadence_window_idx" ON "issues" USING btree ("cadence","window_key");--> statement-breakpoint
CREATE UNIQUE INDEX "subscribers_email_idx" ON "subscribers" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "subscribers_token_idx" ON "subscribers" USING btree ("unsubscribe_token");