# Quick Start: Game UI-Engine 分離架構實作指南

**Feature**: 001-game-ui-game
**Date**: 2025-10-14
**Estimated Duration**: 4-5 週

本文檔提供快速開始實作本功能的指南，包含實作順序、關鍵步驟、測試方法等。

---

## 實作優先級總覽

```
階段 1 (1-2 週) → 建立 BC 隔離與整合事件基礎
  ├─ 目錄結構重組
  ├─ 定義整合事件介面
  ├─ 實作 EventBus
  └─ 配置 ESLint 邊界檢查

階段 2 (2-3 週) → 事件驅動重構
  ├─ 重構 game-engine UseCase 發布事件
  ├─ 實作 game-ui EventSubscriber
  ├─ 實作 GameViewModel
  └─ 整合測試與契約測試

階段 3 (1 週) → 遊戲規則修正
  ├─ 修正 Koi-Koi 計分加倍邏輯
  ├─ 補充場上 3 張配對處理
  ├─ 實作 CardMatchingService
  └─ 補充單元測試

階段 4 (可選，1 週) → 功能完整性
  ├─ 實作牌堆翻牌限時選擇
  ├─ 實作玩家放棄遊戲功能
  └─ E2E 測試
```

---

## 階段 1: 建立 BC 隔離與整合事件基礎

### 目標
- 建立清晰的 BC 目錄結構
- 定義所有整合事件介面
- 實作記憶體內 EventBus
- 確保 BC 之間完全隔離

### 步驟 1.1: 建立目錄結構

```bash
# 建立新的 BC 目錄
mkdir -p src/game-engine/{domain,application,infrastructure}
mkdir -p src/game-engine/domain/{entities,services}
mkdir -p src/game-engine/application/{usecases,ports,services}
mkdir -p src/game-engine/infrastructure/adapters

mkdir -p src/game-ui/{domain,application,infrastructure,presentation}
mkdir -p src/game-ui/domain/{models,services}
mkdir -p src/game-ui/application/{usecases,ports}
mkdir -p src/game-ui/infrastructure/adapters
mkdir -p src/game-ui/presentation/{controllers,presenters,stores}

mkdir -p src/shared/{events,constants,services}
mkdir -p src/shared/events/{base,game,ports}
```

### 步驟 1.2: 定義整合事件介面

**優先順序**: 按以下順序建立事件介面

1. **基礎事件** (`src/shared/events/base/IntegrationEvent.ts`)
   ```typescript
   export interface IntegrationEvent {
     readonly eventId: string
     readonly eventType: string
     readonly timestamp: number
     readonly sequenceNumber: number
   }
   ```

2. **核心遊戲事件** (按 data-model.md 定義)
   - `GameInitializedEvent.ts`
   - `CardPlayedEvent.ts`
   - `YakuAchievedEvent.ts`
   - `KoikoiDeclaredEvent.ts`
   - `RoundEndedEvent.ts`
   - `GameEndedEvent.ts`

3. **延後實作** (階段 4)
   - `DeckCardRevealedEvent.ts`
   - `MatchSelectionRequiredEvent.ts`
   - `MatchSelectionTimeoutEvent.ts`
   - `GameAbandonedEvent.ts`

**檢查點**:
```bash
# 確認所有事件介面都繼承 IntegrationEvent
grep -r "extends IntegrationEvent" src/shared/events/game/
```

### 步驟 1.3: 實作 EventBus

**位置**: `src/shared/events/base/EventBus.ts`

