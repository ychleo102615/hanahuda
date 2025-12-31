# Research: Nuxt Backend Server

**Feature Branch**: `008-nuxt-backend-server`
**Research Date**: 2024-12-04
**Status**: Complete

---

## 1. Technical Context Clarifications

### 1.1 Backend Framework Choice

**Decision**: Nuxt 4 (Nitro) 作為後端框架

**Rationale**:
- 依據 `doc/nuxt-fullstack-feasibility.md` 的可行性分析，Nitro 能完全支援所有後端功能
- 全棧 TypeScript 提升開發效率，減少學習曲線
- Domain Layer 可與前端 `user-interface BC` 共用邏輯
- 部署簡化為單一應用

**Alternatives Considered**:
- Java Spring Boot：效能較高，微服務化路徑清晰，但需維護兩套技術棧、Domain 邏輯重複實作
- 獨立 Node.js 服務：增加部署複雜度，無法利用 Nuxt 整合優勢

---

### 1.2 ORM 選擇

**Decision**: Drizzle ORM（符合 spec.md FR-026 要求）

**Rationale**:
- spec.md 明確指定使用 Drizzle ORM
- 型別安全，與 TypeScript 整合良好
- 輕量級，較 Prisma 啟動更快
- SQL-first 設計，學習曲線低

**Alternatives Considered**:
- Prisma：功能更全面但 bundle size 較大，啟動較慢
- 直接 SQL：失去型別安全，維護成本高

---

### 1.3 SSE 實現方式

**Decision**: 使用 Nitro 的 `h3` eventStream API

**Rationale**:
- Nitro 原生支援 SSE（`eventStream` helper）
- 符合現有 `doc/shared/protocol.md` 設計
- 瀏覽器內建自動重連機制

**技術實現**:
```typescript
// server/api/v1/games/[gameId]/events.get.ts
import { eventStream } from 'h3'

export default defineEventHandler(async (event) => {
  return eventStream(event, async (push) => {
    // 訂閱遊戲事件
    const subscription = gameEventBus.subscribe(gameId, (gameEvent) => {
      push({ data: JSON.stringify(gameEvent) })
    })

    // 清理
    event.node.res.on('close', () => {
      subscription.unsubscribe()
    })
  })
})
```

**部署限制**:
- 不支援 Serverless 平台（Vercel, Netlify）
- 需要持久伺服器（Railway, Fly.io, Render）

---

### 1.4 遊戲狀態管理

**Decision**: 記憶體內狀態管理 + 資料庫持久化

**Rationale**:
- MVP 階段單伺服器部署，記憶體管理效能最佳
- 資料庫持久化用於：
  - 斷線重連快照恢復
  - 遊戲統計數據持久化
  - 意外重啟後的遊戲恢復

**資料結構**:
```typescript
// 記憶體中的活躍遊戲
const activeGames: Map<GameId, GameAggregate> = new Map()

// 資料庫儲存（用於重連和統計）
- games 表：遊戲會話元資料
- game_snapshots 表：遊戲狀態快照（JSON）
- player_stats 表：玩家統計數據
```

---

### 1.5 Domain Layer 架構

**Decision**: 後端獨立實作 Core Game BC Domain Layer

**Rationale**:
- 前端 `user-interface/domain` 是 UI 提示用的輕量邏輯（卡片比對、役種進度）
- 後端 Domain Layer 需要完整遊戲引擎（發牌、狀態機、分數計算）
- 符合 Constitution 第 III 條「Server Authority」原則

**不共用原因**:
1. 前端 Domain Layer 設計目的不同（UI 提示 vs 遊戲引擎）
2. 後端需要完整的 Aggregate 和 Entity 模式
3. Constitution 要求「伺服器是遊戲狀態的唯一真相來源」

---

### 1.6 假玩家服務設計

**Decision**: Opponent Service 作為 Adapter Layer 的事件監聽服務

