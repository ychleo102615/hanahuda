# Data Model: Game UI-Engine 分離架構

**Feature**: 001-game-ui-game
**Date**: 2025-10-14
**Status**: Phase 1 Design

本文檔定義 game-engine 和 game-ui 兩個 Bounded Context 的資料模型，以及跨 BC 通訊的整合事件結構。

---

## 架構總覽

```
┌─────────────────────────────────────────────────────────────┐
│                         shared/                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  IntegrationEvent (基礎事件)                            │ │
│  │  GameInitializedEvent, CardPlayedEvent, etc.           │ │
│  │  EventBus, CardMatchingService (介面)                  │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
         ▲                                        ▲
         │ 依賴                                    │ 依賴
         │                                        │
┌────────┴─────────┐                    ┌─────────┴───────────┐
│  game-engine BC  │                    │    game-ui BC       │
│  ┌─────────────┐ │                    │  ┌────────────────┐ │
│  │ GameState   │ │                    │  │ GameViewModel  │ │
│  │ Player      │ │                    │  │ (本地狀態快照)  │ │
│  │ Card        │ │                    │  └────────────────┘ │
│  │ Yaku        │ │                    │                     │
│  └─────────────┘ │                    │  接收整合事件       │
│  發布整合事件     │                    │  更新視圖模型       │
└──────────────────┘                    └─────────────────────┘
```

---

## Shared - 整合事件定義

所有整合事件都放在 `src/shared/events/` 目錄，作為兩個 BC 的契約。

### 基礎事件型別

```typescript
/**
 * 整合事件基礎介面
 * 所有跨 BC 的事件都繼承此介面
 */
export interface IntegrationEvent {
  /** 事件唯一識別碼 (UUID) */
  readonly eventId: string

  /** 事件類型 (過去式命名) */
  readonly eventType: string

  /** 事件發生時間戳 (Unix timestamp, milliseconds) */
  readonly timestamp: number

  /** 事件序號 (用於檢測遺失) */
  readonly sequenceNumber: number
}
```

**設計原則**:
- 使用 `number` (Unix timestamp) 而非 `Date` 物件，符合 Protocol Buffers 相容性
- `eventType` 使用字串字面值而非 enum，為日後 Protobuf 轉換保留彈性
- `sequenceNumber` 為必填欄位，game-ui 透過此欄位檢測事件遺失

---

### 共用數據結構（v2.0）

在進入具體事件定義前，先定義共用的嵌套數據結構：

#### YakuResult（役種結果）

```typescript
/**
 * 役種結果
 *
 * 用於表示玩家達成的役種資訊
 */
export interface YakuResult {
  /** 役種類型 */
  readonly yaku:
    | 'GOKO'        // 五光 (10分)
    | 'SHIKO'       // 四光 (8分)
    | 'AME_SHIKO'   // 雨四光 (7分)
    | 'SANKO'       // 三光 (5分)
    | 'INOSHIKACHO' // 猪鹿蝶 (5分)
    | 'AKA_TAN'     // 赤短 (5分)
    | 'AO_TAN'      // 青短 (5分)
    | 'TANE'        // 種 (1+分)
    | 'TAN'         // 短 (1+分)
    | 'KASU'        // カス (1+分)

  /** 本役種的分數 */
  readonly points: number

  /** 構成此役種的牌 ID 列表（供 UI 高亮顯示） */
  readonly cardIds: string[]
}
```

#### MatchResult（配對結果）

```typescript
/**
 * 配對結果
 *
 * 表示手牌或牌堆卡牌的配對結果，包含三種情況：
 * 1. no_match: 無配對，牌放到場上
 * 2. single_match: 單一配對，自動捕獲
 * 3. multiple_matches: 多重配對，需要玩家選擇
 */
export interface MatchResult {
  /** 來源牌 ID（手牌或牌堆卡牌） */
  readonly sourceCardId: string

  /** 來源類型 */
  readonly sourceType: 'hand' | 'deck'

  /** 配對類型 */
  readonly matchType: 'no_match' | 'single_match' | 'multiple_matches'

  /** 配對到的場牌 ID（單一配對時） */
  readonly matchedFieldCardId?: string

  /** 捕獲的牌 ID 列表（包含來源牌和配對場牌） */
  readonly capturedCardIds: string[]

  /** 可選擇的場牌 ID 列表（多重配對時） */
  readonly selectableFieldCardIds?: string[]

  /** 已選擇的場牌 ID（多重配對選擇後） */
  readonly selectedFieldCardId?: string

  /** 是否自動選擇（超時） */
  readonly autoSelected?: boolean

  /** 選擇時限（毫秒，多重配對時） */
  readonly selectionTimeout?: number

  /** 配對成功後達成的役種 */
  readonly achievedYaku?: YakuResult[]
}
```

