# Data Model: User Interface BC - Application Layer

**Feature**: 003-ui-application-layer
**Date**: 2025-11-14
**Status**: Design Phase

## Model Overview

Application Layer 包含以下實體分類：
- **Use Cases**: 18 個（3 玩家操作 + 15 事件處理）
- **Port 介面**: 21 個（18 Input Ports + 3 Output Ports）
- **Protocol 型別**: 40+ 個（SSE 事件、命令格式、共用資料結構）
- **輔助型別**: 錯誤碼、Result 型別、動畫參數等

---

## 1. Use Cases

### 1.1 玩家操作 Use Cases（3 個）

#### PlayHandCardUseCase

**職責**: 處理玩家打出手牌的完整流程

**依賴**:
- `SendCommandPort` (Output)
- `TriggerUIEffectPort` (Output)
- `DomainFacade` (Domain Layer)

**輸入**:
```typescript
interface PlayHandCardInput {
  cardId: string           // 要打出的手牌 ID
  handCards: string[]      // 當前手牌列表
  fieldCards: string[]     // 當前場牌列表
}
```

**輸出**:
```typescript
type PlayHandCardOutput = Result<{
  needSelection: boolean         // 是否需要選擇配對目標
  possibleTargets?: string[]     // 可選目標列表（多重配對時）
  selectedTarget?: string | null // 選中的目標（單一配對時）
}>
```

**業務流程**:
1. 調用 `DomainFacade.validateCardExists()` 驗證卡片在手牌中
2. 調用 `DomainFacade.findMatchableCards()` 檢查配對邏輯
3. 若有多張可配對場牌，調用 `TriggerUIEffectPort.showSelectionUI()` 觸發選擇 UI
4. 若單一配對或無配對，調用 `SendCommandPort.playHandCard()` 發送命令

---

#### SelectMatchTargetUseCase

**職責**: 處理玩家選擇配對目標

**依賴**:
- `SendCommandPort` (Output)
- `DomainFacade` (Domain Layer)

**輸入**:
```typescript
interface SelectMatchTargetInput {
  sourceCardId: string        // 來源卡片 ID
  targetCardId: string        // 選擇的目標卡片 ID
  possibleTargets: string[]   // 可選目標列表
}
```

**輸出**:
```typescript
type SelectMatchTargetOutput = Result<{
  valid: boolean
}>
```

**業務流程**:
1. 調用 `DomainFacade.validateTargetInList()` 驗證選擇的目標是否合法
2. 調用 `SendCommandPort.selectTarget()` 發送 `TurnSelectTarget` 命令

---

#### MakeKoiKoiDecisionUseCase

**職責**: 處理 Koi-Koi 決策

**依賴**:
- `SendCommandPort` (Output)
- `TriggerUIEffectPort` (Output)
- `DomainFacade` (Domain Layer)

**輸入**:
```typescript
interface MakeKoiKoiDecisionInput {
  currentYaku: YakuScore[]      // 當前役種列表
  depositoryCards: string[]     // 獲得區卡片
  koiKoiMultiplier: number      // 當前 Koi-Koi 倍率
  decision: 'KOI_KOI' | 'END_ROUND'
}
```

**輸出**:
```typescript
type MakeKoiKoiDecisionOutput = Result<{
  decision: 'KOI_KOI' | 'END_ROUND'
  currentScore: number
  potentialScore?: number  // 潛在分數（選擇繼續時）
}>
```

**業務流程**:
1. 調用 `DomainFacade.calculateYakuProgress()` 計算當前役種與得分
2. 若選擇繼續，計算潛在分數（可選功能）
3. 調用 `SendCommandPort.makeDecision()` 發送 `RoundMakeDecision` 命令
4. 調用 `TriggerUIEffectPort` 更新 UI 狀態

---

### 1.2 SSE 事件處理 Use Cases（15 個）

#### HandleGameStartedUseCase

**職責**: 處理 `GameStarted` 事件

**依賴**:
- `UIStatePort` (Output)
- `TriggerUIEffectPort` (Output)

**輸入**: `GameStartedEvent`

**輸出**: `void`

**業務流程**:
1. 解析玩家資訊與規則集
2. 調用 `UIStatePort.initializeGameContext(game_id, players, ruleset)` 初始化遊戲上下文
3. 調用 `TriggerUIEffectPort` 顯示「遊戲開始」訊息

