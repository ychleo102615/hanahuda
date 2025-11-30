# Data Model: 遊戲大廳與操作面板

**Branch**: `007-lobby-settings-panel` | **Date**: 2025-11-30
**Phase**: Phase 1 - Design Artifacts
**Input**: Research findings from `research.md`

---

## 1. Events（事件定義）

### 1.1 GameErrorEvent（新增）

遊戲層級錯誤事件，用於處理配對超時、遊戲過期等非回合操作錯誤。

```typescript
/**
 * GameErrorEvent - 遊戲層級錯誤事件
 *
 * @description
 * 由伺服器發送，通知客戶端遊戲層級的錯誤狀況。
 * 與 TurnErrorEvent 的區別：
 * - TurnErrorEvent: 回合操作錯誤（如打牌無效）
 * - GameErrorEvent: 遊戲會話錯誤（如配對超時、遊戲過期）
 *
 * @example
 * ```typescript
 * {
 *   event_type: 'GameError',
 *   event_id: 'evt-1234',
 *   timestamp: '2025-11-30T12:00:00Z',
 *   error_code: 'MATCHMAKING_TIMEOUT',
 *   message: 'Matchmaking timeout after 30 seconds',
 *   recoverable: true,
 *   suggested_action: 'RETRY_MATCHMAKING'
 * }
 * ```
 */
export interface GameErrorEvent {
  /** 事件類型（固定為 'GameError'） */
  readonly event_type: 'GameError'

  /** 事件 ID（唯一識別碼） */
  readonly event_id: string

  /** 事件時間戳（ISO 8601 格式） */
  readonly timestamp: string

  /**
   * 錯誤代碼
   *
   * @example
   * - MATCHMAKING_TIMEOUT: 配對超時（30 秒無配對成功）
   * - GAME_EXPIRED: 遊戲會話過期（長時間無操作）
   * - SESSION_INVALID: 會話 Token 無效
   * - OPPONENT_DISCONNECTED: 對手永久斷線
   */
  readonly error_code:
    | 'MATCHMAKING_TIMEOUT'
    | 'GAME_EXPIRED'
    | 'SESSION_INVALID'
    | 'OPPONENT_DISCONNECTED'

  /**
   * 錯誤訊息（人類可讀）
   *
   * @example
   * 'Matchmaking timeout, please retry'
   */
  readonly message: string

  /**
   * 錯誤是否可恢復
   *
   * @description
   * - true: 使用者可重試（如配對超時）
   * - false: 不可恢復，需返回首頁（如會話無效）
   */
  readonly recoverable: boolean

  /**
   * 建議的使用者操作（可選）
   *
   * @example
   * - RETRY_MATCHMAKING: 重試配對
   * - RETURN_HOME: 返回首頁
   * - RECONNECT: 嘗試重連
   */
  readonly suggested_action?: 'RETRY_MATCHMAKING' | 'RETURN_HOME' | 'RECONNECT'
}
```

---

### 1.2 GameStartedEvent（現有，參考用）

```typescript
/**
 * GameStartedEvent - 遊戲開始事件
 *
 * @description
 * 配對成功後，伺服器發送此事件通知遊戲開始。
 * 客戶端收到後，從 Lobby 導航至 GamePage。
 *
 * @source front-end/src/user-interface/application/types/events.ts
 */
export interface GameStartedEvent {
  readonly event_type: 'GameStarted'
  readonly event_id: string
  readonly timestamp: string
  readonly game_id: string
  readonly players: ReadonlyArray<PlayerInfo>
  readonly ruleset: Ruleset
  readonly starting_player_id: string
}
```

---

### 1.3 GameSnapshotRestore（現有，參考用）