#### TurnTransition（回合切換）

```typescript
/**
 * 回合切換資訊
 *
 * 表示玩家回合的切換，嵌套在各種事件中，取代獨立的 PlayerTurnChangedEvent
 */
export interface TurnTransition {
  /** 前一位玩家 ID（遊戲初始化時為 null） */
  readonly previousPlayerId: string | null

  /** 當前玩家 ID */
  readonly currentPlayerId: string

  /** 回合切換原因 */
  readonly reason: 'game_initialized' | 'card_played' | 'koikoi_declared'
}
```

---

### 遊戲事件定義（v2.0 優化版）

**v2.0 主要改進**：
- 減少事件數量：一次出牌從 3-4 個事件減少到 1-2 個事件
- 嵌套數據結構：`MatchResult`, `TurnTransition`, `YakuResult`
- 原子性更好：相關信息在同一事件中

**刪除的事件**（已合併到新結構中）：
- ❌ `DeckCardRevealedEvent` → 合併到 `CardPlayedEvent.deckMatch`
- ❌ `MatchSelectionRequiredEvent` → 合併到 `CardPlayedEvent.deckMatch`
- ❌ `MatchSelectionTimeoutEvent` → 合併到 `MatchSelectedEvent`
- ❌ `PlayerTurnChangedEvent` → 嵌套到各事件的 `turnTransition`
- ❌ `YakuAchievedEvent` → 嵌套到 `MatchResult.achievedYaku`

#### 1. GameInitializedEvent（完整快照）

```typescript
/**
 * 遊戲初始化事件
 *
 * 此事件包含完整的遊戲初始狀態快照，是唯一可傳遞完整狀態的事件。
 * 觸發時機：
 * - 遊戲首次開始
 * - 玩家重新整理頁面
 * - game-ui 請求完整同步（檢測到事件遺失時）
 */
export interface GameInitializedEvent extends IntegrationEvent {
  readonly eventType: 'GameInitialized'

  readonly gameState: {
    /** 遊戲唯一識別碼 */
    readonly gameId: string

    /** 當前回合數 (1-12) */
    readonly currentRound: number

    /** 當前階段 */
    readonly phase: 'setup' | 'dealing' | 'playing' | 'koikoi' | 'round_end' | 'game_end'

    /** 當前玩家 ID */
    readonly currentPlayerId: string

    /** 玩家資訊 */
    readonly players: ReadonlyArray<{
      readonly id: string
      readonly name: string
      readonly handCardIds: string[]      // 手牌 ID 列表
      readonly capturedCardIds: string[]  // 捕獲牌 ID 列表
      readonly totalScore: number          // 總分
      readonly roundScore: number          // 本回合分數
    }>

    /** 場上的牌 ID 列表 */
    readonly fieldCardIds: string[]

    /** 牌堆剩餘張數（不洩露具體牌面） */
    readonly deckCardCount: number

    /** 是否有玩家宣告 Koi-Koi */
    readonly koikoiPlayerId: string | null
  }

  /** 所有 48 張牌的資訊（供 UI 渲染） */
  readonly cardDefinitions: ReadonlyArray<{
    readonly id: string
    readonly suit: number        // 月份 (1-12)
    readonly type: 'bright' | 'animal' | 'ribbon' | 'plain'
    readonly points: number      // 點數 (20, 10, 5, 1)
  }>

  /** 初始回合資訊（v2.0 新增） */
  readonly turnTransition: TurnTransition
}
```

