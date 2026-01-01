# Core Game BC - Domain Layer

## 職責

實作花札遊戲的核心業務邏輯，提供純 TypeScript 函數，不依賴任何框架。

**核心原則**:
- ✅ **純業務邏輯**: 不依賴 Nuxt、Drizzle 等任何框架
- ✅ **純函數設計**: 所有操作返回新物件，不修改輸入
- ✅ **不可變性**: 使用 `Object.freeze()` 確保狀態不可變
- ✅ **類型安全**: 完整的 TypeScript 類型定義
- ✅ **高測試覆蓋**: 所有業務邏輯必須有單元測試

---

## 核心領域模型

### 1. Game (Aggregate Root)

#### 職責
- 遊戲會話的聚合根
- 管理遊戲配置（規則集、總局數）
- 管理遊戲生命週期（初始化、進行中、結束）
- 維護累計分數
- 協調 Round Entity

#### 類型定義

```typescript
// server/domain/game/game.ts
interface Game {
  readonly id: string                     // 遊戲 ID (UUID)
  readonly sessionToken: string           // Session Token
  readonly players: readonly Player[]     // 玩家列表（2 人）
  readonly cumulativeScores: readonly CumulativeScore[]  // 累計分數
  readonly totalRounds: number            // 總局數
  readonly roundsPlayed: number           // 已進行局數
  readonly currentRound: Round | null     // 當前局
  readonly status: GameStatus             // 遊戲狀態
  readonly isPlayer2Ai: boolean           // 對手是否為 AI
}

type GameStatus = 'WAITING' | 'IN_PROGRESS' | 'FINISHED'
```

#### 核心操作（純函數）

```typescript
// server/domain/game/game-operations.ts

// 創建新遊戲
function createGame(params: CreateGameParams): Game

// 開始新局
function startNewRound(game: Game, dealerId: string): Game

// 更新累計分數
function updateCumulativeScore(game: Game, playerId: string, points: number): Game

// 判斷遊戲是否結束
function isGameFinished(game: Game): boolean

// 獲取勝者
function getWinner(game: Game): string | null
```

---

### 2. Round (Entity)

#### 職責
- 代表一局遊戲
- 管理卡牌分布（手牌、場牌、牌堆、已獲得牌）
- 管理回合流程（FlowStage 狀態機）
- 管理 Koi-Koi 狀態

#### 類型定義

```typescript
// server/domain/round/round.ts
interface Round {
  readonly roundNumber: number            // 局數
  readonly dealerId: string               // 莊家 ID
  readonly hands: Readonly<Record<string, readonly string[]>>  // 手牌
  readonly field: readonly string[]       // 場牌
  readonly deck: readonly string[]        // 牌堆
  readonly depositories: Readonly<Record<string, readonly string[]>>  // 已獲得牌
  readonly flowStage: FlowStage           // 流程狀態
  readonly activePlayerId: string         // 當前行動玩家
  readonly koiKoiStatuses: readonly KoiKoiStatus[]  // Koi-Koi 狀態
  readonly pendingDeckCard: string | null // 待處理的翻牌
  readonly status: RoundStatus            // 局狀態
}

type RoundStatus = 'IN_PROGRESS' | 'ENDED'
```

#### 核心操作（純函數）

```typescript
// server/domain/round/round-operations.ts

// 創建新局並發牌
function createRound(params: CreateRoundParams): Round

// 執行打手牌操作
function playHandCard(round: Round, playerId: string, cardId: string, targetId?: string): PlayHandCardResult

// 執行翻牌操作
function flipDeckCard(round: Round): FlipDeckCardResult

// 執行翻牌配對選擇
function selectDeckTarget(round: Round, targetId: string): SelectDeckTargetResult

// 更新 Koi-Koi 狀態
function updateKoiKoiStatus(round: Round, playerId: string, decision: KoiKoiDecision): Round

// 切換行動玩家
function switchActivePlayer(round: Round): Round
```

---

### 3. Value Objects

#### Card（卡牌 ID 格式）

```typescript
// 卡牌 ID 格式: MMTI
// MM: 月份 (01-12)
// T: 類型 (1=光, 2=種, 3=短冊, 4=かす)
// I: 索引 (1-4)

// 例: "0111" = 1月光牌（松上鶴）
// 例: "0341" = 3月かす
```

#### FlowStage（流程狀態）

```typescript
type FlowStage =
  | 'AWAITING_HAND_PLAY'    // 等待打手牌
  | 'AWAITING_SELECTION'    // 等待選擇配對目標（翻牌多重配對）
  | 'AWAITING_DECISION'     // 等待 Koi-Koi 決策
```

#### KoiKoiStatus（Koi-Koi 狀態）

```typescript
interface KoiKoiStatus {
  readonly playerId: string
  readonly calledCount: number    // 呼叫 Koi-Koi 次數
}
```