---

#### HandleRoundDealtUseCase

**職責**: 處理 `RoundDealt` 事件

**依賴**:
- `UIStatePort` (Output)
- `TriggerUIEffectPort` (Output)

**輸入**: `RoundDealtEvent`

**輸出**: `void`

**業務流程**:
1. 調用 `TriggerUIEffectPort.triggerAnimation('DEAL_CARDS', ...)` 觸發發牌動畫
2. 調用 `UIStatePort.updateFieldCards()` 更新場牌狀態
3. 調用 `UIStatePort.updateHandCards()` 更新手牌狀態
4. 調用 `UIStatePort.updateDeckRemaining()` 更新牌堆剩餘數量
5. 調用 `UIStatePort.setFlowStage()` 更新 FlowStage

---

#### HandleTurnCompletedUseCase

**職責**: 處理 `TurnCompleted` 事件（無中斷、無役種形成）

**依賴**:
- `UIStatePort` (Output)
- `TriggerUIEffectPort` (Output)

**輸入**: `TurnCompletedEvent`

**輸出**: `void`

**業務流程**:
1. 解析手牌操作與翻牌操作
2. 調用 `TriggerUIEffectPort.triggerAnimation('CARD_MOVE', ...)` 觸發卡片移動動畫
3. 調用 `UIStatePort` 更新場牌、手牌、獲得區狀態
4. 調用 `UIStatePort.setFlowStage()` 更新 FlowStage

---

#### HandleSelectionRequiredUseCase

**職責**: 處理 `SelectionRequired` 事件（翻牌雙重配對）

**依賴**:
- `UIStatePort` (Output)
- `TriggerUIEffectPort` (Output)

**輸入**: `SelectionRequiredEvent`

**輸出**: `void`

**業務流程**:
1. 解析已完成的手牌操作
2. 調用 `TriggerUIEffectPort.triggerAnimation()` 觸發手牌移動動畫
3. 調用 `UIStatePort.updateHandCards()` 更新手牌狀態
4. 調用 `TriggerUIEffectPort.showSelectionUI()` 顯示選擇配對 UI 並高亮可選目標
5. 調用 `UIStatePort.setFlowStage('AWAITING_SELECTION')` 更新 FlowStage

---

#### HandleTurnProgressAfterSelectionUseCase

**職責**: 處理 `TurnProgressAfterSelection` 事件

**依賴**:
- `UIStatePort` (Output)
- `TriggerUIEffectPort` (Output)
- `DomainFacade` (Domain Layer)

**輸入**: `TurnProgressAfterSelectionEvent`

**輸出**: `void`

**業務流程**:
1. 解析選擇後的翻牌操作
2. 調用 `TriggerUIEffectPort.triggerAnimation('CARD_MOVE', ...)` 觸發卡片移動動畫
3. 調用 `UIStatePort` 更新場牌、獲得區狀態
4. 若有新役種形成（`yaku_update` 非 null）：
   - 調用 `DomainFacade` 驗證役種
   - 調用 `TriggerUIEffectPort.triggerAnimation('YAKU_EFFECT', ...)` 觸發役種特效
5. 調用 `UIStatePort.setFlowStage()` 更新 FlowStage

---

#### HandleDecisionRequiredUseCase

**職責**: 處理 `DecisionRequired` 事件（形成役種，需決策）

**依賴**:
- `UIStatePort` (Output)
- `TriggerUIEffectPort` (Output)
- `DomainFacade` (Domain Layer)

**輸入**: `DecisionRequiredEvent`

**輸出**: `void`

**業務流程**:
1. 解析本回合的手牌操作與翻牌操作
2. 調用 `TriggerUIEffectPort.triggerAnimation()` 觸發卡片移動動畫
3. 調用 `UIStatePort` 更新場牌、手牌、獲得區狀態
4. 調用 `DomainFacade.calculateYakuProgress()` 計算當前役種與得分
5. 計算潛在分數（用於決策建議，可選）
6. 調用 `TriggerUIEffectPort.showDecisionModal()` 顯示 Koi-Koi 決策 Modal
7. 調用 `UIStatePort.setFlowStage('AWAITING_DECISION')` 更新 FlowStage

---

#### HandleDecisionMadeUseCase

