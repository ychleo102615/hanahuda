# Data Model: UI Animation Refactor

**Feature**: 005-ui-animation-refactor
**Date**: 2025-11-21
**Layer**: Adapter Layer (User Interface BC)

本文檔定義動畫系統重構所需的資料模型，**首要是 Output Ports 重構的介面定義**，其次是 ZoneRegistry、動畫類型擴展、拖曳狀態等。

---

## 1. Output Ports Models (P2 Priority)

### 1.1 AnimationPort

動畫系統介面，提供可 await 的動畫 API。

```typescript
export interface AnimationPort {
  // 高階動畫 API
  playDealAnimation(params: DealAnimationParams): Promise<void>        // 回合開始批量發牌
  playCardToFieldAnimation(cardId: string, fromHand: boolean): Promise<void>  // 手牌打到場上
  playMatchAnimation(handCardId: string, fieldCardId: string): Promise<void>  // 配對合併效果
  playToDepositoryAnimation(cardIds: string[], targetType: CardType): Promise<void>  // 移至獲得區
  playFlipFromDeckAnimation(cardId: string): Promise<void>             // 翻牌階段單張翻牌

  // 控制
  interrupt(): void
  isAnimating(): boolean

  // 區域註冊
  registerZone(zoneName: ZoneName, element: HTMLElement): void
  unregisterZone(zoneName: ZoneName): void
}
```

### 1.2 NotificationPort

通知系統介面，管理 Modal、Toast、選擇 UI。

```typescript
export interface NotificationPort {
  // 選擇 UI
  showSelectionUI(possibleTargets: string[]): void
  hideSelectionUI(): void

  // Modal
  showDecisionModal(currentYaku: YakuScore[], currentScore: number): void
  showGameFinishedUI(winnerId: string, finalScores: PlayerScore[], isPlayerWinner: boolean): void
  showRoundDrawnUI(currentTotalScores: PlayerScore[]): void

  // Toast
  showErrorMessage(message: string): void
  showSuccessMessage(message: string): void
  showReconnectionMessage(): void

  // 查詢
  isModalVisible(): boolean
}
```

### 1.3 GameStatePort

遊戲狀態介面（原 UIStatePort 重新命名）。

```typescript
export interface GameStatePort {
  // 初始化
  initializeGameContext(gameId: string, players: PlayerInfo[], ruleset: Ruleset): void
  restoreGameState(snapshot: GameSnapshotRestore): void

  // 狀態更新
  setFlowStage(stage: FlowState): void
  setActivePlayer(playerId: string): void
  updateFieldCards(cards: string[]): void
  updateHandCards(cards: string[]): void
  updateOpponentHandCount(count: number): void
  updateDepositoryCards(playerCards: string[], opponentCards: string[]): void
  updateScores(playerScore: number, opponentScore: number): void
  updateDeckRemaining(count: number): void
  updateYaku(playerYaku: YakuScore[], opponentYaku: YakuScore[]): void

  // 查詢
  getLocalPlayerId(): string
  getFieldCards(): string[]
  getDepositoryCards(playerId: string): string[]
}
```

### 1.4 DealAnimationParams

發牌動畫參數。

```typescript
interface DealAnimationParams {
  fieldCards: string[]
  playerHandCards: string[]
  opponentHandCount: number
}
```

---

## 2. Zone Registry Models

### 1.1 ZonePosition

區域位置資訊，記錄各區域的螢幕座標。

```typescript
interface ZonePosition {
  readonly zoneName: ZoneName
  readonly rect: DOMRect  // x, y, width, height, top, left, right, bottom
}

type ZoneName =
  | 'deck'               // 牌堆
  | 'field'              // 場牌區
  | 'player-hand'        // 玩家手牌
  | 'opponent-hand'      // 對手手牌
  | 'player-depository'  // 玩家獲得區
  | 'opponent-depository' // 對手獲得區
  | `player-depository-${CardType}`   // 玩家獲得區分組
  | `opponent-depository-${CardType}` // 對手獲得區分組
```

