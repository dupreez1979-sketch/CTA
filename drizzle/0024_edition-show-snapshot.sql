-- Freeze Spotlight shows into each edition: per-edition snapshot of the show's
-- display fields, taken on add and refreshable on demand. A NULL snapshot_at
-- marks a legacy row that still renders from the live `shows` table.
ALTER TABLE "showcase_edition_shows" ADD COLUMN IF NOT EXISTS "title" text;
ALTER TABLE "showcase_edition_shows" ADD COLUMN IF NOT EXISTS "company_key" text;
ALTER TABLE "showcase_edition_shows" ADD COLUMN IF NOT EXISTS "url" text;
ALTER TABLE "showcase_edition_shows" ADD COLUMN IF NOT EXISTS "blurb" text;
ALTER TABLE "showcase_edition_shows" ADD COLUMN IF NOT EXISTS "age_range" text;
ALTER TABLE "showcase_edition_shows" ADD COLUMN IF NOT EXISTS "image_url" text;
ALTER TABLE "showcase_edition_shows" ADD COLUMN IF NOT EXISTS "snapshot_at" timestamp with time zone;