**職責**: 處理 `DecisionMade` 事件（僅在選擇 `KOI_KOI` 時）

**依賴**:
- `UIStatePort` (Output)
- `TriggerUIEffectPort` (Output)

**輸入**: `DecisionMadeEvent`

**輸出**: `void`

**業務流程**:
1. 調用 `UIStatePort.updateKoiKoiMultiplier()` 更新玩家 Koi-Koi 倍率
2. 調用 `TriggerUIEffectPort` 顯示「繼續遊戲」訊息
3. 調用 `UIStatePort.setFlowStage()` 更新 FlowStage（返回 `AWAITING_HAND_PLAY`）

---

#### HandleRoundScoredUseCase

**職責**: 處理 `RoundScored` 事件（局結束計分）

**依賴**:
- `UIStatePort` (Output)
- `TriggerUIEffectPort` (Output)
- `DomainFacade` (Domain Layer)

**輸入**: `RoundScoredEvent`

**輸出**: `void`

**業務流程**:
1. 解析勝者、役種列表、倍率、最終得分
2. 調用 `DomainFacade` 驗證分數計算（可選）
3. 調用 `TriggerUIEffectPort.triggerAnimation('SCORE_UPDATE', ...)` 觸發分數變化動畫
4. 調用 `UIStatePort.updateScores()` 更新累計分數
5. 調用 `TriggerUIEffectPort` 顯示局結算畫面

---

#### HandleRoundDrawnUseCase

**職責**: 處理 `RoundDrawn` 事件（平局）

**依賴**:
- `TriggerUIEffectPort` (Output)

**輸入**: `RoundDrawnEvent`

**輸出**: `void`

**業務流程**:
1. 調用 `TriggerUIEffectPort` 顯示「本局平局」訊息
2. 顯示當前分數（無變化）

---

#### HandleRoundEndedInstantlyUseCase

**職責**: 處理 `RoundEndedInstantly` 事件（Teshi 或場牌流局）

**依賴**:
- `UIStatePort` (Output)
- `TriggerUIEffectPort` (Output)

**輸入**: `RoundEndedInstantlyEvent`

**輸出**: `void`

**業務流程**:
1. 解析結束原因（`TESHI` / `FIELD_KUTTSUKI`）
2. 若為 Teshi，顯示勝者與獲得分數
3. 調用 `UIStatePort.updateScores()` 更新累計分數
4. 調用 `TriggerUIEffectPort` 顯示特殊結束訊息

---

#### HandleGameFinishedUseCase

**職責**: 處理 `GameFinished` 事件（遊戲結束）

**依賴**:
- `TriggerUIEffectPort` (Output)
- `UIStatePort` (Output)

**輸入**: `GameFinishedEvent`

**輸出**: `void`

**業務流程**:
1. 調用 `UIStatePort.getLocalPlayerId()` 取得當前玩家 ID
2. 判斷 `isPlayerWinner = event.winner_id === currentPlayerId`
3. 調用 `TriggerUIEffectPort.showGameFinishedUI()` 顯示遊戲結束畫面（含勝負資訊）

---

#### HandleTurnErrorUseCase

**職責**: 處理 `TurnError` 事件（操作錯誤）

**依賴**:
- `TriggerUIEffectPort` (Output)
- `DomainFacade` (可選，用於錯誤訊息映射)

**輸入**: `TurnErrorEvent`

**輸出**: `void`

**業務流程**:
1. 解析錯誤代碼與訊息
2. 映射為友善的錯誤說明
3. 調用 `TriggerUIEffectPort.showErrorMessage()` 顯示錯誤提示
4. 根據 `retry_allowed` 決定是否允許重試

---

#### HandleReconnectionUseCase

**職責**: 處理斷線重連的快照恢復

**依賴**:
- `UIStatePort` (Output)
- `TriggerUIEffectPort` (Output)

**輸入**: `GameSnapshotRestore`

**輸出**: `void`

**業務流程**:
1. 解析快照數據
2. 調用 `UIStatePort.restoreGameState(snapshot)` 靜默恢復完整遊戲狀態（無動畫）
3. 根據 `current_flow_stage` 渲染對應 UI
4. 調用 `TriggerUIEffectPort.showReconnectionMessage()` 顯示「Connection is restored」提示訊息

---

## 2. Port 介面

### 2.1 Input Ports（18 個）