**Rationale**:
- **Server 中立原則**：Core Game BC 不區分玩家類型（人類或 AI）
- OpponentService 監聽內部事件，自動加入遊戲並執行回合
- 與 REST endpoints 共用 Use Cases（直接呼叫，不經 HTTP）
- 事件驅動模式，未來可獨立為 Opponent BC 或微服務

**架構定位**:
```
┌─────────────────────────────────────────────────────┐
│  Adapter Layer                                       │
│  ┌──────────────────┐                               │
│  │ OpponentService  │ ← 監聽內部事件，呼叫 Use Cases │
│  └────────┬─────────┘                               │
│           │ 訂閱事件                                 │
│           ▼                                          │
│  ┌─────────────────────────────────────────────┐    │
│  │ InternalEventBus (實作 InternalEventPublisherPort)│
│  └──────────────────────────────┬──────────────┘    │
│                                 ▲ 發布事件           │
├─────────────────────────────────┼──────────────────┤
│  Application Layer              │                   │
│  • JoinGameUseCase 發布 ROOM_CREATED               │
│  • 其他 Use Cases 發布 PLAYER_TURN_STARTED 等       │
│  • 不區分 AI 或人類                                 │
└─────────────────────────────────────────────────────┘
```

**內部事件發布（透過 Output Port）**:
```typescript
// server/application/ports/output/internalEventPublisherPort.ts
interface InternalEventPublisherPort {
  publishRoomCreated(gameId: string, waitingPlayerId: string): void
  publishPlayerTurnStarted(gameId: string, playerId: string, flowState: FlowState): void
  publishSelectionRequired(gameId: string, playerId: string, options: string[]): void
  publishDecisionRequired(gameId: string, playerId: string): void
}
```

**OpponentService 實現**:
```typescript
// server/adapters/opponent/opponentService.ts
class OpponentService {
  private readonly aiPlayerIds = new Set<string>()

  constructor(
    private internalEventBus: InternalEventBus,
    private joinGameUseCase: JoinGameUseCase,
    private playHandCardUseCase: PlayHandCardUseCase,
    // ... 其他 Use Cases
  ) {
    this.subscribeToEvents()
  }

  private subscribeToEvents() {
    // 監聽房間建立 → 自動加入（透過 JoinGameUseCase）
    this.internalEventBus.on('ROOM_CREATED', async (event) => {
      const aiPlayer = this.createAiPlayer()
      await this.joinGameUseCase.execute({
        playerId: aiPlayer.id,
        playerName: 'AI Opponent'
      })
      this.aiPlayerIds.add(aiPlayer.id)
    })

    // 監聽回合開始 → 若是 AI 則自動操作
    this.internalEventBus.on('PLAYER_TURN_STARTED', async (event) => {
      if (this.aiPlayerIds.has(event.playerId)) {
        await this.simulateThinkingDelay()
        await this.executeAiTurn(event.gameId, event.playerId, event.flowState)
      }
    })
  }
}
```

**時序控制**:
- 模擬動畫時間：3 秒（固定）
- 模擬思考時間：1.5-3 秒（隨機）
- 使用 setTimeout 實現延遲

**關鍵設計決策**:
- AI 與人類玩家使用相同的 JoinGameUseCase 加入遊戲
- AI 也獲得 session_token，保持介面一致性
- JoinGameUseCase 包含配對邏輯，未來可獨立為 Matchmaking BC

---

### 1.7 型別定義策略

**Decision**: 共用型別移至 `shared/` 目錄，符合 Nuxt 設計哲學

**Rationale**:
- Nuxt 設計哲學推薦共用邏輯放在 `shared/` 目錄
- 前端已定義完整的 Protocol 型別（符合 `doc/shared/protocol.md`）
- **複製**型別定義到 `shared/types/`，而非直接引用前端路徑
- 確保前後端型別一致性

**目錄結構**:
```
front-end/
├── shared/                    # 前後端共用（Nuxt 設計哲學）
│   └── types/
│       ├── events.ts          # SSE 事件型別（從 app/.../types/ 移動）
│       ├── commands.ts        # 命令型別
│       ├── shared.ts          # 共用資料結構
│       ├── flow-state.ts      # FlowState 定義
│       └── errors.ts          # 錯誤型別
├── app/
│   └── user-interface/
│       └── application/
│           └── types/         # 改為從 shared/types 重新導出
│               └── index.ts   # export * from '~/shared/types'
└── server/
    └── types/
        └── index.ts           # export * from '~/shared/types'
```