**欄位設計理由**:
- `deckCardCount`: 只傳遞數量而非具體牌面，防止作弊（日後前後端分離時）
- `cardDefinitions`: 雖然不變，但為了讓 game-ui BC 完全獨立，包含在初始化事件中
- `players[].handCardIds`: 單機模式下可傳遞所有玩家手牌，日後可依模式過濾
- `turnTransition`: **v2.0 新增**，提供初始玩家資訊（previousPlayerId 為 null，reason 為 'game_initialized'）

---

#### 2. CardPlayedEvent（增量事件）（v2.0 重構）

```typescript
/**
 * 玩家出牌事件（v2.0）
 *
 * 代表玩家已成功出牌並完成配對與捕獲流程。
 * 此事件為增量事件，僅包含變化資訊。
 *
 * v2.0 重大改進：
 * - 使用 MatchResult 結構表示手牌和牌堆配對結果
 * - 直接包含 achievedYaku，取代獨立的 YakuAchievedEvent
 * - 包含 turnTransition，取代獨立的 PlayerTurnChangedEvent
 * - 支援多重配對場景（turnTransition 為 null 表示等待玩家選擇）
 */
export interface CardPlayedEvent extends IntegrationEvent {
  readonly eventType: 'CardPlayed'

  /** 出牌的玩家 ID */
  readonly playerId: string

  /** 從手牌打出的牌 ID */
  readonly playedCardId: string

  /** 手牌配對結果 */
  readonly handMatch: MatchResult

  /** 牌堆翻牌配對結果 */
  readonly deckMatch: MatchResult

  /** 回合切換資訊（null 表示等待玩家選擇或 Koi-Koi 決策） */
  readonly turnTransition: TurnTransition | null
}
```

**v2.0 設計理由**:
- **嵌套結構**: 使用 `MatchResult` 統一表示配對結果，包含配對類型、捕獲牌、役種等完整資訊
- **減少事件數量**: 原本需要 3-4 個事件（CardPlayed + YakuAchieved + PlayerTurnChanged），現在只需 1 個
- **原子性**: 所有相關信息（配對、役種、回合切換）在同一事件中，避免 UI 接收到部分狀態
- **明確狀態**: `turnTransition: null` 表示尚未切換回合（等待多重配對選擇或 Koi-Koi 決策）
- **移除 animationHint**: 可從 `matchType` 和 `capturedCardIds` 推導動畫路徑

---

#### 3. MatchSelectedEvent（增量事件）（v2.0 新增）

```typescript
/**
 * 配對選擇完成事件（v2.0 新增）
 *
 * 當玩家完成多重配對選擇（或超時自動選擇）時發布此事件。
 *
 * 此事件合併了原本的 MatchSelectionTimeoutEvent，透過 autoSelected 欄位區分。
 */
export interface MatchSelectedEvent extends IntegrationEvent {
  readonly eventType: 'MatchSelected'

  /** 選擇的玩家 ID */
  readonly playerId: string

  /** 來源牌 ID（通常是牌堆卡牌） */
  readonly sourceCardId: string

  /** 已選擇的場牌 ID */
  readonly selectedFieldCardId: string

  /** 是否自動選擇（超時） */
  readonly autoSelected: boolean

  /** 捕獲的牌 ID 列表 */
  readonly capturedCardIds: string[]

  /** 選擇後達成的役種 */
  readonly achievedYaku?: YakuResult[]

  /** 回合切換資訊 */
  readonly turnTransition: TurnTransition
}
```

**設計理由**:
- 取代舊的 `DeckCardRevealedEvent` + `MatchSelectionRequiredEvent` + `MatchSelectionTimeoutEvent`
- `autoSelected` 明確區分玩家主動選擇或超時自動選擇
- 包含役種和回合切換資訊，保持原子性

---

#### 4. KoikoiDeclaredEvent（增量事件）（v2.0 更新）

```typescript
/**
 * Koi-Koi 宣告事件（v2.0 更新）
 *
 * 當玩家選擇宣告 Koi-Koi（繼續遊玩）或選擇勝負（結束回合）時發布此事件。
 *
 * v2.0 改進：包含 turnTransition，取代獨立的 PlayerTurnChangedEvent
 */
export interface KoikoiDeclaredEvent extends IntegrationEvent {
  readonly eventType: 'KoikoiDeclared'

  /** 做出選擇的玩家 ID */
  readonly playerId: string

  /** 是否選擇 Koi-Koi（true: 繼續, false: 勝負） */
  readonly declared: boolean

  /** 回合切換資訊（如果選擇勝負則為 null，因為回合結束） */
  readonly turnTransition: TurnTransition | null
}
```

