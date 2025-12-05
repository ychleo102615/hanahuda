CREATE TABLE "games" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_token" uuid NOT NULL,
	"player1_id" uuid NOT NULL,
	"player1_name" varchar(50) NOT NULL,
	"player2_id" uuid,
	"player2_name" varchar(50),
	"is_player2_ai" boolean DEFAULT true NOT NULL,
	"status" varchar(20) DEFAULT 'WAITING' NOT NULL,
	"total_rounds" integer DEFAULT 2 NOT NULL,
	"rounds_played" integer DEFAULT 0 NOT NULL,
	"cumulative_scores" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "games_session_token_unique" UNIQUE("session_token")
);
--> statement-breakpoint
CREATE TABLE "game_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_id" uuid NOT NULL,
	"round_number" integer NOT NULL,
	"snapshot" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "player_stats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_id" uuid NOT NULL,
	"total_score" integer DEFAULT 0 NOT NULL,
	"games_played" integer DEFAULT 0 NOT NULL,
	"games_won" integer DEFAULT 0 NOT NULL,
	"games_lost" integer DEFAULT 0 NOT NULL,
	"yaku_counts" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"koi_koi_calls" integer DEFAULT 0 NOT NULL,
	"multiplier_wins" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "player_stats_player_id_unique" UNIQUE("player_id")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"token" uuid PRIMARY KEY NOT NULL,
	"game_id" uuid NOT NULL,
	"player_id" uuid NOT NULL,
	"connected_at" timestamp DEFAULT now() NOT NULL,
	"last_activity_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "game_snapshots" ADD CONSTRAINT "game_snapshots_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "game_snapshots_game_id_idx" ON "game_snapshots" USING btree ("game_id");--> statement-breakpoint
CREATE INDEX "sessions_game_id_idx" ON "sessions" USING btree ("game_id");