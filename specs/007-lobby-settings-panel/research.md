# Research: 遊戲大廳與操作面板

**Feature**: `007-lobby-settings-panel` | **Date**: 2025-11-30
**Phase**: Phase 0 - Research & Architecture Investigation

## Research Overview

本研究針對 [Technical Context](./plan.md#technical-context) 中標記為 NEEDS CLARIFICATION 的項目進行深入調查，確保設計決策基於現有架構模式。

---

## 1. 現有路由結構 (Vue Router)

### 發現位置
- **路由配置**: `/front-end/src/router/index.ts`
- **路由守衛**: `/front-end/src/user-interface/adapter/router/guards.ts`

### 現有路由定義

```typescript
// /front-end/src/router/index.ts
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/views/HomePage.vue'),
    },
    {
      path: '/game',
      name: 'game',
      component: () => import('@/views/GamePage.vue'),
      beforeEnter: gamePageGuard,  // 遊戲模式守衛
    },
  ],
})
```

### gamePageGuard 功能

- **用途**: 根據查詢參數決定遊戲模式 (mock/backend/local)
- **實作方式**: 使用 `sessionStorage.setItem('gameMode', mode)` 儲存模式
- **模式初始化**:
  - `mock`: 開發測試模式 (預設)
  - `backend`: 連接後端伺服器
  - `local`: 離線單機遊戲 (尚未實作)

### 設計決策

✅ **新增 `/lobby` 路由**
- 路徑: `/lobby`
- 組件: `GameLobby.vue`
- 守衛: 需要新增 `lobbyPageGuard` 處理重連邏輯

✅ **重連跳過大廳邏輯**
- 在 `beforeEnter` 守衛中檢查是否為重連情境
- 判斷方式: 檢查 sessionStorage 是否有現有 session_token
- 若為重連 → 直接導航至 `/game`
- 若為新遊戲 → 正常進入 `/lobby`

**決策理由**:
- 遵循現有路由守衛模式 (`gamePageGuard` 範例)
- 使用 sessionStorage 與現有模式一致性
- 守衛邏輯集中管理,易於測試與維護

---

## 2. 現有 SSE 事件處理機制

### 發現位置
- **SSE 客戶端**: `/front-end/src/user-interface/adapter/sse/GameEventClient.ts`
- **事件路由器**: `/front-end/src/user-interface/adapter/sse/EventRouter.ts`
- **事件註冊**: `/front-end/src/user-interface/adapter/di/registry.ts` (registerEventRoutes 函數)

### 架構流程

```
SSE Server → GameEventClient → EventRouter → Use Case (Input Port)
```

1. **GameEventClient**:
   - 使用原生 `EventSource` API 建立 SSE 連線
   - 支援事件類型: `GameStarted`, `GameSnapshotRestore`, `RoundDealt`, 等共 13 種
   - 連線 URL: `/api/v1/games/{gameId}/events?token={sessionToken}`
   - 自動重連機制: 指數退避,最多 5 次 (1s, 2s, 4s, 8s, 16s)

2. **EventRouter**:
   - 將事件類型映射到對應的 Input Port (Use Case)
   - 使用 `Map<string, InputPort>` 儲存事件處理器
   - **事件序列化**: 使用 Promise 鏈確保事件依序處理 (防止動畫衝突)
   - 支援 `clearEventChain()` 用於緊急情況清空排隊事件

3. **事件註冊範例**:

```typescript
// registerEventRoutes() in registry.ts
router.register('GameStarted', gameStartedPort)
router.register('GameSnapshotRestore', gameSnapshotRestorePort)
router.register('TurnError', turnErrorPort)  // 回合級錯誤
```

### HandleGameStartedUseCase

**位置**: `/front-end/src/user-interface/application/use-cases/event-handlers/HandleGameStartedUseCase.ts`

**功能**:
1. 調用 `updateUIState.initializeGameContext(game_id, players, ruleset)`
2. 調用 `gameState.updateDeckRemaining(48)`

**當前行為**: 初始化遊戲上下文後,GamePage.vue 自動顯示遊戲畫面

### 設計決策

✅ **在 GameLobby 中訂閱 GameStarted 事件**
- 使用現有 EventRouter 機制
- GameLobby.vue 在 mounted 時透過 DI Container 取得 EventRouter
- 監聽 GameStarted 事件 → 執行 `router.push('/game')`

✅ **配對超時由後端處理 (Server Authority)**
- **前端**: 顯示倒數計時 UI (純 UX，無業務邏輯)
- **後端**: 30 秒內未配對成功 → 發送 `GameError` 事件
- **前端**: 收到 GameError → `HandleGameErrorUseCase` 處理並重置大廳狀態

**決策理由**:
- 遵循現有事件處理模式
- 利用 EventRouter 的事件序列化機制
- 符合 Clean Architecture (Use Case 處理業務邏輯)
- **符合 Server Authority 原則**: 超時判斷由後端決定，前端僅響應事件

**替代方案 (已拒絕)**:
- ❌ 在 GameLobby.vue 中直接監聽 SSE: 違反分層原則,組件不應直接依賴 SSE
- ❌ 使用 Pinia store 的 $subscribe: 破壞單一職責,store 不應處理路由導航
- ❌ 前端 setTimeout 觸發超時邏輯: 違反 Server Authority，超時判斷應由後端決定

---

## 3. 現有命令發送機制 (GameRequestJoin)

### 發現位置
- **API 客戶端**: `/front-end/src/user-interface/adapter/api/GameApiClient.ts`

### joinGame() 方法

```typescript
// GameApiClient.ts (第 87-94 行)
async joinGame(sessionToken?: string): Promise<JoinGameResponse> {
  const url = `${this.baseURL}/api/v1/games/join`
  const body = sessionToken ? { session_token: sessionToken } : {}

  // joinGame 不進行重試 (避免重複加入遊戲)
  const response = await this.post(url, body)
  return response
}

// 回傳型別
interface JoinGameResponse {
  game_id: string
  session_token: string
  player_id: string
  snapshot: any | null  // 重連時才有值
}
```

### 特性
- **不重試**: joinGame 刻意不使用 `postWithRetry`,避免重複加入遊戲
- **重連支援**: 若提供 `sessionToken`,後端返回 snapshot 恢復遊戲狀態
- **錯誤處理**: 拋出 `NetworkError`, `ServerError`, `TimeoutError`, `ValidationError`

### 設計決策

✅ **在 matchmakingState 中調用 joinGame()**
- 使用現有 `GameApiClient` 實例 (透過 DI Container 注入)
- 調用時機: GameLobby.vue 點擊「Find Match」按鈕
- 錯誤處理: try-catch 捕獲錯誤,顯示錯誤訊息並重置大廳狀態

✅ **儲存 session_token 於 sessionStorage**
- 用於判斷是否為重連情境
- 路由守衛可檢查 sessionStorage 跳過大廳

**決策理由**:
- 使用現有 API 客戶端,無需新增檔案
- 符合單一職責原則 (GameApiClient 負責所有 API 通訊)
- sessionStorage 與現有模式一致 (gameMode 也存於此)

**替代方案 (已拒絕)**:
- ❌ 新增 gameApi.ts: 重複現有功能,增加維護成本
- ❌ 使用 localStorage: sessionStorage 更適合會話級資料,瀏覽器關閉自動清除

---

## 4. 現有重連機制

### 發現位置
- **重連 Use Case**: `/front-end/src/user-interface/application/use-cases/event-handlers/HandleReconnectionUseCase.ts`
- **SSE 自動重連**: `/front-end/src/user-interface/adapter/sse/GameEventClient.ts` (reconnect 方法)

### GameSnapshotRestore 事件處理

**HandleReconnectionUseCase** 執行流程:

```typescript
execute(snapshot: GameSnapshotRestore): void {
  // 0. 立即中斷所有動畫,清除動畫層狀態
  this.animationPort.interrupt()
  this.animationPort.clearHiddenCards()

  // 1. 靜默恢復完整遊戲狀態（無動畫）
  this.updateUIState.restoreGameState(snapshot)

  // 2. 顯示「連線已恢復」提示訊息
  this.notification.showReconnectionMessage()

  // 3. 恢復操作倒數（如果有）
  this.notification.startActionCountdown(snapshot.action_timeout_seconds)
}
```

### SSE 自動重連機制

- **觸發時機**: `eventSource.onerror` 事件
- **重連策略**: 指數退避 (1s, 2s, 4s, 8s, 16s)
- **最大嘗試次數**: 5 次
- **失敗回調**: `onConnectionFailedCallback()`

### 設計決策

✅ **路由守衛跳過大廳**
- 在 `beforeEnter` 守衛中檢查 sessionStorage 的 `session_token`
- 若存在 → 判斷為重連 → 直接導航至 `/game`
- 重連流程: HomePage → (點擊 Start Game) → 守衛檢測 → 自動進入 /game

✅ **GamePage.vue 自動調用 joinGame(session_token)**
- 若 sessionStorage 有 session_token,mounted 時自動調用 `joinGame(session_token)`
- 後端返回 GameSnapshotRestore 事件 → HandleReconnectionUseCase 恢復狀態

**決策理由**:
- 遵循現有重連流程 (GameSnapshotRestore → HandleReconnectionUseCase)
- 守衛邏輯簡單清晰,易於測試
- 使用者體驗佳: 重連後直接回到遊戲,無需經過大廳

**注意事項**:
- ⚠️ 確保 session_token 過期時清除 sessionStorage,避免無效重連嘗試

---

## 5. 現有動畫模式 (@vueuse/motion)

### 發現位置
- **動畫適配器**: `/front-end/src/user-interface/adapter/animation/AnimationPortAdapter.ts`
- **動畫 Store**: `/front-end/src/user-interface/adapter/stores/animationLayerStore.ts`
- **Zone 註冊表**: `/front-end/src/user-interface/adapter/animation/ZoneRegistry.ts`

### 架構模式

- **AnimationPort** (Output Port): 定義動畫介面
- **AnimationPortAdapter**: 實作 AnimationPort,整合 @vueuse/motion
- **ZoneRegistry**: 管理動畫區域 (如 playerZone, opponentZone)
- **animationLayerStore**: 追蹤動畫狀態,防止衝突

### 設計決策

✅ **ActionPanel 使用 @vueuse/motion 滑出動畫**
- 使用 `v-motion` 指令或 `useMotion()` composable
- 動畫效果: `translateX(100%) → translateX(0)` (從右側滑出)
- 動畫時長: 300ms (符合 60fps 要求)

✅ **不整合 AnimationPort**
- ActionPanel 動畫為純 UI 效果,不涉及遊戲狀態
- 直接在組件中使用 @vueuse/motion,無需透過 Port 抽象

**決策理由**:
- 遵循現有動畫模式 (@vueuse/motion)
- 簡化實作,ActionPanel 動畫無需與遊戲邏輯協調
- 避免過度設計 (YAGNI 原則)

**範例程式碼**:

```vue
<template>
  <div
    v-motion
    :initial="{ x: '100%' }"
    :enter="{ x: 0, transition: { duration: 300 } }"
    :leave="{ x: '100%', transition: { duration: 300 } }"
  >
    <!-- ActionPanel 內容 -->
  </div>
</template>
```

---

## 6. 現有 Pinia Store 結構

### 發現位置
- **Store 目錄**: `/front-end/src/user-interface/adapter/stores/`
- **現有 Stores**:
  - `gameState.ts` - 遊戲狀態 (卡片、回合、分數)
  - `uiState.ts` - UI 狀態 (模態框、選擇狀態)
  - `animationLayerStore.ts` - 動畫層狀態

### 命名慣例

✅ **統一使用 `*State.ts` 後綴**
- 範例: `gameState.ts`, `uiState.ts`
- 新 store: `matchmakingState.ts` (非 matchmakingStore.ts)

### 架構模式

- **Port Adapter 模式**: Store 實作 Output Port 介面
- **範例**: `GameStatePortAdapter.ts` 實作 `GameStatePort`
- **DI Container**: Stores 透過 DI Container 注入到 Use Cases

### 設計決策

✅ **新增 matchmakingState.ts**
- 職責: 管理配對狀態與 UI 反饋
- 狀態定義:
  ```typescript
  type MatchmakingStatus = 'idle' | 'matchmaking' | 'error'
  ```
- Actions:
  - `startMatchmaking()`: 發起配對,調用 `GameApiClient.joinGame()`
  - `handleGameError()`: 處理 GameError 事件 (由 HandleGameErrorUseCase 調用)
  - `resetToIdle()`: 重置為初始狀態
- **UX 倒數計時**: 在 store 中管理倒數秒數 (純顯示用途，無業務邏輯)

✅ **不整合至 gameState.ts**
- 配對邏輯與遊戲狀態分離,符合單一職責原則
- gameState.ts 已處理遊戲內狀態,不應混入配對邏輯

**決策理由**:
- 遵循現有命名慣例
- 單一職責原則: 每個 store 處理獨立關注點
- 易於測試: matchmakingState 可獨立測試,無需依賴 gameState

---

## 7. 現有組件架構

### 發現位置
- **Views**: `/front-end/src/views/` (HomePage.vue, GamePage.vue)
- **Components**: `/front-end/src/components/` (NavigationBar.vue, HeroSection.vue 等)

### 現有組件
- `HomePage.vue`: 首頁 (Hero Section, Rules Section, Footer)
- `GamePage.vue`: 遊戲頁面 (TopInfoBar, 場牌區, 手牌區等)
- `NavigationBar.vue`: 導航列

### 設計決策

✅ **新增 ActionPanel.vue 於 /front-end/src/components/**
- 設計為可重用組件
- Props:
  ```typescript
  interface Props {
    isOpen: boolean
    items: ActionPanelItem[]
  }

  interface ActionPanelItem {
    id: string
    label: string
    icon?: string
    onClick: () => void
  }
  ```
- Events: `@close` (點擊外部區域或關閉按鈕時觸發)

✅ **新增 GameLobby.vue 於 /front-end/src/views/**
- 職責: 顯示配對 UI,處理配對流程
- 組件結構:
  - 「Find Match」按鈕
  - 配對狀態提示 (「Finding match... 27s」- 純 UX 倒數)
  - 錯誤訊息顯示 (來自 GameError 事件)
  - 整合 ActionPanel

✅ **修改 HomePage.vue**
- 「Start Game」按鈕導航至 `/lobby` (原本直接進入 `/game`)

✅ **修改 GamePage.vue**
- 整合 ActionPanel,提供「Leave Game」選項

**決策理由**:
- ActionPanel 可重用於 GameLobby 與 GamePage,符合 DRY 原則
- GameLobby 為獨立頁面,歸類為 View
- 修改最小化,僅調整導航目標與新增 ActionPanel

---

## 8. DI Container 與依賴注入

### 發現位置
- **DI Container**: `/front-end/src/user-interface/adapter/di/container.ts`
- **Token 定義**: `/front-end/src/user-interface/adapter/di/tokens.ts`
- **註冊邏輯**: `/front-end/src/user-interface/adapter/di/registry.ts`

### 註冊流程

```
1. registerStores()          - 註冊 Pinia Stores
2. registerOutputPorts()     - 註冊 Output Ports (GameStatePort, UIStatePort 等)
3. registerModeAdapters()    - 註冊 SendCommandPort (Mock/Backend/Local)
4. registerInputPorts()      - 註冊 Use Cases
5. registerEventRoutes()     - 綁定事件到 Use Cases
6. initializeSSEClient()     - 初始化 SSE 客戶端 (backend 模式)
```

### 設計決策

✅ **新增 matchmakingState 註冊至 DI Container**
- 在 `registerStores()` 中註冊
- Token: `TOKENS.MatchmakingState`

✅ **新增 HandleGameErrorUseCase 註冊**
- 在 `registerInputPorts()` 中註冊
- Token: `TOKENS.HandleGameErrorPort`
- 依賴: `MatchmakingStatePort`, `NotificationPort`

✅ **GameLobby.vue 透過 DI Container 取得依賴**
- `container.resolve(TOKENS.MatchmakingState)`
- `container.resolve(TOKENS.GameApiClient)`

**決策理由**:
- 遵循現有 DI 模式,所有依賴透過 Container 管理
- 易於測試: 可注入 Mock 依賴
- 符合依賴反轉原則 (Dependency Inversion Principle)

---

## 9. 新事件設計: GameError (遊戲層級錯誤)

### 設計動機

現有 `TurnError` 處理**回合級錯誤** (打牌、選擇、決策錯誤)，但缺少**遊戲層級錯誤**處理機制 (配對超時、連線問題、遊戲過期等)。

### 事件對比

| 事件 | 層級 | 用途 | 範例 |
|------|------|------|------|
| **TurnError** | 回合級 | 玩家操作錯誤 | INVALID_CARD, WRONG_PLAYER, INVALID_STATE |
| **GameError** | 遊戲級 | 遊戲會話錯誤 | MATCHMAKING_TIMEOUT, CONNECTION_LOST, GAME_EXPIRED |

### GameError 事件規格 (提案)

```typescript
{
  event: "GameError",
  event_id: number,
  timestamp: string,
  error_code: "MATCHMAKING_TIMEOUT" | "CONNECTION_LOST" | "GAME_EXPIRED" | "OPPONENT_DISCONNECTED" | "SERVER_MAINTENANCE",
  message: string,               // 人類可讀的錯誤訊息 (繁體中文)
  recoverable: boolean,          // 是否可恢復 (true: 可重試, false: 必須返回首頁)
  suggested_action?: "RETRY_MATCHMAKING" | "RETURN_HOME" | "RECONNECT"  // 建議使用者操作
}
```

### 錯誤碼定義

| error_code | recoverable | suggested_action | 說明 |
|------------|-------------|------------------|------|
| `MATCHMAKING_TIMEOUT` | true | `RETRY_MATCHMAKING` | 配對超時（30 秒內未找到對手） |
| `GAME_EXPIRED` | false | `RETURN_HOME` | 遊戲會話過期（長時間未操作） |
| `CONNECTION_LOST` | true | `RECONNECT` | 連線中斷（可嘗試重連） |
| `OPPONENT_DISCONNECTED` | false | `RETURN_HOME` | 對手離線（遊戲結束） |
| `SERVER_MAINTENANCE` | false | `RETURN_HOME` | 伺服器維護中 |

### HandleGameErrorUseCase

**位置**: `/front-end/src/user-interface/application/use-cases/event-handlers/HandleGameErrorUseCase.ts`

**職責**:
1. 根據 `error_code` 更新 matchmakingState 狀態
2. 顯示錯誤訊息 (調用 NotificationPort)
3. 若 `recoverable: false`,自動導航回首頁 (清除 sessionStorage)

**範例流程**:

```typescript
execute(event: GameErrorEvent): void {
  // 1. 顯示錯誤訊息
  this.notification.showError(event.message)

  // 2. 根據錯誤類型處理
  switch (event.error_code) {
    case 'MATCHMAKING_TIMEOUT':
      // 重置配對狀態,允許重試
      this.matchmakingState.handleTimeout()
      break

    case 'GAME_EXPIRED':
    case 'OPPONENT_DISCONNECTED':
      // 清除會話,導航回首頁
      this.matchmakingState.clearSession()
      router.push('/')
      break

    // ... 其他錯誤處理
  }
}
```

### 設計決策

✅ **GameError 需加入 protocol.md**
- 作為正式的 SSE 事件類型
- 定義於 `doc/shared/protocol.md` Section V (伺服器事件)

✅ **擴展性設計**
- `error_code` 為開放式枚舉,可隨時新增錯誤類型
- `recoverable` 與 `suggested_action` 提供語意化的錯誤處理指引

**決策理由**:
- **符合 Server Authority**: 所有錯誤判斷由後端決定並推送
- **通用性**: 可處理配對超時、連線問題、遊戲生命週期等各種遊戲級錯誤
- **可擴展性**: 未來新增錯誤類型無需修改前端架構

---

## 決策總結表

| 項目 | 決策 | 理由 |
|------|------|------|
| **路由** | 新增 `/lobby` 路由 + `lobbyPageGuard` | 遵循現有路由守衛模式,重連跳過大廳 |
| **SSE 事件** | 使用現有 EventRouter,監聽 GameStarted | 符合現有事件處理架構 |
| **命令發送** | 使用現有 `GameApiClient.joinGame()` | 無需新增 API 檔案,減少重複 |
| **重連機制** | 路由守衛檢查 session_token 跳過大廳 | 整合現有 HandleReconnectionUseCase |
| **配對超時** | 後端發送 GameError 事件,前端響應 | 符合 Server Authority 原則 |
| **新事件** | 定義 GameError 遊戲層級錯誤事件 | 通用性、可擴展性、符合協議分層 |
| **Use Case** | HandleGameErrorUseCase (通用錯誤處理) | 處理所有遊戲層級錯誤,可擴展 |
| **動畫** | ActionPanel 使用 @vueuse/motion | 遵循現有動畫模式,簡化實作 |
| **Store** | 新增 `matchmakingState.ts` | 命名一致性,單一職責原則 |
| **組件** | ActionPanel 為可重用組件 | DRY 原則,大廳與遊戲皆可使用 |
| **DI** | matchmakingState 註冊至 Container | 遵循現有 DI 模式,易於測試 |

---

## 技術風險與緩解措施

### 風險 1: GameError 事件需後端實作支援
- **風險**: 新事件需後端團隊實作,可能有延遲
- **緩解**: Phase 1 在 contracts/ 中明確定義事件規格,提供完整文檔供後端參考

### 風險 2: 重連時 session_token 過期
- **風險**: 使用者長時間離線,token 已失效
- **緩解**: joinGame(session_token) 失敗時,清除 sessionStorage 並導航回大廳

### 風險 3: ActionPanel 動畫與遊戲動畫衝突
- **風險**: ActionPanel 滑出時,遊戲動畫正在播放
- **緩解**: ActionPanel 動畫獨立於 EventRouter 事件序列化,不影響遊戲邏輯

### 風險 4: 前端倒數計時與後端超時不同步
- **風險**: 前端顯示 0 秒但後端尚未超時,或反之
- **緩解**: 前端倒數僅為 UX 提示,真實超時由後端 GameError 事件決定

---

## 下一步 (Phase 1: Design & Contracts)

1. ✅ 完成所有 NEEDS CLARIFICATION 項目研究
2. ⏭️ 提取實體與值物件 → `data-model.md`
3. ⏭️ 定義 GameError 事件規格 → `/contracts/game-error-event.md`
4. ⏭️ 撰寫 protocol.md 變更提案 → `/contracts/protocol-amendment.md`
5. ⏭️ 撰寫快速入門指南 → `quickstart.md`
6. ⏭️ 更新 Agent Context (`update-agent-context.sh`)

---

**Research Complete** ✅ | **Ready for Phase 1**
