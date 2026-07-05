CREATE TABLE "logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"level" text NOT NULL,
	"category" text NOT NULL,
	"message" text NOT NULL
);--> statement-breakpoint
CREATE INDEX "logs_created_idx" ON "logs" ("created_at");