```typescript
/**
 * GameSnapshotRestore - 遊戲快照恢復
 *
 * @description
 * 斷線重連時，伺服器發送完整遊戲狀態快照。
 * 客戶端收到後，直接恢復到 GamePage（跳過 Lobby）。
 *
 * @source front-end/src/user-interface/application/types/events.ts
 */
export interface GameSnapshotRestore {
  readonly game_id: string
  readonly players: ReadonlyArray<PlayerInfo>
  readonly ruleset: Ruleset
  readonly field_cards: ReadonlyArray<string>
  readonly player_hand: ReadonlyArray<string>
  readonly opponent_hand_count: number
  readonly player_depository: ReadonlyArray<string>
  readonly opponent_depository: ReadonlyArray<string>
  readonly deck_remaining: number
  readonly player_score: number
  readonly opponent_score: number
  readonly player_yaku: ReadonlyArray<YakuScore>
  readonly opponent_yaku: ReadonlyArray<YakuScore>
  readonly current_turn_player_id: string
  readonly dealer_id: string
  readonly flow_state: FlowState
  readonly drawn_card: string | null
  readonly possible_target_card_ids: ReadonlyArray<string>
}
```

---

## 2. Input Ports（輸入埠）

### 2.1 HandleGameErrorPort（新增）

```typescript
/**
 * HandleGameErrorPort - Input Port
 *
 * @description
 * 處理 GameError 事件的 Use Case 介面。
 * 由 Application Layer 定義，Use Case 實作。
 * EventRouter 呼叫此 Port 處理 GameError 事件。
 *
 * @example
 * ```typescript
 * // EventRouter 中註冊
 * this.handlers.set('GameError', this.handleGameErrorPort)
 *
 * // 事件到達時呼叫
 * const handler = this.handlers.get(event.event_type)
 * handler.execute(event as GameErrorEvent)
 * ```
 */
export interface HandleGameErrorPort {
  /**
   * 執行 GameError 事件處理邏輯
   *
   * @param event - GameError 事件
   *
   * @description
   * 處理流程：
   * 1. 顯示錯誤通知（NotificationPort）
   * 2. 更新配對狀態為 'error'（MatchmakingStatePort）
   * 3. 若不可恢復，清除會話並導航回首頁
   */
  execute(event: GameErrorEvent): void
}
```

---

### 2.2 HandleGameStartedPort（現有，參考用）

```typescript
/**
 * HandleGameStartedPort - Input Port
 *
 * @description
 * 處理 GameStarted 事件的 Use Case 介面。
 * 配對成功後，導航至遊戲畫面。
 *
 * @source front-end/src/user-interface/application/ports/input/event-handlers.port.ts
 */
export interface HandleGameStartedPort {
  execute(event: GameStartedEvent): void
}
```

---

### 2.3 HandleReconnectionPort（現有，參考用）

```typescript
/**
 * HandleReconnectionPort - Input Port
 *
 * @description
 * 處理斷線重連的快照恢復邏輯。
 * 收到 GameSnapshotRestore 後，直接恢復到遊戲畫面（跳過 Lobby）。
 *
 * @source front-end/src/user-interface/application/ports/input/event-handlers.port.ts
 */
export interface HandleReconnectionPort {
  execute(snapshot: GameSnapshotRestore): void
}
```

---

## 3. Output Ports（輸出埠）

### 3.1 MatchmakingStatePort（新增）

