# 前端架構總覽

## 技術棧

- **框架**: Nuxt 4 + Vue 3 + TypeScript
- **樣式**: Tailwind CSS v4
- **路由**: Nuxt Router（基於 Vue Router）
- **狀態管理**: Pinia
- **HTTP 客戶端**: $fetch（Nuxt 內置）/ Fetch API
- **SSE 客戶端**: EventSource API
- **動畫**: @vueuse/motion
- **SVG 優化**: vite-plugin-svg-icons
- **構建工具**: Nuxt 4（內建 Vite）

---

## Bounded Context 劃分

前端採用 DDD 的 Bounded Context 概念，目前實作一個主要上下文：

### User Interface BC

**職責**: 遊戲 UI 呈現層

- **Domain Layer**: 前端遊戲邏輯（卡片解析、配對驗證、役種檢測等純函數）
- **Application Layer**: UI 流程控制的 Use Cases（與框架無關的業務編排）
- **Adapter Layer**: Pinia（狀態管理實作）、Vue 組件、路由、API 客戶端

**核心功能**:
- 遊戲介面渲染（首頁、大廳、遊戲頁面）
- 卡片操作互動（點擊、hover）
- 動畫與視覺回饋（使用 @vueuse/motion）
- 即時 UI 狀態更新
- SSE 事件接收與處理

**依賴**:
- 連接後端（使用 REST + SSE）
- Mock 模式（開發測試用）

---

## 架構原則

### Clean Architecture 分層

User Interface BC 遵循 Clean Architecture 的三層結構：

```
┌─────────────────────────────────────────────────┐
│  Adapter Layer (Pinia、Vue 組件、API 客戶端)     │
│                                                  │
│  ┌───────────────────────────────────────────┐ │
│  │  Application Layer (Use Cases 流程編排)   │ │
│  │                                            │ │
│  │  ┌─────────────────────────────────────┐ │ │
│  │  │  Domain Layer (純函數遊戲邏輯)      │ │ │
│  │  └─────────────────────────────────────┘ │ │
│  └───────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

**依賴規則**:
- 依賴箭頭只能由外層指向內層
- **Domain Layer**: 純函數，不依賴任何框架
- **Application Layer**: Use Cases，不依賴 Vue、Pinia 等框架
- **Adapter Layer**: 框架整合（Pinia 狀態管理、Vue 組件、API 通訊）

---

### 遊戲模式

前端支援兩種遊戲模式，透過 DI Container 切換：

**Backend 模式**（預設）
```
User Interface BC → Backend (REST + SSE)
```
- 透過 API 與後端通訊
- 遊戲邏輯由後端執行
- 支援斷線重連

**Mock 模式**（開發測試用）
```
User Interface BC → MockApiClient + MockEventEmitter
```
- 使用 Mock 資料模擬後端回應
- 無需啟動後端服務
- 方便前端開發與測試

---

## 依賴注入

### DI Container

前端使用 DI Container 來組裝所有依賴，確保：
- ✅ **依賴反轉**: Application Layer 定義介面，Adapter Layer 提供實作
- ✅ **可測試性**: 輕鬆替換依賴為 Mock
- ✅ **集中管理**: 所有依賴關係在一處配置

**推薦方案**:
- **TypeScript**: `tsyringe` 或 `inversify`
- **輕量級**: 自訂簡易 DI Container

---

### DI Container 配置範例

#### 1. 註冊依賴（Nuxt 4 Plugin）

**檔案**：`app/plugins/01.di-container.client.ts`

```typescript
import { container } from '~/user-interface/adapter/di/container'
import { registerDependencies, type GameMode } from '~/user-interface/adapter/di/registry'

export default defineNuxtPlugin(() => {
  // 僅在 client-side 執行（.client.ts 後綴已確保）
  if (import.meta.server) {
    console.warn('[DI Plugin] Skipping on server-side')
    return
  }

  // 從 runtimeConfig 讀取遊戲模式（預設為 'backend'）
  const runtimeConfig = useRuntimeConfig()
  const gameMode: GameMode = runtimeConfig.public.gameMode as GameMode

  try {
    // 註冊所有依賴（統一由 registry.ts 管理）
    registerDependencies(container, gameMode)
  } catch (error) {
    console.error('[DI Plugin] Failed to initialize DI container:', error)
    throw error
  }

  // 提供全域 diContainer（可選）
  return {
    provide: {
      diContainer: container,
    },
  }
})
```

**重點說明**：
- **`.client.ts` 後綴**：確保此 plugin 僅在 client-side 運行（SSE 和 Pinia 僅支援 client-side）
- **`01.` 前綴**：確保此 plugin 在 SVG 圖示 plugin（`00.svg-icons.client.ts`）之後載入
- **統一管理**：所有依賴註冊邏輯封裝在 `registry.ts` 中，支援 backend 和 mock 兩種遊戲模式

---

#### 2. Use Case 實作與註冊

**Use Case 實作（純粹的 TypeScript class）**

```typescript
// PlayHandCardUseCase.ts
import type { SendCommandPort, NotificationPort, AnimationPort } from '../ports/output'
import type { DomainFacade } from '../types/domain-facade'
import type { PlayHandCardInput, PlayHandCardOutput, PlayHandCardPort } from '../ports/input'

