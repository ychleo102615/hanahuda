# Data Model: Nuxt Backend Server

**Feature Branch**: `008-nuxt-backend-server`
**Date**: 2024-12-04
**Status**: Design

---

## 1. Domain Model Overview

### 1.1 Bounded Context: Core Game BC

Core Game BC 負責遊戲會話管理、回合流程控制、規則驗證和事件產生。

```
┌─────────────────────────────────────────────────────────┐
│  Core Game BC                                           │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Game Aggregate                                   │  │
│  │  ├── Game (Aggregate Root)                        │  │
│  │  │   ├── gameId: UUID                             │  │
│  │  │   ├── players: Player[]                        │  │
│  │  │   ├── ruleset: Ruleset                         │  │
│  │  │   ├── currentRound: Round                      │  │
│  │  │   ├── cumulativeScores: PlayerScore[]          │  │
│  │  │   └── roundsPlayed: number                     │  │
│  │  │                                                │  │
│  │  ├── Round (Entity)                               │  │
│  │  │   ├── dealerId: string                         │  │
│  │  │   ├── field: CardId[]                          │  │
│  │  │   ├── deck: CardId[]                           │  │
│  │  │   ├── playerStates: PlayerRoundState[]         │  │
│  │  │   ├── flowState: FlowState                     │  │
│  │  │   ├── activePlayerId: string                   │  │
│  │  │   └── koiStatuses: KoiStatus[]                 │  │
│  │  │                                                │  │
│  │  └── Value Objects                                │  │
│  │      ├── CardId (MMTI format)                     │  │
│  │      ├── CardPlay                                 │  │
│  │      ├── Yaku                                     │  │
│  │      ├── KoiStatus                                │  │
│  │      └── Ruleset                                  │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  Domain Services                                        │
│  ├── DeckService (發牌、洗牌)                           │
│  ├── MatchingService (配對驗證)                         │
│  ├── YakuDetectionService (役種檢測)                    │
│  └── ScoringService (計分規則)                          │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Entity Definitions

### 2.1 Game (Aggregate Root)

```typescript
// server/domain/game/game.ts

interface Game {
  readonly id: string                          // UUID v4
  readonly sessionToken: string                // UUID v4, 用於重連驗證
  readonly players: readonly Player[]          // 2 位玩家
  readonly ruleset: Ruleset                    // 遊戲規則設定
  readonly cumulativeScores: readonly PlayerScore[]  // 累計分數
  readonly roundsPlayed: number                // 已完成局數
  readonly totalRounds: number                 // 總局數（預設 2）
  readonly currentRound: Round | null          // 當前局（遊戲結束時為 null）
  readonly status: GameStatus                  // WAITING | IN_PROGRESS | FINISHED
  readonly createdAt: Date
  readonly updatedAt: Date
}

type GameStatus = 'WAITING' | 'IN_PROGRESS' | 'FINISHED'
```

**業務規則**:
- 遊戲 ID 使用 UUID v4 格式
- 每場遊戲固定 2 位玩家
- 玩家 2 為假玩家時，`is_ai = true`
- 遊戲結束後會話立即清除（FR-025）

---

### 2.2 Player (Entity)

```typescript
// server/domain/game/player.ts

interface Player {
  readonly id: string                          // UUID v4（前端 localStorage 生成）
  readonly name: string                        // 玩家名稱
  readonly isAi: boolean                       // 是否為假玩家
}
```

**業務規則**:
- 匿名 player_id 由前端 localStorage 生成
- 清除 localStorage 後視為新玩家

---

### 2.3 Round (Entity)

```typescript
// server/domain/round/round.ts

interface Round {
  readonly dealerId: string                    // 莊家 ID
  readonly field: readonly string[]            // 場牌（Card IDs）
  readonly deck: readonly string[]             // 牌堆（Card IDs）
  readonly playerStates: readonly PlayerRoundState[]  // 玩家局內狀態
  readonly flowState: FlowState                // 流程狀態
  readonly activePlayerId: string              // 當前行動玩家
  readonly koiStatuses: readonly KoiStatus[]   // Koi-Koi 狀態
  readonly pendingSelection: PendingSelection | null  // 等待選擇的配對目標
}

interface PlayerRoundState {
  readonly playerId: string
  readonly hand: readonly string[]             // 手牌（Card IDs）
  readonly depository: readonly string[]       // 獲得區（Card IDs）
}