**v2.0 設計理由**:
- 選擇 Koi-Koi (declared = true)：包含 `turnTransition`，切換到對手回合
- 選擇勝負 (declared = false)：`turnTransition` 為 null，因為回合即將結束，接著發送 `RoundEndedEvent`

---

#### 5. RoundEndedEvent（增量事件）

```typescript
/**
 * 回合結束事件
 *
 * 代表一個回合已結束，包含本回合的結果摘要。
 */
export interface RoundEndedEvent extends IntegrationEvent {
  readonly eventType: 'RoundEnded'

  /** 獲勝者 ID（平局時為 null） */
  readonly winnerId: string | null

  /** 本回合結果摘要 */
  readonly roundResult: {
    /** 回合編號 */
    readonly round: number

    /** 各玩家的役種與分數 */
    readonly playerResults: ReadonlyArray<{
      readonly playerId: string
      readonly yakuResults: ReadonlyArray<{
        readonly yaku: string
        readonly points: number
        readonly cardIds: string[]
      }>
      readonly baseScore: number        // 原始分數
      readonly multiplier: number       // 倍數（Koi-Koi 加倍時為 2，否則為 1）
      readonly finalScore: number       // 最終分數（baseScore × multiplier）
    }>

    /** 是否有玩家宣告過 Koi-Koi */
    readonly koikoiDeclared: boolean

    /** 宣告 Koi-Koi 的玩家 ID */
    readonly koikoiPlayerId: string | null
  }
}
```

**欄位設計理由**:
- 包含 `multiplier` 欄位明確顯示是否有加倍，UI 可顯示「Koi-Koi 加倍！」提示
- `baseScore` 和 `finalScore` 分開，便於 UI 呈現計分過程
- 平局時 `winnerId` 為 `null`

---

#### 10. GameEndedEvent（增量事件）

```typescript
/**
 * 遊戲結束事件
 *
 * 代表整場遊戲已結束（完成所有回合或玩家放棄），包含最終結果。
 */
export interface GameEndedEvent extends IntegrationEvent {
  readonly eventType: 'GameEnded'

  /** 最終獲勝者 ID（平局時為 null） */
  readonly winnerId: string | null

  /** 遊戲結束原因 */
  readonly reason: 'all_rounds_completed' | 'player_abandoned'

  /** 最終結果摘要 */
  readonly finalResult: {
    /** 各玩家的總分 */
    readonly playerFinalScores: ReadonlyArray<{
      readonly playerId: string
      readonly totalScore: number
      readonly roundsWon: number      // 獲勝回合數
    }>

    /** 完成的回合數 */
    readonly roundsPlayed: number
  }
}
```

---

#### 11. GameAbandonedEvent（增量事件）

```typescript
/**
 * 遊戲放棄事件
 *
 * 當玩家選擇放棄遊戲時發布此事件，對手自動獲勝。
 */
export interface GameAbandonedEvent extends IntegrationEvent {
  readonly eventType: 'GameAbandoned'

  /** 放棄遊戲的玩家 ID */
  readonly abandonedPlayerId: string

  /** 自動獲勝的對手 ID */
  readonly winnerId: string

  /** 放棄時的回合數 */
  readonly currentRound: number

  /** 放棄時的階段 */
  readonly phase: string
}
```

---

## Game Engine BC - Domain Model

game-engine BC 負責所有遊戲規則邏輯，不包含任何 UI 相關代碼。

### Entity: GameState

