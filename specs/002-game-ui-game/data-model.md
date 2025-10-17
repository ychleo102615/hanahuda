# Data Model Design: Game-UI 與 Game-Engine BC 徹底分離

**Feature Branch**: `002-game-ui-game`
**Date**: 2025-10-17
**Status**: Design Complete

## Overview

本文檔定義 game-engine 和 game-ui 兩個 Bounded Context 的資料模型。根據 DDD 原則,兩個 BC 之間僅透過整合事件通訊,不直接傳遞 Entity。

---

## 1. game-engine BC 資料模型

### 1.1 Domain Entities (領域實體)

#### **GameState** (遊戲狀態)

**檔案**: `src/game-engine/domain/entities/GameState.ts`

**屬性**:
```typescript
class GameState {
  // 基本資訊
  readonly players: readonly Player[]
  readonly deck: readonly Card[]
  readonly field: readonly Card[]
  readonly round: number
  readonly phase: GamePhase  // 'setup' | 'playing' | 'koikoi' | 'round_end' | 'game_end'
  readonly currentPlayerIndex: number

  // 遊戲狀態
  readonly koikoiPlayer: string | null
  readonly lastMove: LastMove | null
  readonly roundResult: RoundResult | null

  // 方法
  addToField(cards: Card[]): void
  removeFromField(cards: Card[]): void
  nextPlayer(): void
  nextRound(): void
  setPhase(phase: GamePhase): void
  setKoikoiPlayer(playerId: string): void
  setRoundResult(result: RoundResult): void
}
```

**關係**:
- 包含 2 個 Player 實體
- 包含多個 Card 值物件
- 聚合根 (Aggregate Root)

#### **Player** (玩家)

**檔案**: `src/game-engine/domain/entities/Player.ts`

**屬性**:
```typescript
class Player {
  readonly id: string
  readonly name: string
  readonly isHuman: boolean
  readonly hand: readonly Card[]
  readonly captured: readonly Card[]
  readonly score: number
  readonly roundScore: number

  // 方法
  playCard(card: Card): Card
  addToCaptured(cards: Card[]): void
  addScore(points: number): void
  resetRound(): void
}
```

**關係**:
- 被 GameState 包含
- 擁有多個 Card 值物件

#### **Card** (卡片) - Value Object

**檔案**: `src/game-engine/domain/entities/Card.ts`

**屬性**:
```typescript
class Card {
  readonly id: string  // 唯一識別碼
  readonly suit: Suit  // 'jan' | 'feb' | ... | 'dec' (12 個月份)
  readonly type: CardType  // 'hikari' | 'tane' | 'tanzaku' | 'kasu'
  readonly points: number  // 20 | 10 | 5 | 1
  readonly name: string  // 卡片名稱 (如 "Pine with Crane")
}
```

**特性**:
- 不可變 (Immutable)
- 值物件 (Value Object)
- 可以跨 BC 傳遞 (因為是值物件)

#### **Yaku** (役種) - Value Object

**檔案**: `src/game-engine/domain/entities/Yaku.ts`

**屬性**:
```typescript
interface Yaku {
  readonly name: YakuName
  readonly points: number
  readonly requiredCards: readonly CardRequirement[]
}

type YakuName =
  | 'GoKo'          // 五光 (50 pts)
  | 'ShiKo'         // 四光 (40 pts)
  | 'AmeShiKo'      // 雨四光 (35 pts)
  | 'SanKo'         // 三光 (30 pts)
  | 'Inoshikacho'   // 猪鹿蝶 (15 pts)
  | 'Hanami'        // 花見酒 (10 pts)
  | 'Tsukimi'       // 月見酒 (10 pts)
  | 'Tane'          // 種 (10 pts + 1/card)
  | 'Tanzaku'       // 短冊 (10 pts + 1/card)
  | 'Kasu'          // カス (10 pts + 1/card)
```

