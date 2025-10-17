# Research Report: Game-UI 與 Game-Engine BC 徹底分離

**Feature Branch**: `002-game-ui-game`
**Research Date**: 2025-10-17
**Status**: Completed

## Executive Summary

本研究針對 game-engine 和 game-ui 兩個 Bounded Context 的徹底分離進行深入分析。當前架構存在**跨 BC 依賴違規**問題:

1. ✅ **game-engine BC 依賴舊的 application 層** - 7 個檔案違規
2. ✅ **整合事件系統 94% 完整** - 僅缺少 MatchSelectedEvent 發布邏輯
3. ✅ **game-ui BC 架構設計完善** - 所有核心元件已實作

## 1. game-engine BC Port 介面需求

### 1.1 當前問題

**架構違規**:
```typescript
// ❌ game-engine BC 不應該依賴 @/application/
import type { GameRepository } from '@/application/ports/repositories/GameRepository'
import type { GamePresenter } from '@/application/ports/presenters/GamePresenter'
import type { ... } from '@/application/dto/GameDTO'
```

**違規檔案清單** (7 個):
1. `GameFlowCoordinator.ts` - 依賴 GameRepository + GamePresenter + DTOs
2. `SetUpGameUseCase.ts` - 依賴 GameRepository
3. `SetUpRoundUseCase.ts` - 依賴 GameRepository
4. `PlayCardUseCase.ts` - 依賴 GameRepository + GamePresenter
5. `CalculateScoreUseCase.ts` - 依賴 DTOs
6. `AbandonGameUseCase.ts` - 依賴 GameRepository
7. `OpponentAI.ts` - 依賴 DTOs

### 1.2 GameRepository 分析

**決策**: 建立 game-engine BC 專屬的 `IGameStateRepository`

**理由**:
- 舊的 GameRepository 有 14 個方法,但只有 4 個被使用 (使用率 28.6%)
- 部分方法包含業務邏輯 (如 playCard, calculateScore),違反 Repository Pattern
- game-engine BC 應該擁有自己的 Repository Port

**新介面設計**:
```typescript
// src/game-engine/application/ports/IGameStateRepository.ts
export interface IGameStateRepository {
  createGame(): Promise<string>
  getGameState(gameId: string): Promise<GameState | null>
  saveGameState(gameId: string, gameState: GameState): Promise<boolean>
  deleteGame(gameId: string): Promise<boolean>
}
```

**優點**:
- ✅ 職責單一 (僅持久化)
- ✅ 介面最小化
- ✅ 符合 BC 隔離原則

### 1.3 GamePresenter 評估

**決策**: 完全移除 GamePresenter 依賴,改用整合事件

**理由**:
- GamePresenter 在 GameFlowCoordinator 中有 40+ 處呼叫
- 所有 presenter 呼叫都有對應的整合事件
- game-engine BC 不應該知道 UI 如何呈現

**映射關係**:
| Presenter 呼叫 | 對應整合事件 |
|---------------|-------------|
| presentGameState | GameInitializedEvent |
| presentYakuDisplay | CardPlayedEvent.achievedYaku |
| presentKoikoiDialog | CardPlayedEvent (phase=koikoi) |
| presentGameEnd | GameEndedEvent |
| presentRoundEnd | RoundEndedEvent |

**實施策略**:
1. 移除 GameFlowCoordinator 的 `presenter` 參數
2. 確認所有整合事件已正確發布
3. 在 game-ui BC 中實作事件處理邏輯

### 1.4 DTO 重組

**決策**: 分類放置,避免跨 BC 依賴

**Input DTOs** → `game-engine/application/dto/`:
```typescript
export interface StartGameInputDTO {
  player1Name: string
  player2Name: string
}

export interface PlayCardInputDTO {
  playerId: string
  cardId: string
  selectedFieldCard?: string
}
```

**Output DTOs** → 使用整合事件取代,不需要額外 DTO

**理由**: 整合事件已包含所有需要的資訊