**Validation Rules**:
- rect.width > 0
- rect.height > 0

### 1.2 Position

簡化的螢幕座標。

```typescript
interface Position {
  readonly x: number  // 螢幕 X 座標 (px)
  readonly y: number  // 螢幕 Y 座標 (px)
}
```

### 1.3 ZoneRegistry

區域位置註冊表，管理所有區域的位置追蹤。

```typescript
interface ZoneRegistry {
  // Core operations
  register(zoneName: ZoneName, element: HTMLElement): void
  unregister(zoneName: ZoneName): void

  // Queries
  getPosition(zoneName: ZoneName): ZonePosition | null
  getCardPosition(zoneName: ZoneName, cardIndex: number): Position
  getAllZones(): ZoneName[]

  // Lifecycle
  dispose(): void  // 清理所有 observers
}
```

**Internal State**:
```typescript
class ZoneRegistryImpl implements ZoneRegistry {
  private zones: Map<ZoneName, {
    element: HTMLElement
    position: ZonePosition
    observer: ResizeObserver
  }>
}
```

---

## 2. Animation Models (Extended)

### 2.1 AnimationType (Extended)

擴展現有動畫類型以支援新功能。

```typescript
type AnimationType =
  // 現有 (P1)
  | 'DEAL_CARDS'      // 發牌動畫
  | 'CARD_MOVE'       // 卡片移動動畫
  // 新增
  | 'CARD_MERGE'      // 配對合併效果
  | 'CARDS_TO_DEPOSITORY'  // 配對牌移動至獲得區
```

### 2.2 CardMoveParams (Refactored)

重構卡片移動參數以使用實際螢幕座標。

```typescript
interface CardMoveParams {
  cardId: string
  from: Position          // 起點螢幕座標
  to: Position            // 終點螢幕座標
  duration: number        // 動畫時長 (ms)
  easing?: 'spring' | 'ease-out'  // 默認 spring
}
```

### 2.3 DealCardsParams (Refactored)

重構發牌參數以包含完整的卡片和位置資訊。

```typescript
interface DealCardsParams {
  cards: {
    cardId: string
    targetZone: ZoneName
    targetIndex: number   // 在目標區域中的索引
  }[]
  delay: number           // 每張卡片延遲 (ms)
  duration: number        // 單張動畫時長 (ms)
}
```

### 2.4 CardMergeParams (New)

配對合併效果參數。

```typescript
interface CardMergeParams {
  handCardId: string      // 手牌 ID
  fieldCardId: string     // 場牌 ID
  mergePosition: Position // 合併位置（場牌位置）
  duration: number        // 合併效果時長 (ms)
}
```

### 2.5 CardsToDepositoryParams (New)

配對牌移動至獲得區參數。

```typescript
interface CardsToDepositoryParams {
  cardIds: [string, string]  // 配對的兩張牌
  from: Position             // 起點（合併位置）
  to: Position               // 終點（獲得區分組位置）
  duration: number           // 動畫時長 (ms)
}
```

---

## 3. Drag State Models

### 3.1 DragState

拖曳狀態管理。

```typescript
interface DragState {
  isDragging: boolean
  draggedCardId: string | null
  currentPosition: Position | null
  dropTargets: DropTarget[]
}

interface DropTarget {
  zoneName: ZoneName
  cardId: string        // 可配對的場牌 ID
  position: Position
  isValid: boolean      // 是否為有效放置目標
}
```

### 3.2 DragEvent Payloads

拖曳事件資料。

```typescript
interface DragStartPayload {
  cardId: string
  startPosition: Position
}

interface DragMovePayload {
  cardId: string
  currentPosition: Position
  nearestTarget: DropTarget | null
}

interface DragEndPayload {
  cardId: string
  endPosition: Position
  droppedTarget: DropTarget | null  // null = 無效放置
}
```

