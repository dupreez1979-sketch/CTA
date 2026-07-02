-- Seed / top-up the member-company registry. Inserts any company
-- missing from the table; existing rows (including admin edits) are
-- untouched thanks to ON CONFLICT DO NOTHING.
INSERT INTO "companies" ("key", "name", "match") VALUES
('spare-parts', 'Spare Parts Puppet Theatre', 'spare parts, sparepartspuppets'),
('windmill', 'Windmill', 'windmill'),
('shake-and-stir', 'Shake & Stir', 'shake & stir, shake and stir, shakeandstir'),
('terrapin', 'Terrapin', 'terrapin'),
('awesome-arts', 'AWESOME Arts', 'awesome arts, awesome festival, awesomearts'),
('monkey-baa', 'Monkey Baa', 'monkey baa, monkeybaa'),
('patch-theatre', 'Patch Theatre', 'patch theatre, patchtheatre'),
('barking-gecko', 'Barking Gecko', 'barking gecko, barkinggecko'),
('slingsby', 'Slingsby', 'slingsby'),
('polyglot', 'Polyglot', 'polyglot'),
('playable-streets', 'Playable Streets', 'playable streets, playablestreets'),
('arena-theatre', 'Arena Theatre', 'arena theatre, arenatheatre'),
('bighart', 'Big hART', 'big hart, bighart'),
('flying-fruit-fly', 'Flying Fruit Fly Circus', 'fruit fly, flyingfruitfly'),
('imaginary-theatre', 'Imaginary Theatre', 'imaginary theatre'),
('little-wing', 'Little Wing Puppets', 'little wing'),
('sensorium', 'Sensorium Theatre', 'sensorium'),
('the-last-great-hunt', 'The Last Great Hunt', 'last great hunt'),
('dead-puppet-society', 'Dead Puppet Society', 'dead puppet'),
('cdp', 'CDP Kids', 'cdp kids, cdp theatre'),
('brymore', 'Brymore Productions', 'brymore'),
('bunk-puppets', 'Bunk Puppets', 'bunk puppets, bunkpuppets'),
('critical-stages', 'Critical Stages Touring', 'critical stages'),
('little-match', 'Little Match Productions', 'little match'),
('erth', 'Erth Visual & Physical', 'erth visual, erthphysical, erth ')
ON CONFLICT ("key") DO NOTHING;