```typescript
/**
 * MatchmakingStatePort - Output Port
 *
 * @description
 * 由 Application Layer 定義，Adapter Layer 實作。
 * 負責管理配對階段的 UI 狀態（大廳畫面）。
 *
 * 與 GameStatePort 的區別：
 * - MatchmakingStatePort: 遊戲會話建立前的配對狀態
 * - GameStatePort: 遊戲會話建立後的遊戲狀態
 *
 * 生命週期：
 * - 建立: 進入 /lobby 路由時
 * - 銷毀: GameStarted 事件後（進入 /game）
 *
 * @example
 * ```typescript
 * // Adapter Layer 實作（使用 Pinia）
 * class PiniaMatchmakingStateAdapter implements MatchmakingStatePort {
 *   constructor(private matchmakingStore: MatchmakingStateStore) {}
 *
 *   setStatus(status: MatchmakingStatus): void {
 *     this.matchmakingStore.status = status
 *   }
 *
 *   setSessionToken(token: string | null): void {
 *     this.matchmakingStore.sessionToken = token
 *   }
 *
 *   setErrorMessage(message: string | null): void {
 *     this.matchmakingStore.errorMessage = message
 *   }
 *
 *   clearSession(): void {
 *     this.matchmakingStore.sessionToken = null
 *     this.matchmakingStore.status = 'idle'
 *     this.matchmakingStore.errorMessage = null
 *   }
 * }
 * ```
 */
export interface MatchmakingStatePort {
  /**
   * 設定配對狀態
   *
   * @param status - 配對狀態
   *
   * @example
   * ```typescript
   * matchmakingState.setStatus('finding') // 配對中
   * matchmakingState.setStatus('error')   // 錯誤
   * matchmakingState.setStatus('idle')    // 重置為初始狀態
   * ```
   */
  setStatus(status: MatchmakingStatus): void

  /**
   * 設定會話 Token
   *
   * @param token - 會話 Token，清除時傳入 null
   *
   * @description
   * GameRequestJoin 成功後，伺服器返回 session_token。
   * 保存此 token 用於後續遊戲會話識別。
   *
   * @example
   * ```typescript
   * matchmakingState.setSessionToken('session-abc123')
   * matchmakingState.setSessionToken(null) // 清除
   * ```
   */
  setSessionToken(token: string | null): void

  /**
   * 設定錯誤訊息
   *
   * @param message - 錯誤訊息，清除時傳入 null
   *
   * @example
   * ```typescript
   * matchmakingState.setErrorMessage('Matchmaking timeout, please retry')
   * matchmakingState.setErrorMessage(null) // 清除錯誤
   * ```
   */
  setErrorMessage(message: string | null): void

  /**
   * 清除會話狀態
   *
   * @description
   * 重置所有配對相關狀態：
   * - status → 'idle'
   * - sessionToken → null
   * - errorMessage → null
   *
   * 使用時機：
   * - 返回首頁時
   * - 不可恢復的錯誤發生時
   *
   * @example
   * ```typescript
   * matchmakingState.clearSession()
   * ```
   */
  clearSession(): void
}

/**
 * MatchmakingStatus - 配對狀態列舉
 */
export type MatchmakingStatus =
  | 'idle'      // 初始狀態（顯示 "Find Match" 按鈕）
  | 'finding'   // 配對中（顯示 "Finding match..." 載入提示）
  | 'error'     // 錯誤狀態（顯示錯誤訊息）
```

---

### 3.2 NotificationPort（現有，參考用）

```typescript
/**
 * NotificationPort - Output Port
 *
 * @description
 * 負責顯示通知訊息（成功、錯誤、警告等）。
 *
 * @source front-end/src/user-interface/application/ports/output/notification.port.ts
 */
export interface NotificationPort {
  showSuccess(message: string): void
  showError(message: string): void
  showWarning(message: string): void
  showInfo(message: string): void
}
```

---

### 3.3 NavigationPort（新增，需確認是否已存在）

```typescript
/**
 * NavigationPort - Output Port
 *
 * @description
 * 負責路由導航操作。
 * 由 Application Layer 定義，Adapter Layer 使用 Vue Router 實作。
 *
 * @example
 * ```typescript
 * // Adapter Layer 實作
 * class VueRouterNavigationAdapter implements NavigationPort {
 *   constructor(private router: Router) {}
 *
 *   navigateToLobby(): void {
 *     this.router.push({ name: 'lobby' })
 *   }
 *
 *   navigateToGame(): void {
 *     this.router.push({ name: 'game' })
 *   }
 *
 *   navigateToHome(): void {
 *     this.router.push({ name: 'home' })
 *   }
 * }
 * ```
 */
export interface NavigationPort {
  /**
   * 導航至遊戲大廳
   */
  navigateToLobby(): void

  /**
   * 導航至遊戲畫面
   */
  navigateToGame(): void

  /**
   * 導航至首頁
   */
  navigateToHome(): void
}
```

---

## 4. Use Cases（使用案例）

### 4.1 HandleGameErrorUseCase（新增）

