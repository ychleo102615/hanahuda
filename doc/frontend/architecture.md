# 前端架構總覽

## 技術棧

- **框架**: Vue 3 + TypeScript
- **樣式**: Tailwind CSS v4
- **路由**: Vue Router
- **狀態管理**: Pinia
- **HTTP 客戶端**: Fetch API
- **SSE 客戶端**: EventSource API

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

#### 1. 註冊依賴（main.ts）

```typescript
import { container } from '@/di'

// Domain Services
import * as CardDomain from '@/user-interface/domain/card'
import * as MatchDomain from '@/user-interface/domain/match'
import * as YakuDomain from '@/user-interface/domain/yaku'

// Use Cases
import { PlayHandCardUseCase } from '@/user-interface/application/usecases'
import { HandleRoundDealtUseCase } from '@/user-interface/application/usecases'
// ... 其他 Use Cases

// Ports 實作
import { GameApiClient } from '@/user-interface/adapter/api'
import { GameEventClient } from '@/user-interface/adapter/sse'
import { AnimationService } from '@/user-interface/adapter/animations'

// 註冊 Domain Services
container.register('CardDomainService', { useValue: CardDomain })
container.register('MatchDomainService', { useValue: MatchDomain })
container.register('YakuDomainService', { useValue: YakuDomain })

// 註冊 Ports 實作
container.register('SendCommandPort', { useClass: GameApiClient })
container.register('AnimationService', { useClass: AnimationService })

// 註冊 Pinia Stores（實作 Output Ports）
const pinia = createPinia()
app.use(pinia)
const gameStateStore = useGameStateStore(pinia)
const uiStateStore = useUIStateStore(pinia)

container.register('UpdateUIStatePort', { useValue: gameStateStore })
container.register('TriggerUIEffectPort', { useValue: uiStateStore })

// 註冊 Use Cases（自動注入依賴）
container.register('PlayHandCardUseCase', { useClass: PlayHandCardUseCase })
container.register('SelectMatchTargetUseCase', { useClass: SelectMatchTargetUseCase })
container.register('MakeKoiKoiDecisionUseCase', { useClass: MakeKoiKoiDecisionUseCase })

// 註冊 SSE 事件處理 Use Cases
container.register('HandleGameStartedUseCase', { useClass: HandleGameStartedUseCase })
container.register('HandleRoundDealtUseCase', { useClass: HandleRoundDealtUseCase })
// ... 其他事件處理 Use Cases

// 初始化 SSE 客戶端並註冊事件處理器
const gameEventClient = new GameEventClient()
gameEventClient.registerEventHandler(
  'GameStarted',
  container.resolve('HandleGameStartedUseCase')
)
gameEventClient.registerEventHandler(
  'RoundDealt',
  container.resolve('HandleRoundDealtUseCase')
)
// ... 其他事件處理器

container.register('GameEventClient', { useValue: gameEventClient })
```

---

#### 2. Use Case 注入依賴

```typescript
// PlayHandCardUseCase.ts
import { injectable, inject } from '@/di'
import type { CardDomainService, MatchDomainService } from '@/user-interface/domain'
import type { SendCommandPort, TriggerUIEffectPort } from './ports/out'

@injectable()
export class PlayHandCardUseCase {
  constructor(
    @inject('CardDomainService') private cardDomain: CardDomainService,
    @inject('MatchDomainService') private matchDomain: MatchDomainService,
    @inject('SendCommandPort') private sendCommand: SendCommandPort,
    @inject('TriggerUIEffectPort') private triggerUI: TriggerUIEffectPort
  ) {}

  async execute(input: PlayHandCardInput): Promise<PlayHandCardOutput> {
    // 1. 驗證卡片
    const isValid = this.cardDomain.validateCardInHand(input.cardId, input.handCards)
    if (!isValid) {
      throw new Error('卡片不在手牌中')
    }

    // 2. 檢查配對
    const matchStatus = this.matchDomain.analyzeMatchStatus(input.cardId, input.fieldCards)

    // 3. 若有多張可配對，顯示選擇 UI
    if (matchStatus.status === 'MULTIPLE_MATCHES') {
      this.triggerUI.showSelectionUI(input.cardId, matchStatus.targets)
      return { needSelection: true, possibleTargets: matchStatus.targets }
    }

    // 4. 單一配對或無配對，直接發送命令
    const target = matchStatus.status === 'SINGLE_MATCH' ? matchStatus.targets[0] : null
    await this.sendCommand.playHandCard(input.cardId, target)

    return { needSelection: false, selectedTarget: target }
  }
}
```

---

#### 3. Vue 組件中使用

```typescript
// PlayerHandZone.vue
<script setup lang="ts">
import { useDI } from '@/di'
import type { PlayHandCardPort } from '@/application/ports/in'

const di = useDI()
const playHandCardUseCase = di.resolve<PlayHandCardPort>('PlayHandCardUseCase')
const gameStateStore = useGameStateStore()

const handleCardClick = async (cardId: string) => {
  try {
    const result = await playHandCardUseCase.execute({
      cardId,
      handCards: gameStateStore.myHandCards,
      fieldCards: gameStateStore.fieldCards
    })

    // Use Case 會自動通過 Output Port 更新 UI 狀態
  } catch (error) {
    console.error('打牌失敗:', error)
  }
}
</script>
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

```
src/
├── user-interface/
│   ├── domain/           (純函數邏輯)
│   ├── application/      (Use Cases)
│   └── adapter/
│       ├── stores/       (Pinia stores)
│       ├── components/   (Vue 組件)
│       ├── router/       (路由配置)
│       └── api/          (API 客戶端)
├── local-game/
│   ├── domain/           (遊戲規則引擎)
│   ├── application/      (遊戲流程 Use Cases)
│   └── adapter/          (與 UI BC 的整合介面)
└── shared/
    └── types/            (TypeScript 型別定義)
```

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
