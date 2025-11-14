# SSE Events Contract

**Feature**: 003-ui-application-layer
**Date**: 2025-11-14
**Purpose**: 定義所有 SSE 事件型別的 TypeScript 介面規範，確保與 protocol.md 一致

## 概述

本文檔定義 Application Layer 處理的所有 SSE 事件型別，嚴格遵循 `doc/shared/protocol.md` 的規範。所有事件介面使用 `readonly` 修飾符確保不可變性。

**總數**: 13 種事件型別（包含 GameSnapshotRestore）

---

## 事件型別映射表

| Event Type | 觸發時機 | 對應 Use Case |
|------------|---------|--------------|
| GameStarted | 遊戲初始化完成 | HandleGameStartedUseCase |
| RoundDealt | 發牌完成 | HandleRoundDealtUseCase |
| TurnCompleted | 回合完成（無中斷） | HandleTurnCompletedUseCase |
| SelectionRequired | 翻牌雙重配對 | HandleSelectionRequiredUseCase |
| TurnProgressAfterSelection | 選擇後回合進展 | HandleTurnProgressAfterSelectionUseCase |
| DecisionRequired | 役種形成，需決策 | HandleDecisionRequiredUseCase |
| DecisionMade | 決策完成（Koi-Koi） | HandleDecisionMadeUseCase |
| RoundScored | 局結束計分 | HandleRoundScoredUseCase |
| RoundDrawn | 平局 | HandleRoundDrawnUseCase |
| RoundEndedInstantly | 特殊結束（Teshi/流局） | HandleRoundEndedInstantlyUseCase |
| GameFinished | 遊戲結束 | HandleGameFinishedUseCase |
| TurnError | 操作錯誤 | HandleTurnErrorUseCase |
| GameSnapshotRestore | 斷線重連快照 | HandleReconnectionUseCase |

---

## 1. GameStarted

**參考**: `doc/shared/protocol.md#GameStarted`

**觸發時機**: 遊戲初始化完成，首局開始前

**介面定義**:
```typescript
export interface GameStartedEvent {
  readonly event_type: 'GameStarted'
  readonly event_id: string
  readonly timestamp: string        // ISO 8601 格式
  readonly game_id: string
  readonly players: ReadonlyArray<PlayerInfo>
  readonly ruleset: Ruleset
  readonly starting_player_id: string
}
```

**相關型別**:
```typescript
export interface PlayerInfo {
  readonly player_id: string
  readonly player_name: string
  readonly is_ai: boolean
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
```

**範例 Payload**:
```json
{
  "event_type": "GameStarted",
  "event_id": "evt_001",
  "timestamp": "2025-11-14T10:30:00Z",
  "game_id": "game_12345",
  "players": [
    { "player_id": "player-1", "player_name": "Alice", "is_ai": false },
    { "player_id": "player-2", "player_name": "AI Bot", "is_ai": true }
  ],
  "ruleset": {
    "target_score": 50,
    "yaku_settings": [
      { "yaku_type": "五光", "base_points": 10, "enabled": true }
    ],
    "special_rules": {
      "teshi_enabled": true,
      "field_kuttsuki_enabled": true
    }
  },
  "starting_player_id": "player-1"
}
```

---

## 2. RoundDealt

**參考**: `doc/shared/protocol.md#RoundDealt`

**觸發時機**: 發牌完成，回合開始前

**介面定義**:
```typescript
export interface RoundDealtEvent {
  readonly event_type: 'RoundDealt'
  readonly event_id: string
  readonly timestamp: string
  readonly dealer_id: string
  readonly field: ReadonlyArray<string>          // 場牌列表（8 張）
  readonly hands: ReadonlyArray<PlayerHand>      // 玩家手牌
  readonly deck_remaining: number                // 牌堆剩餘數量
  readonly next_state: NextState
}
```

**相關型別**:
```typescript
export interface PlayerHand {
  readonly player_id: string
  readonly cards: ReadonlyArray<string>
}

export interface NextState {
  readonly state_type: FlowState
  readonly active_player_id: string
}

export type FlowState =
  | 'AWAITING_HAND_PLAY'
  | 'AWAITING_SELECTION'
  | 'AWAITING_DECISION'
```

**範例 Payload**:
```json
{
  "event_type": "RoundDealt",
  "event_id": "evt_002",
  "timestamp": "2025-11-14T10:30:05Z",
  "dealer_id": "player-1",
  "field": ["0111", "0121", "0211", "0221", "0311", "0321", "0411", "0421"],
  "hands": [
    { "player_id": "player-1", "cards": ["0131", "0141", "0231", "0241"] },
    { "player_id": "player-2", "cards": ["0331", "0341", "0431", "0441"] }
  ],
  "deck_remaining": 32,
  "next_state": {
    "state_type": "AWAITING_HAND_PLAY",
    "active_player_id": "player-1"
  }
}
```

