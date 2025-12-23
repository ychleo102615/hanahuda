# Data Model: Backend Testing & Logging Enhancement

**Feature Branch**: `009-backend-testing-logging`
**Date**: 2025-12-23

## Entity: GameLog

用於 Event Sourcing 的遊戲日誌記錄，支援遊戲重播功能。

### Schema Definition

```typescript
// Drizzle ORM Schema
import { pgTable, bigserial, integer, uuid, varchar, jsonb, timestamp, index } from 'drizzle-orm/pg-core'

export const gameLogs = pgTable('game_logs', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  sequenceNumber: integer('sequence_number').notNull(),  // 應用層序號，保證寫入順序
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
| `id` | BIGSERIAL | No | 主鍵，自動遞增整數 |
| `sequenceNumber` | INTEGER | No | 應用層序號，保證 Fire-and-Forget 模式下的寫入順序 |
| `gameId` | UUID | No | 關聯的遊戲 ID，用於查詢特定遊戲的所有事件 |
| `playerId` | VARCHAR(100) | Yes | 觸發事件的玩家 ID（系統事件為 null） |
| `eventType` | VARCHAR(100) | No | 事件類型識別碼（使用 SSE 協議名稱） |
| `payload` | JSONB | No | Event Sourcing 完整 payload，支援遊戲重播 |
| `createdAt` | TIMESTAMP WITH TZ | No | 事件發生時間（UTC） |

### Indexes

| Index | Type | Columns | Purpose |
|-------|------|---------|---------|
| `idx_game_logs_game_id` | B-tree | `game_id` | 快速查詢特定遊戲的所有事件 |
| `idx_game_logs_created_at` | BRIN | `created_at` | 時序查詢優化，支援資料清理 |

---

## Event Types (SSOT)

### Constants Definition

事件類型使用常數定義，確保 Single Source of Truth：

```typescript
// shared/contracts/events.ts
export const EVENT_TYPES = {
  // Game Lifecycle
  InitialState: 'InitialState',
  GameStarted: 'GameStarted',
  GameFinished: 'GameFinished',
  // Round Events
  RoundDealt: 'RoundDealt',
  RoundEnded: 'RoundEnded',
  // Turn Events
  TurnCompleted: 'TurnCompleted',
  SelectionRequired: 'SelectionRequired',
  TurnProgressAfterSelection: 'TurnProgressAfterSelection',
  DecisionRequired: 'DecisionRequired',
  DecisionMade: 'DecisionMade',
  // Error Events
  TurnError: 'TurnError',
  GameError: 'GameError',
  // Snapshot
  GameSnapshotRestore: 'GameSnapshotRestore',
} as const

// server/database/schema/gameLogs.ts
export const COMMAND_TYPES = {
  PlayHandCard: 'PlayHandCard',
  SelectTarget: 'SelectTarget',
  MakeDecision: 'MakeDecision',
  LeaveGame: 'LeaveGame',
} as const
```

---

## Event Sourcing Payloads

### 設計原則

- **Commands（Use Cases）**：記錄玩家意圖（最小化）
- **Events（CompositeEventPublisher）**：記錄完整結果（支援重播）

### Commands (記錄於 Use Cases)

| Event Type | Payload | Description |
|------------|---------|-------------|
| `PlayHandCard` | `{ cardId, targetCardId? }` | 玩家選擇打出的手牌和配對目標 |
| `SelectTarget` | `{ sourceCardId, targetCardId }` | 雙配對時玩家選擇的目標 |
| `MakeDecision` | `{ decision }` | Koi-Koi 或結束局的決策 |
| `LeaveGame` | `{ reason }` | 離開原因 |

### Events (記錄於 CompositeEventPublisher)

| Event Type | Payload | Description |
|------------|---------|-------------|
| `GameStarted` | `{ starting_player_id, players, ruleset }` | 遊戲初始化狀態 |
| `RoundDealt` | `{ current_round, dealer_id, field, hands }` | 發牌完整結果 |
| `TurnCompleted` | `{ player_id, hand_card_play, draw_card_play }` | 回合完整操作結果 |
| `TurnProgressAfterSelection` | `{ player_id, selection, draw_card_play }` | 選擇後的完整結果 |
| `DecisionMade` | `{ player_id, decision }` | 決策結果 |
| `RoundEnded` | `{ reason, updated_total_scores, scoring_data?, instant_data? }` | 回合結束完整資訊 |
| `GameFinished` | `{ winner_id, reason, final_scores }` | 遊戲結束完整資訊 |

### Payload 詳細結構

#### GameStarted
```typescript
{
  starting_player_id: string,           // 先手玩家
  players: PlayerInfo[],                // 玩家資訊（id, display_name）
  ruleset: Ruleset                      // 遊戲規則設定
}
```

#### RoundDealt
```typescript
{
  current_round: number,                // 第幾局
  dealer_id: string,                    // 莊家 ID
  field: string[],                      // 初始場牌
  hands: PlayerHand[]                   // 各玩家手牌
}
```

#### TurnCompleted
```typescript
{
  player_id: string,                    // 操作玩家
  hand_card_play: {                     // 手牌操作
    played_card: string,                // 打出的牌
    matched_card: string | null,        // 配對的場牌
    captured_cards: string[]            // 收取的牌
  },
  draw_card_play: {                     // 翻牌操作
    played_card: string,                // 翻出的牌
    matched_card: string | null,        // 配對的場牌
    captured_cards: string[]            // 收取的牌
  }
}
```

#### TurnProgressAfterSelection
```typescript
{
  player_id: string,                    // 操作玩家
  selection: {                          // 選擇結果
    source_card: string,                // 翻出的牌
    selected_target: string,            // 選擇的配對目標
    captured_cards: string[]            // 收取的牌
  },
  draw_card_play: {                     // 翻牌操作（同上）
    played_card: string,
    matched_card: string | null,
    captured_cards: string[]
  }
}
```

#### RoundEnded
```typescript
{
  reason: RoundEndReason,               // SCORED | DRAWN | INSTANT_*
  updated_total_scores: PlayerScore[],  // 更新後的累積分數
  scoring_data?: {                      // 計分時有值
    winner_id: string,
    yaku_list: Yaku[],
    base_score: number,
    final_score: number,
    multipliers: ScoreMultipliers
  },
  instant_data?: {                      // 特殊結束時有值
    winner_id: string | null,
    awarded_points: number
  }
}
```

#### GameFinished
```typescript
{
  winner_id: string | null,             // 勝者（平局為 null）
  reason: GameEndedReason,              // 結束原因
  final_scores: PlayerScore[]           // 最終分數
}
```

### Events Not Logged

以下事件不記錄到資料庫：

- `TurnError`, `GameError`: 錯誤事件由日誌框架處理
- `InitialState`, `GameSnapshotRestore`: 狀態恢復事件（重連用）
- `SelectionRequired`, `DecisionRequired`: 僅為提示，實際操作由命令/事件記錄

---

## TypeScript Types

```typescript
// 從 GameEvent 推導需要記錄的 SSE 事件類型
type LoggableSseEventType = Extract<
  GameEvent['event_type'],
  | typeof EVENT_TYPES.GameStarted
  | typeof EVENT_TYPES.GameFinished
  | typeof EVENT_TYPES.RoundDealt
  | typeof EVENT_TYPES.RoundEnded
  | typeof EVENT_TYPES.TurnCompleted
  | typeof EVENT_TYPES.TurnProgressAfterSelection
  | typeof EVENT_TYPES.DecisionMade
