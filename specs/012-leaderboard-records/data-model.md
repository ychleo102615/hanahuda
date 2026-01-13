# Data Model: Leaderboard and Records

**Feature Branch**: `012-leaderboard-records`
**Date**: 2026-01-13

## Overview

本文件定義 Leaderboard BC 的資料模型，包含資料庫 Schema 和 Domain 層實體。

---

## Database Schema

### New Table: `daily_player_scores`

每日玩家分數快照表，用於支援日/週排行榜查詢。

```typescript
// front-end/server/database/schema/dailyPlayerScores.ts

import { pgTable, uuid, date, integer, timestamp, primaryKey, index } from 'drizzle-orm/pg-core'

/**
 * Daily Player Scores Table
 *
 * @description
 * 儲存每位玩家的每日遊戲分數快照。
 * 由 Core-Game BC 的 GameFinishedEvent 事件驅動更新。
 * 資料保留 30 天，由 dailyScoreCleanup plugin 定時清理。
 */
export const dailyPlayerScores = pgTable('daily_player_scores', {
  /** 玩家 ID */
  playerId: uuid('player_id').notNull(),

  /** 日期 (UTC+8 台灣時間) */
  date: date('date').notNull(),

  /** 當日累計分數 */
  score: integer('score').notNull().default(0),

  /** 當日遊戲場數 */
  gamesPlayed: integer('games_played').notNull().default(0),

  /** 當日獲勝場數 */
  gamesWon: integer('games_won').notNull().default(0),

  /** 當日 Koi-Koi 宣告次數 */
  koiKoiCalls: integer('koi_koi_calls').notNull().default(0),

  /** 建立時間 */
  createdAt: timestamp('created_at').defaultNow().notNull(),

  /** 更新時間 */
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  // 複合主鍵：玩家 ID + 日期
  primaryKey({ columns: [table.playerId, table.date] }),
  // 日期索引，用於排行榜查詢和資料清理
  index('idx_daily_player_scores_date').on(table.date),
  // 分數索引，用於排行榜排序
  index('idx_daily_player_scores_score').on(table.score),
])

/**
 * 推斷的型別
 */
export type DailyPlayerScore = typeof dailyPlayerScores.$inferSelect
export type NewDailyPlayerScore = typeof dailyPlayerScores.$inferInsert
```

### Migration SQL

```sql
-- 0009_daily_player_scores.sql

CREATE TABLE IF NOT EXISTS "daily_player_scores" (
  "player_id" uuid NOT NULL,
  "date" date NOT NULL,
  "score" integer NOT NULL DEFAULT 0,
  "games_played" integer NOT NULL DEFAULT 0,
  "games_won" integer NOT NULL DEFAULT 0,
  "koi_koi_calls" integer NOT NULL DEFAULT 0,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "daily_player_scores_pkey" PRIMARY KEY ("player_id", "date")
);

CREATE INDEX IF NOT EXISTS "idx_daily_player_scores_date" ON "daily_player_scores" ("date");
CREATE INDEX IF NOT EXISTS "idx_daily_player_scores_score" ON "daily_player_scores" ("score");
```

---

## Domain Layer Entities

### DailyPlayerScore (Entity)

```typescript
// front-end/server/leaderboard/domain/daily-score/daily-player-score.ts

/**
 * 每日玩家分數快照
 *
 * @description
 * 記錄單一玩家在特定日期的遊戲統計。
 * 作為排行榜計算的基礎資料單位。
 */
export interface DailyPlayerScore {
  readonly playerId: string
  readonly date: Date
  readonly score: number
  readonly gamesPlayed: number
  readonly gamesWon: number
  readonly koiKoiCalls: number
}

/**
 * 建立 DailyPlayerScore 的輸入參數
 */
export interface CreateDailyPlayerScoreInput {
  playerId: string
  date: Date
  scoreChange: number
  isWinner: boolean
  koiKoiCallCount: number
}

/**
 * 更新 DailyPlayerScore 的邏輯
 *
 * @description
 * 純函數，計算更新後的分數快照。
 * 支援累加或新建場景。
 */
export function updateDailyScore(
  existing: DailyPlayerScore | null,
  input: CreateDailyPlayerScoreInput
): DailyPlayerScore {
  const base = existing ?? {
    playerId: input.playerId,
    date: input.date,
    score: 0,
    gamesPlayed: 0,
    gamesWon: 0,
    koiKoiCalls: 0,
  }

  return {
    ...base,
    score: base.score + input.scoreChange,
    gamesPlayed: base.gamesPlayed + 1,
    gamesWon: base.gamesWon + (input.isWinner ? 1 : 0),
    koiKoiCalls: base.koiKoiCalls + input.koiKoiCallCount,
  }
}
```

### LeaderboardEntry (Value Object)