---

## 3. TurnCompleted

**參考**: `doc/shared/protocol.md#TurnCompleted`

**觸發時機**: 回合完成，無中斷、無役種形成

**介面定義**:
```typescript
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
```

**相關型別**:
```typescript
export interface CardPlay {
  readonly played_card: string          // 打出或翻出的卡片 ID
  readonly matched_card: string | null  // 配對到的場牌 ID（若有）
  readonly captured_cards: ReadonlyArray<string>  // 獲得的卡片列表
}
```

**範例 Payload**:
```json
{
  "event_type": "TurnCompleted",
  "event_id": "evt_003",
  "timestamp": "2025-11-14T10:30:10Z",
  "player_id": "player-1",
  "hand_card_play": {
    "played_card": "0131",
    "matched_card": "0111",
    "captured_cards": ["0131", "0111"]
  },
  "draw_card_play": {
    "played_card": "0151",
    "matched_card": null,
    "captured_cards": []
  },
  "deck_remaining": 31,
  "next_state": {
    "state_type": "AWAITING_HAND_PLAY",
    "active_player_id": "player-2"
  }
}
```

---

## 4. SelectionRequired

**參考**: `doc/shared/protocol.md#SelectionRequired`

**觸發時機**: 翻牌時出現雙重配對（場上有 2+ 張同月份牌）

**介面定義**:
```typescript
export interface SelectionRequiredEvent {
  readonly event_type: 'SelectionRequired'
  readonly event_id: string
  readonly timestamp: string
  readonly player_id: string
  readonly hand_card_play: CardPlay         // 已完成的手牌操作
  readonly drawn_card: string               // 翻出的牌
  readonly possible_targets: ReadonlyArray<string>  // 可選配對目標
  readonly deck_remaining: number
}
```

**範例 Payload**:
```json
{
  "event_type": "SelectionRequired",
  "event_id": "evt_004",
  "timestamp": "2025-11-14T10:30:15Z",
  "player_id": "player-1",
  "hand_card_play": {
    "played_card": "0231",
    "matched_card": "0211",
    "captured_cards": ["0231", "0211"]
  },
  "drawn_card": "0241",
  "possible_targets": ["0221", "0222"],
  "deck_remaining": 30
}
```

---

## 5. TurnProgressAfterSelection

**參考**: `doc/shared/protocol.md#TurnProgressAfterSelection`

**觸發時機**: 玩家選擇配對目標後，回合繼續進行

**介面定義**:
```typescript
export interface TurnProgressAfterSelectionEvent {
  readonly event_type: 'TurnProgressAfterSelection'
  readonly event_id: string
  readonly timestamp: string
  readonly player_id: string
  readonly selection: CardSelection
  readonly draw_card_play: CardPlay         // 翻牌操作結果
  readonly yaku_update: YakuUpdate | null   // 役種更新（若有）
  readonly deck_remaining: number
  readonly next_state: NextState
}
```

**相關型別**:
```typescript
export interface CardSelection {
  readonly source_card: string       // 來源卡片（翻出的牌）
  readonly selected_target: string   // 選擇的目標
  readonly captured_cards: ReadonlyArray<string>
}

export interface YakuUpdate {
  readonly newly_formed_yaku: ReadonlyArray<Yaku>  // 新形成的役種
  readonly all_active_yaku: ReadonlyArray<Yaku>    // 所有當前役種
}

export interface Yaku {
  readonly yaku_type: string
  readonly base_points: number
  readonly contributing_cards: ReadonlyArray<string>
}
```

**範例 Payload**:
```json
{
  "event_type": "TurnProgressAfterSelection",
  "event_id": "evt_005",
  "timestamp": "2025-11-14T10:30:20Z",
  "player_id": "player-1",
  "selection": {
    "source_card": "0241",
    "selected_target": "0221",
    "captured_cards": ["0241", "0221"]
  },
  "draw_card_play": {
    "played_card": "0241",
    "matched_card": "0221",
    "captured_cards": ["0241", "0221"]
  },
  "yaku_update": null,
  "deck_remaining": 30,
  "next_state": {
    "state_type": "AWAITING_HAND_PLAY",
    "active_player_id": "player-2"
  }
}
```

---

## 6. DecisionRequired

**參考**: `doc/shared/protocol.md#DecisionRequired`

**觸發時機**: 役種形成，需要玩家決策（繼續或結束）

**介面定義**:
```typescript
export interface DecisionRequiredEvent {
  readonly event_type: 'DecisionRequired'
  readonly event_id: string
  readonly timestamp: string
  readonly player_id: string
  readonly hand_card_play: CardPlay | null
  readonly draw_card_play: CardPlay | null
  readonly yaku_update: YakuUpdate        // 役種更新（必定非 null）
  readonly current_multipliers: ScoreMultipliers
  readonly deck_remaining: number
}
```

