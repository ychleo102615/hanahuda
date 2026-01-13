CREATE TABLE "daily_player_scores" (
	"player_id" uuid NOT NULL,
	"date" date NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"games_played" integer DEFAULT 0 NOT NULL,
	"games_won" integer DEFAULT 0 NOT NULL,
	"koi_koi_calls" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "daily_player_scores_player_id_date_pk" PRIMARY KEY("player_id","date")
);
--> statement-breakpoint
CREATE INDEX "idx_daily_player_scores_date" ON "daily_player_scores" USING btree ("date");--> statement-breakpoint
CREATE INDEX "idx_daily_player_scores_score" ON "daily_player_scores" USING btree ("score");