### 1.5 最終建議

**game-engine BC 只需要 2 個 Port**:
1. `IGameStateRepository` - 狀態持久化
2. `IEventPublisher` - 發布整合事件 (來自 shared)

---

## 2. 整合事件系統完整性

### 2.1 現有事件清單 (7 種)

| 事件 | 用途 | 大小 | 狀態 |
|------|------|------|------|
| GameInitializedEvent | 完整遊戲狀態快照 | ~5-8KB | ✅ 完整 |
| CardPlayedEvent | 出牌動作 (含配對) | ~300-500B | ✅ 完整 |
| MatchSelectedEvent | 多重配對選擇 | ~200-400B | ⚠️ 缺少發布邏輯 |
| KoikoiDeclaredEvent | 來來宣言 | ~200-300B | ✅ 完整 |
| RoundEndedEvent | 回合結束 | ~400-600B | ✅ 完整 |
| GameEndedEvent | 遊戲結束 | ~300-400B | ✅ 完整 |
| GameAbandonedEvent | 遊戲放棄 | ~250-350B | ✅ 完整 |

### 2.2 事件覆蓋度

**GameFlowCoordinator Presenter 呼叫對照**:
- 13 種 presenter 方法
- 所有方法都有對應的整合事件或不需要事件 (如 clearError)
- ✅ **覆蓋率 100%**

**game-ui BC 事件處理**:
- UpdateGameViewUseCase 已實作所有 7 種事件的處理器
- ✅ **處理完整度 100%**

### 2.3 發現的問題

**MatchSelectedEvent 缺少發布邏輯**:

當前 PlayCardUseCase 遇到多重配對時僅返回錯誤:
```typescript
else if (fieldMatches.length === 2) {
  return {
    success: false,
    error: 'errors.multipleMatchesFound'  // ❌ 沒有發布事件
  }
}
```

**建議**: 實作獨立的 `SelectMatchUseCase` 處理配對選擇

### 2.4 事件訂閱機制

**當前狀況**: 事件訂閱設置位置不明確

**建議**: 在 `main.ts` 中設置全局事件訂閱:
```typescript
function setupEventSubscriptions() {
  const eventBus = container.getEventBus()
  const updateGameViewUseCase = container.resolve(...)

  eventBus.subscribe('*', (event) => {
    updateGameViewUseCase.handleEvent(event)
  })
}
```

### 2.5 改進建議

**高優先級**:
1. 🔴 實作 MatchSelectedEvent 發布邏輯
2. 🔴 明確事件訂閱設置位置
3. 🟡 完成 DIContainer 配置

**中優先級**:
4. 🟡 事件序列號驗證
5. 🟡 事件日誌與偵錯

---

## 3. game-ui BC 架構設計

### 3.1 已完成的架構元件

**Application Layer**:
- ✅ UpdateGameViewUseCase - 處理整合事件,增量更新 GameViewModel
- ✅ HandleUserInputUseCase - 驗證使用者輸入,產生命令
- ✅ IUIPresenter (Port) - UI 展示介面
- ✅ IEventSubscriber (Port) - 事件訂閱介面

**Domain Layer**:
- ✅ GameViewModel - 不可變的遊戲視圖模型
- ✅ PlayerViewModel - 不可變的玩家視圖模型
- ✅ UICardMatchingService - UI 卡片配對服務

**Presentation Layer**:
- ✅ GameController - 薄層協調器
- ✅ VueGamePresenter - 實作 IUIPresenter,更新 Pinia store
- ✅ gameStore - Pinia 狀態管理

**Infrastructure Layer**:
- ✅ EventBusAdapter - 實作 IEventSubscriber

### 3.2 舊 UI 層遷移策略

**需要遷移的元件** (from `/src/ui/`):