```typescript
/**
 * HandleGameErrorUseCase - Use Case
 *
 * @description
 * 實作 HandleGameErrorPort，處理 GameError 事件。
 *
 * 依賴的 Output Ports：
 * - NotificationPort: 顯示錯誤通知
 * - MatchmakingStatePort: 更新配對狀態
 * - NavigationPort: 導航回首頁（若不可恢復）
 *
 * @example
 * ```typescript
 * // DI Container 註冊
 * const handleGameErrorUseCase = new HandleGameErrorUseCase(
 *   notificationPort,
 *   matchmakingStatePort,
 *   navigationPort
 * )
 * ```
 */
export class HandleGameErrorUseCase implements HandleGameErrorPort {
  constructor(
    private readonly notification: NotificationPort,
    private readonly matchmakingState: MatchmakingStatePort,
    private readonly navigation: NavigationPort
  ) {}

  execute(event: GameErrorEvent): void {
    // 1. 顯示錯誤通知
    this.notification.showError(event.message)

    // 2. 更新配對狀態為錯誤
    this.matchmakingState.setStatus('error')
    this.matchmakingState.setErrorMessage(event.message)

    // 3. 若不可恢復，清除會話並導航回首頁
    if (!event.recoverable) {
      this.matchmakingState.clearSession()
      this.navigation.navigateToHome()
      return
    }

    // 4. 可恢復的錯誤，根據 suggested_action 處理
    if (event.suggested_action === 'RETURN_HOME') {
      this.matchmakingState.clearSession()
      this.navigation.navigateToHome()
    }
    // 若 suggested_action 為 'RETRY_MATCHMAKING'，則保持在大廳（使用者可手動重試）
  }
}
```

---

### 4.2 HandleGameStartedUseCase（修改現有）

```typescript
/**
 * HandleGameStartedUseCase - Use Case
 *
 * @description
 * 實作 HandleGameStartedPort，處理 GameStarted 事件。
 *
 * 新增依賴：
 * - MatchmakingStatePort: 清除配對狀態（因為已成功配對）
 *
 * @example
 * ```typescript
 * const handleGameStartedUseCase = new HandleGameStartedUseCase(
 *   gameStatePort,
 *   navigationPort,
 *   matchmakingStatePort // 新增
 * )
 * ```
 */
export class HandleGameStartedUseCase implements HandleGameStartedPort {
  constructor(
    private readonly gameState: GameStatePort,
    private readonly navigation: NavigationPort,
    private readonly matchmakingState: MatchmakingStatePort // 新增依賴
  ) {}

  execute(event: GameStartedEvent): void {
    // 1. 初始化遊戲上下文
    this.gameState.initializeGameContext(
      event.game_id,
      event.players,
      event.ruleset
    )

    // 2. 清除配對狀態（NEW）
    this.matchmakingState.clearSession()

    // 3. 導航至遊戲畫面
    this.navigation.navigateToGame()
  }
}
```

---

### 4.3 HandleReconnectionUseCase（修改現有）

```typescript
/**
 * HandleReconnectionUseCase - Use Case
 *
 * @description
 * 實作 HandleReconnectionPort，處理斷線重連快照恢復。
 *
 * 重點：斷線重連時，直接恢復到遊戲畫面，不經過 Lobby。
 *
 * 新增依賴：
 * - MatchmakingStatePort: 確保配對狀態已清除（防止殘留）
 *
 * @example
 * ```typescript
 * const handleReconnectionUseCase = new HandleReconnectionUseCase(
 *   gameStatePort,
 *   navigationPort,
 *   matchmakingStatePort // 新增
 * )
 * ```
 */
export class HandleReconnectionUseCase implements HandleReconnectionPort {
  constructor(
    private readonly gameState: GameStatePort,
    private readonly navigation: NavigationPort,
    private readonly matchmakingState: MatchmakingStatePort // 新增依賴
  ) {}

  execute(snapshot: GameSnapshotRestore): void {
    // 1. 清除配對狀態（防止殘留，NEW）
    this.matchmakingState.clearSession()

    // 2. 恢復完整遊戲狀態
    this.gameState.restoreGameState(snapshot)

    // 3. 導航至遊戲畫面（跳過 Lobby）
    this.navigation.navigateToGame()
  }
}
```

---

## 5. Pinia Store State（Adapter Layer）

### 5.1 MatchmakingStateStore（新增）