export class PlayHandCardUseCase implements PlayHandCardPort {
  constructor(
    private readonly sendCommand: SendCommandPort,
    private readonly notification: NotificationPort,
    private readonly domain: DomainFacade,
    private readonly animation: AnimationPort
  ) {}

  async execute(input: PlayHandCardInput): Promise<PlayHandCardOutput> {
    // 1. 檢查是否有動畫正在執行
    if (this.animation.isAnimating()) {
      this.notification.showError('請等待動畫完成')
      return { success: false }
    }

    // 2. 使用 Domain Facade 驗證卡片
    const isValid = this.domain.validateCardInHand(input.cardId, input.handCards)
    if (!isValid) {
      this.notification.showError('卡片不在手牌中')
      return { success: false }
    }

    // 3. 發送命令到後端
    await this.sendCommand.playHandCard(input.cardId, input.matchTarget)
    return { success: true }
  }
}
```

**在 registry.ts 中註冊（注入依賴）**

```typescript
// registry.ts (節錄)
function registerInputPorts(container: DIContainer): void {
  // 1. 先解析所有需要的 Output Ports
  const sendCommandPort = container.resolve(TOKENS.SendCommandPort)
  const notificationPort = container.resolve(TOKENS.NotificationPort)
  const domainFacade = container.resolve(TOKENS.DomainFacade)
  const animationPort = container.resolve(TOKENS.AnimationPort)

  // 2. 註冊 Use Case，並在 factory function 中傳入依賴
  container.register(
    TOKENS.PlayHandCardPort,
    () => new PlayHandCardUseCase(
      sendCommandPort,
      notificationPort,
      domainFacade,
      animationPort
    ),
    { singleton: true }
  )
}
```

---

#### 3. Vue 組件中使用（Nuxt 4 Composable）

```vue
<!-- PlayerHandZone.vue -->
<script setup lang="ts">
import { TOKENS } from '~/user-interface/adapter/di/tokens'
import type { PlayHandCardPort } from '~/user-interface/application/ports/input'

// 使用 useDependency composable 解析依賴（基於 Symbol Token）
const playHandCardUseCase = useDependency<PlayHandCardPort>(TOKENS.PlayHandCardPort)
const gameStateStore = useGameStateStore()

const handleCardClick = async (cardId: string) => {
  // 呼叫 Use Case
  const result = await playHandCardUseCase.execute({
    cardId,
    handCards: gameStateStore.myHandCards,
    matchTarget: null // 若有配對目標則傳入
  })

  if (!result.success) {
    // Use Case 已透過 NotificationPort 顯示錯誤訊息
    return
  }

  // Use Case 會自動通過 Output Ports 更新 UI 狀態
}
</script>

<template>
  <div class="player-hand-zone">
    <CardComponent
      v-for="card in gameStateStore.myHandCards"
      :key="card.id"
      :card="card"
      @click="handleCardClick(card.id)"
    />
  </div>
</template>
```

**useDependency Composable 實作**

```typescript
// app/user-interface/adapter/composables/useDependency.ts
import { container } from '~/user-interface/adapter/di/container'

export function useDependency<T>(token: symbol): T {
  if (!container.has(token)) {
    throw new Error(`[useDependency] Dependency not found: ${token.toString()}`)
  }
  return container.resolve<T>(token)
}
```

---

### 模式切換（Backend vs. Mock）

透過 `nuxt.config.ts` 的 `runtimeConfig.public.gameMode` 控制：

```typescript
// Backend 模式：使用真實 API
container.register(TOKENS.GameApiClient, () => new GameApiClient())
container.register(TOKENS.GameEventClient, () => new GameEventClient())

