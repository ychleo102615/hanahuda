# 前端架構總覽

## 技術棧

- **框架**: Nuxt 4 + Vue 3 + TypeScript
- **樣式**: Tailwind CSS v4
- **路由**: Nuxt Router（基於 Vue Router）
- **狀態管理**: Pinia
- **HTTP 客戶端**: $fetch（Nuxt 內置）/ Fetch API
- **SSE 客戶端**: EventSource API
- **構建工具**: Nuxt 4（內建 Vite）

---

## Bounded Context 劃分

前端採用 DDD 的 Bounded Context 概念，劃分為兩個獨立的上下文：

### 1. User Interface BC

**職責**: 遊戲 UI 呈現層

- **Domain Layer**: 前端遊戲邏輯（卡片解析、配對驗證、役種檢測等純函數）
- **Application Layer**: UI 流程控制的 Use Cases（與框架無關的業務編排）
- **Adapter Layer**: Pinia（狀態管理實作）、Vue 組件、路由、API 客戶端

**核心功能**:
- 遊戲介面渲染（首頁、遊戲頁面）
- 卡片操作互動（點擊、拖拽、hover）
- 動畫與視覺回饋
- 即時 UI 狀態更新

**依賴**:
- 可以獨立運行（使用 local-game BC）
- 也可以連接後端（使用 REST + SSE）

---

### 2. Local Game BC

**職責**: 完整的本地遊戲引擎（前端版後端）

- **Domain Layer**: 遊戲規則引擎、牌組管理、回合控制
- **Application Layer**: 遊戲流程編排 Use Cases、對手決策邏輯
- **Adapter Layer**: 與 user-interface BC 的整合介面

**核心功能**:
- 完整的遊戲邏輯實作（發牌、配對、役種判定）
- 本地對手策略（AI 邏輯）
- 離線遊玩支援
- 遊戲狀態管理

**使用場景**:
- 離線模式遊玩
- 前端原型開發與測試
- 快速迭代遊戲規則

---

## 架構原則

### Clean Architecture 分層

兩個 BC 都遵循 Clean Architecture 的三層結構：

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

### BC 整合模式

**模式 1: 離線模式**
```
User Interface BC → Local Game BC
```
- user-interface 呼叫 local-game 提供的遊戲引擎
- 所有遊戲邏輯在前端執行
- 無需後端連線

**模式 2: 線上模式**
```
User Interface BC → Backend (REST + SSE)
```
- user-interface 透過 API 與後端通訊
- 遊戲邏輯由後端執行
- local-game BC 不參與

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

**檔案**：`plugins/01.di-container.client.ts`

```typescript
import { container } from '~/src/user-interface/adapter/di/container'
import { registerDependencies, type GameMode } from '~/src/user-interface/adapter/di/registry'

export default defineNuxtPlugin(() => {
  // 僅在 client-side 執行（.client.ts 後綴已確保）
  if (import.meta.server) {
    console.warn('[DI Plugin] Skipping on server-side')
    return
  }

  // 從 sessionStorage 讀取遊戲模式（預設為 'mock'）
  const gameMode: GameMode = (sessionStorage.getItem('gameMode') as GameMode) || 'mock'

  console.info('[DI Plugin] Initializing DI container', { gameMode })

  try {
    // 註冊所有依賴（統一由 registry.ts 管理）
    registerDependencies(container, gameMode)

    console.info('[DI Plugin] DI container initialized successfully', {
      registeredTokens: container.getRegisteredTokens().length,
    })
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
- **`01.` 前綴**：確保此 plugin 在其他 plugin 之後載入（Pinia 由 Nuxt 自動初始化）
- **統一管理**：所有依賴註冊邏輯封裝在 `registry.ts` 中，支援 3 種遊戲模式（backend、mock、local）

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
import { TOKENS } from '~/src/user-interface/adapter/di/tokens'
import type { PlayHandCardPort } from '~/src/user-interface/application/ports/input'

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
// composables/useDependency.ts
import { container } from '~/src/user-interface/adapter/di/container'

export function useDependency<T>(token: symbol): T {
  if (!container.has(token)) {
    throw new Error(`[useDependency] Dependency not found: ${token.toString()}`)
  }
  return container.resolve<T>(token)
}
```