```typescript
/**
 * MatchmakingStateStore - Pinia Store
 *
 * @description
 * 實作 MatchmakingStatePort 介面的 Pinia Store。
 * 負責管理配對階段的 UI 狀態。
 *
 * @location front-end/src/user-interface/adapter/stores/matchmakingState.ts
 */
import { defineStore } from 'pinia'
import type { MatchmakingStatus } from '@/user-interface/application/ports/output'

interface MatchmakingState {
  /** 配對狀態 */
  status: MatchmakingStatus

  /** 會話 Token（GameRequestJoin 成功後保存） */
  sessionToken: string | null

  /** 錯誤訊息 */
  errorMessage: string | null
}

export const useMatchmakingStateStore = defineStore('matchmakingState', {
  state: (): MatchmakingState => ({
    status: 'idle',
    sessionToken: null,
    errorMessage: null,
  }),

  actions: {
    // === MatchmakingStatePort 實作 ===

    setStatus(status: MatchmakingStatus): void {
      this.status = status
    },

    setSessionToken(token: string | null): void {
      this.sessionToken = token
    },

    setErrorMessage(message: string | null): void {
      this.errorMessage = message
    },

    clearSession(): void {
      this.status = 'idle'
      this.sessionToken = null
      this.errorMessage = null
    },
  },
})
```

---

## 6. Vue Components（Views & Components）

### 6.1 GameLobby.vue（新增）

```typescript
/**
 * GameLobby.vue - 遊戲大廳頁面
 *
 * @description
 * 使用者點擊首頁「Start Game」後進入的中轉畫面。
 * 提供「Find Match」按鈕開始配對，顯示配對狀態。
 *
 * @location front-end/src/views/GameLobby.vue
 *
 * @dependencies
 * - matchmakingStateStore: 讀取配對狀態
 * - GameApiClient: 發送 GameRequestJoin 命令
 * - ActionPanel: 操作面板組件
 *
 * @example
 * ```vue
 * <template>
 *   <div class="lobby-container">
 *     <!-- 配對狀態區 -->
 *     <div v-if="status === 'idle'" class="lobby-idle">
 *       <h2>Ready to Play?</h2>
 *       <p>Click below to find an opponent</p>
 *       <button @click="handleFindMatch">Find Match</button>
 *     </div>
 *
 *     <div v-if="status === 'finding'" class="lobby-finding">
 *       <LoadingSpinner />
 *       <p>Finding match...</p>
 *       <p class="countdown">{{ countdown }}s</p>
 *     </div>
 *
 *     <div v-if="status === 'error'" class="lobby-error">
 *       <ErrorIcon />
 *       <p>{{ errorMessage }}</p>
 *       <button @click="handleRetry">Retry</button>
 *     </div>
 *
 *     <!-- 操作面板 -->
 *     <ActionPanel :context="'lobby'" />
 *   </div>
 * </template>
 * ```
 */

interface GameLobbyProps {
  // 無 props（狀態來自 Pinia store）
}

interface GameLobbyEmits {
  // 無 emits（使用 API client 發送命令）
}

interface GameLobbyData {
  /** UX 用途的倒數計時（純視覺，無實際語意） */
  countdown: number

  /** 倒數計時器 ID */
  countdownTimer: number | null
}

// 主要方法
const methods = {
  /**
   * 處理「Find Match」按鈕點擊
   *
   * @description
   * 1. 發送 GameRequestJoin 命令
   * 2. 保存 session_token
   * 3. 更新狀態為 'finding'
   * 4. 啟動 UX 倒數計時（30 秒）
   */
  async handleFindMatch(): Promise<void>,

  /**
   * 處理重試按鈕點擊
   *
   * @description
   * 清除錯誤狀態，重置為 'idle'，允許使用者重新點擊 Find Match。
   */
  handleRetry(): void,

  /**
   * 啟動 UX 倒數計時
   *
   * @description
   * 純視覺效果，每秒減 1，從 30 倒數至 0。
   * 不具實際應用語意（真正的超時由後端 GameError 事件控制）。
   */
  startCountdown(): void,

  /**
   * 停止倒數計時
   */
  stopCountdown(): void,
}
```

---

### 6.2 ActionPanel.vue（新增）

