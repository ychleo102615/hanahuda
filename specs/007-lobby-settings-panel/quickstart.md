# Quickstart: 遊戲大廳與操作面板實作指南

**Branch**: `007-lobby-settings-panel` | **Date**: 2025-11-30
**Feature**: 遊戲大廳與操作面板
**Estimated Time**: 6-8 hours

---

## 實作順序建議

本功能採用 **由內而外** 的實作順序（Clean Architecture 原則）：

```
Phase A: Application Layer（核心邏輯）
  ├─ 1. 定義 Output Ports
  ├─ 2. 定義 Input Ports
  └─ 3. 實作 Use Cases

Phase B: Adapter Layer（外部整合）
  ├─ 4. Pinia Store（實作 Output Ports）
  ├─ 5. Router Guards（路由守衛）
  └─ 6. DI Container（依賴注入配置）

Phase C: UI Layer（使用者介面）
  ├─ 7. ActionPanel Component（可重用組件）
  ├─ 8. GameLobby View（大廳頁面）
  └─ 9. 整合至 GamePage 與 HomePage

Phase D: Testing & Integration
  ├─ 10. 單元測試（Use Cases、Stores）
  ├─ 11. 組件測試（Vue 組件）
  └─ 12. 整合測試（完整流程）
```

---

## Phase A: Application Layer

### 1. 定義 Output Ports

**檔案**: `front-end/src/user-interface/application/ports/output/matchmaking-state.port.ts`

```typescript
export interface MatchmakingStatePort {
  setStatus(status: MatchmakingStatus): void
  setSessionToken(token: string | null): void
  setErrorMessage(message: string | null): void
  clearSession(): void
}

export type MatchmakingStatus = 'idle' | 'finding' | 'error'
```

**檔案**: `front-end/src/user-interface/application/ports/output/navigation.port.ts`

```typescript
export interface NavigationPort {
  navigateToLobby(): void
  navigateToGame(): void
  navigateToHome(): void
}
```

**更新**: `front-end/src/user-interface/application/ports/output/index.ts`

```typescript
export type { MatchmakingStatePort } from './matchmaking-state.port'
export type { NavigationPort } from './navigation.port'
```

---

### 2. 定義 Input Ports

**檔案**: `front-end/src/user-interface/application/types/events.ts`

新增 GameErrorEvent 介面：

```typescript
export interface GameErrorEvent {
  readonly event_type: 'GameError'
  readonly event_id: string
  readonly timestamp: string
  readonly error_code: 'MATCHMAKING_TIMEOUT' | 'GAME_EXPIRED' | 'SESSION_INVALID' | 'OPPONENT_DISCONNECTED'
  readonly message: string
  readonly recoverable: boolean
  readonly suggested_action?: 'RETRY_MATCHMAKING' | 'RETURN_HOME' | 'RECONNECT'
}
```

**檔案**: `front-end/src/user-interface/application/ports/input/event-handlers.port.ts`

```typescript
export interface HandleGameErrorPort {
  execute(event: GameErrorEvent): void
}
```

---

### 3. 實作 Use Cases

**檔案**: `front-end/src/user-interface/application/use-cases/event-handlers/HandleGameErrorUseCase.ts`

```typescript
import type {
  HandleGameErrorPort,
  NotificationPort,
  MatchmakingStatePort,
  NavigationPort,
  GameErrorEvent,
} from '@/user-interface/application/ports'

export class HandleGameErrorUseCase implements HandleGameErrorPort {
  constructor(
    private readonly notification: NotificationPort,
    private readonly matchmakingState: MatchmakingStatePort,
    private readonly navigation: NavigationPort
  ) {}

  execute(event: GameErrorEvent): void {
    this.notification.showError(event.message)
    this.matchmakingState.setStatus('error')
    this.matchmakingState.setErrorMessage(event.message)

    if (!event.recoverable) {
      this.matchmakingState.clearSession()
      this.navigation.navigateToHome()
      return
    }

    if (event.suggested_action === 'RETURN_HOME') {
      this.matchmakingState.clearSession()
      this.navigation.navigateToHome()
    }
  }
}
```

