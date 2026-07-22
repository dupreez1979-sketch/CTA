ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "inclusion_mode" text NOT NULL DEFAULT 'auto';