**定義**: 由 Application Layer 定義並實作為 Use Cases，供 Adapter Layer 呼叫

#### 玩家操作 Ports（3 個）

```typescript
// ports/input/player-operations.port.ts

export interface PlayHandCardPort {
  execute(input: PlayHandCardInput): PlayHandCardOutput
}

export interface SelectMatchTargetPort {
  execute(input: SelectMatchTargetInput): SelectMatchTargetOutput
}

export interface MakeKoiKoiDecisionPort {
  execute(input: MakeKoiKoiDecisionInput): MakeKoiKoiDecisionOutput
}
```

#### 事件處理 Ports（15 個）

```typescript
// ports/input/event-handlers.port.ts

export interface HandleGameStartedPort {
  execute(event: GameStartedEvent): void
}

export interface HandleRoundDealtPort {
  execute(event: RoundDealtEvent): void
}

export interface HandleTurnCompletedPort {
  execute(event: TurnCompletedEvent): void
}

export interface HandleSelectionRequiredPort {
  execute(event: SelectionRequiredEvent): void
}

export interface HandleTurnProgressAfterSelectionPort {
  execute(event: TurnProgressAfterSelectionEvent): void
}

export interface HandleDecisionRequiredPort {
  execute(event: DecisionRequiredEvent): void
}

export interface HandleDecisionMadePort {
  execute(event: DecisionMadeEvent): void
}

export interface HandleRoundScoredPort {
  execute(event: RoundScoredEvent): void
}

export interface HandleRoundDrawnPort {
  execute(event: RoundDrawnEvent): void
}

export interface HandleRoundEndedInstantlyPort {
  execute(event: RoundEndedInstantlyEvent): void
}

export interface HandleGameFinishedPort {
  execute(event: GameFinishedEvent): void
}

export interface HandleTurnErrorPort {
  execute(event: TurnErrorEvent): void
}

export interface HandleReconnectionPort {
  execute(snapshot: GameSnapshotRestore): void
}
```

---

### 2.2 Output Ports（3 個）

**定義**: 由 Application Layer 定義，Adapter Layer 實作，供 Use Cases 呼叫

#### SendCommandPort

**職責**: 發送命令到後端

```typescript
// ports/output/send-command.port.ts

export interface SendCommandPort {
  /**
   * 發送打牌命令
   * @param cardId 手牌 ID
   * @param target 配對目標 ID（可選）
   */
  playHandCard(cardId: string, target?: string): Promise<void>

  /**
   * 發送選擇配對目標命令
   * @param source 來源卡片 ID
   * @param target 目標卡片 ID
   */
  selectTarget(source: string, target: string): Promise<void>

  /**
   * 發送 Koi-Koi 決策命令
   * @param decision 決策（繼續或結束）
   */
  makeDecision(decision: 'KOI_KOI' | 'END_ROUND'): Promise<void>
}
```

---

#### UIStatePort

**職責**: 更新 UI 狀態

```typescript
// ports/output/update-ui-state.port.ts

export interface UIStatePort {
  /**
   * 初始化遊戲上下文（GameStarted 使用）
   * @param gameId 遊戲 ID
   * @param players 玩家資訊列表
   * @param ruleset 遊戲規則集
   */
  initializeGameContext(gameId: string, players: PlayerInfo[], ruleset: Ruleset): void

  /**
   * 恢復完整遊戲狀態（GameSnapshotRestore 使用，靜默恢復無動畫）
   * @param snapshot 完整的遊戲快照數據
   */
  restoreGameState(snapshot: GameSnapshotRestore): void

  /**
   * 設定當前流程階段
   */
  setFlowStage(stage: FlowState): void

  /**
   * 更新場牌列表
   */
  updateFieldCards(cards: string[]): void

  /**
   * 更新手牌列表
   */
  updateHandCards(cards: string[]): void

  /**
   * 更新獲得區卡片
   * @param playerCards 玩家獲得區
   * @param opponentCards 對手獲得區
   */
  updateDepositoryCards(playerCards: string[], opponentCards: string[]): void

  /**
   * 更新分數
   * @param playerScore 玩家分數
   * @param opponentScore 對手分數
   */
  updateScores(playerScore: number, opponentScore: number): void

  /**
   * 更新牌堆剩餘數量
   */
  updateDeckRemaining(count: number): void

  /**
   * 更新玩家 Koi-Koi 倍率
   * @param playerId 玩家 ID
   * @param multiplier 倍率
   */
  updateKoiKoiMultiplier(playerId: string, multiplier: number): void
}
```