**修改檔案**: `HandleGameStartedUseCase.ts` 與 `HandleReconnectionUseCase.ts`

新增 `MatchmakingStatePort` 依賴，在成功配對/重連後呼叫 `clearSession()`。

---

## Phase B: Adapter Layer

### 4. Pinia Store

**檔案**: `front-end/src/user-interface/adapter/stores/matchmakingState.ts`

```typescript
import { defineStore } from 'pinia'
import type { MatchmakingStatus } from '@/user-interface/application/ports/output'

interface MatchmakingState {
  status: MatchmakingStatus
  sessionToken: string | null
  errorMessage: string | null
}

export const useMatchmakingStateStore = defineStore('matchmakingState', {
  state: (): MatchmakingState => ({
    status: 'idle',
    sessionToken: null,
    errorMessage: null,
  }),

  actions: {
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

### 5. Router Guards

**檔案**: `front-end/src/user-interface/adapter/router/guards/lobbyPageGuard.ts`

```typescript
import type { NavigationGuardNext, RouteLocationNormalized } from 'vue-router'
import { useGameStateStore } from '@/user-interface/adapter/stores/gameState'

export function lobbyPageGuard(
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
  next: NavigationGuardNext
): void {
  const gameState = useGameStateStore()

  if (gameState.gameId) {
    console.warn('[lobbyPageGuard] Game session exists, redirecting to /game')
    next({ name: 'game' })
    return
  }

  next()
}
```

**修改檔案**: `front-end/src/user-interface/adapter/router/guards/gamePageGuard.ts`

將重定向目標從 `'home'` 改為 `'lobby'`：

```typescript
if (!gameState.gameId) {
  console.warn('[gamePageGuard] No game session, redirecting to /lobby')
  next({ name: 'lobby' })  // 修改此行
  return
}
```

**更新檔案**: `front-end/src/router/index.ts`

```typescript
import { lobbyPageGuard } from '@/user-interface/adapter/router/guards'

const router = createRouter({
  routes: [
    // ... existing routes
    {
      path: '/lobby',
      name: 'lobby',
      component: () => import('@/views/GameLobby.vue'),
      beforeEnter: lobbyPageGuard,
    },
  ],
})
```

---

### 6. DI Container

**檔案**: `front-end/src/user-interface/adapter/di/container.ts`

```typescript
import { useMatchmakingStateStore } from '@/user-interface/adapter/stores/matchmakingState'
import { HandleGameErrorUseCase } from '@/user-interface/application/use-cases/event-handlers'

// Output Ports 實作
const matchmakingStatePort: MatchmakingStatePort = {
  setStatus: (status) => useMatchmakingStateStore().setStatus(status),
  setSessionToken: (token) => useMatchmakingStateStore().setSessionToken(token),
  setErrorMessage: (message) => useMatchmakingStateStore().setErrorMessage(message),
  clearSession: () => useMatchmakingStateStore().clearSession(),
}

const navigationPort: NavigationPort = {
  navigateToLobby: () => router.push({ name: 'lobby' }),
  navigateToGame: () => router.push({ name: 'game' }),
  navigateToHome: () => router.push({ name: 'home' }),
}

// Use Cases
const handleGameErrorUseCase = new HandleGameErrorUseCase(
  notificationPort,
  matchmakingStatePort,
  navigationPort
)