```typescript
// front-end/server/leaderboard/domain/leaderboard/leaderboard-entry.ts

/**
 * 排行榜條目
 *
 * @description
 * 表示排行榜中的單一玩家排名資訊。
 * 為 Value Object，無獨立身份識別。
 */
export interface LeaderboardEntry {
  /** 排名 (1-based) */
  readonly rank: number
  /** 玩家 ID */
  readonly playerId: string
  /** 玩家顯示名稱 */
  readonly displayName: string
  /** 分數 */
  readonly score: number
  /** 遊戲場數 */
  readonly gamesPlayed: number
  /** 是否為當前玩家 */
  readonly isCurrentPlayer: boolean
}

/**
 * 計算排名（處理同分情況）
 *
 * @description
 * 同分玩家顯示相同排名，下一名玩家順延。
 * 例如：1, 2, 2, 4
 */
export function calculateRanks(
  entries: Omit<LeaderboardEntry, 'rank'>[]
): LeaderboardEntry[] {
  let currentRank = 1
  let previousScore: number | null = null

  return entries.map((entry, index) => {
    if (previousScore !== null && entry.score < previousScore) {
      currentRank = index + 1
    }
    previousScore = entry.score

    return {
      ...entry,
      rank: currentRank,
    }
  })
}
```

### LeaderboardType (Value Object)

```typescript
// front-end/server/leaderboard/domain/leaderboard/leaderboard-type.ts

/**
 * 排行榜類型
 */
export const LEADERBOARD_TYPES = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
} as const

export type LeaderboardType = typeof LEADERBOARD_TYPES[keyof typeof LEADERBOARD_TYPES]

/**
 * 驗證排行榜類型
 */
export function isValidLeaderboardType(value: string): value is LeaderboardType {
  return Object.values(LEADERBOARD_TYPES).includes(value as LeaderboardType)
}
```

### TimeRange (Value Object)

```typescript
// front-end/server/leaderboard/domain/statistics/time-range.ts

/**
 * 時間範圍類型
 */
export const TIME_RANGES = {
  DAY: 'day',
  WEEK: 'week',
  MONTH: 'month',
  ALL: 'all',
} as const

export type TimeRange = typeof TIME_RANGES[keyof typeof TIME_RANGES]

/**
 * 驗證時間範圍
 */
export function isValidTimeRange(value: string): value is TimeRange {
  return Object.values(TIME_RANGES).includes(value as TimeRange)
}

/**
 * 計算時間範圍的起始日期 (UTC+8)
 *
 * @param range 時間範圍類型
 * @returns 起始日期，若為 'all' 則返回 null
 */
export function getTimeRangeStartDate(range: TimeRange): Date | null {
  if (range === TIME_RANGES.ALL) {
    return null
  }

  const now = new Date()
  // 轉換為 UTC+8 時區
  const taipeiOffset = 8 * 60 * 60 * 1000
  const taipeiNow = new Date(now.getTime() + taipeiOffset)

  switch (range) {
    case TIME_RANGES.DAY:
      // 今日 00:00 (UTC+8)
      return new Date(taipeiNow.getFullYear(), taipeiNow.getMonth(), taipeiNow.getDate())

    case TIME_RANGES.WEEK:
      // 本週一 00:00 (UTC+8)
      const dayOfWeek = taipeiNow.getDay()
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
      const monday = new Date(taipeiNow)
      monday.setDate(taipeiNow.getDate() - daysToMonday)
      monday.setHours(0, 0, 0, 0)
      return monday

    case TIME_RANGES.MONTH:
      // 本月 1 日 00:00 (UTC+8)
      return new Date(taipeiNow.getFullYear(), taipeiNow.getMonth(), 1)

    default:
      return null
  }
}
```

### PlayerStatistics (Aggregate)

```typescript
// front-end/server/leaderboard/domain/statistics/player-statistics.ts

import type { YakuCounts } from '~/server/database/schema/playerStats'

/**
 * 玩家統計資料
 *
 * @description
 * 彙整玩家的遊戲統計，可來自累計資料或時間範圍聚合。
 */
export interface PlayerStatistics {
  /** 玩家 ID */
  readonly playerId: string
  /** 總分數 */
  readonly totalScore: number
  /** 遊戲場數 */
  readonly gamesPlayed: number
  /** 獲勝場數 */
  readonly gamesWon: number
  /** 失敗場數 */
  readonly gamesLost: number
  /** 勝率 (0-100) */
  readonly winRate: number
  /** Koi-Koi 宣告次數 */
  readonly koiKoiCalls: number
  /** 倍率獲勝次數 */
  readonly multiplierWins: number
  /** 各役種達成次數 */
  readonly yakuCounts: Readonly<YakuCounts>
  /** 資料時間範圍 */
  readonly timeRange: TimeRange
}

/**
 * 計算勝率
 */
export function calculateWinRate(gamesWon: number, gamesPlayed: number): number {
  if (gamesPlayed === 0) return 0
  return Math.round((gamesWon / gamesPlayed) * 100)
}

/**
 * 建立空統計資料
 */
export function createEmptyStatistics(
  playerId: string,
  timeRange: TimeRange
): PlayerStatistics {
  return {
    playerId,
    totalScore: 0,
    gamesPlayed: 0,
    gamesWon: 0,
    gamesLost: 0,
    winRate: 0,
    koiKoiCalls: 0,
    multiplierWins: 0,
    yakuCounts: {},
    timeRange,
  }
}
```