**遷移策略**:
1. 將現有 `app/user-interface/application/types/` 內容移至 `shared/types/`
2. 前端 `app/.../types/index.ts` 改為重新導出
3. 後端直接從 `~/shared/types` 引用

---

## 2. Best Practices Research

### 2.1 Nitro Server API 設計

**最佳實踐**:
- 使用目錄結構自動路由：`server/api/v1/games/join.post.ts`
- 使用 `defineEventHandler` 包裝所有 handler
- 使用 `readBody` / `readValidatedBody` 讀取請求體
- 使用 `createError` 拋出錯誤

**範例**:
```typescript
// server/api/v1/games/join.post.ts
import { z } from 'zod'

const schema = z.object({
  player_id: z.string().uuid(),
  session_token: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, schema.parse)
  const result = await joinGameUseCase.execute(body)
  return result
})
```

---

### 2.2 Drizzle ORM 設計模式

**最佳實踐**:
- Schema 定義放在 `server/database/schema/`
- 使用 `drizzle-kit` 管理 migrations
- Repository Pattern 封裝資料存取

**範例 Schema**:
```typescript
// server/database/schema/games.ts
import { pgTable, uuid, jsonb, timestamp, boolean } from 'drizzle-orm/pg-core'

export const games = pgTable('games', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionToken: uuid('session_token').unique().notNull(),
  player1Id: uuid('player1_id').notNull(),
  player2Id: uuid('player2_id'),
  isPlayer2Ai: boolean('is_player2_ai').default(true),
  state: jsonb('state').$type<GameSnapshot>(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})
```

---

### 2.3 Clean Architecture in Nitro

**目錄結構建議**:
```
server/
├── api/v1/                    # Framework Layer (Nitro handlers)
├── application/               # Application Layer (Use Cases)
│   ├── use-cases/
│   └── ports/
│       ├── input/             # Input Port interfaces
│       └── output/            # Output Port interfaces
├── domain/                    # Domain Layer (Aggregates, Services)
│   ├── game/
│   ├── round/
│   └── services/
├── adapters/                  # Adapter Layer (Port implementations)
│   ├── persistence/
│   ├── event-publisher/
│   └── opponent/              # Opponent Service（Core Game BC 之外）
├── database/                  # Database schema and migrations
│   ├── schema/
│   └── migrations/
└── utils/                     # Shared utilities
```

**依賴規則**:
- `api/` `adapters/` `database` → `application/` → `domain/`
- `adapters/` implements `application/ports/`
- `domain/` 無外部依賴（純 TypeScript）

---

### 2.4 事件發布機制

**最佳實踐**:
- 使用 Event Emitter 模式管理 SSE 訂閱
- 每個遊戲有獨立的 event channel
- 支援多客戶端訂閱同一遊戲

**實現**:
```typescript
// server/adapters/event-publisher/sseEventPublisher.ts
import { EventEmitter } from 'events'

class GameEventBus {
  private emitter = new EventEmitter()

  publish(gameId: string, event: GameEvent): void {
    this.emitter.emit(`game:${gameId}`, event)
  }

  subscribe(gameId: string, handler: (event: GameEvent) => void): () => void {
    this.emitter.on(`game:${gameId}`, handler)
    return () => this.emitter.off(`game:${gameId}`, handler)
  }
}

export const gameEventBus = new GameEventBus()
```

---

### 2.5 超時處理機制

**最佳實踐**:
- 使用 `setTimeout` + `Map` 管理超時計時器
- 每次玩家操作重置計時器
- 超時後觸發代管操作或斷線處理

