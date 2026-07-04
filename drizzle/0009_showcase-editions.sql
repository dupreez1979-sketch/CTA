CREATE TABLE "showcase_edition_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"edition_id" integer NOT NULL,
	"feed_item_id" integer NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"featured" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "showcase_edition_shows" (
	"id" serial PRIMARY KEY NOT NULL,
	"edition_id" integer NOT NULL,
	"show_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "showcase_editions" (
	"id" serial PRIMARY KEY NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"sent_at" timestamp with time zone,
	"item_count" integer DEFAULT 0 NOT NULL,
	"profile_count" integer DEFAULT 0 NOT NULL,
	"recipient_count" integer DEFAULT 0 NOT NULL,
	"recipients" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "feed_items" ADD COLUMN "presenter_relevance" text DEFAULT 'low' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "sc_edition_item_idx" ON "showcase_edition_items" USING btree ("edition_id","feed_item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sc_edition_show_idx" ON "showcase_edition_shows" USING btree ("edition_id","show_id");--> statement-breakpoint
UPDATE "feed_items" SET "presenter_relevance" = CASE
  WHEN "presenter_status" = 'excluded' THEN 'low'
  WHEN "presenter_status" IN ('draft','sent') THEN 'high'
  WHEN "presenter_relevant" THEN 'high'
  ELSE 'low' END;
--> statement-breakpoint
INSERT INTO "showcase_editions" ("id", "status", "sent_at", "item_count", "profile_count", "recipient_count", "recipients", "created_at", "updated_at")
SELECT "id",
  CASE "status" WHEN 'sending' THEN 'failed' ELSE "status" END,
  "sent_at", "item_count", "profile_count", "recipient_count", "recipients",
  coalesce("sent_at", now()), coalesce("sent_at", now())
FROM "presenter_sends";
--> statement-breakpoint
SELECT setval(pg_get_serial_sequence('showcase_editions','id'),
  greatest(coalesce((SELECT max("id") FROM "showcase_editions"), 1), 1));
--> statement-breakpoint
INSERT INTO "showcase_edition_items" ("edition_id", "feed_item_id", "position", "featured")
SELECT "presenter_send_id", "id",
  row_number() OVER (PARTITION BY "presenter_send_id"
    ORDER BY "presenter_position" ASC NULLS LAST, "published_at" DESC) - 1,
  "presenter_featured"
FROM "feed_items"
WHERE "presenter_status" = 'sent'
  AND "presenter_send_id" IN (SELECT "id" FROM "showcase_editions");
--> statement-breakpoint
INSERT INTO "showcase_editions" ("status")
SELECT 'draft' WHERE EXISTS (SELECT 1 FROM "feed_items" WHERE "presenter_status" = 'draft');
--> statement-breakpoint
INSERT INTO "showcase_edition_items" ("edition_id", "feed_item_id", "position", "featured")
SELECT (SELECT max("id") FROM "showcase_editions" WHERE "status" = 'draft'), f."id",
  row_number() OVER (ORDER BY f."presenter_position" ASC NULLS LAST, f."published_at" DESC) - 1,
  f."presenter_featured"
FROM "feed_items" f WHERE f."presenter_status" = 'draft';
--> statement-breakpoint
INSERT INTO "showcase_edition_shows" ("edition_id", "show_id")
SELECT e."id", s."id"
FROM "shows" s, (SELECT max("id") AS "id" FROM "showcase_editions" WHERE "status" = 'draft') e
WHERE s."status" = 'active' AND e."id" IS NOT NULL;