**YakuResult** (役種結果):
```typescript
interface YakuResult {
  readonly yaku: Yaku
  readonly cards: readonly Card[]
  readonly points: number
}
```

### 1.2 Domain Services (領域服務)

#### **DeckService** (牌組服務)

**檔案**: `src/game-engine/domain/services/DeckService.ts`

**職責**:
- 建立標準 48 張花牌
- 洗牌
- 發牌

**方法**:
```typescript
class DeckService {
  static createStandardDeck(): Card[]
  static shuffleDeck(deck: Card[]): Card[]
  static dealCards(deck: Card[], handSize: number, fieldSize: number): DealResult
}
```

#### **EngineCardMatchingService** (卡片配對服務)

**檔案**: `src/game-engine/domain/services/EngineCardMatchingService.ts`

**職責**:
- 計算卡片配對
- 實作 ICardMatchingService 介面 (from shared)

**方法**:
```typescript
class EngineCardMatchingService implements ICardMatchingService {
  findMatchingCards(card: Card, fieldCards: readonly Card[]): Card[]
  canMatch(card1: Card, card2: Card): boolean
}
```

### 1.3 Application DTOs (資料傳輸物件)

#### **Input DTOs** (輸入 DTO)

**檔案**: `src/game-engine/application/dto/GameInputDTO.ts`

```typescript
// 開始遊戲
export interface StartGameInputDTO {
  player1Name: string
  player2Name: string
}

// 出牌
export interface PlayCardInputDTO {
  playerId: string
  cardId: string
  selectedFieldCard?: string  // 多重配對時需要
}

// 來來決策
export interface KoikoiDecisionInputDTO {
  playerId: string
  declareKoikoi: boolean
}

// 放棄遊戲
export interface AbandonGameInputDTO {
  gameId: string
  abandoningPlayerId: string
  reason: 'user_quit' | 'timeout' | 'connection_lost'
}
```

#### **Internal DTOs** (內部 DTO)

**檔案**: `src/game-engine/application/dto/GameResultDTO.ts`

```typescript
// UseCase 內部使用,不跨越 BC 邊界
export interface SetUpGameResult {
  success: boolean
  gameId: string
  error?: string
}

export interface SetUpRoundResult {
  success: boolean
  gameState?: GameState  // 僅在 UseCase 之間傳遞
  error?: string
}
```

**注意**: 這些 DTO 僅在 game-engine BC 內部使用,不會跨越 BC 邊界。

### 1.4 Application Ports (應用層介面)

#### **IGameStateRepository** (遊戲狀態儲存庫)

**檔案**: `src/game-engine/application/ports/IGameStateRepository.ts`

```typescript
export interface IGameStateRepository {
  /**
   * 創建新遊戲,返回遊戲 ID
   */
  createGame(): Promise<string>

  /**
   * 取得遊戲狀態
   */
  getGameState(gameId: string): Promise<GameState | null>

  /**
   * 儲存遊戲狀態
   */
  saveGameState(gameId: string, gameState: GameState): Promise<boolean>

  /**
   * 刪除遊戲
   */
  deleteGame(gameId: string): Promise<boolean>
}
```

**設計原則**:
- 僅負責資料持久化
- 不包含業務邏輯
- 介面最小化 (4 個方法)

#### **IEventPublisher** (事件發布者)

**檔案**: `src/game-engine/application/ports/IEventPublisher.ts`

```typescript
// 實際定義在 shared/events/ports/IEventPublisher.ts
export type { IEventPublisher } from '@/shared/events/ports/IEventPublisher'
```

```typescript
// shared/events/ports/IEventPublisher.ts
export interface IEventPublisher {
  /**
   * 發布整合事件
   */
  publishEvent(event: IntegrationEvent): Promise<void>

  /**
   * 取得下一個序列號
   */
  getNextSequenceNumber(): number
}
```

---

## 2. game-ui BC 資料模型

### 2.1 Domain Models (領域模型)

#### **GameViewModel** (遊戲視圖模型)

