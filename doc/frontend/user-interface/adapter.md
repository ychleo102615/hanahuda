# User Interface BC - Adapter Layer

## 職責

實作 Application Layer 定義的 Output Ports，並將 Use Cases 與框架整合。

**核心原則**:
- ✅ **框架整合**: 實作 Pinia stores、Vue 組件、API 客戶端
- ✅ **Port 實作**: 實作 Application Layer 定義的所有 Output Ports
- ✅ **事件橋接**: 將 SSE 事件轉發給對應的 Use Case Input Ports
- ✅ **狀態管理**: 使用 Pinia 管理 UI 狀態
- ✅ **依賴注入**: 使用 DI Container 組裝所有依賴

---

## 模組劃分

### 1. Pinia Stores（狀態管理）

#### GameStateStore

**職責**: 管理遊戲核心狀態，實作 `UpdateUIStatePort`

**狀態**:
```typescript
{
  gameId: string | null,
  flowStage: FlowStage,
  activePlayerId: string | null,

  // 牌面狀態
  fieldCards: string[],
  myHandCards: string[],
  opponentHandCount: number,
  myDepository: string[],
  opponentDepository: string[],
  deckRemaining: number,

  // 分數與役種
  myScore: number,
  opponentScore: number,
  myYaku: YakuScore[],
  opponentYaku: YakuScore[],
  koiKoiMultipliers: Map<string, number>,

  // 規則集
  ruleset: Ruleset | null
}
```

**Actions（實作 UpdateUIStatePort）**:
```typescript
// 實作 UpdateUIStatePort
setFlowStage(stage: FlowStage)
updateFieldCards(cards: string[])
updateHandCards(cards: string[])
updateDepositoryCards(playerCards: string[], opponentCards: string[])
updateScores(playerScore: number, opponentScore: number)
updateDeckRemaining(count: number)
updateKoiKoiMultiplier(playerId: string, multiplier: number)
```

---

#### UIStateStore

**職責**: 管理 UI 互動狀態，實作 `TriggerUIEffectPort` 部分

**狀態**:
```typescript
{
  // 選擇狀態
  selectionMode: boolean,
  selectionSourceCard: string | null,
  selectionPossibleTargets: string[],

  // 決策 Modal 狀態
  decisionModalVisible: boolean,
  decisionModalData: {
    currentYaku: YakuScore[],
    currentScore: number,
    potentialScore?: number
  } | null,

  // 錯誤與提示
  errorMessage: string | null,
  infoMessage: string | null,

  // 連線狀態
  connectionStatus: 'connected' | 'connecting' | 'disconnected',
  reconnecting: boolean
}
```

**Actions（實作 TriggerUIEffectPort 部分）**:
```typescript
showSelectionUI(sourceCard: string, possibleTargets: string[])
hideSelectionUI()
showDecisionModal(data: DecisionModalData)
hideDecisionModal()
showErrorMessage(message: string)
showInfoMessage(message: string)
clearMessages()
setConnectionStatus(status: ConnectionStatus)
```

---

#### AnimationStore（可選）

**職責**: 管理動畫隊列與狀態

**狀態**:
```typescript
{
  animationQueue: Animation[],
  isAnimating: boolean
}
```

**Actions（實作 TriggerUIEffectPort.triggerAnimation）**:
```typescript
triggerAnimation(type: AnimationType, params: AnimationParams)
completeAnimation()
clearQueue()
```

---

### 2. API 客戶端

#### GameApiClient

**職責**: 實作 SendCommandPort，與後端 REST API 通訊

**方法**:
```typescript
class GameApiClient implements SendCommandPort {
  // 加入遊戲/重連
  async joinGame(playerId: string, sessionToken?: string): Promise<{
    gameId: string,
    sessionToken: string,
    isReconnect: boolean
  }>

  // 打出手牌
  async playHandCard(gameId: string, cardId: string, target?: string): Promise<void>

  // 選擇配對目標
  async selectTarget(gameId: string, source: string, target: string): Promise<void>

  // Koi-Koi 決策
  async makeDecision(gameId: string, decision: 'KOI_KOI' | 'END_ROUND'): Promise<void>
}
```

**錯誤處理**:
- HTTP 錯誤：重試邏輯（最多 3 次）
- 超時處理：預設 5 秒超時
- 網路斷線：拋出錯誤供上層處理

---

### 3. SSE 客戶端

#### GameEventClient

**職責**: 建立 SSE 連線，接收伺服器事件並轉發給 Use Cases

**方法**:
```typescript
class GameEventClient {
  private eventSource: EventSource | null
  private useCases: Map<string, HandleEventPort>

  // 建立 SSE 連線
  connect(gameId: string, sessionToken: string): void

  // 斷開連線
  disconnect(): void

  // 註冊事件處理器（由 DI Container 注入）
  registerEventHandler(eventType: string, useCase: HandleEventPort): void

  // 內部：處理接收到的事件
  private handleEvent(event: MessageEvent): void
}
```

**事件處理流程**:
1. 接收 SSE 事件
2. 解析事件類型與 payload
3. 查找對應的 Use Case Input Port
4. 調用 Use Case 的 `execute()` 方法

**重連機制**:
- 偵測連線中斷（`onerror` 事件）
- 使用指數退避策略重連（1s → 2s → 4s → 8s → 16s，最大 30s）
- 重連成功後觸發 `HandleReconnectionUseCase`