**核心功能**:
```typescript
export class EventBus implements IEventBus {
  private subscribers = new Map<string, Set<EventHandler>>()
  private sequenceNumber = 0
  private logger = new EventLogger()

  publish<T extends IntegrationEvent>(event: Omit<T, 'sequenceNumber'>): void {
    const eventWithSeq = {
      ...event,
      sequenceNumber: ++this.sequenceNumber,
      timestamp: event.timestamp || Date.now(),
      eventId: event.eventId || crypto.randomUUID(),
    } as T

    this.logger.logEventPublished(eventWithSeq)

    const handlers = this.subscribers.get(event.eventType) || new Set()
    handlers.forEach(handler => {
      try {
        handler(eventWithSeq)
      } catch (error) {
        this.logger.logEventError(eventWithSeq, error)
      }
    })
  }

  subscribe<T extends IntegrationEvent>(
    eventType: string,
    handler: (event: T) => void | Promise<void>
  ): () => void {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, new Set())
    }
    this.subscribers.get(eventType)!.add(handler as EventHandler)

    // 返回 unsubscribe 函式
    return () => {
      this.subscribers.get(eventType)?.delete(handler as EventHandler)
    }
  }
}
```

**測試**:
```bash
npm run test:unit -- src/shared/events/base/EventBus.test.ts
```

### 步驟 1.4: 配置 ESLint 邊界檢查

**位置**: `eslint.config.ts`

```typescript
{
  rules: {
    'import/no-restricted-paths': ['error', {
      zones: [
        {
          target: './src/game-engine',
          from: './src/game-ui',
          message: 'game-engine BC must not depend on game-ui BC',
        },
        {
          target: './src/game-ui',
          from: './src/game-engine',
          message: 'game-ui BC must not depend on game-engine BC',
        },
      ],
    }],
  },
}
```

**新增 npm script**:
```json
{
  "scripts": {
    "lint:boundaries": "node .specify/scripts/check-bc-boundaries.js"
  }
}
```

**測試**:
```bash
npm run lint:boundaries
```

### 階段 1 完成檢查清單

- [ ] 目錄結構已建立
- [ ] 所有核心整合事件介面已定義
- [ ] EventBus 已實作並通過單元測試
- [ ] ESLint 邊界檢查已配置並通過
- [ ] EventLogger 已實作（開發/生產模式）
- [ ] `npm run lint` 無錯誤
- [ ] `npm run test:unit` 通過

---

## 階段 2: 事件驅動重構

### 目標
- 將現有的 game-engine 邏輯改為發布整合事件
- 實作 game-ui 的 EventSubscriber 接收事件並更新 ViewModel
- 確保 UI 完全不依賴 game-engine 的內部狀態

### 步驟 2.1: 移動現有 Domain 實體到 game-engine

**移動清單**:
```bash
# 移動 Domain 實體
mv src/domain/entities/Card.ts src/game-engine/domain/entities/
mv src/domain/entities/GameState.ts src/game-engine/domain/entities/
mv src/domain/entities/Player.ts src/game-engine/domain/entities/
mv src/domain/entities/Yaku.ts src/game-engine/domain/entities/

# 移動 Domain 服務
mv src/domain/services/DeckService.ts src/game-engine/domain/services/
```

**更新 import 路徑**:
```bash
# 全域搜尋並替換
# 從: import { Card } from '@/domain/entities/Card'
# 到: import { Card } from '@game-engine/domain/entities/Card'
```

**測試**:
```bash
npm run type-check
npm run test:unit -- src/game-engine/domain/
```

### 步驟 2.2: 重構 PlayCardUseCase 發布事件

**位置**: `src/game-engine/application/usecases/PlayCardUseCase.ts`

**重構前**:
```typescript
async execute(request: PlayCardRequest): Promise<PlayCardResponse> {
  // ... 遊戲邏輯
  return { success: true, capturedCards }
}
```

**重構後**:
```typescript
async execute(request: PlayCardRequest): Promise<void> {
  // ... 遊戲邏輯（不變）

  // 發布 CardPlayedEvent
  await this.eventPublisher.publish({
    eventType: 'CardPlayed',
    playerId: request.playerId,
    playedCardId: request.cardId,
    handMatchedFieldCardId: matchedCard?.id,
    handCapturedCardIds: capturedFromHand.map(c => c.id),
    deckCardId: deckCard.id,
    deckMatchedFieldCardId: deckMatched?.id,
    deckCapturedCardIds: capturedFromDeck.map(c => c.id),
  })

  // 檢查役種
  const yakuResults = Yaku.checkYaku(currentPlayer.captured)
  if (yakuResults.length > 0) {
    await this.eventPublisher.publish({
      eventType: 'YakuAchieved',
      playerId: request.playerId,
      yakuResults: yakuResults.map(r => ({
        yaku: r.yaku,
        points: r.points,
        cardIds: r.cards.map(c => c.id),
      })),
      totalScore: yakuResults.reduce((sum, r) => sum + r.points, 0),
    })
  }
}
```