**實現**:
```typescript
// server/adapters/timeout/actionTimeoutManager.ts
class ActionTimeoutManager {
  private timers: Map<string, NodeJS.Timeout> = new Map()

  startTimeout(gameId: string, playerId: string, seconds: number, onTimeout: () => void): void {
    this.clearTimeout(gameId)
    const timer = setTimeout(onTimeout, (seconds + 3) * 1000) // +3秒冗餘
    this.timers.set(gameId, timer)
  }

  clearTimeout(gameId: string): void {
    const timer = this.timers.get(gameId)
    if (timer) {
      clearTimeout(timer)
      this.timers.delete(gameId)
    }
  }
}
```

---

## 3. Integration Patterns

### 3.1 Clean Architecture 核心流程

**命令處理流程（強調 CA 分層）**:

```
[Client REST Request]
        ↓
[Nitro Handler] → 驗證 + 解析 body（Framework Layer）
        ↓
┌───────────────────────────────────────────────────────────┐
│  Use Case (Application Layer)                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  1. 從 Repository (Output Port) 載入 Aggregate       │  │
│  │  2. 呼叫 Domain Layer 執行業務邏輯                   │  │
│  │  3. Domain 返回結果 + 產生 Domain Events            │  │
│  │  4. 透過 Event Publisher (Output Port) 發布事件      │  │
│  │  5. 透過 Repository (Output Port) 持久化            │  │
│  └─────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────┘
        ↓
[Domain Layer] ← 純業務邏輯，無外部依賴
        ↓ (Domain Events)
[Use Case 繼續]
        ↓
[Event Publisher (Adapter)] → 推送 SSE 事件到客戶端
        ↓
[Repository (Adapter)] → 持久化到資料庫
```

**關鍵原則**:
1. **Domain Layer 是核心**：所有業務邏輯在 Domain 執行
2. **Use Case 編排流程**：Use Case 負責協調 Domain 和 Adapters
3. **Adapters 實現 Ports**：Repository 和 EventPublisher 是 Output Ports 的實現
4. **依賴方向**：Framework → Application → Domain（絕不反向）

---

### 3.2 具體流程範例：打手牌

```typescript
// PlayHandCardUseCase 流程

async execute(command: TurnPlayHandCard): Promise<void> {
  // 1. 從 Repository 載入 Game Aggregate
  const game = await this.gameRepository.findById(command.game_id)

  // 2. 呼叫 Domain Layer 執行業務邏輯
  const result = game.playHandCard(command.card_id, command.target_card_id)
  // Domain Layer 返回：
  // - 操作結果（CardPlay）
  // - 產生的 Domain Events（TurnCompleted / SelectionRequired / DecisionRequired）

  // 3. 透過 Event Publisher 發布事件
  for (const event of result.events) {
    await this.eventPublisher.publish(game.id, event)
  }

  // 4. 透過 Repository 持久化
  await this.gameRepository.save(game)

  // 5. 若輪到假玩家，觸發 Opponent Service
  if (game.isNextPlayerAi()) {
    await this.opponentAction.executeOpponentTurn(game.id)
  }
}
```

---

### 3.3 斷線重連流程

```
1. Client 發送 GameRequestJoin（含 session_token）
2. Server 驗證 session_token
3. 若遊戲仍在進行：
   - 從記憶體/資料庫取得 GameSnapshot
   - 推送 GameSnapshotRestore 事件
4. 若遊戲已結束：
   - 推送 GameError（SESSION_INVALID）
```

---

### 3.4 假玩家回合流程

```
1. 真人玩家回合結束，next_state 指向假玩家
2. Use Case 呼叫 OpponentActionPort（Output Port）
3. Opponent Service（Adapter）執行：
   a. 模擬動畫延遲（3 秒）
   b. 模擬思考延遲（1.5-3 秒）
   c. 執行隨機策略決策
4. Opponent Service 返回決策給 Use Case
5. Use Case 呼叫 Domain Layer 執行操作
6. Domain Layer 產生事件
7. Use Case 透過 Event Publisher 推送事件
8. 回合結束，next_state 指向真人玩家
```

**架構說明**:
- Opponent Service 位於 Core Game BC 之外
- 透過 Output Port (`OpponentActionPort`) 與 Core Game BC 互動
- 未來可輕鬆抽離為獨立 BC 或微服務