**檔案**: `src/game-ui/domain/models/GameViewModel.ts`

**屬性**:
```typescript
class GameViewModel {
  readonly gameId: string
  readonly currentRound: number
  readonly maxRounds: number
  readonly phase: GamePhase
  readonly currentPlayerId: string | null

  // 卡片資料 (使用 ID 而非 Entity)
  readonly fieldCardIds: readonly string[]
  readonly deckCardCount: number

  // 玩家資料
  readonly players: readonly PlayerViewModel[]

  // 完整的卡片定義 (供 UI 查詢)
  readonly cardDefinitions: readonly CardDefinition[]

  // 事件追蹤
  readonly lastEventSequence: number
  readonly lastEventType: string | null

  // 回合結果
  readonly roundResult: RoundResultView | null

  // 不可變更新方法
  withPlayers(players: readonly PlayerViewModel[]): GameViewModel
  withPhase(phase: GamePhase): GameViewModel
  withFieldCards(cardIds: readonly string[]): GameViewModel
  withRoundResult(result: RoundResultView | null): GameViewModel
  // ... 其他 with 方法
}
```

**設計特點**:
- ✅ 不可變 (Immutable) - 所有更新返回新實例
- ✅ 僅包含 UI 需要的資料
- ✅ 使用 Card ID 而非 Entity
- ✅ 包含完整卡片定義供 UI 查詢

#### **PlayerViewModel** (玩家視圖模型)

**檔案**: `src/game-ui/domain/models/PlayerViewModel.ts`

**屬性**:
```typescript
class PlayerViewModel {
  readonly id: string
  readonly name: string
  readonly isHuman: boolean

  // 卡片 ID (而非 Entity)
  readonly handCardIds: readonly string[]
  readonly capturedCardIds: readonly string[]

  // 分數
  readonly totalScore: number
  readonly roundScore: number

  // 統計
  readonly handCardCount: number
  readonly capturedCardCount: number

  // 不可變更新方法
  withHand(cardIds: readonly string[]): PlayerViewModel
  withCaptured(cardIds: readonly string[]): PlayerViewModel
  withScore(total: number, round: number): PlayerViewModel
  // ... 其他 with 方法
}
```

**設計特點**:
- ✅ 不可變 (Immutable)
- ✅ 僅包含 UI 需要的資料
- ✅ 使用 Card ID 而非 Entity

#### **CardDefinition** (卡片定義) - Value Object

**檔案**: `src/game-ui/domain/models/GameViewModel.ts` (內部定義)

```typescript
export interface CardDefinition {
  readonly id: string
  readonly suit: Suit
  readonly type: CardType
  readonly points: number
  readonly name?: string  // 可選,用於顯示
}
```

**用途**:
- 在 GameViewModel 中提供完整卡片資料
- 供 UI components 根據 ID 查詢卡片資訊
- 避免在每個事件中重複傳遞卡片資料

#### **RoundResultView** (回合結果視圖)

```typescript
export interface RoundResultView {
  readonly winnerId: string | null
  readonly winnerName: string | null
  readonly score: number
  readonly yakuNames: readonly string[]
  readonly koikoiDeclared: boolean
}
```

### 2.2 Domain Services (領域服務)

#### **UICardMatchingService** (UI 卡片配對服務)

**檔案**: `src/game-ui/domain/services/UICardMatchingService.ts`

**職責**:
- 計算可配對的場牌 (供 UI 高亮顯示)
- 實作 ICardMatchingService 介面 (from shared)

**方法**:
```typescript
class UICardMatchingService implements ICardMatchingService {
  findMatchingCards(
    handCardId: string,
    fieldCardIds: readonly string[],
    cardDefinitions: readonly CardDefinition[]
  ): string[]

  canMatch(card1: CardDefinition, card2: CardDefinition): boolean
}
```

**差異**:
- 使用 Card ID 而非 Card Entity
- 接受 CardDefinition 陣列作為資料來源