**依賴注入**:
```typescript
constructor(
  private gameRepository: IGameRepository,
  private eventPublisher: IEventPublisher  // 新增
) {}
```

**測試**:
```bash
npm run test:integration -- src/game-engine/application/usecases/PlayCardUseCase.test.ts
```

### 步驟 2.3: 實作 GameViewModel

**位置**: `src/game-ui/domain/models/GameViewModel.ts`

```typescript
export class GameViewModel {
  private gameId: string = ''
  private currentRound: number = 1
  private currentPhase: GamePhase = 'setup'
  private currentPlayerId: string = ''
  private players: PlayerViewModel[] = []
  private fieldCardIds: string[] = []
  private deckCardCount: number = 0
  private lastEventSequence: number = 0

  applyEvent(event: IntegrationEvent): void {
    switch (event.eventType) {
      case 'GameInitialized':
        this.applyGameInitialized(event as GameInitializedEvent)
        break
      case 'CardPlayed':
        this.applyCardPlayed(event as CardPlayedEvent)
        break
      case 'YakuAchieved':
        this.applyYakuAchieved(event as YakuAchievedEvent)
        break
      // ... 其他事件
    }
    this.lastEventSequence = event.sequenceNumber
  }

  private applyGameInitialized(event: GameInitializedEvent): void {
    // 完整替換狀態
    this.gameId = event.gameState.gameId
    this.currentRound = event.gameState.currentRound
    // ...
  }

  private applyCardPlayed(event: CardPlayedEvent): void {
    // 增量更新狀態
    const player = this.players.find(p => p.id === event.playerId)
    if (!player) return

    player.removeFromHand(event.playedCardId)
    // ...
  }
}
```

**測試**:
```bash
npm run test:unit -- src/game-ui/domain/models/GameViewModel.test.ts
```

### 步驟 2.4: 實作 GameUIEventSubscriber

**位置**: `src/game-ui/application/usecases/UpdateGameViewUseCase.ts`

```typescript
export class UpdateGameViewUseCase {
  constructor(
    private viewModel: GameViewModel,
    private presenter: IUIPresenter
  ) {}

  async handleEvent(event: IntegrationEvent): Promise<void> {
    // 檢查序號連續性
    if (event.sequenceNumber !== this.viewModel.lastEventSequence + 1) {
      console.warn(`Event sequence gap detected`)
      await this.requestFullStateSync()
      return
    }

    // 更新 ViewModel
    this.viewModel.applyEvent(event)

    // 通知 Presenter 更新 UI
    await this.presenter.updateView(this.viewModel)
  }
}
```

**在 main.ts 中訂閱事件**:
```typescript
// main.ts
const eventBus = new EventBus()
const viewModel = new GameViewModel()
const updateViewUseCase = new UpdateGameViewUseCase(viewModel, presenter)

eventBus.subscribe('GameInitialized', (event) => updateViewUseCase.handleEvent(event))
eventBus.subscribe('CardPlayed', (event) => updateViewUseCase.handleEvent(event))
eventBus.subscribe('YakuAchieved', (event) => updateViewUseCase.handleEvent(event))
// ... 訂閱所有事件
```

### 階段 2 完成檢查清單

- [ ] 所有 Domain 實體已移動到 game-engine BC
- [ ] PlayCardUseCase 已重構為發布事件
- [ ] GameViewModel 已實作並通過單元測試
- [ ] UpdateGameViewUseCase 已實作
- [ ] 事件訂閱已在 main.ts 配置
- [ ] 整合測試通過（game-engine 發布事件 → game-ui 接收並更新）
- [ ] UI 功能正常運作（手動測試）

---