// 更新 EventRouter 註冊
eventRouter.registerHandler('GameError', handleGameErrorUseCase)
```

---

## Phase C: UI Layer

### 7. ActionPanel Component

**檔案**: `front-end/src/components/ActionPanel.vue`

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useMatchmakingStateStore } from '@/user-interface/adapter/stores/matchmakingState'
import { useGameStateStore } from '@/user-interface/adapter/stores/gameState'

interface Props {
  context: 'lobby' | 'game'
}

const props = defineProps<Props>()
const router = useRouter()
const matchmakingState = useMatchmakingStateStore()
const gameState = useGameStateStore()

const isOpen = ref(false)
const showConfirmDialog = ref(false)

function togglePanel() {
  isOpen.value = !isOpen.value
}

function closePanel() {
  isOpen.value = false
}

function handleBackToHome() {
  if (props.context === 'lobby' && matchmakingState.status === 'finding') {
    // TODO: 發送取消配對命令（若需要）
  }
  matchmakingState.clearSession()
  router.push({ name: 'home' })
  closePanel()
}

function handleLeaveGame() {
  showConfirmDialog.value = true
}

function confirmLeaveGame() {
  // TODO: 發送 GameLeave 命令（若需要）
  gameState.$reset() // 清除遊戲狀態
  router.push({ name: 'home' })
  showConfirmDialog.value = false
  closePanel()
}

function cancelLeaveGame() {
  showConfirmDialog.value = false
}
</script>

<template>
  <!-- 選單按鈕 -->
  <button @click="togglePanel" class="fixed top-4 right-4 z-40">
    <svg><!-- 漢堡選單圖示 --></svg>
  </button>

  <!-- 遮罩 -->
  <div v-if="isOpen" @click="closePanel" class="fixed inset-0 bg-black/50 z-40"></div>

  <!-- 面板 -->
  <div
    v-if="isOpen"
    v-motion
    :initial="{ x: 300 }"
    :enter="{ x: 0 }"
    class="fixed right-0 top-0 h-full w-64 bg-white shadow-lg z-50"
  >
    <button @click="closePanel" class="absolute top-4 right-4">X</button>

    <ul class="mt-16 space-y-4 px-6">
      <li v-if="context === 'lobby'" @click="handleBackToHome" class="cursor-pointer">
        Back to Home
      </li>
      <li v-if="context === 'game'" @click="handleLeaveGame" class="cursor-pointer">
        Leave Game
      </li>
      <li v-if="context === 'game'" @click="handleBackToHome" class="cursor-pointer">
        Back to Home
      </li>
    </ul>
  </div>

  <!-- 確認對話框 -->
  <div v-if="showConfirmDialog" class="fixed inset-0 flex items-center justify-center z-60">
    <div class="bg-white p-6 rounded shadow-lg">
      <h3>Leave Game?</h3>
      <p>The game will end if you leave. Are you sure?</p>
      <button @click="confirmLeaveGame">Confirm</button>
      <button @click="cancelLeaveGame">Cancel</button>
    </div>
  </div>
</template>
```

---

### 8. GameLobby View

**檔案**: `front-end/src/views/GameLobby.vue`

```vue
<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useMatchmakingStateStore } from '@/user-interface/adapter/stores/matchmakingState'
import { GameApiClient } from '@/user-interface/adapter/api/GameApiClient'
import ActionPanel from '@/components/ActionPanel.vue'

const matchmakingState = useMatchmakingStateStore()
const { status, errorMessage } = storeToRefs(matchmakingState)

const gameApiClient = new GameApiClient()
const countdown = ref(30)
const countdownTimer = ref<number | null>(null)

async function handleFindMatch() {
  try {
    matchmakingState.setStatus('finding')
    matchmakingState.setErrorMessage(null)
    startCountdown()

    const response = await gameApiClient.joinGame()
    matchmakingState.setSessionToken(response.session_token)

    // 等待 GameStarted 事件（由 EventRouter 處理）
  } catch (error) {
    matchmakingState.setStatus('error')
    matchmakingState.setErrorMessage('Failed to join matchmaking')
    stopCountdown()
  }
}

function handleRetry() {
  matchmakingState.setStatus('idle')
  matchmakingState.setErrorMessage(null)
  countdown.value = 30
}

function startCountdown() {
  countdownTimer.value = window.setInterval(() => {
    if (countdown.value > 0) {
      countdown.value--
    } else {
      stopCountdown()
    }
  }, 1000)
}

function stopCountdown() {
  if (countdownTimer.value !== null) {
    clearInterval(countdownTimer.value)
    countdownTimer.value = null
  }
}

onUnmounted(() => {
  stopCountdown()
})
</script>

<template>
  <div class="lobby-container">
    <!-- Idle State -->
    <div v-if="status === 'idle'" class="text-center">
      <h2>Ready to Play?</h2>
      <p>Click below to find an opponent</p>
      <button @click="handleFindMatch" class="btn-primary">Find Match</button>
    </div>

    <!-- Finding State -->
    <div v-if="status === 'finding'" class="text-center">
      <div class="spinner"></div>
      <p>Finding match...</p>
      <p class="text-sm text-gray-500">{{ countdown }}s</p>
    </div>

    <!-- Error State -->
    <div v-if="status === 'error'" class="text-center">
      <p class="text-red-600">{{ errorMessage }}</p>
      <button @click="handleRetry" class="btn-secondary">Retry</button>
    </div>

    <ActionPanel :context="'lobby'" />
  </div>
</template>
```

