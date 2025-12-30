import { pgTable, unique, uuid, integer, jsonb, timestamp, varchar, boolean, index, bigserial } from "drizzle-orm/pg-core"
import { sql as _sql } from "drizzle-orm"



export const playerStats = pgTable("player_stats", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	playerId: uuid("player_id").notNull(),
	totalScore: integer("total_score").default(0).notNull(),
	gamesPlayed: integer("games_played").default(0).notNull(),
	gamesWon: integer("games_won").default(0).notNull(),
	gamesLost: integer("games_lost").default(0).notNull(),
	yakuCounts: jsonb("yaku_counts").default({}).notNull(),
	koiKoiCalls: integer("koi_koi_calls").default(0).notNull(),
	multiplierWins: integer("multiplier_wins").default(0).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("player_stats_player_id_unique").on(table.playerId),
]);

export const games = pgTable("games", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	sessionToken: uuid("session_token").notNull(),
	player1Id: uuid("player1_id").notNull(),
	player1Name: varchar("player1_name", { length: 50 }).notNull(),
	player2Id: uuid("player2_id"),
	player2Name: varchar("player2_name", { length: 50 }),
	isPlayer2Ai: boolean("is_player2_ai").default(true).notNull(),
	status: varchar({ length: 20 }).default('WAITING').notNull(),
	totalRounds: integer("total_rounds").default(2).notNull(),
	roundsPlayed: integer("rounds_played").default(0).notNull(),
	cumulativeScores: jsonb("cumulative_scores").default([]).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("games_session_token_unique").on(table.sessionToken),
]);

export const gameLogs = pgTable("game_logs", {
	id: bigserial({ mode: "bigint" }).primaryKey().notNull(),
	gameId: uuid("game_id").notNull(),
	playerId: varchar("player_id", { length: 100 }),
	eventType: varchar("event_type", { length: 100 }).notNull(),
	payload: jsonb().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	sequenceNumber: integer("sequence_number").notNull(),
}, (table) => [
	index("idx_game_logs_game_id").using("btree", table.gameId.asc().nullsLast().op("uuid_ops")),
]);