## 階段 3: 遊戲規則修正

### 目標
- 修正 research.md 中指出的遊戲規則實作問題
- 確保遊戲邏輯正確性

### 步驟 3.1: 修正 Koi-Koi 計分加倍邏輯

**位置**: `src/game-engine/application/usecases/CalculateScoreUseCase.ts`

**問題**: 未正確處理所有 Koi-Koi 加倍情境

**修正**:
```typescript
calculateFinalScore(
  player1Score: number,
  player2Score: number,
  koikoiPlayer: string | null
): { player1FinalScore: number; player2FinalScore: number } {
  if (!koikoiPlayer) {
    return { player1FinalScore: player1Score, player2FinalScore: player2Score }
  }

  // 判斷誰是獲勝者
  const winner = this.determineWinner(player1Score, player2Score)

  if (winner === 'player1' && koikoiPlayer === 'player1') {
    // 宣告者獲勝，自己加倍
    return { player1FinalScore: player1Score * 2, player2FinalScore: 0 }
  } else if (winner === 'player2' && koikoiPlayer === 'player1') {
    // 對手獲勝，對手加倍，宣告者 0 分
    return { player1FinalScore: 0, player2FinalScore: player2Score * 2 }
  } else if (winner === 'player1' && koikoiPlayer === 'player2') {
    return { player1FinalScore: player1Score * 2, player2FinalScore: 0 }
  } else if (winner === 'player2' && koikoiPlayer === 'player2') {
    return { player1FinalScore: 0, player2FinalScore: player2Score * 2 }
  } else {
    // 平局
    return { player1FinalScore: 0, player2FinalScore: 0 }
  }
}
```

**測試案例**:
```typescript
describe('CalculateScore - Koi-Koi 加倍規則', () => {
  it('宣告 Koi-Koi 後自己獲勝，分數加倍', () => {
    // player1 有 5 張種 = 1 分，宣告 Koi-Koi
    const result = calculateScore(1, 0, 'player1')
    expect(result.player1FinalScore).toBe(2) // 1 * 2
    expect(result.player2FinalScore).toBe(0)
  })

  it('宣告 Koi-Koi 後對手獲勝，對手加倍，自己 0 分', () => {
    // player1 宣告 Koi-Koi，但 player2 湊成三光 = 5 分
    const result = calculateScore(0, 5, 'player1')
    expect(result.player1FinalScore).toBe(0)
    expect(result.player2FinalScore).toBe(10) // 5 * 2
  })
})
```

### 步驟 3.2: 補充場上 3 張配對處理

**位置**: `src/game-engine/application/usecases/PlayCardUseCase.ts:35-78`

**問題**: 未處理場上有 3 張同月份牌的情況

**修正**:
```typescript
const fieldMatches = gameState.getFieldMatches(playedCard)

if (fieldMatches.length === 3) {
  // 自動捕獲全部 3 張（三枚合わせ）
  const removedCards = gameState.removeFromField(fieldMatches.map(c => c.id))
  capturedCards = [playedCard, ...removedCards]
  currentPlayer.addToCaptured(capturedCards)
} else if (fieldMatches.length === 2) {
  // 需要玩家選擇
  if (!request.selectedFieldCardId) {
    throw new Error('errors.multipleMatchesFound')
  }
  // ... 處理玩家選擇
} else if (fieldMatches.length === 1) {
  // 自動配對
  // ...
} else {
  // 無配對，放置到場上
  gameState.addToField([playedCard])
}
```

**測試案例**:
```typescript
describe('PlayCard - 場上 3 張配對', () => {
  it('場上有 3 張同月份牌，應自動捕獲全部', async () => {
    // 場上有 2 月カス×3
    const result = await playCardUseCase.execute({
      playerId: 'player1',
      cardId: '2-plain-0', // 2 月カス
    })

    expect(result.handCapturedCardIds).toHaveLength(4) // 1 手牌 + 3 場牌
  })
})
```

### 步驟 3.3: 實作 CardMatchingService

**位置**: `src/shared/services/CardMatchingService.ts`