### 2.3 Application Ports (應用層介面)

#### **IUIPresenter** (UI 展示者)

**檔案**: `src/game-ui/application/ports/IUIPresenter.ts`

```typescript
export interface IUIPresenter {
  // 狀態更新
  presentStateUpdate(gameViewModel: GameViewModel): void
  presentGameState(gameViewModel: GameViewModel): void

  // 動畫
  presentCardPlayAnimation(cardId: string, targetArea: 'field' | 'captured'): void
  presentDeckRevealAnimation(cardId: string): void
  presentTurnTransition(fromPlayerId: string, toPlayerId: string): void

  // UI 元素
  presentYakuAchievement(yakuNames: string[], score: number): void
  presentKoikoiDialog(show: boolean): void
  presentMatchSelection(matchingCardIds: string[]): void
  clearMatchSelection(): void
  clearKoikoiDialog(): void

  // 遊戲結束
  presentRoundEnd(winnerId: string | null, score: number): void
  presentGameEnd(winnerId: string | null, finalScore: number): void

  // 訊息與錯誤
  presentMessage(messageKey: string, params?: Record<string, string | number>): void
  presentError(errorKey: string, params?: Record<string, string | number>): void
  clearError(): void
}
```

**設計特點**:
- ✅ 使用 Card ID 而非 Entity
- ✅ 接受 GameViewModel 而非 GameState
- ✅ 提供豐富的 UI 呈現方法

#### **IEventSubscriber** (事件訂閱者)

**檔案**: `src/game-ui/application/ports/IEventSubscriber.ts`

```typescript
// 實際定義在 shared/events/ports/IEventSubscriber.ts
export type { IEventSubscriber } from '@/shared/events/ports/IEventSubscriber'
```

```typescript
// shared/events/ports/IEventSubscriber.ts
export interface IEventSubscriber {
  /**
   * 訂閱特定類型的事件
   */
  subscribe<T extends IntegrationEvent>(
    eventType: string,
    handler: EventHandler<T>
  ): Unsubscribe

  /**
   * 訂閱所有事件 (使用 '*' 萬用字元)
   */
  subscribeAll(handler: EventHandler<IntegrationEvent>): Unsubscribe

  /**
   * 取消訂閱
   */
  unsubscribe(eventType: string, handler: EventHandler): void
}

type EventHandler<T extends IntegrationEvent> = (event: T) => void | Promise<void>
type Unsubscribe = () => void
```

---

## 3. 整合事件資料模型 (Shared)

### 3.1 Base Types (基礎類型)

#### **IntegrationEvent** (整合事件基礎介面)

**檔案**: `src/shared/events/base/IntegrationEvent.ts`

```typescript
export interface IntegrationEvent {
  readonly eventId: string  // UUID
  readonly eventType: string  // 事件類型名稱
  readonly timestamp: number  // Unix timestamp (ms)
  readonly sequenceNumber: number  // 事件序列號
}
```

#### **TurnTransition** (回合交接)

**檔案**: `src/shared/events/base/TurnTransition.ts`

```typescript
export interface TurnTransition {
  readonly previousPlayerId: string
  readonly currentPlayerId: string
  readonly reason: 'card_played' | 'match_selected' | 'koikoi_declared' | 'round_start'
}
```

#### **MatchResult** (配對結果)

**檔案**: `src/shared/events/base/MatchResult.ts`

```typescript
export interface MatchResult {
  readonly matchType: 'no_match' | 'single_match' | 'multiple_matches'
  readonly sourceCardId: string
  readonly matchedCardIds: readonly string[]
  readonly capturedCardIds: readonly string[]
  readonly achievedYaku: readonly YakuResult[]  // 新達成的役種
}
```

#### **YakuResult** (役種結果)

**檔案**: `src/shared/events/base/YakuResult.ts`