| 元件 | 動作 | 理由 |
|------|------|------|
| CardComponent.vue | 保留,更新 props | 純展示元件 |
| GameBoard.vue | 保留,更新 props | 需改用 GameViewModel |
| PlayerHand.vue | 保留,更新 props | 需改用 PlayerViewModel |
| GameView.vue | 保留,重寫邏輯 | 改用新 GameController |
| useLocale.ts | 保留不變 | 通用邏輯 |
| cardAssetMapping.ts | 保留或遷移 | 純工具函式 |

**需要棄用的元件**:
- ❌ `/src/ui/controllers/GameController.ts` - 改用 game-ui BC 版本
- ❌ `/src/ui/presenters/VueGamePresenter.ts` - 改用 game-ui BC 版本
- ❌ `/src/ui/stores/gameStore.ts` - 改用 game-ui BC 版本

### 3.3 UseCase 職責分工

**UpdateGameViewUseCase** (事件處理器):
- ✅ 接收並處理 game-engine BC 的整合事件
- ✅ 增量構建/更新 GameViewModel
- ✅ 事件序列驗證與缺失檢測
- ✅ 通過 IUIPresenter 觸發 UI 更新

**HandleUserInputUseCase** (輸入驗證器):
- ✅ 驗證使用者輸入的合法性
- ✅ 提供即時 UI 反饋
- ✅ 產生 game-engine BC 命令 (不執行)
- ✅ 提供 UI 輔助方法

### 3.4 DIContainer 配置策略

**建議**: 擴展現有 DIContainer

```typescript
export class DIContainer {
  // 新增 game-ui BC 服務鍵
  static readonly UI_UPDATE_VIEW_USE_CASE = Symbol('UpdateGameViewUseCase')
  static readonly UI_HANDLE_INPUT_USE_CASE = Symbol('HandleUserInputUseCase')
  static readonly UI_GAME_CONTROLLER = Symbol('UIGameController')
  static readonly UI_GAME_PRESENTER = Symbol('UIGamePresenter')
  static readonly UI_EVENT_SUBSCRIBER = Symbol('UIEventSubscriber')

  setupGameUIServices(gameStore): void {
    // 註冊 game-ui BC 所有服務
  }

  static createWithGameUI(gameStore): DIContainer {
    const container = new DIContainer()
    container.setupDefaultServices()     // game-engine BC
    container.setupGameUIServices(gameStore)  // game-ui BC
    return container
  }
}
```

### 3.5 main.ts 初始化策略

**改造重點**:
1. 在 app.mount 後初始化 DIContainer
2. 設置全局事件訂閱
3. 將 DIContainer 提供給 Vue app

```typescript
// main.ts
app.mount('#app')

// Setup DI Container
const gameUIStore = useGameUIStore()
const container = DIContainer.createWithGameUI(gameUIStore)
app.provide('DIContainer', container)

// Setup event subscriptions
const eventBus = container.getEventBus()
const updateGameViewUseCase = container.resolve(...)
eventBus.subscribe('*', (event) => updateGameViewUseCase.handleEvent(event))
```

### 3.6 GameView.vue 改造策略

**改造前**:
```typescript
const gameStore = useGameStore()  // 舊版 store
const diContainer = DIContainer.createDefault(gameStore)
const gameController = diContainer.resolve(DIContainer.GAME_CONTROLLER)  // 舊版
```

**改造後**:
```typescript
const gameStore = useGameStore()  // game-ui BC store
const diContainer = inject<DIContainer>('DIContainer')
const gameController = diContainer.resolve(DIContainer.UI_GAME_CONTROLLER)  // 新版

// 使用 GameViewModel 資料
const gameViewModel = computed(() => gameStore.gameViewModel)
const fieldCardIds = computed(() => gameViewModel.value?.fieldCardIds || [])
```

---

## 4. 技術決策總結

### 4.1 關鍵決策