---

### 9. 整合至現有頁面

**修改檔案**: `front-end/src/views/HomePage.vue`

```vue
<template>
  <div>
    <!-- ... existing content ... -->
    <button @click="handleStartGame">Start Game</button>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

function handleStartGame() {
  router.push({ name: 'lobby' })  // 修改：導航至大廳而非遊戲
}
</script>
```

**修改檔案**: `front-end/src/views/GamePage.vue`

```vue
<template>
  <div>
    <!-- ... existing game content ... -->
    <ActionPanel :context="'game'" />
  </div>
</template>

<script setup lang="ts">
import ActionPanel from '@/components/ActionPanel.vue'
</script>
```

---

## Phase D: Testing

### 10. 單元測試（Use Cases）

**檔案**: `front-end/tests/unit/HandleGameErrorUseCase.spec.ts`

```typescript
import { describe, it, expect, vi } from 'vitest'
import { HandleGameErrorUseCase } from '@/user-interface/application/use-cases/event-handlers'
import type { GameErrorEvent } from '@/user-interface/application/types'

describe('HandleGameErrorUseCase', () => {
  it('should handle MATCHMAKING_TIMEOUT', () => {
    const notificationPort = { showError: vi.fn() }
    const matchmakingStatePort = {
      setStatus: vi.fn(),
      setErrorMessage: vi.fn(),
      clearSession: vi.fn(),
    }
    const navigationPort = { navigateToHome: vi.fn() }

    const useCase = new HandleGameErrorUseCase(
      notificationPort,
      matchmakingStatePort,
      navigationPort
    )

    const event: GameErrorEvent = {
      event_type: 'GameError',
      event_id: 'test-001',
      timestamp: '2025-11-30T12:00:00Z',
      error_code: 'MATCHMAKING_TIMEOUT',
      message: 'Timeout',
      recoverable: true,
      suggested_action: 'RETRY_MATCHMAKING',
    }

    useCase.execute(event)

    expect(notificationPort.showError).toHaveBeenCalledWith('Timeout')
    expect(matchmakingStatePort.setStatus).toHaveBeenCalledWith('error')
    expect(navigationPort.navigateToHome).not.toHaveBeenCalled()
  })
})
```

---

### 11. 組件測試

**檔案**: `front-end/tests/components/ActionPanel.spec.ts`

```typescript
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ActionPanel from '@/components/ActionPanel.vue'

describe('ActionPanel', () => {
  it('should display "Back to Home" in lobby context', () => {
    const wrapper = mount(ActionPanel, {
      props: { context: 'lobby' },
    })

    expect(wrapper.text()).toContain('Back to Home')
    expect(wrapper.text()).not.toContain('Leave Game')
  })

  it('should display "Leave Game" in game context', () => {
    const wrapper = mount(ActionPanel, {
      props: { context: 'game' },
    })

    expect(wrapper.text()).toContain('Leave Game')
    expect(wrapper.text()).toContain('Back to Home')
  })
})
```

---

### 12. 整合測試

手動測試流程：

1. **首頁 → 大廳 → 配對成功**
   - 點擊「Start Game」 → 導航至 `/lobby`
   - 點擊「Find Match」 → 狀態變為 `finding`
   - 等待 GameStarted 事件 → 導航至 `/game`

2. **配對超時處理**
   - 點擊「Find Match」
   - 等待 30 秒（或觸發後端 GameError）
   - 驗證錯誤訊息顯示
   - 驗證可重試

3. **操作面板**
   - 在大廳點擊選單按鈕 → 面板滑出
   - 點擊「Back to Home」 → 導航至首頁
   - 在遊戲中點擊選單按鈕
   - 點擊「Leave Game」 → 顯示確認對話框

