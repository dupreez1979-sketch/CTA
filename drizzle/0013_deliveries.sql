CREATE TABLE "deliveries" (
	"id" serial PRIMARY KEY NOT NULL,
	"subscriber_id" integer NOT NULL,
	"kind" text NOT NULL,
	"issue_id" integer,
	"edition_id" integer,
	"subject" text NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "deliveries_subscriber_idx" ON "deliveries" USING btree ("subscriber_id");--> statement-breakpoint
CREATE INDEX "deliveries_issue_idx" ON "deliveries" USING btree ("issue_id");--> statement-breakpoint
CREATE INDEX "deliveries_edition_idx" ON "deliveries" USING btree ("edition_id");