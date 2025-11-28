# Data Model: 事件時間倒數功能

**Feature Branch**: `006-event-countdown-timer`
**Date**: 2025-11-28

## Overview

本文檔定義事件時間倒數功能所需的數據模型變更。

---

## 1. Event Type Extensions

### 1.1 ActionTimeout 類型

用於需要玩家操作的事件。

```typescript
/**
 * 操作時限欄位
 *
 * @description
 * 正整數，表示玩家可操作的剩餘秒數。
 * 由伺服器決定並透過 SSE 事件傳遞。
 */
type ActionTimeoutSeconds = number  // 正整數 > 0
```

### 1.2 DisplayTimeout 類型

用於回合結束面板的自動關閉時限。

```typescript
/**
 * 顯示時限欄位
 *
 * @description
 * 正整數，表示面板顯示的剩餘秒數。
 * 倒數結束後面板自動關閉。
 */
type DisplayTimeoutSeconds = number  // 正整數 > 0
```

---

## 2. Event Schema Changes

### 2.1 Events with `action_timeout_seconds`

#### RoundDealtEvent

```typescript
export interface RoundDealtEvent {
  readonly event_type: 'RoundDealt'
  readonly event_id: string
  readonly timestamp: string
  readonly dealer_id: string
  readonly field: ReadonlyArray<string>
  readonly hands: ReadonlyArray<PlayerHand>
  readonly deck_remaining: number
  readonly next_state: NextState
  readonly action_timeout_seconds?: number  // ✅ NEW (optional)
}
```

#### SelectionRequiredEvent

```typescript
export interface SelectionRequiredEvent {
  readonly event_type: 'SelectionRequired'
  readonly event_id: string
  readonly timestamp: string
  readonly player_id: string
  readonly hand_card_play: CardPlay
  readonly drawn_card: string
  readonly possible_targets: ReadonlyArray<string>
  readonly deck_remaining: number
  readonly action_timeout_seconds?: number  // ✅ NEW (optional)
}
```

#### TurnProgressAfterSelectionEvent

```typescript
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
  readonly action_timeout_seconds?: number  // ✅ NEW (optional)
}
```

#### DecisionRequiredEvent

```typescript
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
  readonly action_timeout_seconds?: number  // ✅ NEW (optional)
}
```

### 2.2 Events with `display_timeout_seconds`

#### RoundScoredEvent

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
  readonly display_timeout_seconds?: number  // ✅ NEW (optional)
}
```

#### RoundEndedInstantlyEvent

```typescript
export interface RoundEndedInstantlyEvent {
  readonly event_type: 'RoundEndedInstantly'
  readonly event_id: string
  readonly timestamp: string
  readonly reason: RoundEndReason
  readonly winner_id: string | null
  readonly awarded_points: number
  readonly updated_total_scores: ReadonlyArray<PlayerScore>
  readonly display_timeout_seconds?: number  // ✅ NEW (optional)
}
```

#### RoundDrawnEvent

```typescript
export interface RoundDrawnEvent {
  readonly event_type: 'RoundDrawn'
  readonly event_id: string
  readonly timestamp: string
  readonly current_total_scores: ReadonlyArray<PlayerScore>
  readonly display_timeout_seconds?: number  // ✅ NEW (optional)
}
```

### 2.3 GameSnapshotRestore

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
  readonly action_timeout_seconds?: number  // ✅ NEW (optional)
}
```

---

## 3. Store State Extensions

### 3.1 UIStateStoreState

```typescript
export interface UIStateStoreState {
  // ... existing fields (decisionModal, gameFinished, roundDrawn, etc.)

  // ========== NEW: Countdown State ==========

  /**
   * 操作倒數剩餘秒數
   *
   * @description
   * 用於回合操作（出牌、選擇、決策）的倒數顯示。
   * null 表示目前無操作倒數。
   */
  actionTimeoutRemaining: number | null

  /**
   * 顯示倒數剩餘秒數
   *
   * @description
   * 用於回合結束面板的倒數顯示。
   * null 表示目前無顯示倒數。
   */
  displayTimeoutRemaining: number | null
}
```

### 3.2 UIStateStoreActions

```typescript
export interface UIStateStoreActions {
  // ... existing methods

  // ========== NEW: Countdown Actions ==========

  /**
   * 啟動操作倒數
   * @param seconds - 倒數秒數
   */
  startActionCountdown(seconds: number): void

  /**
   * 停止操作倒數
   */
  stopActionCountdown(): void

  /**
   * 啟動顯示倒數
   * @param seconds - 倒數秒數
   * @param onComplete - 倒數結束時的回調（可選）
   */
  startDisplayCountdown(seconds: number, onComplete?: () => void): void

  /**
   * 停止顯示倒數
   */
  stopDisplayCountdown(): void
}
```