```typescript
/**
 * ActionPanel.vue - 操作面板組件
 *
 * @description
 * 從螢幕右側滑出的操作面板，根據 context 動態顯示選項。
 *
 * @location front-end/src/components/ActionPanel.vue
 *
 * @props
 * - context: 'lobby' | 'game' - 決定顯示哪些操作選項
 *
 * @dependencies
 * - @vueuse/motion: 滑動動畫
 * - Vue Router: 導航操作
 *
 * @example
 * ```vue
 * <!-- 大廳中使用 -->
 * <ActionPanel :context="'lobby'" />
 *
 * <!-- 遊戲中使用 -->
 * <ActionPanel :context="'game'" />
 * ```
 *
 * @design
 * ```vue
 * <template>
 *   <!-- 選單按鈕（漢堡選單圖示） -->
 *   <button @click="togglePanel" class="menu-button">
 *     <MenuIcon />
 *   </button>
 *
 *   <!-- 半透明遮罩（點擊關閉面板） -->
 *   <div
 *     v-if="isOpen"
 *     class="overlay"
 *     @click="closePanel"
 *   ></div>
 *
 *   <!-- 面板本體（從右側滑入） -->
 *   <div
 *     v-if="isOpen"
 *     v-motion
 *     :initial="{ x: 300 }"
 *     :enter="{ x: 0, transition: { duration: 300 } }"
 *     :leave="{ x: 300, transition: { duration: 300 } }"
 *     class="action-panel"
 *   >
 *     <!-- 關閉按鈕 -->
 *     <button @click="closePanel" class="close-button">
 *       <CloseIcon />
 *     </button>
 *
 *     <!-- 操作選項列表 -->
 *     <ul class="action-list">
 *       <!-- 大廳專屬選項 -->
 *       <li v-if="context === 'lobby'" @click="handleBackToHome">
 *         <HomeIcon /> Back to Home
 *       </li>
 *
 *       <!-- 遊戲中專屬選項 -->
 *       <li v-if="context === 'game'" @click="handleLeaveGame">
 *         <ExitIcon /> Leave Game
 *       </li>
 *       <li v-if="context === 'game'" @click="handleBackToHome">
 *         <HomeIcon /> Back to Home
 *       </li>
 *
 *       <!-- 未來擴充選項（示例） -->
 *       <!-- <li @click="handleSettings">
 *         <SettingsIcon /> Settings
 *       </li> -->
 *     </ul>
 *   </div>
 *
 *   <!-- 確認對話框（Leave Game 使用） -->
 *   <ConfirmDialog
 *     v-if="showConfirmDialog"
 *     title="Leave Game?"
 *     message="The game will end if you leave. Are you sure?"
 *     @confirm="confirmLeaveGame"
 *     @cancel="cancelLeaveGame"
 *   />
 * </template>
 * ```
 */

interface ActionPanelProps {
  /** 面板上下文（決定顯示哪些選項） */
  context: 'lobby' | 'game'
}

interface ActionPanelData {
  /** 面板是否開啟 */
  isOpen: boolean

  /** 是否顯示確認對話框 */
  showConfirmDialog: boolean
}

const methods = {
  /**
   * 切換面板開關
   */
  togglePanel(): void,

  /**
   * 關閉面板
   */
  closePanel(): void,

  /**
   * 處理「Back to Home」
   *
   * @description
   * - 若在大廳且正在配對（status === 'finding'），先取消配對
   * - 清除 matchmakingState
   * - 導航至首頁
   */
  handleBackToHome(): void,

  /**
   * 處理「Leave Game」
   *
   * @description
   * 顯示確認對話框，防止誤觸。
   */
  handleLeaveGame(): void,

  /**
   * 確認退出遊戲
   *
   * @description
   * 1. 發送 GameLeave 命令（若需要，待確認是否有此命令）
   * 2. 清除遊戲狀態
   * 3. 導航至首頁
   */
  confirmLeaveGame(): void,

  /**
   * 取消退出遊戲
   */
  cancelLeaveGame(): void,
}
```

---

## 7. Router Configuration（路由配置）

### 7.1 新增 /lobby 路由

```typescript
/**
 * Router Configuration
 *
 * @location front-end/src/router/index.ts
 *
 * @modifications
 * 1. 新增 /lobby 路由
 * 2. 新增 lobbyPageGuard（防止斷線重連時誤入大廳）
 * 3. 修改 HomePage.vue 的「Start Game」導航至 /lobby
 */

import { createRouter, createWebHistory } from 'vue-router'
import { gamePageGuard, lobbyPageGuard } from '@/user-interface/adapter/router/guards'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/views/HomePage.vue'),
    },
    {
      path: '/lobby',  // 新增
      name: 'lobby',
      component: () => import('@/views/GameLobby.vue'),
      beforeEnter: lobbyPageGuard,  // 新增守衛
    },
    {
      path: '/game',
      name: 'game',
      component: () => import('@/views/GamePage.vue'),
      beforeEnter: gamePageGuard,
    },
  ],
})

export default router
```