```typescript
/**
 * 遊戲狀態實體
 *
 * 管理整場遊戲的核心狀態，包含回合、階段、玩家、牌堆、場牌等。
 * 此實體為 Aggregate Root，負責維護遊戲狀態的一致性。
 */
export class GameState {
  private readonly gameId: string
  private players: Player[] = []
  private deck: Card[] = []
  private field: Card[] = []
  private currentPlayerIndex: number = 0
  private phase: GamePhase = 'setup'
  private round: number = 1
  private koikoiPlayer: string | null = null
  private roundResult: RoundResult | null = null

  // Getters（只讀，返回副本）
  get players(): readonly Player[]
  get deck(): readonly Card[]
  get field(): readonly Card[]
  get currentPlayer(): Player | null
  get phase(): GamePhase
  get round(): number
  get koikoiPlayer(): string | null

  // 狀態變更方法（由 UseCase 呼叫）
  addPlayer(player: Player): void
  setDeck(cards: Card[]): void
  setField(cards: Card[]): void
  drawCard(): Card | null
  addToField(cards: Card[]): void
  removeFromField(cardIds: string[]): Card[]
  getFieldMatches(card: Card): Card[]
  setPhase(phase: GamePhase): void
  nextPlayer(): void
  setKoikoiPlayer(playerId: string | null): void
  nextRound(): void
  reset(): void
}
```

**設計原則**:
- 所有私有欄位，只透過 getter 暴露（返回副本或 readonly）
- 不直接發布事件，由 Application Layer 的 UseCase 負責事件發布
- 不包含 UI 相關邏輯（如動畫、音效）

**狀態轉換規則**:
```
setup → dealing → playing ⇄ koikoi → round_end → playing (下一回合)
                                    ↓
                                 game_end (達最大回合數或玩家放棄)
```

---

### Entity: Player

```typescript
/**
 * 玩家實體
 *
 * 管理單一玩家的手牌、捕獲牌、分數等資料。
 */
export class Player {
  private readonly id: string
  private readonly name: string
  private hand: Card[] = []
  private captured: Card[] = []
  private totalScore: number = 0
  private roundScore: number = 0

  constructor(id: string, name: string)

  get id(): string
  get name(): string
  get hand(): readonly Card[]
  get captured(): readonly Card[]
  get handCount(): number
  get capturedCount(): number
  get totalScore(): number
  get roundScore(): number

  addToHand(cards: Card[]): void
  removeFromHand(cardId: string): Card | null
  addToCaptured(cards: Card[]): void
  addScore(points: number): void
  resetRound(): void
  clone(): Player
}
```

---

### Value Object: Card

```typescript
/**
 * 卡牌值物件
 *
 * 代表一張花牌，包含月份、類型、點數等不可變屬性。
 */
export class Card {
  readonly id: string          // 格式: "{suit}-{type}-{index}"，如 "1-bright-0"
  readonly suit: number         // 月份 (1-12)
  readonly type: CardType       // 'bright' | 'animal' | 'ribbon' | 'plain'
  readonly points: number       // 點數 (20, 10, 5, 1)

  constructor(id: string, suit: number, type: CardType, points: number)

  /** 判斷是否可與另一張牌配對（同月份） */
  canMatchWith(other: Card): boolean {
    return this.suit === other.suit
  }

  /** 判斷是否為特定月份的特定類型 */
  isMatch(suit: number, type: CardType): boolean {
    return this.suit === suit && this.type === type
  }

  equals(other: Card): boolean {
    return this.id === other.id
  }
}

export type CardType = 'bright' | 'animal' | 'ribbon' | 'plain'
```

**不可變性**: Card 的所有欄位都是 `readonly`，一旦建立就不可修改。

---

### Domain Service: Yaku