**相關型別**:
```typescript
export interface ScoreMultipliers {
  readonly player_multipliers: Record<string, number>
}
```

**範例 Payload**:
```json
{
  "event_type": "DecisionRequired",
  "event_id": "evt_006",
  "timestamp": "2025-11-14T10:30:25Z",
  "player_id": "player-1",
  "hand_card_play": {
    "played_card": "0331",
    "matched_card": "0311",
    "captured_cards": ["0331", "0311"]
  },
  "draw_card_play": {
    "played_card": "0351",
    "matched_card": null,
    "captured_cards": []
  },
  "yaku_update": {
    "newly_formed_yaku": [
      {
        "yaku_type": "赤短",
        "base_points": 5,
        "contributing_cards": ["0321", "0221", "0122"]
      }
    ],
    "all_active_yaku": [
      {
        "yaku_type": "赤短",
        "base_points": 5,
        "contributing_cards": ["0321", "0221", "0122"]
      }
    ]
  },
  "current_multipliers": {
    "player_multipliers": {
      "player-1": 1,
      "player-2": 1
    }
  },
  "deck_remaining": 29
}
```

---

## 7. DecisionMade

**參考**: `doc/shared/protocol.md#DecisionMade`

**觸發時機**: 玩家做出決策（僅在選擇 KOI_KOI 時推送）

**介面定義**:
```typescript
export interface DecisionMadeEvent {
  readonly event_type: 'DecisionMade'
  readonly event_id: string
  readonly timestamp: string
  readonly player_id: string
  readonly decision: 'KOI_KOI' | 'END_ROUND'
  readonly updated_multipliers: ScoreMultipliers
  readonly next_state: NextState
}
```

**範例 Payload**:
```json
{
  "event_type": "DecisionMade",
  "event_id": "evt_007",
  "timestamp": "2025-11-14T10:30:30Z",
  "player_id": "player-1",
  "decision": "KOI_KOI",
  "updated_multipliers": {
    "player_multipliers": {
      "player-1": 2,
      "player-2": 1
    }
  },
  "next_state": {
    "state_type": "AWAITING_HAND_PLAY",
    "active_player_id": "player-1"
  }
}
```

---

## 8. RoundScored

**參考**: `doc/shared/protocol.md#RoundScored`

**觸發時機**: 局結束，計分完成

**介面定義**:
```typescript
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
```

**相關型別**:
```typescript
export interface PlayerScore {
  readonly player_id: string
  readonly score: number
}
```

**範例 Payload**:
```json
{
  "event_type": "RoundScored",
  "event_id": "evt_008",
  "timestamp": "2025-11-14T10:35:00Z",
  "winner_id": "player-1",
  "yaku_list": [
    {
      "yaku_type": "赤短",
      "base_points": 5,
      "contributing_cards": ["0321", "0221", "0122"]
    }
  ],
  "base_score": 5,
  "final_score": 10,
  "multipliers": {
    "player_multipliers": {
      "player-1": 2,
      "player-2": 1
    }
  },
  "updated_total_scores": [
    { "player_id": "player-1", "score": 10 },
    { "player_id": "player-2", "score": 0 }
  ]
}
```

---

## 9. RoundDrawn

**參考**: `doc/shared/protocol.md#RoundDrawn`

**觸發時機**: 局結束，平局（無人形成役種）

**介面定義**:
```typescript
export interface RoundDrawnEvent {
  readonly event_type: 'RoundDrawn'
  readonly event_id: string
  readonly timestamp: string
  readonly current_total_scores: ReadonlyArray<PlayerScore>
}
```

**範例 Payload**:
```json
{
  "event_type": "RoundDrawn",
  "event_id": "evt_009",
  "timestamp": "2025-11-14T10:40:00Z",
  "current_total_scores": [
    { "player_id": "player-1", "score": 10 },
    { "player_id": "player-2", "score": 5 }
  ]
}
```

---

## 10. RoundEndedInstantly

**參考**: `doc/shared/protocol.md#RoundEndedInstantly`

**觸發時機**: 局因特殊情況立即結束（Teshi 或場牌流局）

**介面定義**:
```typescript
export interface RoundEndedInstantlyEvent {
  readonly event_type: 'RoundEndedInstantly'
  readonly event_id: string
  readonly timestamp: string
  readonly reason: RoundEndReason
  readonly winner_id: string | null
  readonly awarded_points: number
  readonly updated_total_scores: ReadonlyArray<PlayerScore>
}
```

**相關型別**:
```typescript
export type RoundEndReason =
  | 'TESHI'           // 手四（手牌含 4 組同月份）
  | 'FIELD_KUTTSUKI'  // 場牌流局（場上 4 組同月份）
  | 'NO_YAKU'         // 無役種（牌堆用盡）
```