// Mock 模式：使用 Mock 實作
container.register(TOKENS.GameApiClient, () => new MockApiClient())
container.register(TOKENS.GameEventClient, () => new MockEventEmitter())
```

**GameApiClient**: 透過 REST API 與後端通訊
**MockApiClient**: 模擬 API 回應，用於開發測試

---

## 響應式設計策略

### Viewport 固定設計

- 遊戲頁面固定 `100vh × 100vw`，無垂直滾動
- 使用 Flexbox 垂直排列五個區塊
- 各區塊高度比例：
  - 頂部資訊列：10-12%
  - 對手已獲得牌區：15%
  - 場中央牌區：30%（核心互動區域）
  - 玩家已獲得牌區：15%
  - 玩家手牌區：25%

### 手機直向模式調整

- 場牌區改為 2 列 × 4 行
- 手牌區增加至 30% 高度並允許橫向滾動
- 頂部資訊列可折疊為 hamburger menu

---

## 測試策略

### Domain Layer
- **單元測試**: 測試所有純函數（卡片解析、配對驗證、役種檢測）
- **覆蓋率目標**: > 90%
- **測試框架**: Vitest

### Application Layer
- **Use Case 測試**: 使用 Mock 測試業務流程編排
- **無框架依賴**: 測試不依賴 Vue、Pinia
- **覆蓋率目標**: > 80%

### Adapter Layer
- **組件測試**: 測試 Vue 組件渲染與互動
- **Pinia Store 測試**: 測試狀態管理邏輯
- **E2E 測試** (可選): Playwright / Cypress
- **視覺回歸測試** (可選): Percy / Chromatic

---

## 目錄結構

Nuxt 4 採用約定式目錄結構，將 Clean Architecture 與框架慣例結合：

```
front-end/
├── nuxt.config.ts              # Nuxt 4 核心配置
├── app/                        # Nuxt 4 應用目錄
│   ├── app.vue                 # 根組件
│   ├── pages/                  # 路由頁面（自動路由）
│   │   ├── index.vue           # 首頁 (/)
│   │   ├── lobby.vue           # 大廳 (/lobby)
│   │   └── game/
│   │       ├── index.vue       # 遊戲頁面 (/game)
│   │       └── components/     # 遊戲頁面專用組件
│   ├── components/             # 全域組件（自動導入）
│   │   └── SvgIcon.vue
│   ├── composables/            # Vue 組合函式（自動導入）
│   │   └── useScrollTo.ts
│   ├── plugins/                # Nuxt 插件
│   │   ├── 00.svg-icons.client.ts    # SVG 圖示初始化
│   │   └── 01.di-container.client.ts # DI 容器初始化
│   ├── middleware/             # 路由中間件
│   │   ├── game.ts
│   │   └── lobby.ts
│   ├── assets/                 # 靜態資源
│   │   ├── icons/              # 50 張花札卡片 SVG
│   │   └── styles/             # CSS 樣式
│   ├── utils/                  # 工具函式
│   │   └── cardMapping.ts      # 卡片 ID 對應
│   └── user-interface/         # User Interface BC
│       ├── domain/             # Domain Layer（純函數）
│       │   ├── card-info.ts
│       │   ├── month-mapping.ts
│       │   └── yaku-info.ts
│       ├── application/        # Application Layer（Use Cases）
│       │   ├── ports/          # Port 介面定義
│       │   └── use-cases/      # Use Case 實作
│       │       └── event-handlers/  # SSE 事件處理
│       └── adapter/            # Adapter Layer
│           ├── di/             # DI 容器
│           ├── api/            # REST API 客戶端
│           ├── sse/            # SSE 客戶端
│           ├── animation/      # 動畫適配器
│           ├── stores/         # Pinia Stores
│           ├── mock/           # Mock 實作
│           └── composables/    # Vue composables
├── server/                     # Nitro 後端（獨立目錄）
└── shared/                     # 前後端共用契約
    └── contracts/
```

**說明**：
- **Nuxt 4 app 目錄**：所有前端代碼位於 `app/` 目錄下
- **Clean Architecture 分層**：`user-interface/` 的 Domain/Application/Adapter 三層分離
- **自動導入**：`components/`、`composables/` 下的內容自動導入
- **約定式路由**：`pages/` 目錄自動生成路由

---

## 參考文檔

- [User Interface BC - Domain Layer](./user-interface/domain.md)
- [User Interface BC - Application Layer](./user-interface/application.md)
- [User Interface BC - Adapter Layer](./user-interface/adapter.md)
- [共用數據契約](../shared/data-contracts.md)
- [通訊協議](../shared/protocol.md)