---

### 7.2 lobbyPageGuard（新增）

```typescript
/**
 * lobbyPageGuard - 路由守衛
 *
 * @description
 * 防止使用者在不適當的情況下進入大廳。
 *
 * 規則：
 * - 若 gameState 已初始化（game_id 存在），代表遊戲會話已建立
 *   → 重定向至 /game（可能是重連或誤導航）
 * - 否則允許進入大廳
 *
 * @location front-end/src/user-interface/adapter/router/guards/lobbyPageGuard.ts
 *
 * @example
 * ```typescript
 * import type { NavigationGuardNext, RouteLocationNormalized } from 'vue-router'
 * import { useGameStateStore } from '@/user-interface/adapter/stores/gameState'
 *
 * export function lobbyPageGuard(
 *   to: RouteLocationNormalized,
 *   from: RouteLocationNormalized,
 *   next: NavigationGuardNext
 * ): void {
 *   const gameState = useGameStateStore()
 *
 *   // 若遊戲會話已建立，重定向至遊戲畫面
 *   if (gameState.gameId) {
 *     console.warn('Game session exists, redirecting to /game')
 *     next({ name: 'game' })
 *     return
 *   }
 *
 *   // 允許進入大廳
 *   next()
 * }
 * ```
 */
```

---

### 7.3 gamePageGuard（修改現有）

```typescript
/**
 * gamePageGuard - 路由守衛（修改現有）
 *
 * @description
 * 防止使用者在未配對成功時進入遊戲畫面。
 *
 * 新增規則：
 * - 若 gameState 未初始化（game_id 不存在）
 *   → 重定向至 /lobby（而非 /home）
 *
 * @location front-end/src/user-interface/adapter/router/guards/gamePageGuard.ts (現有)
 *
 * @example
 * ```typescript
 * export function gamePageGuard(
 *   to: RouteLocationNormalized,
 *   from: RouteLocationNormalized,
 *   next: NavigationGuardNext
 * ): void {
 *   const gameState = useGameStateStore()
 *
 *   // 若遊戲會話不存在，重定向至大廳（NEW: 改為 /lobby）
 *   if (!gameState.gameId) {
 *     console.warn('No game session, redirecting to /lobby')
 *     next({ name: 'lobby' })  // 修改：原為 'home'
 *     return
 *   }
 *
 *   // 允許進入遊戲畫面
 *   next()
 * }
 * ```
 */
```

---

## 8. API Client（現有，語意確認）

### 8.1 GameApiClient.joinGame()

```typescript
/**
 * GameApiClient.joinGame() - 發送 GameRequestJoin 命令
 *
 * @location front-end/src/user-interface/adapter/api/GameApiClient.ts (現有)
 *
 * @description
 * 發送 POST /api/v1/games/join 請求，請求伺服器配對。
 *
 * @param sessionToken - 可選，重連時提供
 * @returns Promise<JoinGameResponse>
 *
 * @example
 * ```typescript
 * // 首次配對（無 session_token）
 * const response = await gameApiClient.joinGame()
 * matchmakingState.setSessionToken(response.session_token)
 *
 * // 重連時（提供 session_token）
 * const response = await gameApiClient.joinGame(existingToken)
 * ```
 */
async joinGame(sessionToken?: string): Promise<JoinGameResponse>

interface JoinGameResponse {
  game_id: string
  session_token: string
  player_id: string
  snapshot: GameSnapshotRestore | null  // 重連時有值
}
```

---

## 9. DI Container Configuration（依賴注入配置）

### 9.1 新增 Output Port 實作註冊

