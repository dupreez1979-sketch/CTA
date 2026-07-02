CREATE TABLE "ai_spend" (
	"id" serial PRIMARY KEY NOT NULL,
	"day" text NOT NULL,
	"input_tokens" bigint DEFAULT 0 NOT NULL,
	"output_tokens" bigint DEFAULT 0 NOT NULL,
	"calls" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "ai_spend_day_idx" ON "ai_spend" USING btree ("day");