>

// 命令類型
type CommandTypeValue = typeof COMMAND_TYPES[keyof typeof COMMAND_TYPES]

// 完整的日誌事件類型
export type GameLogEventType = CommandTypeValue | LoggableSseEventType

// Drizzle Types (auto-generated)
export type GameLog = typeof gameLogs.$inferSelect
export type NewGameLog = typeof gameLogs.$inferInsert
```

---

## Database Configuration

### UTC Timezone

資料庫連線設定為 UTC timezone，確保時間戳一致性：

```typescript
// server/utils/db.ts
const client = postgres(connectionString, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
  connection: {
    TimeZone: 'UTC',
  },
})
```

---

## Replay Algorithm

從事件序列重建遊戲狀態：

```typescript
function replayGame(logs: GameLog[]): GameState {
  // 使用 sequenceNumber 排序，保證邏輯順序
  const sortedLogs = logs.sort((a, b) => a.sequenceNumber - b.sequenceNumber)

  let state: GameState | null = null

  for (const log of sortedLogs) {
    switch (log.eventType) {
      case EVENT_TYPES.GameStarted:
        state = initializeGameState(log.payload)
        break
      case EVENT_TYPES.RoundDealt:
        state = applyRoundDealt(state, log.payload)
        break
      case COMMAND_TYPES.PlayHandCard:
        state = applyPlayHandCard(state, log.payload)
        break
      case EVENT_TYPES.TurnCompleted:
        state = applyTurnCompleted(state, log.payload)
        break
      // ... 其他事件
    }
  }

  return state
}
```

### 序號機制說明

由於採用 Fire-and-Forget 模式，資料庫寫入順序無法保證。序號機制解決此問題：

```
調用時序                              DB 寫入（非同步）
────────────────────────────────────────────────────────
logAsync(PlayHandCard)  → seq=1     INSERT (seq=1) ─┐
    ↓                                                │ 可能亂序
Domain 操作...                                       │
    ↓                                                │
logAsync(TurnCompleted) → seq=2     INSERT (seq=2) ─┘

查詢時: ORDER BY sequence_number ASC
結果: PlayHandCard(1) → TurnCompleted(2) ✓
```

---

## Data Retention

- **保留期限**: 30 天
- **清理策略**: DROP 過期的週分區
- **實作方式**: PostgreSQL scheduled job 或 Nitro cron task

---

## Validation Rules

1. `eventType` 必須是 `GameLogEventType` 定義的類型之一
2. `payload` 必須是有效的 JSON 且符合對應 eventType 的結構
3. `gameId` 必須對應存在的遊戲（軟性檢查，不強制外鍵）
4. `createdAt` 必須是有效的 UTC 時間戳
