# 後端架構總覽

## 技術棧

### 核心框架
- **Nuxt 4 Nitro** (Server Engine)
- **TypeScript 5.9+**
- **H3** (HTTP 框架)
- **Drizzle ORM** (資料庫 ORM)
- **PostgreSQL 14+** (資料庫)
- **Zod** (Schema Validation)

### 通訊協議
- **REST API**: 處理客戶端命令（加入遊戲、打牌、選擇配對、Koi-Koi 決策）
- **Server-Sent Events (SSE)**: 推送遊戲事件給客戶端

### 架構設計
- **Clean Architecture**: 嚴格分層（Domain → Application → Adapter → Framework）
- **Domain-Driven Design (DDD)**: Bounded Context、Aggregate、Entity、Value Object
- **Nuxt 全棧架構**: 前後端整合於同一專案，共用 TypeScript 類型

---

## Bounded Context 劃分

### 1. Core Game BC（核心遊戲）

**職責**:
- 遊戲會話管理（Game Aggregate Root）
- 遊戲規則引擎（發牌、配對、役種檢測、分數計算）
- 回合流程控制（FlowStage 狀態機）
- SSE 事件推送
- 遊戲狀態持久化

**核心領域模型**:
- **Game** (Aggregate Root): 遊戲會話
- **Round**: 局
- **Card**: 卡牌（Value Object）
- **Yaku**: 役種（Value Object）
- **Player**: 玩家（Entity）

**詳細文檔**:
- [Core Game BC - Domain Layer](./core-game/domain.md)
- [Core Game BC - Application Layer](./core-game/application.md)
- [Core Game BC - Adapter Layer](./core-game/adapter.md)

---

### 2. Opponent BC（對手策略）

**職責**:
- AI 對手決策邏輯（選擇手牌、選擇配對目標、Koi-Koi 決策）
- 策略模式實作（簡易隨機策略）

**核心領域模型**:
- **OpponentStrategy** (Interface): 對手策略介面
- **SimpleAIStrategy**: 簡易 AI 策略

**詳細文檔**:
- [Opponent BC - Domain Layer](./opponent/domain.md)
- [Opponent BC - Application Layer](./opponent/application.md)
- [Opponent BC - Adapter Layer](./opponent/adapter.md)

---

## Clean Architecture 分層