#### CardPlay（卡牌操作結果）

```typescript
interface CardPlay {
  readonly playedCard: string           // 打出的卡片
  readonly capturedCards: readonly string[]  // 捕獲的卡片
  readonly matchType: 'single' | 'multiple' | 'none'  // 配對類型
}
```

---

## Domain Services

### 1. matchingService（配對邏輯）

#### 職責
- 找出可配對的場牌
- 執行配對邏輯

#### 核心函數

```typescript
// server/domain/services/matching-service.ts

// 找出可配對的場牌
function findMatchableCards(cardId: string, fieldCards: readonly string[]): string[]

// 判斷兩張牌是否同月份
function isSameMonth(cardId1: string, cardId2: string): boolean

// 取得卡牌月份
function getCardMonth(cardId: string): number
```

---

### 2. yakuDetectionService（役種檢測服務）

#### 職責
- 檢測已形成的役種
- 計算基礎分數

#### MVP 實作 12 種常用役種

**光牌系（4 種）**:
- **五光 (15 點)**: 5 張光牌
- **四光 (10 點)**: 4 張光牌（不含雨）
- **雨四光 (8 點)**: 4 張光牌（含雨）
- **三光 (6 點)**: 3 張光牌（不含雨）

**短冊系（3 種）**:
- **赤短 (5 點)**: 3 張紅色短冊
- **青短 (5 點)**: 3 張藍色短冊
- **短冊 (1 點)**: 5 張以上短冊

**種牌系（4 種）**:
- **豬鹿蝶 (5 點)**: 萩豬、紅葉鹿、牡丹蝶
- **花見酒 (3 點)**: 櫻幕 + 菊盃
- **月見酒 (3 點)**: 芒月 + 菊盃
- **種 (1 點)**: 5 張以上種牌

**かす系（1 種）**:
- **かす (1 點)**: 10 張以上かす牌

#### 核心函數

```typescript
// server/domain/services/yaku-detection-service.ts

// 檢測所有已形成的役種
function detectYaku(depositoryCards: readonly string[], settings?: YakuSettings): Yaku[]

// 各役種檢測函數
function hasGokou(cards: readonly string[]): boolean    // 五光
function hasShikou(cards: readonly string[]): boolean   // 四光
function hasAmeShikou(cards: readonly string[]): boolean // 雨四光
function hasSankou(cards: readonly string[]): boolean   // 三光
// ... 其他役種
```

---

### 3. scoringService（分數計算服務）

#### 職責
- 計算最終得分（含倍率）
- 應用 Koi-Koi 倍率
- 應用 7 分倍增規則

#### 核心函數

```typescript
// server/domain/services/scoring-service.ts

// 計算基礎分數
function calculateBaseScore(yakus: readonly Yaku[]): number

// 計算最終得分（含倍率）
function calculateFinalScore(
  baseScore: number,
  koiKoiStatuses: readonly KoiKoiStatus[],
  winnerId: string
): number
```

---

## 不可變性保證

所有 Domain 操作都返回新物件，確保不可變性：

```typescript
// 範例：打手牌操作
function playHandCard(round: Round, playerId: string, cardId: string): PlayHandCardResult {
  // 驗證操作...

  // 返回新的 Round 物件（使用 Object.freeze）
  const newRound = Object.freeze({
    ...round,
    hands: Object.freeze({
      ...round.hands,
      [playerId]: Object.freeze(round.hands[playerId].filter(c => c !== cardId))
    }),
    field: Object.freeze([...newField]),
    depositories: Object.freeze({
      ...round.depositories,
      [playerId]: Object.freeze([...round.depositories[playerId], ...captured])
    })
  })

  return { round: newRound, cardPlay }
}
```

---

## 測試要求

### 單元測試覆蓋率

- ✅ **Game 操作**: 100% 覆蓋
  - 創建遊戲、開始新局、更新分數、判斷結束

- ✅ **Round 操作**: 100% 覆蓋
  - 發牌、打手牌、翻牌、配對選擇
  - FlowStage 狀態轉換

- ✅ **matchingService**: 100% 覆蓋
  - 同月份判斷、配對邏輯

- ✅ **yakuDetectionService**: 100% 覆蓋
  - 所有 12 種役種檢測
  - 邊界值測試

- ✅ **scoringService**: 100% 覆蓋
  - Koi-Koi 倍率計算
  - 7 分倍增規則

### 測試框架

- **工具**: Vitest
- **斷言**: Vitest built-in assertions

---

## 參考文檔

- [Application Layer](./application.md)
- [Adapter Layer](./adapter.md)
- [共用數據契約](../../shared/data-contracts.md)
- [通訊協議](../../shared/protocol.md)
- [遊戲規則](../../shared/game-rules.md)
- [後端架構總覽](../architecture.md)