---

#### TriggerUIEffectPort

**職責**: 觸發 UI 效果（動畫、Modal、訊息提示等）

```typescript
// ports/output/trigger-ui-effect.port.ts

export type AnimationType =
  | 'DEAL_CARDS'
  | 'CARD_MOVE'
  | 'YAKU_EFFECT'
  | 'SCORE_UPDATE'

export type AnimationParams<T extends AnimationType = AnimationType> =
  T extends 'DEAL_CARDS' ? {
    fieldCards: string[]
    hands: Array<{ player_id: string; cards: string[] }>
  } :
  T extends 'CARD_MOVE' ? {
    cardId: string
    from: 'hand' | 'field' | 'deck'
    to: 'field' | 'depository'
  } :
  T extends 'YAKU_EFFECT' ? {
    yakuType: string
    affectedCards: string[]
  } :
  T extends 'SCORE_UPDATE' ? {
    playerId: string
    oldScore: number
    newScore: number
  } :
  never

export interface TriggerUIEffectPort {
  /**
   * 顯示選擇配對 UI
   * @param possibleTargets 可選目標列表
   */
  showSelectionUI(possibleTargets: string[]): void

  /**
   * 顯示 Koi-Koi 決策 Modal
   * @param currentYaku 當前役種列表
   * @param currentScore 當前分數
   * @param potentialScore 潛在分數（可選）
   */
  showDecisionModal(
    currentYaku: YakuScore[],
    currentScore: number,
    potentialScore?: number
  ): void

  /**
   * 顯示錯誤訊息
   * @param message 錯誤訊息
   */
  showErrorMessage(message: string): void

  /**
   * 顯示重連成功訊息
   */
  showReconnectionMessage(): void

  /**
   * 觸發動畫
   * @param type 動畫類型
   * @param params 動畫參數
   */
  triggerAnimation<T extends AnimationType>(
    type: T,
    params: AnimationParams<T>
  ): void
}
```

---

## 3. Protocol 型別（40+ 個）

### 3.1 核心枚舉

```typescript
// types/flow-state.ts

/**
 * 遊戲流程狀態
 * 參考: doc/shared/protocol.md#FlowState
 */
export type FlowState =
  | 'AWAITING_HAND_PLAY'
  | 'AWAITING_SELECTION'
  | 'AWAITING_DECISION'

export const FlowState = {
  AWAITING_HAND_PLAY: 'AWAITING_HAND_PLAY' as const,
  AWAITING_SELECTION: 'AWAITING_SELECTION' as const,
  AWAITING_DECISION: 'AWAITING_DECISION' as const
} as const
```

```typescript
// types/errors.ts

export type ErrorCode =
  | 'INVALID_CARD'
  | 'INVALID_TARGET'
  | 'WRONG_PLAYER'
  | 'INVALID_STATE'
  | 'INVALID_SELECTION'
  | 'CARD_NOT_IN_HAND'  // 客戶端預驗證錯誤

export type RoundEndReason =
  | 'TESHI'
  | 'FIELD_KUTTSUKI'
  | 'NO_YAKU'
```

---

### 3.2 SSE 事件型別（15+ 個）