---

### 模式切換（線上 vs. 離線）

```typescript
// 線上模式：使用 Backend API
container.register('SendCommandPort', { useClass: GameApiClient })
container.register('GameEventClient', { useClass: GameEventClient })

// 離線模式：使用 Local Game BC
container.register('SendCommandPort', { useClass: LocalGameAdapter })
container.register('GameEventClient', { useClass: LocalGameEventEmitter })
```

**LocalGameAdapter**: 將命令轉發給 local-game BC
**LocalGameEventEmitter**: 模擬 SSE 事件推送

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

## 目錄結構建議

Nuxt 4 採用約定式目錄結構，將 Clean Architecture 與框架慣例結合：

```
front-end/
├── nuxt.config.ts        # Nuxt 4 核心配置
├── app.vue               # 根組件
├── pages/                # 路由頁面（Nuxt 約定，自動路由）
│   ├── index.vue         # 首頁 (/)
│   ├── lobby.vue         # 大廳 (/lobby)
│   └── game.vue          # 遊戲頁面 (/game)
├── components/           # 全域組件（Nuxt 自動導入）
├── composables/          # Vue 組合函式（Nuxt 自動導入）
│   └── useDependency.ts  # DI 容器使用
├── plugins/              # Nuxt 插件
│   ├── 01.di-container.client.ts   # DI 容器初始化
│   └── 02.svg-icons.client.ts      # SVG 圖示註冊
├── middleware/           # 路由中間件（替代 guards）
│   ├── game-page.ts
│   └── lobby-page.ts
├── stores/               # Pinia Stores（Nuxt 頂層目錄）
├── src/                  # 原有代碼保留在 src/
│   ├── user-interface/   # User Interface BC（保持不變）
│   │   ├── domain/       # Domain Layer（純函數邏輯）
│   │   ├── application/  # Application Layer（Use Cases）
│   │   └── adapter/      # Adapter Layer
│   │       ├── di/       # DI 容器
│   │       ├── api/      # API 客戶端
│   │       ├── sse/      # SSE 客戶端
│   │       ├── animation/# 動畫適配器
│   │       └── composables/ # Vue composables
│   ├── local-game/       # Local Game BC
│   │   ├── domain/       # 遊戲規則引擎
│   │   ├── application/  # 遊戲流程 Use Cases
│   │   └── adapter/      # 與 UI BC 的整合介面
│   ├── assets/           # 靜態資源
│   ├── data/             # 靜態資料
│   ├── types/            # 全域類型
│   └── constants/        # 常數
└── tsconfig.json         # TypeScript 配置
```

**說明**：
- **Nuxt 約定目錄**：`pages/`、`components/`、`plugins/`、`middleware/` 遵循 Nuxt 4 慣例
- **Clean Architecture 保留**：`src/user-interface/` 和 `src/local-game/` 的 Domain/Application/Adapter 三層分離完整保留
- **自動導入**：Nuxt 4 自動導入 `components/`、`composables/` 下的內容，無需手動 import
- **約定式路由**：`pages/` 目錄自動生成路由，無需手動配置 Vue Router

---

## 參考文檔

- [User Interface BC - Domain Layer](./user-interface/domain.md)
- [User Interface BC - Application Layer](./user-interface/application.md)
- [User Interface BC - Adapter Layer](./user-interface/adapter.md)
- [Local Game BC - Domain Layer](./local-game/domain.md)
- [Local Game BC - Application Layer](./local-game/application.md)
- [Local Game BC - Adapter Layer](./local-game/adapter.md)
- [共用數據契約](../shared/data-contracts.md)
- [通訊協議](../shared/protocol.md)
