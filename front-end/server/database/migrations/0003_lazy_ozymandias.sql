-- Drop and recreate game_logs table with BIGSERIAL id
-- Note: This migration is destructive - all existing game_logs data will be lost
-- This is acceptable as the table was just created and contains no production data

DROP TABLE IF EXISTS "game_logs";--> statement-breakpoint

CREATE TABLE "game_logs" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"game_id" uuid NOT NULL,
	"player_id" varchar(100),
	"event_type" varchar(100) NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE INDEX "idx_game_logs_game_id" ON "game_logs" USING btree ("game_id");
