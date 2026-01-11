# Game Gateway 整合遷移指南

## 概述

Game Gateway 架構將原本分散的配對 SSE 和遊戲 SSE 整合為單一統一端點，簡化前端連線管理並解決 `game_id` 時序問題。

## 架構對比

### 舊架構（已 Deprecated）

```
前端
├── SSE 1: /api/v1/matchmaking/status  → 配對事件
│   └── 收到 MatchFound 後...
│       └── 斷開 SSE 1，連接 SSE 2      ← 前端負責編排 ❌
└── SSE 2: /api/v1/games/connect       → 遊戲事件
```

**問題**：
- 前端需管理兩個 SSE 連線
- `MatchFound` 事件發送時 `game_id` 尚未建立（值為 'pending'）
- 連線切換邏輯複雜，容易出錯

### 新架構（Gateway）

```
前端 ─── 單一 SSE ───> GET /api/v1/events
                            │
                     PlayerConnectionManager
                            │
                      PlayerEventBus
                            │
         ┌──────────────────┼──────────────────┐
   Matchmaking BC      Core Game BC       Opponent BC
   (MatchFound)      (GameEvents)       (RoomCreated)
```

**優勢**：
- 單一 SSE 連線接收所有事件
- `MatchFound` 由 `GameCreationHandler` 在遊戲建立後發布，包含有效 `game_id`
- 前端不需處理連線切換邏輯
- 支援未來微服務擴展

## 後端實作清單

### Phase 1: 基礎建設

| 檔案 | 說明 |
|------|------|
| `server/shared/infrastructure/event-bus/playerEventBus.ts` | PlayerEventBus 實作（以 playerId 為 key） |
| `server/gateway/playerConnectionManager.ts` | 玩家連線管理（註冊/移除/訂閱） |
| `server/gateway/playerStatusService.ts` | 玩家狀態查詢（IDLE/MATCHMAKING/IN_GAME） |
| `server/api/v1/events.get.ts` | Gateway SSE 端點 |

### Phase 2: BC 整合

| 檔案 | 修改內容 |
|------|----------|
| `server/core-game/adapters/event-subscriber/gameCreationHandler.ts` | 遊戲建立後發布 `MatchFound` 到 PlayerEventBus |
| `server/matchmaking/adapters/registry/matchmakingRegistry.ts` | 發布 `MatchmakingStatus` 到 PlayerEventBus |
| `server/core-game/adapters/event-publisher/compositeEventPublisher.ts` | 同時發布遊戲事件到 PlayerEventBus |

## 前端實作清單

### Phase 3: Gateway 元件

| 檔案 | 說明 |
|------|------|
| `shared/contracts/gateway-events.ts` | Gateway 事件類型定義 |
| `app/game-client/adapter/sse/GatewayEventRouter.ts` | 統一事件路由器 |
| `app/game-client/adapter/sse/GatewayEventClient.ts` | 統一 SSE 客戶端 |
| `app/game-client/adapter/composables/useGatewayConnection.ts` | Gateway 連線 Composable |
| `app/game-client/application/use-cases/HandleGatewayConnectedUseCase.ts` | Gateway 連線事件處理 |

### Phase 4: Deprecated 標記

所有舊 SSE 端點和客戶端已標記為 `@deprecated`：

**後端**：
- `/api/v1/matchmaking/status.get.ts`
- `/api/v1/games/connect.get.ts`

**前端**：
- `MatchmakingEventClient`
- `GameEventClient`
- `SSEConnectionManager`
- `useMatchmakingConnection`

## Gateway 事件格式

### SSE 事件命名

```
格式: ${domain}:${type}
範例: MATCHMAKING:MatchFound, GAME:RoundDealt
```

### GatewayEvent 結構

```typescript
interface GatewayEvent {
  readonly domain: 'MATCHMAKING' | 'GAME'
  readonly type: string
  readonly payload: unknown
  readonly event_id: string
  readonly timestamp: string
}
```

### 初始事件：GatewayConnected

連線建立後第一個事件，包含玩家目前狀態：

```typescript
{
  domain: 'GAME',
  type: 'GatewayConnected',
  payload: {
    player_id: string,
    status: 'IDLE' | 'MATCHMAKING' | 'IN_GAME',
    // MATCHMAKING 狀態
    entryId?: string,
    roomType?: string,
    elapsedSeconds?: number,
    // IN_GAME 狀態
    gameId?: string,
    gameStatus?: string
  }
}
```

## 前端遷移指南

### 舊的使用方式（Deprecated）

```typescript
// ❌ 舊方式：分散的連線管理
const matchmakingConnection = useMatchmakingConnection()
matchmakingConnection.connect() // SSE 1

// ... 配對成功後切換到遊戲 SSE
const gameConnection = useGameConnection()
gameConnection.connect() // SSE 2
```

### 新的使用方式（推薦）

```typescript
// ✅ 新方式：單一連線
import { useGatewayConnection } from '~/game-client/adapter/composables/useGatewayConnection'

const gateway = useGatewayConnection()

// 單一連線接收所有事件
gateway.connect()

// 斷線時清理
onUnmounted(() => {
  gateway.disconnect()
})
```

### 頁面整合範例

```vue
<script setup>
import { useGatewayConnection } from '~/game-client/adapter/composables/useGatewayConnection'
import { onMounted, onUnmounted } from 'vue'

const gateway = useGatewayConnection()

onMounted(() => {
  // 建立 Gateway 連線（身份由 Cookie 驗證）
  gateway.connect()
})

onUnmounted(() => {
  // 清理連線
  gateway.disconnect()
})
</script>
```

## DI 註冊

### 新增的 Tokens