interface PendingSelection {
  readonly drawnCard: string                   // 翻出的卡片
  readonly possibleTargets: readonly string[]  // 可選配對目標
  readonly handCardPlay: CardPlay              // 已完成的手牌操作
}
```

**業務規則**:
- 發牌時每位玩家 8 張手牌，場上 8 張牌
- 牌堆初始 24 張
- FlowState 狀態機控制回合流程

---

### 2.4 FlowState (Value Object)

```typescript
// shared/types/flow-state.ts（從前端移至 shared/）

type FlowState =
  | 'AWAITING_HAND_PLAY'    // 等待打手牌
  | 'AWAITING_SELECTION'    // 等待選擇翻牌配對目標
  | 'AWAITING_DECISION'     // 等待 Koi-Koi 決策
```

**狀態轉換規則**:

```
                ┌─────────────────────────────────────┐
                │         AWAITING_HAND_PLAY          │
                └─────────────────────────────────────┘
                               │
            ┌──────────────────┼──────────────────┐
            │                  │                  │
    [翻牌雙重配對]      [無中斷完成]       [形成役種]
            │                  │                  │
            ▼                  ▼                  ▼
┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐
│ AWAITING_SELECTION  │  │ → 下一位玩家        │  │ AWAITING_DECISION   │
└─────────────────────┘  │ AWAITING_HAND_PLAY  │  └─────────────────────┘
            │            └─────────────────────┘            │
            │                                               │
     [選擇完成]                                    ┌────────┴────────┐
            │                                     │                 │
            ▼                                 [KOI_KOI]        [END_ROUND]
    [檢查役種形成]                                │                 │
            │                                     ▼                 ▼
    ┌───────┴───────┐                    ┌─────────────┐    ┌─────────────┐
    │               │                    │ → 下一位    │    │ RoundScored │
[無役種]       [有役種]                  │ HAND_PLAY   │    └─────────────┘
    │               │                    └─────────────┘
    ▼               ▼
[→ 下一位]   [AWAITING_DECISION]
```

---

## 3. Value Objects

### 3.1 CardPlay

```typescript
// shared/types/shared.ts

interface CardPlay {
  readonly played_card: string           // 打出/翻開的卡片 ID
  readonly matched_card: string | null   // 配對的場牌 ID（無配對為 null）
  readonly captured_cards: readonly string[]  // 捕獲的卡片
}
```

### 3.2 Yaku

```typescript
// shared/types/shared.ts

interface Yaku {
  readonly yaku_type: string            // 役種類型
  readonly base_points: number          // 基礎分數
  readonly contributing_cards: readonly string[]  // 貢獻的卡片
}
```

### 3.3 KoiStatus

```typescript
// server/domain/round/koiStatus.ts

interface KoiStatus {
  readonly player_id: string
  readonly koi_multiplier: number       // 當前倍數
  readonly times_continued: number      // 宣告 Koi-Koi 次數
}
```

### 3.4 Ruleset

```typescript
// shared/types/shared.ts

interface Ruleset {
  readonly target_score: number                    // 目標分數
  readonly yaku_settings: readonly YakuSetting[]   // 役種設定
  readonly special_rules: SpecialRules             // 特殊規則
}

interface YakuSetting {
  readonly yaku_type: string
  readonly base_points: number
  readonly enabled: boolean
}

interface SpecialRules {
  readonly teshi_enabled: boolean          // 是否啟用手四
  readonly field_kuttsuki_enabled: boolean // 是否啟用場牌流局
}
```

---

## 4. Domain Services

### 4.1 DeckService

```typescript
// server/domain/services/deckService.ts

interface DeckService {
  /**
   * 建立並洗牌一副完整的花札牌組
   * @returns 洗好的 48 張牌（Card IDs）
   */
  createShuffledDeck(): readonly string[]

  /**
   * 發牌
   * @param deck 當前牌堆
   * @returns { hands: [8張, 8張], field: [8張], remainingDeck: [24張] }
   */
  deal(deck: readonly string[]): DealResult
}

interface DealResult {
  readonly hands: readonly [readonly string[], readonly string[]]
  readonly field: readonly string[]
  readonly remainingDeck: readonly string[]
}
```

### 4.2 MatchingService

```typescript
// server/domain/services/matchingService.ts

