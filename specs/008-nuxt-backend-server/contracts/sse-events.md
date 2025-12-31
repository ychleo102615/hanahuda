# SSE Event Contracts

**Feature Branch**: `008-nuxt-backend-server`
**Date**: 2024-12-04

---

## 1. Overview

SSE 事件由伺服器推送至客戶端，所有事件都包含通用欄位。

### 1.1 通用事件結構

```typescript
interface BaseEvent {
  event_type: string      // 事件類型
  event_id: string        // UUID v4，事件唯一識別碼
  timestamp: string       // ISO 8601 格式
}
```

---

## 2. Adapter Layer DTOs

以下結構為 **Adapter Layer 的 DTO**，用於 Domain → SSE Event 的資料轉換。

### 2.1 ScoreMultipliers (DTO)

從 Domain 的 `KoiStatus[]` 轉換而來，用於簡化前端處理。

```typescript
// server/adapters/mappers/dtos.ts

interface ScoreMultipliers {
  readonly player_multipliers: Record<string, number>
}

// Mapper 函數
function toScoreMultipliers(koiStatuses: readonly KoiStatus[]): ScoreMultipliers {
  return {
    player_multipliers: Object.fromEntries(
      koiStatuses.map(k => [k.player_id, k.koi_multiplier])
    )
  }
}
```

### 2.2 NextState (DTO)

```typescript
interface NextState {
  readonly state_type: FlowState
  readonly active_player_id: string
}
```

### 2.3 YakuUpdate (DTO)

```typescript
interface YakuUpdate {
  readonly newly_formed_yaku: readonly Yaku[]
  readonly all_active_yaku: readonly Yaku[]
}
```

---

## 3. Game-Level Events

### 3.1 GameStartedEvent

遊戲配對完成，雙方玩家收到。

```typescript
interface GameStartedEvent extends BaseEvent {
  event_type: 'GameStarted'
  game_id: string
  players: readonly PlayerInfo[]
  ruleset: Ruleset
  starting_player_id: string
}

interface PlayerInfo {
  player_id: string
  player_name: string
  is_ai: boolean
}
```

### 3.2 RoundDealtEvent

新局發牌完成。

```typescript
interface RoundDealtEvent extends BaseEvent {
  event_type: 'RoundDealt'
  dealer_id: string
  field: readonly string[]              // 場牌 IDs
  hands: readonly PlayerHand[]          // 手牌資訊
  deck_remaining: number
  next_state: NextState
  action_timeout_seconds: number
}

interface PlayerHand {
  player_id: string
  cards: readonly string[]              // 自己的手牌完整列表
  // 對手的手牌不傳 cards，前端根據 player_id 判斷
}
```

### 3.3 GameFinishedEvent

遊戲結束。

```typescript
interface GameFinishedEvent extends BaseEvent {
  event_type: 'GameFinished'
  winner_id: string
  final_scores: readonly PlayerScore[]
}

interface PlayerScore {
  player_id: string
  score: number
}
```

---

## 4. Turn-Level Events

### 4.1 TurnCompletedEvent

回合無中斷完成（無雙重配對、無役種形成）。

```typescript
interface TurnCompletedEvent extends BaseEvent {
  event_type: 'TurnCompleted'
  player_id: string
  hand_card_play: CardPlay              // 必定存在
  draw_card_play: CardPlay              // 必定存在
  deck_remaining: number
  next_state: NextState
  action_timeout_seconds: number
}

interface CardPlay {
  played_card: string
  matched_card: string | null
  captured_cards: readonly string[]
}
```

### 4.2 SelectionRequiredEvent

翻牌出現雙重配對，需要玩家選擇。

```typescript
interface SelectionRequiredEvent extends BaseEvent {
  event_type: 'SelectionRequired'
  player_id: string
  hand_card_play: CardPlay              // 已完成的手牌操作
  drawn_card: string                    // 翻出的卡片
  possible_targets: readonly string[]   // 可選配對目標
  deck_remaining: number
  action_timeout_seconds: number
}
```

### 4.3 TurnProgressAfterSelectionEvent

玩家選擇配對目標後，回合繼續。

```typescript
interface TurnProgressAfterSelectionEvent extends BaseEvent {
  event_type: 'TurnProgressAfterSelection'
  player_id: string
  selection: CardSelection
  draw_card_play: CardPlay
  yaku_update: YakuUpdate | null        // 有新役種時才有值
  deck_remaining: number
  next_state: NextState
  action_timeout_seconds: number
}

interface CardSelection {
  source_card: string
  selected_target: string
  captured_cards: readonly string[]
}
```

---

## 5. Decision Events

### 5.1 DecisionRequiredEvent

玩家形成役種，需要做 Koi-Koi 決策。

```typescript
interface DecisionRequiredEvent extends BaseEvent {
  event_type: 'DecisionRequired'
  player_id: string
  hand_card_play: CardPlay | null       // 可能在手牌階段形成
  draw_card_play: CardPlay | null       // 可能在翻牌階段形成
  yaku_update: YakuUpdate
  current_multipliers: ScoreMultipliers // DTO：從 KoiStatus[] 轉換
  deck_remaining: number
  action_timeout_seconds: number
}
```

### 5.2 DecisionMadeEvent

玩家選擇 KOI_KOI（選擇 END_ROUND 時直接推送 RoundScoredEvent）。

```typescript
interface DecisionMadeEvent extends BaseEvent {
  event_type: 'DecisionMade'
  player_id: string
  decision: 'KOI_KOI' | 'END_ROUND'
  updated_multipliers: ScoreMultipliers // DTO：更新後的倍率
  next_state: NextState
  action_timeout_seconds: number
}
```