4. **斷線重連**
   - 在遊戲中模擬斷線
   - 重連成功 → 直接進入遊戲（跳過大廳）

---

## 常見陷阱

### 1. Port 循環依賴
❌ **錯誤**：Output Port 依賴 Use Case
✅ **正確**：Use Case 依賴 Output Port

### 2. 忘記清除配對狀態
❌ **錯誤**：GameStarted 後 matchmakingState 殘留
✅ **正確**：在 HandleGameStartedUseCase 中呼叫 `clearSession()`

### 3. 路由守衛邏輯錯誤
❌ **錯誤**：gamePageGuard 重定向至 home
✅ **正確**：gamePageGuard 重定向至 lobby

### 4. 倒數計時與實際超時混淆
❌ **錯誤**：前端倒數計時結束時發送錯誤
✅ **正確**：前端倒數僅 UX，實際超時由後端 GameError 控制

---

## 檔案清單

### 新增檔案
```
front-end/src/
├── user-interface/
│   ├── application/
│   │   ├── ports/
│   │   │   ├── output/
│   │   │   │   ├── matchmaking-state.port.ts  ✨
│   │   │   │   └── navigation.port.ts          ✨
│   │   │   └── input/
│   │   │       └── event-handlers.port.ts      (修改)
│   │   ├── types/
│   │   │   └── events.ts                       (修改)
│   │   └── use-cases/
│   │       └── event-handlers/
│   │           └── HandleGameErrorUseCase.ts   ✨
│   └── adapter/
│       ├── stores/
│       │   └── matchmakingState.ts             ✨
│       └── router/
│           └── guards/
│               └── lobbyPageGuard.ts           ✨
├── views/
│   ├── GameLobby.vue                            ✨
│   ├── HomePage.vue                             (修改)
│   └── GamePage.vue                             (修改)
├── components/
│   └── ActionPanel.vue                          ✨
└── router/
    └── index.ts                                 (修改)

tests/
├── unit/
│   └── HandleGameErrorUseCase.spec.ts           ✨
└── components/
    ├── ActionPanel.spec.ts                      ✨
    └── GameLobby.spec.ts                        ✨
```

### 修改檔案
- `HandleGameStartedUseCase.ts` - 新增 matchmakingStatePort 依賴
- `HandleReconnectionUseCase.ts` - 新增 matchmakingStatePort 依賴
- `gamePageGuard.ts` - 重定向目標改為 lobby
- `HomePage.vue` - 「Start Game」導航至 lobby
- `GamePage.vue` - 整合 ActionPanel

---

## 檢查清單

- [ ] 所有 Output Ports 已定義並實作
- [ ] 所有 Input Ports 已定義
- [ ] Use Cases 實作完成，依賴正確注入
- [ ] Pinia Store 已建立並實作 MatchmakingStatePort
- [ ] 路由守衛邏輯正確（lobbyPageGuard, gamePageGuard）
- [ ] ActionPanel 組件可重用，根據 context 動態顯示
- [ ] GameLobby 倒數計時僅 UX，不觸發實際超時
- [ ] EventRouter 已註冊 GameError 事件處理器
- [ ] 單元測試覆蓋率 > 70%
- [ ] 組件測試涵蓋主要互動流程
- [ ] 手動測試所有 User Stories

---

## 預估工時分配

| Phase | 任務 | 時間 |
|-------|------|------|
| A | Application Layer (Ports + Use Cases) | 1.5h |
| B | Adapter Layer (Stores + Guards + DI) | 1.5h |
| C | UI Layer (Components + Views) | 2.5h |
| D | Testing (Unit + Component + Integration) | 2h |
| **Total** | | **7.5h** |

---

## 參考文件

- `specs/007-lobby-settings-panel/spec.md` - 功能規格
- `specs/007-lobby-settings-panel/data-model.md` - 數據模型
- `specs/007-lobby-settings-panel/research.md` - 技術研究
- `specs/007-lobby-settings-panel/contracts/game-error-event.md` - GameError 事件規格
- `doc/readme.md` - Clean Architecture 指南
- `doc/shared/protocol.md` - 通訊協議

---

**Good luck! 🚀**