```typescript
/**
 * DI Container Configuration
 *
 * @location front-end/src/user-interface/adapter/di/container.ts
 *
 * @modifications
 * 1. 註冊 MatchmakingStatePort 實作
 * 2. 註冊 NavigationPort 實作
 * 3. 更新 HandleGameStartedUseCase 依賴
 * 4. 更新 HandleReconnectionUseCase 依賴
 * 5. 新增 HandleGameErrorUseCase 註冊
 */

import { useMatchmakingStateStore } from '@/user-interface/adapter/stores/matchmakingState'
import type {
  MatchmakingStatePort,
  NavigationPort,
} from '@/user-interface/application/ports/output'

// === Output Ports 實作 ===

// MatchmakingStatePort 實作
const matchmakingStatePort: MatchmakingStatePort = {
  setStatus: (status) => useMatchmakingStateStore().setStatus(status),
  setSessionToken: (token) => useMatchmakingStateStore().setSessionToken(token),
  setErrorMessage: (message) => useMatchmakingStateStore().setErrorMessage(message),
  clearSession: () => useMatchmakingStateStore().clearSession(),
}

// NavigationPort 實作
const navigationPort: NavigationPort = {
  navigateToLobby: () => router.push({ name: 'lobby' }),
  navigateToGame: () => router.push({ name: 'game' }),
  navigateToHome: () => router.push({ name: 'home' }),
}

// === Use Cases 註冊 ===

// HandleGameErrorUseCase（新增）
const handleGameErrorUseCase = new HandleGameErrorUseCase(
  notificationPort,
  matchmakingStatePort,
  navigationPort
)

// HandleGameStartedUseCase（修改，新增 matchmakingStatePort 依賴）
const handleGameStartedUseCase = new HandleGameStartedUseCase(
  gameStatePort,
  navigationPort,
  matchmakingStatePort  // 新增
)

// HandleReconnectionUseCase（修改，新增 matchmakingStatePort 依賴）
const handleReconnectionUseCase = new HandleReconnectionUseCase(
  gameStatePort,
  navigationPort,
  matchmakingStatePort  // 新增
)
```

---

## 10. EventRouter Configuration（事件路由配置）

### 10.1 註冊 GameError 事件處理器

```typescript
/**
 * EventRouter Configuration
 *
 * @location front-end/src/user-interface/adapter/sse/EventRouter.ts (或類似位置)
 *
 * @modifications
 * 註冊 'GameError' 事件對應的 HandleGameErrorPort
 */

import type { HandleGameErrorPort } from '@/user-interface/application/ports/input'

class EventRouter {
  private handlers: Map<string, any>

  constructor(
    // ... 現有依賴
    private handleGameErrorPort: HandleGameErrorPort  // 新增
  ) {
    this.handlers = new Map()
    this.registerHandlers()
  }

  private registerHandlers(): void {
    // ... 現有事件註冊
    this.handlers.set('GameStarted', this.handleGameStartedPort)
    this.handlers.set('GameError', this.handleGameErrorPort)  // 新增
    // ...
  }

  handleEvent(event: SSEEvent): void {
    const handler = this.handlers.get(event.event_type)
    if (!handler) {
      console.warn(`No handler for event type: ${event.event_type}`)
      return
    }
    handler.execute(event)
  }
}
```

---

## Summary

本 data-model.md 定義了實作「遊戲大廳與操作面板」功能所需的所有數據模型、介面與架構設計。

### 核心設計決策

1. **獨立 MatchmakingStatePort**：
   - 與 GameStatePort 分離（配對階段 vs 遊戲階段）
   - 單一職責原則

2. **GameError 事件**：
   - 由後端發送（Server Authority 原則）
   - 前端倒數計時純 UX，無應用語意

3. **Clean Architecture 分層**：
   - Input Ports: Handle* prefix, execute() method
   - Output Ports: 細粒度方法，由 Application Layer 定義
   - Use Cases: 實作 Input Ports，依賴 Output Ports

4. **路由守衛邏輯**：
   - lobbyPageGuard: 防止遊戲會話已建立時誤入大廳
   - gamePageGuard: 未配對成功時重定向至大廳（而非首頁）

5. **ActionPanel 可擴展設計**：
   - 根據 context prop 動態顯示選項
   - 未來可新增 'Settings', 'Rules' 等選項

### 下一步

- Phase 1: 定義 GameError 事件規格（contracts/game-error-event.md）
- Phase 1: 建立 quickstart.md
- Phase 1: 執行 update-agent-context.sh
- Phase 2: /speckit.tasks（生成 tasks.md）