```typescript
/**
 * 役種檢查領域服務
 *
 * 負責判定玩家捕獲的牌是否形成役種，回傳役種列表及分數。
 */
export class Yaku {
  /**
   * 檢查役種
   * @param capturedCards - 玩家捕獲的牌
   * @returns 役種結果列表（可能同時湊成多個役種）
   */
  static checkYaku(capturedCards: readonly Card[]): YakuResult[] {
    const results: YakuResult[] = []

    // 分類卡牌
    const brightCards = capturedCards.filter(c => c.type === 'bright')
    const animalCards = capturedCards.filter(c => c.type === 'animal')
    const ribbonCards = capturedCards.filter(c => c.type === 'ribbon')
    const plainCards = capturedCards.filter(c => c.type === 'plain')

    // 檢查光牌役種（特殊規則：11月雨光）
    const hasNovemberBright = brightCards.some(c => c.suit === 11)

    if (brightCards.length === 5) {
      results.push({ yaku: 'GOKO', points: 10, cards: brightCards })
    } else if (brightCards.length === 4 && !hasNovemberBright) {
      results.push({ yaku: 'SHIKO', points: 8, cards: brightCards })
    } else if (brightCards.length === 4 && hasNovemberBright) {
      results.push({ yaku: 'AME_SHIKO', points: 7, cards: brightCards })
    } else if (brightCards.length === 3 && !hasNovemberBright) {
      results.push({ yaku: 'SANKO', points: 5, cards: brightCards })
    }
    // 注意：3張光含雨光不成立任何役種

    // 檢查其他役種...
    // 猪鹿蝶、赤短、青短、種、短、カス

    return results
  }
}

export interface YakuResult {
  readonly yaku: YakuName
  readonly points: number
  readonly cards: readonly Card[]
}
```

---

### Domain Service: CardMatchingService (介面定義在 shared)

```typescript
/**
 * 花牌配對尋找領域服務
 *
 * 定義配對規則（同月份）及自動選擇優先順序邏輯。
 * 此服務的介面定義在 shared，game-engine 和 game-ui 各自實作。
 */
export interface ICardMatchingService {
  /**
   * 尋找可配對的場牌
   * @param card - 要配對的牌（手牌或翻牌）
   * @param fieldCards - 場上的牌
   * @returns 可配對的場牌列表
   */
  findMatches(card: Card, fieldCards: readonly Card[]): Card[]

  /**
   * 自動選擇配對（當有多重配對時）
   * 優先順序：光 > 種 > 短 > カス，同類型按場牌出現順序
   * @param card - 要配對的牌
   * @param fieldCards - 可配對的場牌列表
   * @returns 自動選擇的場牌
   */
  autoSelect(card: Card, fieldCards: readonly Card[]): Card
}

// game-engine 實作
export class EngineCardMatchingService implements ICardMatchingService {
  findMatches(card: Card, fieldCards: readonly Card[]): Card[] {
    return fieldCards.filter(fc => card.canMatchWith(fc))
  }

  autoSelect(card: Card, fieldCards: readonly Card[]): Card {
    // 按點數排序（光20 > 種10 > 短5 > カス1）
    const sorted = [...fieldCards].sort((a, b) => b.points - a.points)
    return sorted[0]  // 返回點數最高的
  }
}
```

---

## Game UI BC - Domain Model

game-ui BC 負責所有 UI 呈現，維護本地的遊戲狀態視圖模型。

### Entity: GameViewModel

```typescript
/**
 * 遊戲視圖模型
 *
 * game-ui BC 的核心實體，維護從 game-engine 接收到的事件重建的本地遊戲狀態。
 * 此模型僅用於 UI 呈現，不包含遊戲規則邏輯。
 */
export class GameViewModel {
  private gameId: string = ''
  private currentRound: number = 1
  private currentPhase: GamePhase = 'setup'
  private currentPlayerId: string = ''
  private players: PlayerViewModel[] = []
  private fieldCardIds: string[] = []
  private deckCardCount: number = 0
  private koikoiPlayerId: string | null = null
  private lastEventSequence: number = 0

  // Getters（只讀）
  get gameId(): string
  get currentRound(): number
  get currentPhase(): GamePhase
  get currentPlayerId(): string
  get players(): readonly PlayerViewModel[]
  get fieldCardIds(): readonly string[]
  get deckCardCount(): number
  get lastEventSequence(): number

  /**
   * 接收整合事件並更新視圖模型
   * 由 UpdateGameViewUseCase 呼叫
   */
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
      // ... 其他事件類型
    }
    this.lastEventSequence = event.sequenceNumber
  }

  private applyGameInitialized(event: GameInitializedEvent): void {
    // 完整替換狀態
    this.gameId = event.gameState.gameId
    this.currentRound = event.gameState.currentRound
    this.currentPhase = event.gameState.phase
    this.currentPlayerId = event.gameState.currentPlayerId
    this.players = event.gameState.players.map(p => new PlayerViewModel(p))
    this.fieldCardIds = [...event.gameState.fieldCardIds]
    this.deckCardCount = event.gameState.deckCardCount
    this.koikoiPlayerId = event.gameState.koikoiPlayerId
  }

  private applyCardPlayed(event: CardPlayedEvent): void {
    // 增量更新狀態
    const player = this.players.find(p => p.id === event.playerId)
    if (!player) return

    // 從手牌移除
    player.removeFromHand(event.playedCardId)

    // 更新場牌
    if (event.handMatchedFieldCardId) {
      this.fieldCardIds = this.fieldCardIds.filter(
        id => id !== event.handMatchedFieldCardId
      )
      player.addToCaptured(event.handCapturedCardIds)
    } else {
      this.fieldCardIds.push(event.playedCardId)
    }

    // 處理翻牌
    this.deckCardCount--
    if (event.deckMatchedFieldCardId) {
      this.fieldCardIds = this.fieldCardIds.filter(
        id => id !== event.deckMatchedFieldCardId
      )
      player.addToCaptured(event.deckCapturedCardIds)
    } else {
      this.fieldCardIds.push(event.deckCardId)
    }
  }

  private applyYakuAchieved(event: YakuAchievedEvent): void {
    const player = this.players.find(p => p.id === event.playerId)
    if (!player) return
    player.updateYaku(event.yakuResults)
  }
}
```