---

## Entity Relationships

```
┌─────────────────────────────────────────────────────────────┐
│                    Leaderboard BC                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐       ┌─────────────────────┐         │
│  │ DailyPlayerScore│       │ LeaderboardEntry    │         │
│  │ (Entity)        │──────>│ (Value Object)      │         │
│  │                 │ query │                     │         │
│  │ - playerId      │       │ - rank              │         │
│  │ - date          │       │ - playerId          │         │
│  │ - score         │       │ - displayName       │         │
│  │ - gamesPlayed   │       │ - score             │         │
│  │ - gamesWon      │       │ - gamesPlayed       │         │
│  │ - koiKoiCalls   │       │ - isCurrentPlayer   │         │
│  └─────────────────┘       └─────────────────────┘         │
│           │                                                 │
│           │ aggregate                                       │
│           ▼                                                 │
│  ┌─────────────────┐       ┌─────────────────────┐         │
│  │ PlayerStatistics│       │ External: player_stats│        │
│  │ (Aggregate)     │<──────│ (Core-Game data)    │         │
│  │                 │ query │                     │         │
│  │ - playerId      │       │ - totalScore        │         │
│  │ - totalScore    │       │ - gamesPlayed       │         │
│  │ - winRate       │       │ - yakuCounts        │         │
│  │ - yakuCounts    │       │ - ...               │         │
│  │ - timeRange     │       └─────────────────────┘         │
│  └─────────────────┘                                        │
│                                                             │
│  Value Objects:                                             │
│  ┌──────────────┐  ┌──────────────┐                        │
│  │LeaderboardType│  │ TimeRange    │                        │
│  │ - daily      │  │ - day        │                        │
│  │ - weekly     │  │ - week       │                        │
│  └──────────────┘  │ - month      │                        │
│                    │ - all        │                        │
│                    └──────────────┘                        │
└─────────────────────────────────────────────────────────────┘
```

---

## Data Flow

### GameFinishedEvent → DailyPlayerScore

```
Core-Game BC                    Leaderboard BC
     │                               │
     │  GameFinishedEvent            │
     │  {                            │
     │    gameId,                    │
     │    winnerId,                  │
     │    finalScores: [             │
     │      {playerId, score}        │
     │    ],                         │
     │    players: [{id, isAi}]      │
     │  }                            │
     │                               │
     └───────────────────────────────>
                 InternalEventBus.subscribe('GAME_FINISHED')
                                     │
                                     ▼
                          UpdateDailyScoreUseCase
                                     │
                                     │ For each human player:
                                     │   1. Get today's date (UTC+8)
                                     │   2. Find/create DailyPlayerScore
                                     │   3. Accumulate score & stats
                                     │
                                     ▼
                          DailyPlayerScoreRepository.upsert()
```

### Leaderboard Query

```
API Request                    Leaderboard BC
     │                               │
     │  GET /api/v1/leaderboard      │
     │  ?type=weekly&limit=10        │
     │                               │
     └───────────────────────────────>
                                     │
                          GetWeeklyLeaderboardUseCase
                                     │
                                     │ 1. Calculate week start (Monday UTC+8)
                                     │ 2. Aggregate daily_player_scores
                                     │ 3. Join with players for displayName
                                     │ 4. Apply tie-breaking (score DESC, games ASC)
                                     │ 5. Calculate ranks
                                     │ 6. If logged in & not in top N, add user's rank
                                     │
                                     ▼
                          LeaderboardEntry[]
```

---

## Indexes and Performance

| Table | Index | Purpose |
|-------|-------|---------|
| daily_player_scores | PRIMARY (player_id, date) | Unique constraint, upsert |
| daily_player_scores | idx_date | Date range queries, cleanup |
| daily_player_scores | idx_score | Leaderboard sorting |

### Expected Query Patterns

1. **Daily Leaderboard**: Filter by today's date, sort by score DESC
2. **Weekly Leaderboard**: Filter by date range (Monday-today), GROUP BY player_id, SUM(score)
3. **Personal Stats (time range)**: Filter by player_id AND date range, aggregate
4. **Cleanup**: DELETE WHERE date < (NOW - 30 days)

---

## Validation Rules

| Field | Rule |
|-------|------|
| playerId | Must be valid UUID |
| date | Must be valid date, cannot be future |
| score | Integer, can be negative (losing games) |
| gamesPlayed | Non-negative integer |
| gamesWon | Non-negative integer, <= gamesPlayed |
| koiKoiCalls | Non-negative integer |
| leaderboard limit | 1-100, default 10 |
| timeRange | Must be one of: day, week, month, all |