**Fallback 模式**（可選）:
- 若 SSE 連線持續失敗超過 5 次
- 切換到短輪詢模式（每 2 秒請求 `/api/v1/games/{gameId}/snapshot`）
- 提示使用者「連線品質較差」

---

### 4. Vue 組件

#### 首頁組件

- **HomePage.vue**: 首頁容器
- **HeroSection.vue**: 主標題與 CTA 按鈕
- **RulesSection.vue**: 規則介紹區
- **AttributionSection.vue**: 版權聲明區
- **NavigationBar.vue**: 導航列

---

#### 遊戲頁面組件

**GamePage.vue**: 遊戲頁面容器（固定 100vh × 100vw）

**子組件**:
- **TopInfoBar.vue**: 頂部資訊列（分數、回合指示器、操作按鈕）
- **OpponentDepositoryZone.vue**: 對手已獲得牌區
- **FieldZone.vue**: 場中央牌區（2行×4列網格）
- **PlayerDepositoryZone.vue**: 玩家已獲得牌區
- **PlayerHandZone.vue**: 玩家手牌區

**互動組件**:
- **CardComponent.vue**: 單張卡片組件
  - Props: `cardId`, `isSelectable`, `isSelected`, `isHighlighted`
  - Events: `@click`, `@hover`
- **SelectionOverlay.vue**: 配對選擇 UI
- **DecisionModal.vue**: Koi-Koi 決策 Modal
- **ErrorToast.vue**: 錯誤提示
- **ReconnectionBanner.vue**: 重連中提示

---

#### 組件與 Use Cases 整合

**範例：玩家打出手牌**

```typescript
// PlayerHandZone.vue
<script setup lang="ts">
import { useDI } from '@/di'
import type { PlayHandCardPort } from '@/application/ports/in'

const di = useDI()
const playHandCardUseCase = di.resolve<PlayHandCardPort>('PlayHandCardUseCase')
const gameStateStore = useGameStateStore()

const handleCardClick = async (cardId: string) => {
  const result = await playHandCardUseCase.execute({
    cardId,
    handCards: gameStateStore.myHandCards,
    fieldCards: gameStateStore.fieldCards
  })

  // Use Case 會自動通過 Output Port 更新 UI 狀態
}
</script>
```

---

### 5. 路由配置

#### Router 設定

```typescript
const routes = [
  {
    path: '/',
    name: 'Home',
    component: HomePage
  },
  {
    path: '/game/:gameId?',
    name: 'Game',
    component: GamePage,
    beforeEnter: (to, from, next) => {
      // 檢查是否已加入遊戲或需要重連
      // ...
    }
  }
]
```

---

### 6. 動畫服務

#### AnimationService

**職責**: 實作 TriggerUIEffectPort.triggerAnimation

**動畫類型**:

**DEAL_CARDS**: 發牌動畫
- 卡片從牌堆飛向各個區域
- 使用 CSS transition 或 GSAP

**CARD_MOVE**: 卡片移動動畫
- 手牌 → 場牌 → 獲得區
- 平滑的飛行路徑

**MATCH_HIGHLIGHT**: 配對高亮
- 配對成功時的閃光效果
- 使用 CSS animation

**YAKU_FORMED**: 役種形成特效
- 相關牌發光或粒子效果
- 顯示役種名稱與得分

**SCORE_UPDATE**: 分數變化動畫
- 數字滾動效果
- 使用 CountUp.js 或自訂動畫

---

## 依賴注入配置

### DI Container 設定

詳見 [architecture.md - 依賴注入](../architecture.md#依賴注入) 章節。

所有 Use Cases、Ports 實作、Domain Services 均通過 DI Container 組裝。

---

## 錯誤處理

### API 錯誤處理

**策略**:
- 4xx 錯誤：顯示友善錯誤訊息
- 5xx 錯誤：重試 3 次，失敗後提示使用者
- 網路錯誤：觸發重連機制

### SSE 錯誤處理

**策略**:
- 連線中斷：自動重連（指數退避）
- 連續失敗 5 次：切換到 Fallback 模式
- 顯示連線狀態（connected / connecting / disconnected）

---

## 測試策略

### Pinia Store 測試

**測試重點**:
- 測試 Actions 是否正確更新狀態
- 使用 `setActivePinia(createPinia())` 初始化測試環境

**範例**:
```typescript
import { setActivePinia, createPinia } from 'pinia'
import { useGameStateStore } from '@/user-interface/adapter/stores'

describe('GameStateStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('應該更新 FlowStage', () => {
    const store = useGameStateStore()
    store.setFlowStage('AWAITING_SELECTION')
    expect(store.flowStage).toBe('AWAITING_SELECTION')
  })
})
```

---

### Vue 組件測試

**測試重點**:
- 測試組件渲染
- 測試用戶互動（點擊、輸入）
- Mock Use Cases 與 Stores

**工具**: `@vue/test-utils` + Vitest

---

### API 客戶端測試

**測試重點**:
- Mock Fetch API
- 測試請求參數與 Response 處理
- 測試錯誤處理與重試邏輯

**工具**: `vitest` + `fetch-mock`

---

## 參考文檔

- [Domain Layer](./domain.md)
- [Application Layer](./application.md)
- [前端架構總覽](../architecture.md)
- [通訊協議](../../shared/protocol.md)
- [共用數據契約](../../shared/data-contracts.md)