---

## 4. Depository Grouping Models

### 4.1 GroupedDepository

獲得區分組資料結構。

```typescript
interface GroupedDepository {
  BRIGHT: Card[]   // 光牌
  ANIMAL: Card[]   // 種牌
  RIBBON: Card[]   // 短冊
  PLAIN: Card[]    // かす
}

// Computed 計算範例
function groupByCardType(cardIds: string[]): GroupedDepository {
  const cards = cardIds.map(id => getCardById(id))
  return {
    BRIGHT: cards.filter(c => c.type === 'BRIGHT'),
    ANIMAL: cards.filter(c => c.type === 'ANIMAL'),
    RIBBON: cards.filter(c => c.type === 'RIBBON'),
    PLAIN: cards.filter(c => c.type === 'PLAIN'),
  }
}
```

### 4.2 DepositoryGroupDisplay

分組顯示資訊。

```typescript
interface DepositoryGroupDisplay {
  type: CardType
  cards: Card[]
  count: number
  isEmpty: boolean
}
```

---

## 5. Deck Zone Models

### 5.1 DeckState

牌堆狀態。

```typescript
interface DeckState {
  remaining: number       // 剩餘張數 (0-24)
  visualLayers: number    // 視覺堆疊層數 (1-4)
}

// 視覺層數計算
function calculateVisualLayers(remaining: number): number {
  if (remaining >= 16) return 4
  if (remaining >= 8) return 3
  if (remaining >= 1) return 2
  return 1
}
```

---

## 6. Animation State Models

### 6.1 AnimationUIState

UI 層動畫狀態（擴展 UIStateStore）。

```typescript
interface AnimationUIState {
  isAnimating: boolean              // 是否有動畫進行中
  blockUserInput: boolean           // 是否阻止用戶操作
  currentAnimationType: AnimationType | null
  animationProgress: number         // 0-1
}
```

---

## 7. Existing Model Integration

### 7.1 Card (Domain Layer - 已存在)

```typescript
// 來自 src/user-interface/domain/types.ts
interface Card {
  readonly card_id: string
  readonly month: number
  readonly type: CardType
  readonly display_name: string
}

type CardType = 'BRIGHT' | 'ANIMAL' | 'RIBBON' | 'PLAIN'
```

### 7.2 GameState Store Integration

新增到 GameStateStore 的 computed properties：

```typescript
// gameState.ts 新增
const groupedMyDepository = computed<GroupedDepository>(() =>
  groupByCardType(myDepository.value)
)

const groupedOpponentDepository = computed<GroupedDepository>(() =>
  groupByCardType(opponentDepository.value)
)
```

---

## 8. State Transitions

### 8.1 Animation Lifecycle

```
pending → running → completed
                 ↘ interrupted
```

### 8.2 Drag Lifecycle

```
idle → dragging → dropped (success)
              ↘ cancelled (invalid drop)
```

---

## 9. Relationships

```
ZoneRegistry
    │
    ├── ZonePosition (many)
    │       │
    │       └── DOMRect
    │
AnimationService
    │
    ├── AnimationQueue
    │       │
    │       └── Animation (many)
    │               │
    │               ├── AnimationType
    │               └── AnimationParams
    │
DragState
    │
    ├── DropTarget (many)
    │
GameStateStore
    │
    ├── GroupedDepository (computed)
    │       │
    │       └── Card (many per type)
    │
    └── DeckState
```

---

## 10. Validation Summary

| Model | Validation Rules |
|-------|-----------------|
| ZonePosition | rect dimensions > 0 |
| Position | x, y are finite numbers |
| CardMoveParams | cardId is valid, duration > 0 |
| DealCardsParams | cards.length <= 16, delay > 0 |
| DragState | draggedCardId valid when isDragging |
| DeckState | 0 <= remaining <= 24 |