**設計原則**:
- `GameViewModel` 是純本地狀態，不發送任何事件到 game-engine
- 所有狀態更新都透過 `applyEvent()` 方法，確保單一入口
- 維護 `lastEventSequence` 以檢測事件遺失

---

### Value Object: PlayerViewModel

```typescript
/**
 * 玩家視圖模型
 *
 * 表示 UI 需要的玩家資訊。
 */
export class PlayerViewModel {
  readonly id: string
  readonly name: string
  private handCardIds: string[] = []
  private capturedCardIds: string[] = []
  private totalScore: number = 0
  private roundScore: number = 0
  private yakuResults: YakuResult[] = []

  constructor(data: {
    id: string
    name: string
    handCardIds: string[]
    capturedCardIds: string[]
    totalScore: number
    roundScore: number
  })

  get handCardIds(): readonly string[]
  get capturedCardIds(): readonly string[]
  get totalScore(): number
  get roundScore(): number
  get yakuResults(): readonly YakuResult[]

  removeFromHand(cardId: string): void {
    this.handCardIds = this.handCardIds.filter(id => id !== cardId)
  }

  addToCaptured(cardIds: string[]): void {
    this.capturedCardIds.push(...cardIds)
  }

  updateYaku(results: YakuResult[]): void {
    this.yakuResults = [...results]
  }
}
```

---

## 資料流範例

### 範例 1: 玩家出牌流程

```
1. 玩家點擊手牌（game-ui）
   ↓
2. UserInputController 呼叫 game-engine 的 PlayCardUseCase
   ↓
3. PlayCardUseCase 執行遊戲邏輯:
   - 驗證出牌合法性
   - 更新 GameState（從手牌移除、檢查配對、更新捕獲牌）
   - 檢查役種（呼叫 Yaku.checkYaku）
   - 發布 CardPlayedEvent
   - （若有役種）發布 YakuAchievedEvent
   ↓
4. game-ui 的 EventSubscriber 接收事件
   ↓
5. UpdateGameViewUseCase 更新 GameViewModel
   ↓
6. VueGamePresenter 更新 Pinia store
   ↓
7. Vue 元件重新渲染
```

### 範例 2: 牌堆翻牌多重配對流程

```
1. PlayCardUseCase 翻牌後發現場上有 2 張可配對
   ↓
2. 發布 DeckCardRevealedEvent
   ↓
3. 發布 MatchSelectionRequiredEvent（時限 10 秒）
   ↓
4. game-ui 接收事件，顯示選擇介面並啟動倒數計時器
   ↓
5a. 玩家在時限內選擇 → 發送選擇指令到 game-engine
    ↓
    game-engine 繼續遊戲流程，發布 CardPlayedEvent

5b. 超時未選擇 → game-engine 自動選擇（按優先順序）
    ↓
    發布 MatchSelectionTimeoutEvent
    ↓
    發布 CardPlayedEvent（含自動選擇的配對）
```