```typescript
export interface ICardMatchingService {
  findMatches(card: Card, fieldCards: readonly Card[]): Card[]
  autoSelect(card: Card, fieldCards: readonly Card[]): Card
}

export class CardMatchingService implements ICardMatchingService {
  findMatches(card: Card, fieldCards: readonly Card[]): Card[] {
    return fieldCards.filter(fc => card.suit === fc.suit)
  }

  autoSelect(card: Card, fieldCards: readonly Card[]): Card {
    // 按點數排序：光20 > 種10 > 短5 > カス1
    const sorted = [...fieldCards].sort((a, b) => b.points - a.points)
    return sorted[0]
  }
}
```

### 階段 3 完成檢查清單

- [ ] Koi-Koi 計分加倍邏輯已修正並通過所有測試
- [ ] 場上 3 張配對已補充實作並通過測試
- [ ] CardMatchingService 已實作並通過測試
- [ ] 所有遊戲規則單元測試通過
- [ ] 手動遊玩測試無邏輯錯誤

---

## 階段 4（可選）: 功能完整性

### 目標
- 實作牌堆翻牌限時選擇機制
- 實作玩家放棄遊戲功能
- 完成 E2E 測試

### 步驟 4.1: 實作牌堆翻牌限時選擇

**整合事件**:
1. `DeckCardRevealedEvent`
2. `MatchSelectionRequiredEvent`
3. `MatchSelectionTimeoutEvent`

**game-engine 流程**:
```typescript
// PlayCardUseCase.ts
const deckMatches = gameState.getFieldMatches(deckCard)

if (deckMatches.length >= 2) {
  // 發布需要選擇事件
  await this.eventPublisher.publish({
    eventType: 'DeckCardRevealed',
    deckCardId: deckCard.id,
    matchableFieldCardIds: deckMatches.map(c => c.id),
  })

  await this.eventPublisher.publish({
    eventType: 'MatchSelectionRequired',
    sourceCardId: deckCard.id,
    sourceType: 'deck',
    selectableFieldCardIds: deckMatches.map(c => c.id),
    timeoutMs: 10000,
  })

  // 暫停執行，等待玩家選擇或超時
  // ... (需要額外的狀態管理)
}
```

**game-ui 流程**:
```typescript
// UpdateGameViewUseCase.ts
async handleMatchSelectionRequired(event: MatchSelectionRequiredEvent): Promise<void> {
  // 顯示選擇 UI
  this.presenter.showMatchSelection(event.selectableFieldCardIds)

  // 啟動倒數計時器
  const timeout = setTimeout(() => {
    this.presenter.hideMatchSelection()
    // 超時後由 game-engine 自動選擇
  }, event.timeoutMs)

  // 等待玩家選擇
  this.presenter.onMatchSelected((selectedCardId) => {
    clearTimeout(timeout)
    // 發送選擇指令到 game-engine
    this.selectMatchCommand.execute({ selectedCardId })
  })
}
```

### 步驟 4.2: 實作玩家放棄遊戲

**整合事件**: `GameAbandonedEvent`

**game-engine UseCase**:
```typescript
// AbandonGameUseCase.ts
export class AbandonGameUseCase {
  async execute(request: { gameId: string; playerId: string }): Promise<void> {
    const game = await this.gameRepository.findById(request.gameId)
    const opponent = game.getOpponent(request.playerId)

    await this.eventPublisher.publish({
      eventType: 'GameAbandoned',
      abandonedPlayerId: request.playerId,
      winnerId: opponent.id,
      currentRound: game.round,
      phase: game.phase,
    })

    await this.eventPublisher.publish({
      eventType: 'GameEnded',
      winnerId: opponent.id,
      reason: 'player_abandoned',
      finalResult: {
        playerFinalScores: [
          { playerId: opponent.id, totalScore: opponent.totalScore, roundsWon: 1 },
          { playerId: request.playerId, totalScore: 0, roundsWon: 0 },
        ],
        roundsPlayed: game.round,
      },
    })
  }
}
```