---

## 4. Risk Analysis

### 4.1 技術風險

| 風險 | 可能性 | 影響 | 緩解措施 |
|-----|-------|------|---------|
| SSE 連線不穩定 | 中 | 高 | 實現斷線重連機制 |
| 記憶體洩漏（遊戲未清理） | 中 | 高 | 實現遊戲清理排程 |
| 並發操作競態條件 | 低 | 高 | 使用樂觀鎖或序列化 |
| ORM 效能瓶頸 | 低 | 中 | 使用連接池、索引優化 |

### 4.2 緩解策略

**SSE 連線管理**:
- 設置心跳機制（每 30 秒發送 `:keepalive`）
- 客戶端自動重連（瀏覽器原生支援）
- 提供 snapshot fallback 端點

**遊戲清理**:
- 遊戲結束後立即清理（FR-025）
- 設置定時清理任務（清除過期遊戲）
- 記錄清理日誌

---

## 5. Protocol Data Type Mapping

### 5.1 Events.ts 與 Protocol.md 對應

| events.ts 型別 | protocol.md 欄位差異 | 需調整 |
|---------------|---------------------|--------|
| `GameStartedEvent` | 缺少 `my_player_id` | 後端需加入 |
| `RoundDealtEvent` | 一致 | 無 |
| `TurnCompletedEvent` | 一致 | 無 |
| `SelectionRequiredEvent` | 一致 | 無 |
| `DecisionRequiredEvent` | 一致 | 無 |
| `DecisionMadeEvent` | `updated_multipliers` vs `koi_multiplier_update` | 以程式碼為準 |
| `RoundScoredEvent` | `yaku_list` vs `yakus`, `base_score` vs `base_total` | 以程式碼為準 |
| `GameSnapshotRestore` | 結構不同 | 後端需調整 |

### 5.2 Shared.ts 與 Protocol.md 對應

| shared.ts 型別 | protocol.md 欄位差異 | 需調整 |
|---------------|---------------------|--------|
| `YakuUpdate` | `newly_formed_yaku` vs `new` | 以程式碼為準 |
| `ScoreMultipliers` | `player_multipliers` vs `seven_plus/winner_koi/opponent_koi` | 以程式碼為準 |
| `CardSelection` | `source_card/selected_target` vs `source/options` | 語意不同，需確認 |
| `KoiStatus` | `koi_multiplier/times_continued` vs `multiplier/called_count` | 以程式碼為準 |
| `Ruleset` | `target_score/yaku_settings/special_rules` vs `total_rounds/koi_koi_multiplier/seven_point_double` | 以程式碼為準 |

### 5.3 結論

**以現有程式碼型別定義為準**（依據使用者指示）：
- 共用型別移至 `shared/types/` 目錄
- 後端和前端都從 `~/shared/types` 引用
- protocol.md 作為設計參考，但程式碼型別為最終權威
- 若需調整，應更新 protocol.md 而非程式碼

---

## 6. Decision Summary

| 決策項目 | 決策內容 | 狀態 |
|---------|---------|------|
| 後端框架 | Nuxt 4 (Nitro) | 確定 |
| ORM | Drizzle ORM | 確定（spec.md 指定）|
| 型別定義 | 移至 `shared/types/`，前後端共用 | 確定 |
| Domain Layer | 後端獨立實作 Core Game BC | 確定 |
| 假玩家服務 | Adapter Service（Core Game BC 之外），未來可獨立為 BC | 確定 |
| 事件推送 | Nitro eventStream + EventEmitter | 確定 |
| 部署平台 | Railway（推薦）/ Fly.io | 待確定 |

---

## References

- `doc/nuxt-fullstack-feasibility.md` - Nuxt 全棧可行性分析
- `doc/shared/protocol.md` - 通訊協議規格
- `doc/shared/data-contracts.md` - 資料契約
- `doc/backend/architecture.md` - 後端架構設計（Java 版本參考）
- `front-end/app/user-interface/application/types/` - 現有型別定義