interface MatchingService {
  /**
   * 檢查兩張牌是否可配對（同月份）
   */
  canMatch(card1: string, card2: string): boolean

  /**
   * 找出場上所有可配對的目標
   * @param cardId 要配對的卡片
   * @param fieldCards 場牌列表
   * @returns 可配對的場牌 IDs
   */
  findMatchableTargets(cardId: string, fieldCards: readonly string[]): readonly string[]
}
```

### 4.3 YakuDetectionService

```typescript
// server/domain/services/yakuDetectionService.ts

interface YakuDetectionService {
  /**
   * 檢測獲得區中所有成立的役種
   * @param depositoryCards 獲得區卡片
   * @param enabledYaku 啟用的役種設定
   * @returns 成立的役種列表
   */
  detectYaku(
    depositoryCards: readonly string[],
    enabledYaku: readonly YakuSetting[]
  ): readonly Yaku[]

  /**
   * 檢測新形成的役種（與之前比較）
   */
  detectNewYaku(
    previousYaku: readonly Yaku[],
    currentYaku: readonly Yaku[]
  ): readonly Yaku[]
}
```

### 4.4 ScoringService

```typescript
// server/domain/services/scoringService.ts

interface ScoreCalculationResult {
  readonly baseScore: number        // 基礎分數（役種點數總和）
  readonly koiMultiplier: number    // Koi-Koi 倍率
  readonly isDoubled: boolean       // 是否觸發 7 點翻倍
  readonly finalScore: number       // 最終分數
}

interface ScoringService {
  /**
   * 計算役種基礎分數
   * @param yakuList 成立的役種列表
   * @returns 基礎分數總和
   */
  calculateBaseScore(yakuList: readonly Yaku[]): number

  /**
   * 計算最終分數
   *
   * 計分公式：
   * 1. 基礎分數 = Σ(役種點數)
   * 2. 套用 Koi-Koi 倍率（每次喊 Koi-Koi 倍率 +1）
   * 3. 若基礎分數 >= 7，最終分數再翻倍
   *
   * finalScore = baseScore × koiMultiplier × (baseScore >= 7 ? 2 : 1)
   *
   * @param baseScore 基礎分數
   * @param koiMultiplier Koi-Koi 倍率（預設 1）
   * @returns 計分結果
   */
  calculateFinalScore(baseScore: number, koiMultiplier?: number): ScoreCalculationResult

  /**
   * 從役種列表與 KoiStatus 計算最終分數
   */
  calculateScoreFromYaku(
    yakuList: readonly Yaku[],
    koiStatus: KoiStatus | null
  ): ScoreCalculationResult
}
```

**計分規則說明**：

| 規則 | 描述 |
|-----|------|
| 基礎分數 | 所有成立役種的點數總和 |
| Koi-Koi 倍率 | 初始為 1，每次喊 Koi-Koi 則 +1 |
| 7 點門檻 | 基礎分數 ≥ 7 時，最終分數額外 ×2 |

**計分範例**：

```
範例 1: 三光(6點) + 赤短(5點) = 11點，無 Koi-Koi
→ 11 × 1 × 2 = 22 點（觸發 7 點翻倍）

範例 2: 種(1點)，喊過 2 次 Koi-Koi
→ 1 × 3 × 1 = 3 點（未達 7 點門檻）

範例 3: 五光(15點)，喊過 1 次 Koi-Koi
→ 15 × 2 × 2 = 60 點
```

---

## 5. Database Schema (Drizzle ORM)

### 5.1 Games Table

```typescript
// server/database/schema/games.ts

import { pgTable, uuid, varchar, jsonb, timestamp, boolean, integer } from 'drizzle-orm/pg-core'

export const games = pgTable('games', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionToken: uuid('session_token').unique().notNull(),
  player1Id: uuid('player1_id').notNull(),
  player1Name: varchar('player1_name', { length: 50 }).notNull(),
  player2Id: uuid('player2_id'),
  player2Name: varchar('player2_name', { length: 50 }),
  isPlayer2Ai: boolean('is_player2_ai').default(true).notNull(),
  status: varchar('status', { length: 20 }).notNull().default('WAITING'),
  totalRounds: integer('total_rounds').notNull().default(2),
  roundsPlayed: integer('rounds_played').notNull().default(0),
  cumulativeScores: jsonb('cumulative_scores').$type<PlayerScore[]>().notNull().default([]),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})