```typescript
// types/events.ts

/**
 * GameStarted 事件
 * 參考: doc/shared/protocol.md#GameStarted
 */
export interface GameStartedEvent {
  readonly event_type: 'GameStarted'
  readonly event_id: string
  readonly timestamp: string
  readonly game_id: string
  readonly players: ReadonlyArray<PlayerInfo>
  readonly ruleset: Ruleset
  readonly starting_player_id: string
}

/**
 * RoundDealt 事件
 * 參考: doc/shared/protocol.md#RoundDealt
 */
export interface RoundDealtEvent {
  readonly event_type: 'RoundDealt'
  readonly event_id: string
  readonly timestamp: string
  readonly dealer_id: string
  readonly field: ReadonlyArray<string>
  readonly hands: ReadonlyArray<PlayerHand>
  readonly deck_remaining: number
  readonly next_state: NextState
}

/**
 * TurnCompleted 事件
 * 參考: doc/shared/protocol.md#TurnCompleted
 */
export interface TurnCompletedEvent {
  readonly event_type: 'TurnCompleted'
  readonly event_id: string
  readonly timestamp: string
  readonly player_id: string
  readonly hand_card_play: CardPlay | null
  readonly draw_card_play: CardPlay | null
  readonly deck_remaining: number
  readonly next_state: NextState
}

/**
 * SelectionRequired 事件
 * 參考: doc/shared/protocol.md#SelectionRequired
 */
export interface SelectionRequiredEvent {
  readonly event_type: 'SelectionRequired'
  readonly event_id: string
  readonly timestamp: string
  readonly player_id: string
  readonly hand_card_play: CardPlay
  readonly drawn_card: string
  readonly possible_targets: ReadonlyArray<string>
  readonly deck_remaining: number
}

/**
 * TurnProgressAfterSelection 事件
 * 參考: doc/shared/protocol.md#TurnProgressAfterSelection
 */
export interface TurnProgressAfterSelectionEvent {
  readonly event_type: 'TurnProgressAfterSelection'
  readonly event_id: string
  readonly timestamp: string
  readonly player_id: string
  readonly selection: CardSelection
  readonly draw_card_play: CardPlay
  readonly yaku_update: YakuUpdate | null
  readonly deck_remaining: number
  readonly next_state: NextState
}

/**
 * DecisionRequired 事件
 * 參考: doc/shared/protocol.md#DecisionRequired
 */
export interface DecisionRequiredEvent {
  readonly event_type: 'DecisionRequired'
  readonly event_id: string
  readonly timestamp: string
  readonly player_id: string
  readonly hand_card_play: CardPlay | null
  readonly draw_card_play: CardPlay | null
  readonly yaku_update: YakuUpdate
  readonly current_multipliers: ScoreMultipliers
  readonly deck_remaining: number
}

/**
 * DecisionMade 事件
 * 參考: doc/shared/protocol.md#DecisionMade
 */
export interface DecisionMadeEvent {
  readonly event_type: 'DecisionMade'
  readonly event_id: string
  readonly timestamp: string
  readonly player_id: string
  readonly decision: 'KOI_KOI' | 'END_ROUND'
  readonly updated_multipliers: ScoreMultipliers
  readonly next_state: NextState
}

/**
 * RoundScored 事件
 * 參考: doc/shared/protocol.md#RoundScored
 */
export interface RoundScoredEvent {
  readonly event_type: 'RoundScored'
  readonly event_id: string
  readonly timestamp: string
  readonly winner_id: string
  readonly yaku_list: ReadonlyArray<Yaku>
  readonly base_score: number
  readonly final_score: number
  readonly multipliers: ScoreMultipliers
  readonly updated_total_scores: ReadonlyArray<PlayerScore>
}

/**
 * RoundDrawn 事件
 * 參考: doc/shared/protocol.md#RoundDrawn
 */
export interface RoundDrawnEvent {
  readonly event_type: 'RoundDrawn'
  readonly event_id: string
  readonly timestamp: string
  readonly current_total_scores: ReadonlyArray<PlayerScore>
}

/**
 * RoundEndedInstantly 事件
 * 參考: doc/shared/protocol.md#RoundEndedInstantly
 */
export interface RoundEndedInstantlyEvent {
  readonly event_type: 'RoundEndedInstantly'
  readonly event_id: string
  readonly timestamp: string
  readonly reason: RoundEndReason
  readonly winner_id: string | null
  readonly awarded_points: number
  readonly updated_total_scores: ReadonlyArray<PlayerScore>
}

/**
 * GameFinished 事件
 * 參考: doc/shared/protocol.md#GameFinished
 */
export interface GameFinishedEvent {
  readonly event_type: 'GameFinished'
  readonly event_id: string
  readonly timestamp: string
  readonly winner_id: string
  readonly final_scores: ReadonlyArray<PlayerScore>
}

/**
 * TurnError 事件
 * 參考: doc/shared/protocol.md#TurnError
 */
export interface TurnErrorEvent {
  readonly event_type: 'TurnError'
  readonly event_id: string
  readonly timestamp: string
  readonly player_id: string
  readonly error_code: ErrorCode
  readonly error_message: string
  readonly retry_allowed: boolean
}

/**
 * GameSnapshotRestore 快照
 * 參考: doc/shared/protocol.md#GameSnapshotRestore
 */
export interface GameSnapshotRestore {
  readonly game_id: string
  readonly players: ReadonlyArray<PlayerInfo>
  readonly ruleset: Ruleset
  readonly field_cards: ReadonlyArray<string>
  readonly deck_remaining: number
  readonly player_hands: ReadonlyArray<PlayerHand>
  readonly player_depositories: ReadonlyArray<PlayerDepository>
  readonly player_scores: ReadonlyArray<PlayerScore>
  readonly current_flow_stage: FlowState
  readonly active_player_id: string
  readonly koi_statuses: ReadonlyArray<KoiStatus>
}
```