```typescript
export interface YakuResult {
  readonly yakuName: YakuName
  readonly points: number
  readonly cardIds: readonly string[]  // 組成此役種的卡片 IDs
}

export type YakuName =
  | 'GoKo' | 'ShiKo' | 'AmeShiKo' | 'SanKo'
  | 'Inoshikacho' | 'Hanami' | 'Tsukimi'
  | 'Tane' | 'Tanzaku' | 'Kasu'
```

### 3.2 Integration Events (整合事件)

#### **GameInitializedEvent** (遊戲初始化事件)

**檔案**: `src/shared/events/game/GameInitializedEvent.ts`

```typescript
export interface GameInitializedEvent extends IntegrationEvent {
  eventType: 'GameInitialized'

  // 遊戲資訊
  gameId: string
  round: number
  maxRounds: number
  phase: GamePhase

  // 玩家資訊 (簡化版,僅 UI 需要的資料)
  players: readonly PlayerSnapshot[]

  // 場地與牌組
  fieldCardIds: readonly string[]
  deckCardCount: number

  // 完整卡片定義 (48 張花牌)
  cardDefinitions: readonly CardDefinition[]

  // 回合交接
  turnTransition: TurnTransition | null
}

interface PlayerSnapshot {
  id: string
  name: string
  isHuman: boolean
  handCardIds: readonly string[]
  capturedCardIds: readonly string[]
  totalScore: number
  roundScore: number
}
```

**特點**:
- 唯一包含完整遊戲狀態的事件
- 包含所有 48 張花牌定義
- 大小 ~5-8KB (合理例外)

#### **CardPlayedEvent** (出牌事件)

**檔案**: `src/shared/events/game/CardPlayedEvent.ts`

```typescript
export interface CardPlayedEvent extends IntegrationEvent {
  eventType: 'CardPlayed'

  playerId: string
  playedCardId: string

  // 手牌配對結果
  handMatch: MatchResult

  // 牌庫翻牌結果
  deckMatch: MatchResult

  // 回合交接 (可能為 null,如果需要配對選擇或達成役種)
  turnTransition: TurnTransition | null
}
```

**大小**: ~300-500 bytes

#### **MatchSelectedEvent** (配對選擇事件)

**檔案**: `src/shared/events/game/MatchSelectedEvent.ts`

```typescript
export interface MatchSelectedEvent extends IntegrationEvent {
  eventType: 'MatchSelected'

  playerId: string
  sourceCardId: string
  selectedFieldCardId: string
  capturedCardIds: readonly string[]

  // 是否為自動選擇 (逾時)
  autoSelected: boolean

  // 達成的役種
  achievedYaku: readonly YakuResult[]

  // 回合交接
  turnTransition: TurnTransition
}
```

**大小**: ~200-400 bytes

#### **KoikoiDeclaredEvent** (來來宣言事件)

**檔案**: `src/shared/events/game/KoikoiDeclaredEvent.ts`

```typescript
export interface KoikoiDeclaredEvent extends IntegrationEvent {
  eventType: 'KoikoiDeclared'

  playerId: string
  continueGame: boolean  // true=來來, false=勝負
  currentYaku: readonly string[]
  currentScore: number

  // 回合交接 (僅當 continueGame=true 時)
  turnTransition: TurnTransition | null
}
```

**大小**: ~200-300 bytes

#### **RoundEndedEvent** (回合結束事件)

**檔案**: `src/shared/events/game/RoundEndedEvent.ts`

```typescript
export interface RoundEndedEvent extends IntegrationEvent {
  eventType: 'RoundEnded'

  round: number
  winnerId: string | null  // null = 平局

  // 獲勝役種
  winningYaku: readonly YakuResult[]

  // 得分資訊
  player1Score: PlayerRoundScore
  player2Score: PlayerRoundScore

  // 來來倍數
  koikoiMultiplier: number

  // 結束原因
  endReason: 'yaku_achieved' | 'no_cards_left' | 'timeout'
}

interface PlayerRoundScore {
  playerId: string
  roundScore: number
  totalScore: number
}
```