```
┌─────────────────────────────────────────────────────────────┐
│  Framework & Drivers Layer (最外層)                         │
│  ├─ Nitro Server Routes (REST API)                          │
│  ├─ SSE Event Stream Handler                                │
│  ├─ Drizzle ORM (PostgreSQL)                                │
│  └─ H3 HTTP Utilities                                       │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  Adapter Layer (介面適配層)                           │ │
│  │  ├─ API Routes (遊戲命令接收)                         │ │
│  │  ├─ SSE Publisher (事件推送)                          │ │
│  │  ├─ DTOs (資料傳輸對象)                               │ │
│  │  ├─ Repository Adapters (Drizzle 實作)                │ │
│  │  └─ Mappers (Domain ↔ DTO 轉換)                       │ │
│  │                                                        │ │
│  │  ┌─────────────────────────────────────────────────┐ │ │
│  │  │  Application Layer (應用業務規則層)             │ │ │
│  │  │  ├─ Use Cases (遊戲操作流程)                   │ │ │
│  │  │  │  ├─ JoinGameUseCase                         │ │ │
│  │  │  │  ├─ PlayHandCardUseCase                     │ │ │
│  │  │  │  ├─ SelectMatchedCardUseCase                │ │ │
│  │  │  │  ├─ MakeDecisionUseCase                     │ │ │
│  │  │  │  └─ ExecuteOpponentTurnUseCase              │ │ │
│  │  │  ├─ Input Ports (命令介面)                      │ │ │
│  │  │  └─ Output Ports (Repository、Event Publisher) │ │ │
│  │  │                                                  │ │ │
│  │  │  ┌───────────────────────────────────────────┐ │ │ │
│  │  │  │  Domain Layer (企業業務規則層)           │ │ │ │
│  │  │  │  ├─ Aggregates                           │ │ │ │
│  │  │  │  │  └─ Game                              │ │ │ │
│  │  │  │  ├─ Entities                             │ │ │ │
│  │  │  │  │  ├─ Round                             │ │ │ │
│  │  │  │  │  └─ Player                            │ │ │ │
│  │  │  │  ├─ Value Objects                        │ │ │ │
│  │  │  │  │  ├─ Card                              │ │ │ │
│  │  │  │  │  ├─ Yaku                              │ │ │ │
│  │  │  │  │  └─ FlowStage                         │ │ │ │
│  │  │  │  └─ Domain Services                      │ │ │ │
│  │  │  │     ├─ matchingService                   │ │ │ │
│  │  │  │     ├─ yakuDetectionService              │ │ │ │
│  │  │  │     └─ scoringService                    │ │ │ │
│  │  │  └───────────────────────────────────────────┘ │ │ │
│  │  └─────────────────────────────────────────────────┘ │ │
│  └───────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 依賴規則 (Dependency Rule)

- ✅ **依賴箭頭只能由外層指向內層**
- ✅ **Domain Layer 不依賴任何框架**（純 TypeScript 函數）
- ✅ **Application Layer 定義 Port 介面，Adapter Layer 實作**
- ✅ **Adapter Layer 負責資料格式轉換**（Domain ↔ DTO）
- ✅ **使用 `Object.freeze()` 確保 Domain 物件不可變**

---

## 目錄結構

```
front-end/
├── server/                           # Nitro 後端目錄
│   ├── api/v1/                       # REST API Routes
│   │   ├── games/
│   │   │   ├── join.post.ts          # POST /api/v1/games/join
│   │   │   └── [gameId]/
│   │   │       ├── events.get.ts     # GET  /api/v1/games/:gameId/events (SSE)
│   │   │       ├── snapshot.get.ts   # GET  /api/v1/games/:gameId/snapshot
│   │   │       ├── leave.post.ts     # POST /api/v1/games/:gameId/leave
│   │   │       ├── turns/
│   │   │       │   ├── play-card.post.ts      # POST /api/v1/games/:gameId/turns/play-card
│   │   │       │   └── select-match.post.ts   # POST /api/v1/games/:gameId/turns/select-match
│   │   │       └── rounds/
│   │   │           └── decision.post.ts       # POST /api/v1/games/:gameId/rounds/decision
│   │   └── health.get.ts             # Health check
│   │
│   ├── domain/                       # Domain Layer
│   │   ├── game/                     # Game Aggregate
│   │   │   ├── game.ts               # Game 類型定義
│   │   │   ├── game-factory.ts       # Game 工廠函數
│   │   │   └── game-operations.ts    # Game 操作（純函數）
│   │   ├── round/                    # Round Entity
│   │   │   ├── round.ts              # Round 類型定義
│   │   │   └── round-operations.ts   # Round 操作（純函數）
│   │   ├── types/                    # 共用類型
│   │   │   ├── card.ts
│   │   │   ├── yaku.ts
│   │   │   └── flow-stage.ts
│   │   └── services/                 # Domain Services
│   │       ├── matching-service.ts   # 配對邏輯
│   │       ├── yaku-detection-service.ts  # 役種檢測
│   │       └── scoring-service.ts    # 分數計算
│   │
│   ├── application/                  # Application Layer
│   │   ├── ports/                    # Port 介面
│   │   │   ├── input/                # Input Ports
│   │   │   └── output/               # Output Ports
│   │   └── use-cases/                # Use Cases
│   │       ├── JoinGameUseCase.ts
│   │       ├── PlayHandCardUseCase.ts
│   │       ├── SelectMatchedCardUseCase.ts
│   │       ├── MakeDecisionUseCase.ts
│   │       └── ExecuteOpponentTurnUseCase.ts
│   │
│   ├── adapters/                     # Adapter Layer
│   │   ├── persistence/              # 持久化
│   │   │   ├── GameRepositoryAdapter.ts
│   │   │   └── mappers/
│   │   ├── event/                    # 事件發布
│   │   │   ├── SSEEventPublisher.ts
│   │   │   └── SSEConnectionRegistry.ts
│   │   └── lock/                     # 並發控制
│   │       └── InMemoryGameLock.ts
│   │
│   ├── database/                     # 資料庫
│   │   ├── drizzle.config.ts
│   │   ├── schema.ts                 # Drizzle Schema
│   │   └── migrations/               # 資料庫遷移
│   │
│   └── utils/                        # 工具函式
│       ├── db.ts                     # 資料庫連線
│       └── session.ts                # Session 處理
│
└── shared/                           # 前後端共用
    └── contracts/                    # 數據契約
        ├── commands.ts               # 命令類型
        ├── events.ts                 # 事件類型
        └── game-state.ts             # 遊戲狀態類型
