ALTER TABLE "feed_items" ADD COLUMN "source" text DEFAULT 'feed' NOT NULL;--> statement-breakpoint
ALTER TABLE "showcase_edition_shows" ADD COLUMN "position" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
-- Backfill Spotlight positions to the order the email used until now
-- (company name, then show title), so existing drafts keep their look.
UPDATE "showcase_edition_shows" es
SET "position" = sub.rn
FROM (
  SELECT es2.id,
         ROW_NUMBER() OVER (
           PARTITION BY es2.edition_id
           ORDER BY COALESCE(c.name, s.company_key), s.title, es2.id
         ) - 1 AS rn
  FROM "showcase_edition_shows" es2
  JOIN "shows" s ON s.id = es2.show_id
  LEFT JOIN "companies" c ON c.key = s.company_key
) sub
WHERE sub.id = es.id;
