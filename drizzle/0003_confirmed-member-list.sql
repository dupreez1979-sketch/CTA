-- Align the registry with the Alliance's confirmed member list.
-- Removes non-members added earlier, corrects official names, and adds
-- The Listies and Threshold. Feed items keep their company_key; items
-- keyed to a removed company will display under "Around the Alliance".
DELETE FROM "companies" WHERE "key" IN (
  'awesome-arts',
  'bighart',
  'flying-fruit-fly',
  'little-wing',
  'the-last-great-hunt',
  'bunk-puppets',
  'critical-stages',
  'little-match',
  'erth'
);
--> statement-breakpoint
UPDATE "companies" SET "name" = 'Barking Gecko Arts' WHERE "key" = 'barking-gecko' AND "name" = 'Barking Gecko';
--> statement-breakpoint
UPDATE "companies" SET "name" = 'Monkey Baa Theatre Co' WHERE "key" = 'monkey-baa' AND "name" = 'Monkey Baa';
--> statement-breakpoint
UPDATE "companies" SET "name" = 'CDP Theatre Producers' WHERE "key" = 'cdp' AND "name" = 'CDP Kids';
--> statement-breakpoint
UPDATE "companies" SET "name" = 'Windmill Production Co' WHERE "key" = 'windmill' AND "name" = 'Windmill';
--> statement-breakpoint
INSERT INTO "companies" ("key", "name", "match") VALUES
('the-listies', 'The Listies', 'listies'),
('threshold', 'Threshold', 'threshold')
ON CONFLICT ("key") DO NOTHING;