```

### 5.2 Game Snapshots Table

> **⚠️ MVP 階段不使用**：採用純記憶體快照策略，快照存於 `inMemoryGameStore` 而非資料庫。
> 此表 Schema 已建立但不寫入資料，保留供未來高可用性需求使用。

```typescript
// server/database/schema/gameSnapshots.ts

export const gameSnapshots = pgTable('game_snapshots', {
  id: uuid('id').primaryKey().defaultRandom(),
  gameId: uuid('game_id').notNull().references(() => games.id, { onDelete: 'cascade' }),
  roundNumber: integer('round_number').notNull(),
  snapshot: jsonb('snapshot').$type<RoundSnapshot>().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// 用於斷線重連的快照結構
interface RoundSnapshot {
  dealerId: string
  field: string[]
  deck: string[]
  playerStates: Array<{
    playerId: string
    hand: string[]
    depository: string[]
  }>
  flowState: FlowState
  activePlayerId: string
  koiStatuses: KoiStatus[]
  pendingSelection: PendingSelection | null
}
```

### 5.3 Player Stats Table

```typescript
// server/database/schema/playerStats.ts

export const playerStats = pgTable('player_stats', {
  id: uuid('id').primaryKey().defaultRandom(),
  playerId: uuid('player_id').unique().notNull(),
  totalScore: integer('total_score').notNull().default(0),
  gamesPlayed: integer('games_played').notNull().default(0),
  gamesWon: integer('games_won').notNull().default(0),
  gamesLost: integer('games_lost').notNull().default(0),
  yakuCounts: jsonb('yaku_counts').$type<Record<string, number>>().notNull().default({}),
  koiKoiCalls: integer('koi_koi_calls').notNull().default(0),
  multiplierWins: integer('multiplier_wins').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})
```

### 5.4 Sessions Table

```typescript
// server/database/schema/sessions.ts

export const sessions = pgTable('sessions', {
  token: uuid('token').primaryKey(),
  gameId: uuid('game_id').notNull().references(() => games.id, { onDelete: 'cascade' }),
  playerId: uuid('player_id').notNull(),
  connectedAt: timestamp('connected_at').defaultNow().notNull(),
  lastActivityAt: timestamp('last_activity_at').defaultNow().notNull(),
  expiresAt: timestamp('expires_at').notNull(),
})

// 索引
export const sessionsGameIdIdx = index('sessions_game_id_idx').on(sessions.gameId)
```

---

## 6. Validation Rules

### 6.1 Game Aggregate Invariants

| 規則 | 描述 | 違反時的錯誤 |
|-----|------|------------|
| 玩家數量 | 遊戲必須有恰好 2 位玩家 | `INVALID_GAME_STATE` |
| 回合存在 | IN_PROGRESS 狀態時必須有 currentRound | `INVALID_GAME_STATE` |
| 分數一致性 | cumulativeScores 長度必須等於玩家數 | `INVALID_GAME_STATE` |

### 6.2 Round Invariants

| 規則 | 描述 | 違反時的錯誤 |
|-----|------|------------|
| 手牌數量 | 每位玩家手牌 0-8 張 | `INVALID_ROUND_STATE` |
| 場牌數量 | 場牌 0-12 張 | `INVALID_ROUND_STATE` |
| 牌堆數量 | 牌堆 0-24 張 | `INVALID_ROUND_STATE` |
| 總牌數 | 手牌 + 場牌 + 牌堆 + 獲得區 = 48 | `INVALID_ROUND_STATE` |

### 6.3 Operation Validation

| 操作 | 驗證規則 | 違反時的錯誤 |
|-----|---------|------------|
| TurnPlayHandCard | 必須是當前行動玩家 | `WRONG_PLAYER` |
| TurnPlayHandCard | FlowState 必須是 AWAITING_HAND_PLAY | `INVALID_STATE` |
| TurnPlayHandCard | 卡片必須在玩家手牌中 | `INVALID_CARD` |
| TurnPlayHandCard | target 必須是有效配對目標 | `INVALID_TARGET` |
| TurnSelectTarget | FlowState 必須是 AWAITING_SELECTION | `INVALID_STATE` |
| TurnSelectTarget | target 必須在 possibleTargets 中 | `INVALID_SELECTION` |
| RoundMakeDecision | FlowState 必須是 AWAITING_DECISION | `INVALID_STATE` |

---

## 7. State Transitions

### 7.1 GameStatus Transitions

```
WAITING ──[配對完成]──> IN_PROGRESS ──[遊戲結束]──> FINISHED
                           │
                           └──[玩家離開]──> FINISHED
```

### 7.2 Round Lifecycle

```
1. [開始新局] → 發牌 → 檢查 Teshi/Kuttsuki
2. [正常流程] → AWAITING_HAND_PLAY → ... → 回合循環
3. [局結束條件]
   - 玩家選擇 END_ROUND → RoundScored
   - 牌堆耗盡無役種 → RoundDrawn
   - Teshi/Kuttsuki → RoundEndedInstantly
4. [局結束後]
   - 若 roundsPlayed < totalRounds → 等待 display_timeout 後開始新局
   - 若 roundsPlayed >= totalRounds → GameFinished
```

---

## 8. Indexes and Constraints

### 8.1 Primary Keys

| Table | Primary Key |
|-------|-------------|
| games | id (UUID) |
| game_snapshots | id (UUID) |
| player_stats | id (UUID) |
| sessions | token (UUID) |

### 8.2 Unique Constraints

| Table | Column(s) |
|-------|-----------|
| games | session_token |
| player_stats | player_id |

### 8.3 Foreign Keys

| Table | Column | References |
|-------|--------|------------|
| game_snapshots | game_id | games.id (CASCADE DELETE) |
| sessions | game_id | games.id (CASCADE DELETE) |

### 8.4 Indexes

| Table | Index | Columns |
|-------|-------|---------|
| sessions | sessions_game_id_idx | game_id |
| game_snapshots | game_snapshots_game_id_idx | game_id |

---

## 9. Memory State Management

### 9.1 Active Games Store

```typescript
// server/adapters/persistence/inMemoryGameStore.ts

class InMemoryGameStore {
  private games: Map<string, GameAggregate> = new Map()
  private playerGameMap: Map<string, string> = new Map() // playerId -> gameId

  get(gameId: string): GameAggregate | undefined
  set(gameId: string, game: GameAggregate): void
  delete(gameId: string): void
  getByPlayerId(playerId: string): GameAggregate | undefined
}
```

### 9.2 SSE Connection Store

```typescript
// server/adapters/event-publisher/connectionStore.ts

class ConnectionStore {
  private connections: Map<string, Set<(event: GameEvent) => void>> = new Map()

  addConnection(gameId: string, handler: (event: GameEvent) => void): void
  removeConnection(gameId: string, handler: (event: GameEvent) => void): void
  broadcast(gameId: string, event: GameEvent): void
  getConnectionCount(gameId: string): number
}
```

---

## 10. Event Structures

所有 SSE 事件型別定義於 `shared/types/events.ts`，包含：

| Event | 觸發時機 | 關鍵欄位 |
|-------|---------|---------|
| `GameStartedEvent` | 配對完成 | game_id, players, ruleset |
| `RoundDealtEvent` | 發牌完成 | field, hands, deck_remaining, next_state |
| `TurnCompletedEvent` | 回合無中斷完成 | hand_card_play, draw_card_play, next_state |
| `SelectionRequiredEvent` | 翻牌雙重配對 | drawn_card, possible_targets |
| `TurnProgressAfterSelectionEvent` | 選擇完成 | selection, draw_card_play, yaku_update |
| `DecisionRequiredEvent` | 形成役種 | yaku_update, current_multipliers |
| `DecisionMadeEvent` | 選擇 KOI_KOI | updated_multipliers, next_state |
| `RoundScoredEvent` | 局結束計分 | yaku_list, final_score, multipliers |
| `RoundDrawnEvent` | 平局 | current_total_scores |
| `RoundEndedInstantlyEvent` | Teshi/Kuttsuki | reason, winner_id |
| `GameFinishedEvent` | 遊戲結束 | final_scores, winner_id |
| `TurnErrorEvent` | 操作錯誤 | error_code, retry_allowed |
| `GameErrorEvent` | 遊戲層級錯誤 | error_code, recoverable |
| `GameSnapshotRestore` | 斷線重連 | 完整遊戲狀態 |