**大小**: ~400-600 bytes

#### **GameEndedEvent** (遊戲結束事件)

**檔案**: `src/shared/events/game/GameEndedEvent.ts`

```typescript
export interface GameEndedEvent extends IntegrationEvent {
  eventType: 'GameEnded'

  gameId: string
  winnerId: string | null  // null = 平手

  // 最終得分
  finalScores: readonly PlayerFinalScore[]

  // 遊戲統計
  totalRounds: number
  gameDuration: number  // 毫秒

  // 結束原因
  endReason: 'max_rounds_reached' | 'target_score_reached' | 'player_abandoned'

  // 時間戳
  gameStartTime: number
  gameEndTime: number
}

interface PlayerFinalScore {
  playerId: string
  playerName: string
  totalScore: number
  roundsWon: number
}
```

**大小**: ~300-400 bytes

#### **GameAbandonedEvent** (遊戲放棄事件)

**檔案**: `src/shared/events/game/GameAbandonedEvent.ts`

```typescript
export interface GameAbandonedEvent extends IntegrationEvent {
  eventType: 'GameAbandoned'

  gameId: string
  abandoningPlayerId: string
  winnerId: string  // 對手自動獲勝

  // 放棄時的狀態
  round: number
  phase: GamePhase

  // 得分資訊
  finalScores: readonly PlayerFinalScore[]

  // 放棄原因
  reason: 'user_quit' | 'timeout' | 'connection_lost'

  abandonedAt: number  // 時間戳
}
```

**大小**: ~250-350 bytes

---

## 4. 資料流與狀態同步

### 4.1 事件驅動的資料流

```
┌──────────────────┐
│  game-engine BC  │
│                  │
│  GameState       │ ──┐
│  (Entity)        │   │ publish event
└──────────────────┘   │
                       ↓
                ┌──────────────┐
                │  EventBus    │
                │  (Shared)    │
                └──────────────┘
                       │ subscribe
                       ↓
┌──────────────────┐   │
│  game-ui BC      │ ←─┘
│                  │
│  GameViewModel   │ ← UpdateGameViewUseCase
│  (Immutable)     │
└──────────────────┘
```

### 4.2 狀態同步策略

**完整同步** (GameInitializedEvent):
- 遊戲首次啟動
- 新回合開始
- 事件缺失檢測到時

**增量同步** (其他事件):
- CardPlayedEvent → 更新手牌、場牌
- MatchSelectedEvent → 更新場牌、捕獲卡片
- KoikoiDeclaredEvent → 更新階段
- RoundEndedEvent → 更新分數、回合結果
- GameEndedEvent → 更新最終狀態
- GameAbandonedEvent → 更新遊戲結束狀態

### 4.3 事件序列號檢查

**UpdateGameViewUseCase** 實作序列號檢查:

```typescript
class UpdateGameViewUseCase {
  handleEvent(event: IntegrationEvent): void {
    const currentViewModel = this.getCurrentViewModel()

    // 檢查序列號間隙
    if (currentViewModel && event.sequenceNumber > currentViewModel.lastEventSequence + 1) {
      // 檢測到事件缺失,請求完整同步
      this.requestFullSync()
      return
    }

    // 正常處理事件
    this.processEvent(event)
  }
}
```

---

## 5. 資料映射與轉換規則

### 5.1 Entity → Event (game-engine BC)

**GameState → GameInitializedEvent**:
```typescript
{
  players: gameState.players.map(p => ({
    id: p.id,
    name: p.name,
    isHuman: p.isHuman,
    handCardIds: p.hand.map(c => c.id),        // ✅ Entity → ID
    capturedCardIds: p.captured.map(c => c.id), // ✅ Entity → ID
    totalScore: p.score,
    roundScore: p.roundScore,
  })),
  fieldCardIds: gameState.field.map(c => c.id), // ✅ Entity → ID
  cardDefinitions: STANDARD_DECK.map(c => ({    // ✅ 提供完整定義
    id: c.id,
    suit: c.suit,
    type: c.type,
    points: c.points,
  })),
}
```