**game-ui Controller**:
```typescript
// GameController.ts
async abandonGame(): Promise<void> {
  const confirmed = await this.presenter.showConfirmDialog(
    '確定要放棄遊戲嗎？對手將自動獲勝。'
  )

  if (confirmed) {
    await this.abandonGameUseCase.execute({
      gameId: this.gameId,
      playerId: this.currentPlayerId,
    })
  }
}
```

### 階段 4 完成檢查清單

- [ ] 牌堆翻牌限時選擇已實作
- [ ] 玩家放棄遊戲已實作
- [ ] E2E 測試涵蓋主要遊玩流程
- [ ] 所有功能需求（spec.md FR-001 ~ FR-019）已達成

---

## 測試策略

### 單元測試

**執行**: `npm run test:unit`

**涵蓋範圍**:
- Domain Layer: Entity、Value Object、Domain Service
- 整合事件結構驗證
- EventBus 功能測試
- GameViewModel 狀態更新測試

**目標覆蓋率**: 90%+

### 整合測試

**執行**: `npm run test:integration`

**涵蓋範圍**:
- UseCase 編排測試
- 事件發布與訂閱流程
- BC 間事件通訊測試

**目標覆蓋率**: 80%+

### 契約測試

**執行**: `npm run test:contract`

**涵蓋範圍**:
- 驗證 game-engine 發布的事件符合 JSON Schema
- 驗證 game-ui 能正確處理符合契約的事件

### E2E 測試

**執行**: `npm run test:e2e`

**涵蓋範圍**:
- 完整遊玩一局遊戲
- Koi-Koi 宣告流程
- 玩家放棄遊戲流程

---

## 開發工具配置

### VS Code 擴充套件

建議安裝：
- ESLint
- Prettier
- Vue Language Features (Volar)
- TypeScript Vue Plugin (Volar)

### TypeScript Path Mapping

**tsconfig.json**:
```json
{
  "compilerOptions": {
    "paths": {
      "@game-engine/*": ["./src/game-engine/*"],
      "@game-ui/*": ["./src/game-ui/*"],
      "@shared/*": ["./src/shared/*"]
    }
  }
}
```

### Vite Alias 配置

**vite.config.ts**:
```typescript
export default defineConfig({
  resolve: {
    alias: {
      '@game-engine': path.resolve(__dirname, './src/game-engine'),
      '@game-ui': path.resolve(__dirname, './src/game-ui'),
      '@shared': path.resolve(__dirname, './src/shared'),
    },
  },
})
```

---

## 常見問題

### Q1: 如何在開發時查看事件日誌？

**A**: 開發模式下，EventLogger 會將所有事件記錄到 console：
```bash
npm run dev
# 打開瀏覽器 Console，可看到：
# 📤 [Event Published] CardPlayed (seq: 10) {...}
```

### Q2: 如何手動觸發完整狀態同步？

**A**: 在 Vue DevTools 或 Console 中執行：
```javascript
window.__eventBus.publish({
  eventType: 'RequestFullStateSync',
  // ...
})
```

### Q3: 如何驗證 BC 邊界沒有被違反？

**A**: 執行邊界檢查腳本：
```bash
npm run lint:boundaries
# 或在 CI 中自動執行
```

### Q4: EventBus 序號如何重置？

**A**: 只在遊戲初始化時重置：
```typescript
const eventBus = new EventBus()
// 序號從 1 開始，遊戲結束後不重置
```

---

## 參考資料

- [plan.md](./plan.md) - 完整實作計劃
- [research.md](./research.md) - 技術研究與決策
- [data-model.md](./data-model.md) - 資料模型定義
- [contracts/](./contracts/) - 整合事件契約
- [spec.md](./spec.md) - 功能規格

---

## 實作進度追蹤

使用 GitHub Issues 或專案管理工具追蹤進度：

- [ ] 階段 1: BC 隔離與整合事件基礎
- [ ] 階段 2: 事件驅動重構
- [ ] 階段 3: 遊戲規則修正
- [ ] 階段 4: 功能完整性（可選）

**預計完成日期**: 依階段規劃約 4-5 週