---

### 3.3 命令型別（3 個）

```typescript
// types/commands.ts

/**
 * TurnPlayHandCard 命令
 * 參考: doc/shared/protocol.md#TurnPlayHandCard
 */
export interface TurnPlayHandCard {
  readonly command_type: 'TurnPlayHandCard'
  readonly game_id: string
  readonly player_id: string
  readonly card_id: string
  readonly target_card_id?: string
}

/**
 * TurnSelectTarget 命令
 * 參考: doc/shared/protocol.md#TurnSelectTarget
 */
export interface TurnSelectTarget {
  readonly command_type: 'TurnSelectTarget'
  readonly game_id: string
  readonly player_id: string
  readonly source_card_id: string
  readonly target_card_id: string
}

/**
 * RoundMakeDecision 命令
 * 參考: doc/shared/protocol.md#RoundMakeDecision
 */
export interface RoundMakeDecision {
  readonly command_type: 'RoundMakeDecision'
  readonly game_id: string
  readonly player_id: string
  readonly decision: 'KOI_KOI' | 'END_ROUND'
}
```

---

### 3.4 共用資料結構（20+ 個）

```typescript
// types/shared.ts

export interface PlayerInfo {
  readonly player_id: string
  readonly player_name: string
  readonly is_ai: boolean
}

export interface PlayerHand {
  readonly player_id: string
  readonly cards: ReadonlyArray<string>
}

export interface PlayerDepository {
  readonly player_id: string
  readonly cards: ReadonlyArray<string>
}

export interface PlayerScore {
  readonly player_id: string
  readonly score: number
}

export interface NextState {
  readonly state_type: FlowState
  readonly active_player_id: string
}

export interface CardPlay {
  readonly played_card: string
  readonly matched_card: string | null
  readonly captured_cards: ReadonlyArray<string>
}

export interface CardSelection {
  readonly source_card: string
  readonly selected_target: string
  readonly captured_cards: ReadonlyArray<string>
}

export interface Yaku {
  readonly yaku_type: string
  readonly base_points: number
  readonly contributing_cards: ReadonlyArray<string>
}

export interface YakuUpdate {
  readonly newly_formed_yaku: ReadonlyArray<Yaku>
  readonly all_active_yaku: ReadonlyArray<Yaku>
}

export interface ScoreMultipliers {
  readonly player_multipliers: Record<string, number>
}

export interface KoiStatus {
  readonly player_id: string
  readonly koi_multiplier: number
  readonly times_continued: number
}

export interface Ruleset {
  readonly target_score: number
  readonly yaku_settings: ReadonlyArray<YakuSetting>
  readonly special_rules: SpecialRules
}

export interface YakuSetting {
  readonly yaku_type: string
  readonly base_points: number
  readonly enabled: boolean
}

export interface SpecialRules {
  readonly teshi_enabled: boolean
  readonly field_kuttsuki_enabled: boolean
}

/**
 * 役種分數（來自 Domain Layer）
 */
export interface YakuScore {
  readonly yaku_type: string
  readonly base_points: number
}
```

---

### 3.5 輔助型別

```typescript
// types/result.ts

/**
 * Result 型別（用於同步操作的錯誤處理）
 */
export type Result<T, E = string> =
  | { success: true; value: T }
  | { success: false; error: E }
```

```typescript
// types/domain-facade.ts

import type { Card, YakuType, YakuProgress } from '@/user-interface/domain'

/**
 * Domain Services 介面（包裝 Domain Layer 純函數）
 */
export interface DomainFacade {
  canMatch(card1: Card, card2: Card): boolean
  findMatchableCards(handCard: Card, fieldCards: Card[]): Card[]
  validateCardExists(card: Card, handCards: Card[]): boolean
  validateTargetInList(target: Card, possibleTargets: Card[]): boolean
  calculateYakuProgress(yakuType: YakuType, depositoryCards: Card[]): YakuProgress
}
```