```typescript
// tokens.ts
export const TOKENS = {
  // Gateway Adapters
  GatewayEventRouter: Symbol('GatewayEventRouter'),
  GatewayEventClient: Symbol('GatewayEventClient'),

  // Gateway Event Handler
  HandleGatewayConnectedPort: Symbol('HandleGatewayConnectedPort'),
}
```

### 註冊流程

```typescript
// registry.ts - registerBackendAdapters()

// 1. GatewayEventRouter（整合 EventRouter + MatchmakingEventRouter）
container.register(TOKENS.GatewayEventRouter, () => {
  const gameRouter = container.resolve(TOKENS.EventRouter)
  const matchmakingRouter = container.resolve(TOKENS.MatchmakingEventRouter)
  return new GatewayEventRouter(gameRouter, matchmakingRouter)
})

// 2. GatewayEventClient
container.register(TOKENS.GatewayEventClient, () => {
  const router = container.resolve(TOKENS.GatewayEventRouter)
  return new GatewayEventClient(router)
})

// 3. HandleGatewayConnectedPort
container.register(TOKENS.HandleGatewayConnectedPort, () =>
  new HandleGatewayConnectedUseCase(
    matchmakingStatePort,
    sessionContextPort,
    navigationPort
  )
)

// 4. 綁定 GatewayConnected 事件
const gatewayConnectedPort = container.resolve(TOKENS.HandleGatewayConnectedPort)
router.register('GatewayConnected', gatewayConnectedPort)
```

## 關鍵修正：game_id 時序問題

### 問題分析

**舊流程**：
```
1. MatchmakingService.processMatchmaking()
2. ├─ internalEventBus.publishMatchFound()  ← 立即發布（game 尚未建立）
3. └─ GameCreationHandler 收到事件
4.     └─ joinGameUseCase.execute()         ← 此時才建立 game
5. SSE 端點收到 MATCH_FOUND
6. └─ 發送 MatchFound { game_id: 'pending' } ← ❌ 無效 game_id
```

**新流程**：
```
1. MatchmakingService.processMatchmaking()
2. └─ internalEventBus.publishMatchFound()  ← 發布到內部匯流排
3. GameCreationHandler 收到事件
4. ├─ joinGameUseCase.execute()             ← 建立 game
5. ├─ 取得有效 game_id
6. └─ playerEventBus.publishToPlayer()      ← ✅ 發布包含有效 game_id 的 MatchFound
```

### 程式碼對比

**修改前（gameCreationHandler.ts）**：
```typescript
// ❌ 沒有發布 MatchFound，由 SSE 端點發布（game_id 為 'pending'）
private async handleHumanMatch(payload: MatchFoundPayload): Promise<void> {
  const player1Result = await this.joinGameUseCase.execute(...)
  const player2Result = await this.joinGameUseCase.execute(...)
  // 沒有發布事件
}
```

**修改後**：
```typescript
// ✅ 遊戲建立後才發布 MatchFound
private async handleHumanMatch(payload: MatchFoundPayload): Promise<void> {
  const player1Result = await this.joinGameUseCase.execute(...)
  const player2Result = await this.joinGameUseCase.execute(...)

  const gameId = player1Result.gameId // ← 有效的 game_id

  // 通知 Player1
  const event1 = createMatchmakingEvent('MatchFound', {
    game_id: gameId,  // ← ✅ 有效的 game_id
    opponent_name: payload.player2Name,
    is_bot: false,
  })
  playerEventBus.publishToPlayer(payload.player1Id, event1)

  // 通知 Player2
  const event2 = createMatchmakingEvent('MatchFound', {
    game_id: gameId,
    opponent_name: payload.player1Name,
    is_bot: false,
  })
  playerEventBus.publishToPlayer(payload.player2Id, event2)
}
```

## 向後兼容性

所有舊端點和客戶端仍可正常運作，已標記為 `@deprecated` 但未移除。

**遷移建議**：
1. 新功能使用 `GatewayEventClient`
2. 現有功能可繼續使用舊架構
3. 逐步遷移到新架構
4. 確認無依賴後再移除舊端點

## 測試檢查清單

- [ ] Gateway SSE 連線成功
- [ ] 收到 `GatewayConnected` 初始事件
- [ ] 配對狀態更新正確接收（`MatchmakingStatus`）
- [ ] 配對成功後 `MatchFound` 包含有效 `game_id`
- [ ] 遊戲事件正確路由（`RoundDealt`, `TurnCompleted` 等）
- [ ] 斷線重連機制正常
- [ ] 連線關閉時 listener 正確清理
- [ ] type-check 通過

## 未來工作

### 完全移除舊架構（待確認無依賴）

1. 移除舊 SSE 端點：
   - `/api/v1/matchmaking/status.get.ts`
   - `/api/v1/games/connect.get.ts`

2. 移除前端舊元件：
   - `MatchmakingEventClient`
   - `GameEventClient`
   - `SSEConnectionManager`
   - `useMatchmakingConnection`

3. 更新所有頁面使用 `useGatewayConnection`

### 微服務擴展

Gateway 架構已為微服務化做好準備：
- `PlayerEventBus` 可改用訊息佇列（Kafka/RabbitMQ）
- 各 BC 獨立部署
- 水平擴展 Gateway 實例

## 參考資料

- 實作計畫：`/Users/leo-huang/.claude/plans/ethereal-bubbling-peach.md`
- 原始問題分析：`game_id` 時序問題導致前端連線失敗
- 架構決策：採用 Gateway 模式統一事件入口

---

**版本**: 1.0.0
**完成日期**: 2026-01-08
**作者**: Claude Sonnet 4.5