---

## 資料一致性保證

### 事件序號機制

```typescript
// game-ui EventSubscriber
class EventSubscriber {
  private lastProcessedSeq = 0
  private paused = false

  async handle(event: IntegrationEvent): Promise<void> {
    // 檢測序號不連續
    if (event.sequenceNumber !== this.lastProcessedSeq + 1) {
      console.warn(
        `⚠️ Event sequence gap: expected ${this.lastProcessedSeq + 1}, got ${event.sequenceNumber}`
      )
      this.paused = true
      await this.requestFullStateSync()  // 請求 GameInitializedEvent
      this.paused = false
      return
    }

    // 檢測重複（冪等性處理）
    if (event.sequenceNumber <= this.lastProcessedSeq) {
      console.info(`ℹ️ Duplicate event ${event.eventId}, skipping.`)
      return
    }

    this.lastProcessedSeq = event.sequenceNumber
    await this.processEvent(event)
  }
}
```

### 狀態同步策略

| 情境 | 同步方式 | 觸發時機 |
|------|---------|---------|
| 初始化 | 完整快照（GameInitializedEvent） | 遊戲開始、頁面重新整理 |
| 正常遊玩 | 增量事件 | 每次玩家行動 |
| 事件遺失檢測到 | 完整快照 | 序號不連續時 |
| 手動重新同步 | 完整快照 | 玩家點擊「重新同步」按鈕 |

---

## 欄位命名與型別慣例

### 命名慣例

- **ID 欄位**: 使用 `{entity}Id` 格式，如 `playerId`, `cardId`, `gameId`
- **ID 列表**: 使用 `{entity}Ids` 格式，如 `cardIds`, `playerIds`
- **數量欄位**: 使用 `{entity}Count` 格式，如 `deckCardCount`, `handCount`
- **布林欄位**: 使用 `is` 或 `has` 前綴，如 `isWinner`, `hasDeclaredKoikoi`
- **時間戳**: 使用 `timestamp` 欄位名，型別為 `number` (Unix timestamp)

### 型別選擇（Protobuf 相容）

| 用途 | 型別 | 範例 |
|------|------|------|
| 識別碼 | `string` | `playerId: string` |
| 數量 / 分數 | `number` | `score: number` |
| 布林值 | `boolean` | `declared: boolean` |
| 列表 | `Array<T>` | `cardIds: string[]` |
| 列舉 | 字串字面值聯集 | `type: 'bright' \| 'animal'` |
| 時間 | `number` | `timestamp: number` |
| 可選欄位 | `T \| undefined` | `winnerId?: string` |

---

## 測試資料範例

### 測試用 GameInitializedEvent

```typescript
const testGameInitializedEvent: GameInitializedEvent = {
  eventId: '123e4567-e89b-12d3-a456-426614174000',
  eventType: 'GameInitialized',
  timestamp: Date.now(),
  sequenceNumber: 1,
  gameState: {
    gameId: 'game-001',
    currentRound: 1,
    phase: 'playing',
    currentPlayerId: 'player-1',
    players: [
      {
        id: 'player-1',
        name: 'Player 1',
        handCardIds: ['1-bright-0', '2-plain-0', '3-ribbon-0', '4-animal-0'],
        capturedCardIds: [],
        totalScore: 0,
        roundScore: 0,
      },
      {
        id: 'player-2',
        name: 'AI Opponent',
        handCardIds: ['5-plain-0', '6-animal-0', '7-ribbon-0', '8-bright-0'],
        capturedCardIds: [],
        totalScore: 0,
        roundScore: 0,
      },
    ],
    fieldCardIds: ['9-plain-0', '10-plain-1', '11-animal-0', '12-ribbon-0'],
    deckCardCount: 40,
    koikoiPlayerId: null,
  },
  cardDefinitions: [
    { id: '1-bright-0', suit: 1, type: 'bright', points: 20 },
    // ... 其他 47 張牌
  ],
}
```

---

**下一步**: Phase 1 - 生成 contracts/ 目錄的整合事件 TypeScript 定義檔案