**原則**:
- ✅ Entity 轉為 ID
- ✅ 包含 UI 需要的所有資訊
- ✅ 僅發送變更的資料 (除 GameInitializedEvent 外)

### 5.2 Event → ViewModel (game-ui BC)

**GameInitializedEvent → GameViewModel**:
```typescript
const gameViewModel = new GameViewModel(
  event.gameId,
  event.round,
  event.maxRounds,
  event.phase,
  event.players[0].id,
  event.fieldCardIds,
  event.deckCardCount,
  event.players.map(p => new PlayerViewModel(/* ... */)),
  event.cardDefinitions,
  event.sequenceNumber,
  event.eventType,
  null
)
```

**CardPlayedEvent → GameViewModel** (增量更新):
```typescript
const updatedViewModel = currentViewModel
  .withPlayers(updatePlayerHand(event))
  .withFieldCards(updateFieldCards(event))
  .withLastEvent(event.sequenceNumber, event.eventType)
```

**原則**:
- ✅ 不可變更新 (返回新實例)
- ✅ 僅更新變更的部分
- ✅ 追蹤事件序列號

### 5.3 ID 查詢機制

**UI Component 根據 ID 查詢完整卡片資料**:

```typescript
// In Vue Component
const fieldCards = computed(() => {
  const gameViewModel = gameStore.gameViewModel
  if (!gameViewModel) return []

  return gameViewModel.fieldCardIds.map(id =>
    gameViewModel.cardDefinitions.find(c => c.id === id)
  ).filter(Boolean)
})
```

**優點**:
- ✅ 避免在每個事件中重複傳遞卡片資料
- ✅ 減少事件大小
- ✅ 保持資料一致性

---

## 6. 驗證規則

### 6.1 資料完整性驗證

**game-engine BC**:
- GameState 聚合根必須維持不變性約束
- Player 手牌與捕獲卡片數量總和 ≤ 48
- 回合號碼必須在 1-12 之間

**game-ui BC**:
- GameViewModel 中的 Card ID 必須在 cardDefinitions 中存在
- PlayerViewModel 中的卡片 ID 必須有效
- 事件序列號必須連續

### 6.2 資料一致性驗證

**跨 BC 一致性**:
- game-engine BC 發送的事件必須包含完整資訊
- game-ui BC 必須能夠根據事件重建完整 UI 狀態
- 事件序列號必須嚴格遞增

### 6.3 測試策略

**單元測試**:
- 測試 Entity 的不變性約束
- 測試 ViewModel 的不可變更新
- 測試事件映射的正確性

**整合測試**:
- 測試事件端到端流程
- 測試資料一致性
- 測試事件序列號檢查

---

## Summary

### 關鍵設計決策

1. **Entity vs Value Object**: Card 是 Value Object,可以跨 BC 傳遞
2. **ID vs Entity**: 整合事件使用 ID 而非 Entity,減少耦合
3. **完整同步 vs 增量同步**: GameInitializedEvent 提供完整狀態,其他事件增量更新
4. **不可變性**: GameViewModel 和 PlayerViewModel 採用不可變設計
5. **事件序列號**: 用於檢測事件缺失,觸發完整同步

### 資料模型總結

| BC | Domain Entities | Value Objects | DTOs | Ports |
|----|----------------|---------------|------|-------|
| game-engine | GameState, Player | Card, Yaku | Input DTOs, Result DTOs | IGameStateRepository, IEventPublisher |
| game-ui | - | CardDefinition | - | IUIPresenter, IEventSubscriber |
| shared | - | IntegrationEvent 系列 | - | IEventBus |

**資料流方向**: game-engine → Events → game-ui (單向)

---

**設計完成日期**: 2025-10-17
**資料模型版本**: v2.0 (BC 完全隔離)