---

## 4. Port Interface Extensions

### 4.1 TriggerUIEffectPort

```typescript
export interface TriggerUIEffectPort {
  // ... existing methods

  // ========== NEW: Countdown Methods ==========

  /**
   * 啟動操作倒數
   * @param seconds - 倒數秒數
   */
  startActionCountdown(seconds: number): void

  /**
   * 停止操作倒數
   */
  stopActionCountdown(): void

  /**
   * 啟動顯示倒數
   * @param seconds - 倒數秒數
   * @param onComplete - 倒數結束時的回調（可選）
   */
  startDisplayCountdown(seconds: number, onComplete?: () => void): void

  /**
   * 停止顯示倒數
   */
  stopDisplayCountdown(): void
}
```

---

## 5. Validation Rules

### 5.1 Timeout Values

| 欄位 | 型別 | 驗證規則 |
|------|------|---------|
| `action_timeout_seconds` | `number \| undefined` | 若存在，必須為正整數 (> 0) |
| `display_timeout_seconds` | `number \| undefined` | 若存在，必須為正整數 (> 0) |

### 5.2 State Transitions

| 狀態變更 | 前提條件 | 後置條件 |
|---------|---------|---------|
| `actionTimeoutRemaining`: null → number | 收到含 `action_timeout_seconds` 的事件 | 啟動 1 秒 interval 遞減 |
| `actionTimeoutRemaining`: number → 0 | interval 遞減至 0 | 停止 interval |
| `actionTimeoutRemaining`: number → null | 收到新事件或手動停止 | 清除 interval |
| `displayTimeoutRemaining`: null → number | 收到含 `display_timeout_seconds` 的事件 | 啟動 1 秒 interval 遞減 |
| `displayTimeoutRemaining`: 0 | interval 遞減至 0 | 觸發 onComplete 回調，自動關閉面板 |

---

## 6. Entity Relationships

```
┌─────────────────────────────────────────────────────────────┐
│                      SSE Events                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ RoundDealt  │  │ Selection   │  │ Decision    │         │
│  │  + timeout  │  │ Required    │  │ Required    │  ...    │
│  │             │  │  + timeout  │  │  + timeout  │         │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘         │
└─────────│────────────────│────────────────│─────────────────┘
          │                │                │
          ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────┐
│               Event Handler Use Cases                       │
│  HandleRoundDealtUseCase, HandleSelectionRequiredUseCase,   │
│  HandleDecisionRequiredUseCase, etc.                        │
│  - 解析 action_timeout_seconds / display_timeout_seconds    │
│  - 調用 TriggerUIEffectPort 方法                            │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                  TriggerUIEffectPort                        │
│  startActionCountdown(seconds)                              │
│  startDisplayCountdown(seconds, onComplete)                 │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    UIStateStore                             │
│  State:                                                     │
│    - actionTimeoutRemaining: number | null                  │
│    - displayTimeoutRemaining: number | null                 │
│  Internal:                                                  │
│    - actionIntervalId: number | null                        │
│    - displayIntervalId: number | null                       │
│    - displayOnComplete: (() => void) | null                 │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    UI Components                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ TopInfoBar  │  │ Decision    │  │ RoundEnd    │         │
│  │ (action)    │  │ Modal       │  │ Panel       │         │
│  │             │  │ (action)    │  │ (display)   │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

---

## 7. Summary Table

### Events Modified

| Event | New Field | Type | Optional |
|-------|-----------|------|----------|
| RoundDealt | `action_timeout_seconds` | number | Yes |
| SelectionRequired | `action_timeout_seconds` | number | Yes |
| TurnProgressAfterSelection | `action_timeout_seconds` | number | Yes |
| DecisionRequired | `action_timeout_seconds` | number | Yes |
| RoundScored | `display_timeout_seconds` | number | Yes |
| RoundEndedInstantly | `display_timeout_seconds` | number | Yes |
| RoundDrawn | `display_timeout_seconds` | number | Yes |
| GameSnapshotRestore | `action_timeout_seconds` | number | Yes |

### Store Changes

| Store | New State Field | Type |
|-------|-----------------|------|
| UIStateStore | `actionTimeoutRemaining` | `number \| null` |
| UIStateStore | `displayTimeoutRemaining` | `number \| null` |

### Port Changes

| Port | New Method |
|------|------------|
| TriggerUIEffectPort | `startActionCountdown(seconds)` |
| TriggerUIEffectPort | `stopActionCountdown()` |
| TriggerUIEffectPort | `startDisplayCountdown(seconds, onComplete?)` |
| TriggerUIEffectPort | `stopDisplayCountdown()` |