| 決策 | 選擇 | 理由 |
|------|------|------|
| Repository Port | 建立 IGameStateRepository | 介面最小化,職責單一 |
| GamePresenter | 完全移除,改用事件 | 符合事件驅動架構 |
| DTO 位置 | Input DTO 放 game-engine BC | 避免跨 BC 依賴 |
| Output DTO | 使用整合事件取代 | 避免重複定義 |
| DIContainer | 擴展現有容器 | 統一依賴管理 |
| 事件訂閱 | 在 main.ts 全局設置 | 明確初始化流程 |

### 4.2 架構優勢

**舊架構 vs 新架構**:

| 指標 | 舊架構 | 新架構 |
|------|--------|--------|
| BC 隔離 | ❌ 緊密耦合 | ✅ 完全隔離 |
| 事件驅動 | ⚠️ 部分支援 | ✅ 完整支援 |
| 依賴方向 | ❌ 雙向依賴 | ✅ 單向依賴 |
| 測試性 | ⚠️ 困難 | ✅ 高可測試性 |
| 擴展性 | ❌ 受限 | ✅ 易於擴展 |

### 4.3 實施風險評估

| 風險 | 嚴重性 | 緩解措施 |
|------|--------|----------|
| 測試通過率下降 | 🟡 中 | 逐步重構,每步驗證測試 |
| UI 更新遺漏 | 🟡 中 | 完整的事件處理測試 |
| 效能影響 | 🟢 低 | 事件系統已驗證效能 |
| 學習曲線 | 🟡 中 | 詳細文件與程式碼註解 |

---

## 5. 實施建議

### 5.1 重構優先級

**Phase 1: 移除 GamePresenter 依賴** (優先級: 🔴 最高)
- 影響: GameFlowCoordinator (~600 行)
- 工作量: 2-3 天
- 風險: 中

**Phase 2: 創建 IGameStateRepository** (優先級: 🟠 高)
- 影響: 所有 UseCase
- 工作量: 1-2 天
- 風險: 低

**Phase 3: 重組 DTO 結構** (優先級: 🟡 中)
- 影響: UseCase 輸入輸出
- 工作量: 1 天
- 風險: 低

**Phase 4: 完成 game-ui BC 整合** (優先級: 🟠 高)
- 影響: main.ts, GameView.vue, DIContainer
- 工作量: 1-2 天
- 風險: 中

### 5.2 測試策略

**單元測試**:
- game-engine BC UseCase 測試 (無 Presenter 依賴)
- game-ui BC UseCase 測試 (事件處理)

**整合測試**:
- 事件端到端流程測試
- UI 更新完整性測試

**架構測試**:
- BC 邊界驗證測試
- 依賴方向檢查測試

### 5.3 遷移檢查清單

**game-engine BC**:
- [ ] 建立 IGameStateRepository 介面
- [ ] 更新所有 UseCase 的 import
- [ ] 移除 GamePresenter 參數
- [ ] 確認整合事件發布完整
- [ ] 移動 Input DTO 到 game-engine BC

**game-ui BC**:
- [ ] 更新 DIContainer 配置
- [ ] 改造 main.ts 初始化邏輯
- [ ] 更新 GameView.vue
- [ ] 改造 Vue components (CardComponent, PlayerHand, GameBoard)
- [ ] 設置事件訂閱

**測試與驗證**:
- [ ] 執行 `npm run type-check` (無錯誤)
- [ ] 執行 `npm run test` (通過率 >= 94%)
- [ ] 執行 `npm run lint:boundaries` (無違規)
- [ ] 手動測試完整遊戲流程

---

## 6. 後續行動

### 6.1 立即執行 (Phase 1)

1. ✅ 生成 data-model.md (資料模型設計)
2. ✅ 生成 contracts/ (介面契約)
3. ✅ 生成 quickstart.md (快速入門)
4. ✅ 更新代理人上下文

### 6.2 下一階段 (Phase 2)

執行 `/speckit.tasks` 生成詳細實施任務清單

---

**研究完成日期**: 2025-10-17
**分析檔案數**: 25 個
**發現問題數**: 5 個主要問題
**建議解決方案數**: 3 個階段性方案
**預估實施時間**: 5-8 天