---

## 6. Round-End Events

### 6.1 RoundScoredEvent

局結束計分（玩家選擇 END_ROUND 或對手 Koi-Koi 後被反殺）。

```typescript
interface RoundScoredEvent extends BaseEvent {
  event_type: 'RoundScored'
  winner_id: string
  yaku_list: readonly Yaku[]
  base_score: number
  final_score: number                   // base_score × multipliers
  multipliers: ScoreMultipliers         // DTO：最終倍率
  updated_total_scores: readonly PlayerScore[]
  display_timeout_seconds: number       // 結果畫面顯示時間
}

interface Yaku {
  yaku_type: string
  base_points: number
  contributing_cards: readonly string[]
}
```

### 6.2 RoundDrawnEvent

平局（牌堆耗盡，無人形成役種）。

```typescript
interface RoundDrawnEvent extends BaseEvent {
  event_type: 'RoundDrawn'
  current_total_scores: readonly PlayerScore[]
  display_timeout_seconds: number
}
```

### 6.3 RoundEndedInstantlyEvent

局立即結束（Teshi 或場牌流局）。

```typescript
interface RoundEndedInstantlyEvent extends BaseEvent {
  event_type: 'RoundEndedInstantly'
  reason: RoundEndReason
  winner_id: string | null              // Teshi 時有勝者
  awarded_points: number
  updated_total_scores: readonly PlayerScore[]
  display_timeout_seconds: number
}

type RoundEndReason = 'TESHI' | 'FIELD_KUTTSUKI' | 'NO_YAKU'
```

---

## 7. Error Events

### 7.1 TurnErrorEvent

回合操作錯誤。

```typescript
interface TurnErrorEvent extends BaseEvent {
  event_type: 'TurnError'
  player_id: string
  error_code: ErrorCode
  error_message: string
  retry_allowed: boolean
}

type ErrorCode =
  | 'INVALID_CARD'
  | 'INVALID_TARGET'
  | 'WRONG_PLAYER'
  | 'INVALID_STATE'
  | 'INVALID_SELECTION'
```

### 7.2 GameErrorEvent

遊戲層級錯誤。

```typescript
interface GameErrorEvent extends BaseEvent {
  event_type: 'GameError'
  error_code: GameErrorCode
  message: string
  recoverable: boolean
  suggested_action?: SuggestedAction
}

type GameErrorCode =
  | 'MATCHMAKING_TIMEOUT'
  | 'GAME_EXPIRED'
  | 'SESSION_INVALID'
  | 'OPPONENT_DISCONNECTED'

type SuggestedAction =
  | 'RETRY_MATCHMAKING'
  | 'RETURN_HOME'
  | 'RECONNECT'
```

---

## 8. Reconnection Event

### 8.1 GameSnapshotRestore

斷線重連時的完整狀態快照。

```typescript
interface GameSnapshotRestore extends BaseEvent {
  event_type: 'GameSnapshotRestore'
  game_id: string
  players: readonly PlayerInfo[]
  ruleset: Ruleset
  field_cards: readonly string[]
  deck_remaining: number
  player_hands: readonly PlayerHand[]
  player_depositories: readonly PlayerDepository[]
  player_scores: readonly PlayerScore[]
  current_flow_stage: FlowState
  active_player_id: string
  koi_statuses: readonly KoiStatus[]    // Domain VO 直接傳遞
  action_timeout_seconds: number
}

interface PlayerDepository {
  player_id: string
  cards: readonly string[]
}
```

---

## 9. Event Mapper 範例

```typescript
// server/adapters/mappers/eventMapper.ts

import type { Game, Round, KoiStatus } from '~/server/domain'
import type { DecisionRequiredEvent, ScoreMultipliers } from './dtos'

export class EventMapper {
  /**
   * Domain KoiStatus[] → DTO ScoreMultipliers
   */
  toScoreMultipliers(koiStatuses: readonly KoiStatus[]): ScoreMultipliers {
    return {
      player_multipliers: Object.fromEntries(
        koiStatuses.map(k => [k.player_id, k.koi_multiplier])
      )
    }
  }

  /**
   * 建立 DecisionRequiredEvent
   */
  toDecisionRequiredEvent(
    game: Game,
    round: Round,
    handCardPlay: CardPlay | null,
    drawCardPlay: CardPlay | null,
    yakuUpdate: YakuUpdate
  ): DecisionRequiredEvent {
    return {
      event_type: 'DecisionRequired',
      event_id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      player_id: round.activePlayerId,
      hand_card_play: handCardPlay,
      draw_card_play: drawCardPlay,
      yaku_update: yakuUpdate,
      current_multipliers: this.toScoreMultipliers(round.koiStatuses),
      deck_remaining: round.deck.length,
      action_timeout_seconds: 15,
    }
  }
}
```

---

## 10. Event Flow Summary

```
遊戲開始
  └─> GameStartedEvent
  └─> RoundDealtEvent

回合流程
  └─> TurnCompletedEvent (無中斷)
  └─> SelectionRequiredEvent → TurnProgressAfterSelectionEvent
  └─> DecisionRequiredEvent → DecisionMadeEvent (KOI_KOI)
                            → RoundScoredEvent (END_ROUND)

局結束
  └─> RoundScoredEvent / RoundDrawnEvent / RoundEndedInstantlyEvent
  └─> RoundDealtEvent (下一局) 或 GameFinishedEvent

錯誤處理
  └─> TurnErrorEvent (操作錯誤)
  └─> GameErrorEvent (會話錯誤)

重連
  └─> GameSnapshotRestore
```