---

## 4. 實體關係圖

```
┌─────────────────────────────────────────────────────┐
│                   Adapter Layer                     │
│  (Vue Components, Pinia Store, REST Client, SSE)   │
└─────────────────────┬──────────────────────┬────────┘
                      │ 呼叫                  │ 實作
                      ▼                       ▼
        ┌──────────────────────┐   ┌──────────────────────┐
        │   Input Ports (18)   │   │  Output Ports (3)    │
        │  - PlayHandCardPort  │   │  - SendCommandPort   │
        │  - Handle*Port       │   │  - UIStatePort │
        │  ...                 │   │  - TriggerUIEffectPort│
        └──────────┬───────────┘   └──────────┬───────────┘
                   │ 實作                      │ 呼叫
                   ▼                           ▼
        ┌──────────────────────────────────────────────┐
        │          Use Cases (18)                      │
        │  - PlayHandCardUseCase                       │
        │  - HandleGameStartedUseCase                  │
        │  ...                                         │
        └──────────────────────┬───────────────────────┘
                               │ 呼叫
                               ▼
                   ┌───────────────────────┐
                   │   Domain Services     │
                   │  (Domain Layer 包裝)  │
                   └───────────┬───────────┘
                               │ 調用
                               ▼
                   ┌───────────────────────┐
                   │    Domain Layer       │
                   │  (純業務邏輯函數)      │
                   └───────────────────────┘
```

---

## 5. 資料流範例

### 範例 1: 玩家打牌流程

```
1. 用戶點擊手牌
   ↓
2. Vue Component 呼叫 PlayHandCardUseCase.execute()
   ↓
3. Use Case 調用 DomainFacade.validateCardExists()
   ↓
4. Use Case 調用 DomainFacade.findMatchableCards()
   ↓
5a. 多重配對 → 調用 TriggerUIEffectPort.showSelectionUI()
5b. 單一配對 → 調用 SendCommandPort.playHandCard()
   ↓
6. SendCommandPort 實作發送 REST API 請求到後端
   ↓
7. 後端驗證並推送 SSE 事件（TurnCompleted 或 SelectionRequired）
   ↓
8. SSE Listener 調用對應的 Handle*UseCase.execute()
   ↓
9. Use Case 調用 UIStatePort 和 TriggerUIEffectPort 更新 UI
```

### 範例 2: SSE 事件處理流程

```
1. 後端推送 DecisionRequired 事件
   ↓
2. SSE Listener 解析事件
   ↓
3. SSE Listener 調用 HandleDecisionRequiredUseCase.execute(event)
   ↓
4. Use Case 調用 TriggerUIEffectPort.triggerAnimation() 觸發動畫
   ↓
5. Use Case 調用 UIStatePort 更新場牌、手牌、獲得區
   ↓
6. Use Case 調用 DomainFacade.calculateYakuProgress() 計算分數
   ↓
7. Use Case 調用 TriggerUIEffectPort.showDecisionModal() 顯示 Modal
   ↓
8. Use Case 調用 UIStatePort.setFlowStage('AWAITING_DECISION')
```

---

## 6. 實體統計

| 類別 | 數量 | 備註 |
|------|------|------|
| Use Cases | 18 | 3 玩家操作 + 15 事件處理 |
| Input Ports | 18 | 對應 18 個 Use Cases |
| Output Ports | 3 | SendCommand, UpdateUIState, TriggerUIEffect |
| SSE 事件型別 | 13 | 包含 GameSnapshotRestore |
| 命令型別 | 3 | TurnPlayHandCard, TurnSelectTarget, RoundMakeDecision |
| 共用資料結構 | 20+ | PlayerInfo, Yaku, Ruleset 等 |
| 枚舉型別 | 3 | FlowState, ErrorCode, RoundEndReason |
| 輔助型別 | 5 | Result, AnimationType, DomainFacade 等 |
| **總計** | **80+** | |

---

## 下一步

1. 生成 contracts/（Port 介面詳細規範）
2. 生成 quickstart.md（開發指南）
3. 更新 CLAUDE.md（記錄新技術）