**範例 Payload（Teshi）**:
```json
{
  "event_type": "RoundEndedInstantly",
  "event_id": "evt_010",
  "timestamp": "2025-11-14T10:45:00Z",
  "reason": "TESHI",
  "winner_id": "player-1",
  "awarded_points": 6,
  "updated_total_scores": [
    { "player_id": "player-1", "score": 16 },
    { "player_id": "player-2", "score": 5 }
  ]
}
```

---

## 11. GameFinished

**參考**: `doc/shared/protocol.md#GameFinished`

**觸發時機**: 遊戲結束（達到目標分數）

**介面定義**:
```typescript
export interface GameFinishedEvent {
  readonly event_type: 'GameFinished'
  readonly event_id: string
  readonly timestamp: string
  readonly winner_id: string
  readonly final_scores: ReadonlyArray<PlayerScore>
}
```

**範例 Payload**:
```json
{
  "event_type": "GameFinished",
  "event_id": "evt_011",
  "timestamp": "2025-11-14T11:00:00Z",
  "winner_id": "player-1",
  "final_scores": [
    { "player_id": "player-1", "score": 50 },
    { "player_id": "player-2", "score": 30 }
  ]
}
```

---

## 12. TurnError

**參考**: `doc/shared/protocol.md#TurnError`

**觸發時機**: 玩家操作錯誤

**介面定義**:
```typescript
export interface TurnErrorEvent {
  readonly event_type: 'TurnError'
  readonly event_id: string
  readonly timestamp: string
  readonly player_id: string
  readonly error_code: ErrorCode
  readonly error_message: string
  readonly retry_allowed: boolean
}
```

**相關型別**:
```typescript
export type ErrorCode =
  | 'INVALID_CARD'      // 卡片不在手牌中
  | 'INVALID_TARGET'    // 配對目標無效
  | 'WRONG_PLAYER'      // 不是當前玩家的回合
  | 'INVALID_STATE'     // 流程狀態不正確
  | 'INVALID_SELECTION' // 選擇的配對目標不合法
```

**範例 Payload**:
```json
{
  "event_type": "TurnError",
  "event_id": "evt_012",
  "timestamp": "2025-11-14T10:50:00Z",
  "player_id": "player-1",
  "error_code": "INVALID_CARD",
  "error_message": "Card '0999' is not in player's hand",
  "retry_allowed": true
}
```

---

## 13. GameSnapshotRestore

**參考**: `doc/shared/protocol.md#GameSnapshotRestore`

**觸發時機**: 斷線重連時，恢復完整遊戲狀態

**介面定義**:
```typescript
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

**相關型別**:
```typescript
export interface PlayerDepository {
  readonly player_id: string
  readonly cards: ReadonlyArray<string>
}

export interface KoiStatus {
  readonly player_id: string
  readonly koi_multiplier: number
  readonly times_continued: number
}
```

**範例 Payload**:
```json
{
  "game_id": "game_12345",
  "players": [
    { "player_id": "player-1", "player_name": "Alice", "is_ai": false },
    { "player_id": "player-2", "player_name": "AI Bot", "is_ai": true }
  ],
  "ruleset": { "target_score": 50, "yaku_settings": [...], "special_rules": {...} },
  "field_cards": ["0111", "0121", "0211"],
  "deck_remaining": 20,
  "player_hands": [
    { "player_id": "player-1", "cards": ["0231", "0241"] }
  ],
  "player_depositories": [
    { "player_id": "player-1", "cards": ["0131", "0111"] },
    { "player_id": "player-2", "cards": ["0221", "0211"] }
  ],
  "player_scores": [
    { "player_id": "player-1", "score": 10 },
    { "player_id": "player-2", "score": 5 }
  ],
  "current_flow_stage": "AWAITING_HAND_PLAY",
  "active_player_id": "player-1",
  "koi_statuses": [
    { "player_id": "player-1", "koi_multiplier": 2, "times_continued": 1 },
    { "player_id": "player-2", "koi_multiplier": 1, "times_continued": 0 }
  ]
}
```

---

## 型別檢查清單

所有事件型別實作必須滿足以下條件：

- [ ] 所有屬性使用 `readonly` 修飾符
- [ ] 陣列使用 `ReadonlyArray<T>` 型別
- [ ] `event_type` 使用字面量型別（如 `'GameStarted'`）
- [ ] `timestamp` 為 ISO 8601 格式字串
- [ ] 所有卡片 ID 為 4 位數字字串（如 `"0341"`）
- [ ] JSDoc 註解標註 `doc/shared/protocol.md` 參考位置
- [ ] 與 protocol.md 定義完全一致

---

## 版本歷史

- **1.0.0** (2025-11-14): 初始版本，定義 13 種 SSE 事件型別
