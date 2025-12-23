# Data Model: Backend Testing & Logging Enhancement

**Feature Branch**: `009-backend-testing-logging`
**Date**: 2025-12-23

## Entity: GameLog

用於 Event Sourcing 的遊戲日誌記錄，支援遊戲重播功能。

### Schema Definition

```typescript
// Drizzle ORM Schema
import { pgTable, uuid, varchar, jsonb, timestamp, index } from 'drizzle-orm/pg-core'

export const gameLogs = pgTable('game_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  gameId: uuid('game_id').notNull(),
  playerId: varchar('player_id', { length: 100 }),  // nullable for system events
  eventType: varchar('event_type', { length: 100 }).notNull(),
  payload: jsonb('payload').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_game_logs_game_id').on(table.gameId),
  // BRIN index for time-series queries (defined in migration SQL)
])
```

### Fields

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `id` | UUID | No | 主鍵，自動生成 |
| `gameId` | UUID | No | 關聯的遊戲 ID，用於查詢特定遊戲的所有事件 |
| `playerId` | VARCHAR(100) | Yes | 觸發事件的玩家 ID（系統事件為 null） |
| `eventType` | VARCHAR(100) | No | 事件類型識別碼 |
| `payload` | JSONB | No | 事件參數，包含重建狀態所需的所有資料 |
| `createdAt` | TIMESTAMP WITH TZ | No | 事件發生時間 |

### Indexes

| Index | Type | Columns | Purpose |
|-------|------|---------|---------|
| `idx_game_logs_game_id` | B-tree | `game_id` | 快速查詢特定遊戲的所有事件 |
| `idx_game_logs_created_at` | BRIN | `created_at` | 時序查詢優化，支援資料清理 |

### Partitioning Strategy

```sql
-- 按週分區，配合 30 天保留策略
CREATE TABLE game_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL,
  player_id VARCHAR(100),
  event_type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (created_at);

-- BRIN index on partitioned table
CREATE INDEX idx_game_logs_created_at ON game_logs
  USING BRIN (created_at) WITH (pages_per_range = 128);
```

---

## Event Types

### Game Lifecycle Events

| Event Type | Payload Structure | Description |
|------------|-------------------|-------------|
| `GAME_STARTED` | `{ oya: string, players: [...], initialField: [...], deck: [...] }` | 遊戲開始，包含初始狀態 |
| `GAME_FINISHED` | `{ winner: string, finalScores: {...}, totalRounds: number }` | 遊戲結束 |

### Round Events

| Event Type | Payload Structure | Description |
|------------|-------------------|-------------|
| `ROUND_STARTED` | `{ roundNumber: number, oya: string, hands: {...}, field: [...] }` | 回合開始 |
| `ROUND_ENDED` | `{ winner: string, scores: {...}, yakus: [...], koiMultiplier: number }` | 回合結束 |

### Turn Events

| Event Type | Payload Structure | Description |
|------------|-------------------|-------------|
| `CARD_PLAYED_FROM_HAND` | `{ cardId: string, targetCardId?: string }` | 從手牌打出 |
| `CARD_DRAWN` | `{ cardId: string }` | 從牌堆翻牌 |
| `SELECTION_MADE` | `{ sourceCardId: string, targetCardId: string }` | 雙配對時的選擇 |
| `CARDS_COLLECTED` | `{ collectedCards: [...] }` | 收牌結果 |
| `DECISION_MADE` | `{ decision: 'KOI_KOI' | 'END_ROUND' }` | Koi-Koi 決策 |

### System Events

| Event Type | Payload Structure | Description |
|------------|-------------------|-------------|
| `PLAYER_TIMEOUT` | `{ action: string }` | 玩家超時，觸發自動操作 |
| `PLAYER_LEFT` | `{ reason: string }` | 玩家離開遊戲 |

---

## TypeScript Types

```typescript
// Domain Types
export type GameLogEventType =
  | 'GAME_STARTED'
  | 'GAME_FINISHED'
  | 'ROUND_STARTED'
  | 'ROUND_ENDED'
  | 'CARD_PLAYED_FROM_HAND'
  | 'CARD_DRAWN'
  | 'SELECTION_MADE'
  | 'CARDS_COLLECTED'
  | 'DECISION_MADE'
  | 'PLAYER_TIMEOUT'
  | 'PLAYER_LEFT'

export interface GameLogEntry {
  gameId: string
  playerId?: string
  eventType: GameLogEventType
  payload: Record<string, unknown>
}

// Drizzle Types (auto-generated)
export type GameLog = typeof gameLogs.$inferSelect
export type NewGameLog = typeof gameLogs.$inferInsert
```

---

## Replay Algorithm

從事件序列重建遊戲狀態的演算法：

```typescript
function replayGame(logs: GameLog[]): GameState {
  // 按時間排序
  const sortedLogs = logs.sort((a, b) =>
    a.createdAt.getTime() - b.createdAt.getTime()
  )

  let state: GameState | null = null

  for (const log of sortedLogs) {
    switch (log.eventType) {
      case 'GAME_STARTED':
        state = initializeGameState(log.payload)
        break
      case 'CARD_PLAYED_FROM_HAND':
        state = applyCardPlayed(state, log.payload)
        break
      // ... 其他事件處理
    }
  }

  return state
}
```

---

## Data Retention

- **保留期限**: 30 天
- **清理策略**: DROP 過期的週分區
- **實作方式**: PostgreSQL scheduled job 或 Nitro cron task

```sql
-- 清理超過 30 天的分區
DROP TABLE IF EXISTS game_logs_2025_w01;
```

---

## Validation Rules

1. `eventType` 必須是預定義的事件類型之一
2. `payload` 必須是有效的 JSON 且符合對應 `eventType` 的結構
3. `gameId` 必須對應存在的遊戲（軟性檢查，不強制外鍵）
4. `createdAt` 必須是有效的 UTC 時間戳
