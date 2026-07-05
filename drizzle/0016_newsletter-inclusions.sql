ALTER TABLE "feed_items" ADD COLUMN "ignored" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE TABLE "newsletter_inclusions" (
	"id" serial PRIMARY KEY NOT NULL,
	"feed_item_id" integer NOT NULL,
	"cadence" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX "newsletter_inclusion_idx" ON "newsletter_inclusions" ("feed_item_id","cadence");
