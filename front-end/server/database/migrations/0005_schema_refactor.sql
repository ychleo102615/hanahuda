-- Schema Refactoring Migration
-- 重構 games 和 player_stats 表結構

-- 1. 清空並重建 player_stats（移除 id 欄位，使用 player_id 為 PK）
DROP TABLE IF EXISTS "player_stats";
CREATE TABLE "player_stats" (
  "player_id" uuid PRIMARY KEY NOT NULL,
  "total_score" integer DEFAULT 0 NOT NULL,
  "games_played" integer DEFAULT 0 NOT NULL,
  "games_won" integer DEFAULT 0 NOT NULL,
  "games_lost" integer DEFAULT 0 NOT NULL,
  "yaku_counts" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "koi_koi_calls" integer DEFAULT 0 NOT NULL,
  "multiplier_wins" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- 2. 清空並重建 games（移除 session_token, player1_name, player2_name, cumulative_scores）
DROP TABLE IF EXISTS "games";
CREATE TABLE "games" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "player1_id" uuid NOT NULL,
  "player2_id" uuid,
  "is_player2_ai" boolean DEFAULT true NOT NULL,
  "status" varchar(20) DEFAULT 'WAITING' NOT NULL,
  "total_rounds" integer DEFAULT 2 NOT NULL,
  "rounds_played" integer DEFAULT 0 NOT NULL,
  "player1_score" integer DEFAULT 0 NOT NULL,
  "player2_score" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