```

---

## 資料庫設計

### 資料表結構

使用 Drizzle ORM 定義的三個主要資料表：

| 資料表 | 用途 |
|--------|------|
| `games` | 遊戲會話（玩家資訊、狀態、累計分數） |
| `player_stats` | 玩家統計（勝率、役種計數、Koi-Koi 次數） |
| `game_logs` | 事件日誌（用於 Debug 追溯問題） |

```typescript
// server/database/schema.ts
export const games = pgTable("games", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  sessionToken: uuid("session_token").notNull().unique(),
  player1Id: uuid("player1_id").notNull(),
  player1Name: varchar("player1_name", { length: 50 }).notNull(),
  player2Id: uuid("player2_id"),
  player2Name: varchar("player2_name", { length: 50 }),
  isPlayer2Ai: boolean("is_player2_ai").default(true).notNull(),
  status: varchar({ length: 20 }).default('WAITING').notNull(),
  totalRounds: integer("total_rounds").default(2).notNull(),
  roundsPlayed: integer("rounds_played").default(0).notNull(),
  cumulativeScores: jsonb("cumulative_scores").default([]).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

export const gameLogs = pgTable("game_logs", {
  id: bigserial({ mode: "bigint" }).primaryKey().notNull(),
  gameId: uuid("game_id").notNull(),
  playerId: varchar("player_id", { length: 100 }),
  eventType: varchar("event_type", { length: 100 }).notNull(),
  payload: jsonb().notNull(),
  sequenceNumber: integer("sequence_number").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("idx_game_logs_game_id").using("btree", table.gameId),
])
```

---

## API 設計原則

### RESTful 端點

遵循 [protocol.md](../shared/protocol.md) 定義的命令結構：

| 端點 | 方法 | 對應命令 | FlowStage |
|------|------|---------|-----------|
| `/api/v1/games/join` | POST | `GameRequestJoin` | N/A (初始化/重連) |
| `/api/v1/games/{gameId}/turns/play-card` | POST | `TurnPlayHandCard` | `AWAITING_HAND_PLAY` |
| `/api/v1/games/{gameId}/turns/select-match` | POST | `TurnSelectTarget` | `AWAITING_SELECTION` |
| `/api/v1/games/{gameId}/rounds/decision` | POST | `RoundMakeDecision` | `AWAITING_DECISION` |
| `/api/v1/games/{gameId}/events` | GET (SSE) | - | - |
| `/api/v1/games/{gameId}/snapshot` | GET | - | Fallback 用 |

### FlowStage 狀態機

遊戲流程由三個狀態驅動：

| 狀態值 | 說明 | 允許的命令 |
|--------|------|-----------|
| `AWAITING_HAND_PLAY` | 等待玩家打出手牌 | `TurnPlayHandCard` |
| `AWAITING_SELECTION` | 等待玩家選擇配對目標 | `TurnSelectTarget` |
| `AWAITING_DECISION` | 等待玩家做 Koi-Koi 決策 | `RoundMakeDecision` |

每個 SSE 事件包含 `next_state`，指示客戶端下一步應等待的命令。

---

## 並發控制

### 悲觀鎖設計

使用 Promise Chain 實現悲觀鎖，確保同一遊戲的操作互斥：

```typescript
// server/adapters/lock/InMemoryGameLock.ts
export class InMemoryGameLock implements GameLockPort {
  private locks: Map<string, Promise<void>> = new Map()

  async withLock<T>(gameId: string, operation: () => Promise<T>): Promise<T> {
    const currentLock = this.locks.get(gameId) ?? Promise.resolve()
    const newLock = currentLock.then(() => operation())
    this.locks.set(gameId, newLock.catch(() => {}))
    return newLock
  }
}
```

**解決問題**:
- 防止同一遊戲的並發操作（如兩個玩家同時打牌）
- 確保遊戲狀態一致性

---

## SSE 事件推送

### 連線管理

```typescript
// server/adapters/event/SSEConnectionRegistry.ts
export class SSEConnectionRegistry {
  private connections: Map<string, Set<EventStream>> = new Map()

  register(gameId: string, stream: EventStream): void
  unregister(gameId: string, stream: EventStream): void
  broadcast(gameId: string, event: SSEEvent): void
}
```

### 事件流程

```
Client → REST: POST /games/{id}/turns/play-card
Server → SSE:  TurnCompleted { hand_card_play, draw_card_play, next_state }
Server → SSE:  DecisionRequired { yaku_update, current_multipliers }
Client → REST: POST /games/{id}/rounds/decision
Server → SSE:  RoundScored { winner_id, final_points }
```

---

## 參考文檔

### 核心文檔
- [共用數據契約](../shared/data-contracts.md)
- [通訊協議](../shared/protocol.md)
- [遊戲規則](../shared/game-rules.md)

### 後端模組
- [Core Game BC](./core-game/)
- [Opponent BC](./opponent/)

### 質量保證
- [測試策略](../quality/testing-strategy.md)
- [指標與標準](../quality/metrics.md)
