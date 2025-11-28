# Protocol Updates: 事件時間倒數功能

**Feature Branch**: `006-event-countdown-timer`
**Date**: 2025-11-28
**Affected Document**: `doc/shared/protocol.md`

## Overview

本文檔定義需要更新至 `doc/shared/protocol.md` 的協議變更。

---

## 1. New Fields Definition

### 1.1 action_timeout_seconds

```yaml
field: action_timeout_seconds
type: number (positive integer)
required: false
description: |
  玩家可操作的剩餘秒數。
  由伺服器決定並在事件中傳遞。
  前端應以此值為起點啟動本地倒數計時器。
applies_to:
  - RoundDealt
  - SelectionRequired
  - TurnProgressAfterSelection (when next_state requires action)
  - DecisionRequired
  - GameSnapshotRestore
```

### 1.2 display_timeout_seconds

```yaml
field: display_timeout_seconds
type: number (positive integer)
required: false
description: |
  回合結束面板顯示的剩餘秒數。
  倒數結束後面板應自動關閉。
  玩家不應能夠提前跳過。
applies_to:
  - RoundEndedInstantly
  - RoundScored
  - RoundDrawn
```

---

## 2. Event Schema Updates

### 2.1 RoundDealt

**Current Schema:**
```json
{
  "dealer_id": "string",
  "field": ["string"],
  "hands": [{"player_id": "string", "cards": ["string"]}],
  "deck_remaining": "number",
  "next_state": {"state_type": "FlowState", "active_player_id": "string"}
}
```

**Updated Schema:**
```json
{
  "dealer_id": "string",
  "field": ["string"],
  "hands": [{"player_id": "string", "cards": ["string"]}],
  "deck_remaining": "number",
  "next_state": {"state_type": "FlowState", "active_player_id": "string"},
  "action_timeout_seconds": "number (optional)"  // ✅ NEW
}
```

**Description Update:**
> RoundDealt 事件在發牌完成時發送。若 `action_timeout_seconds` 存在，表示首位行動玩家的出牌時限。

---

### 2.2 SelectionRequired

**Current Schema:**
```json
{
  "player_id": "string",
  "hand_card_play": {"played_card": "string", "matched_card": "string|null", "captured_cards": ["string"]},
  "drawn_card": "string",
  "possible_targets": ["string"],
  "deck_remaining": "number"
}
```

**Updated Schema:**
```json
{
  "player_id": "string",
  "hand_card_play": {"played_card": "string", "matched_card": "string|null", "captured_cards": ["string"]},
  "drawn_card": "string",
  "possible_targets": ["string"],
  "deck_remaining": "number",
  "action_timeout_seconds": "number (optional)"  // ✅ NEW
}
```

**Description Update:**
> SelectionRequired 事件在翻牌雙重配對時發送。若 `action_timeout_seconds` 存在，表示選擇配對目標的時限。

---

### 2.3 TurnProgressAfterSelection

**Current Schema:**
```json
{
  "player_id": "string",
  "selection": {"source": "string", "options": ["string"]},
  "draw_card_play": {"played_card": "string", "matched_card": "string|null", "captured_cards": ["string"]},
  "yaku_update": {"new": [...], "total_base": "number"} | null,
  "deck_remaining": "number",
  "next_state": {"state_type": "FlowState", "active_player_id": "string"}
}
```

**Updated Schema:**
```json
{
  "player_id": "string",
  "selection": {"source": "string", "options": ["string"]},
  "draw_card_play": {"played_card": "string", "matched_card": "string|null", "captured_cards": ["string"]},
  "yaku_update": {"new": [...], "total_base": "number"} | null,
  "deck_remaining": "number",
  "next_state": {"state_type": "FlowState", "active_player_id": "string"},
  "action_timeout_seconds": "number (optional)"  // ✅ NEW
}
```

**Description Update:**
> TurnProgressAfterSelection 事件在玩家選擇配對目標後發送。若 `next_state` 需要操作且 `action_timeout_seconds` 存在，表示下一步操作的時限。

---

### 2.4 DecisionRequired

**Current Schema:**
```json
{
  "player_id": "string",
  "hand_card_play": {"played_card": "string", "matched_card": "string|null", "captured_cards": ["string"]} | null,
  "draw_card_play": {"played_card": "string", "matched_card": "string|null", "captured_cards": ["string"]} | null,
  "yaku_update": {"new": [...], "total_base": "number"},
  "current_multipliers": {"seven_plus": "number", "winner_koi": "number", "opponent_koi": "number"},
  "deck_remaining": "number"
}
```

**Updated Schema:**
```json
{
  "player_id": "string",
  "hand_card_play": {"played_card": "string", "matched_card": "string|null", "captured_cards": ["string"]} | null,
  "draw_card_play": {"played_card": "string", "matched_card": "string|null", "captured_cards": ["string"]} | null,
  "yaku_update": {"new": [...], "total_base": "number"},
  "current_multipliers": {"seven_plus": "number", "winner_koi": "number", "opponent_koi": "number"},
  "deck_remaining": "number",
  "action_timeout_seconds": "number (optional)"  // ✅ NEW
}
```

**Description Update:**
> DecisionRequired 事件在玩家形成役種時發送。若 `action_timeout_seconds` 存在，表示 Koi-Koi 決策的時限。

---

### 2.5 RoundScored

**Current Schema:**
```json
{
  "winner_id": "string",
  "yakus": [{"type": "string", "base_points": "number"}],
  "base_total": "number",
  "multipliers": {"seven_plus": "number", "winner_koi": "number", "opponent_koi": "number"},
  "final_points": "number",
  "cumulative_scores": [{"player_id": "string", "score": "number"}]
}
```

**Updated Schema:**
```json
{
  "winner_id": "string",
  "yakus": [{"type": "string", "base_points": "number"}],
  "base_total": "number",
  "multipliers": {"seven_plus": "number", "winner_koi": "number", "opponent_koi": "number"},
  "final_points": "number",
  "cumulative_scores": [{"player_id": "string", "score": "number"}],
  "display_timeout_seconds": "number (optional)"  // ✅ NEW
}
```

**Description Update:**
> RoundScored 事件在局結束計分時發送。若 `display_timeout_seconds` 存在，表示結果面板顯示時間，倒數結束後自動進入下一回合。

---

### 2.6 RoundEndedInstantly

**Current Schema:**
```json
{
  "reason": "RoundEndReason",
  "winner_id": "string | null",
  "points_earned": "number",
  "cumulative_scores": [{"player_id": "string", "score": "number"}]
}
```

**Updated Schema:**
```json
{
  "reason": "RoundEndReason",
  "winner_id": "string | null",
  "points_earned": "number",
  "cumulative_scores": [{"player_id": "string", "score": "number"}],
  "display_timeout_seconds": "number (optional)"  // ✅ NEW
}
```

**Description Update:**
> RoundEndedInstantly 事件在 Teshi 或場牌流局時發送。若 `display_timeout_seconds` 存在，表示結果面板顯示時間。

---

### 2.7 RoundDrawn

**Current Schema:**
```json
{
  "reason": "RoundEndReason",
  "cumulative_scores": [{"player_id": "string", "score": "number"}]
}
```

**Updated Schema:**
```json
{
  "reason": "RoundEndReason",
  "cumulative_scores": [{"player_id": "string", "score": "number"}],
  "display_timeout_seconds": "number (optional)"  // ✅ NEW
}
```

**Description Update:**
> RoundDrawn 事件在平局（牌堆耗盡無役）時發送。若 `display_timeout_seconds` 存在，表示結果面板顯示時間。

---

### 2.8 GameSnapshotRestore

**Current Schema:**
```json
{
  "my_player_id": "string",
  "game": {"id": "string", "ruleset": {...}, "cumulative_scores": [...], "rounds_played": "number"},
  "round": {"dealer_id": "string", "koi_status": [...]},
  "cards": {"field": [...], "my_hand": [...], "opponent_hand_count": "number", "my_depository": [...], "opponent_depository": [...], "deck_remaining": "number"},
  "flow_state": {"state_type": "FlowState", "active_player_id": "string", "context": {...}}
}
```

**Updated Schema:**
```json
{
  "my_player_id": "string",
  "game": {"id": "string", "ruleset": {...}, "cumulative_scores": [...], "rounds_played": "number"},
  "round": {"dealer_id": "string", "koi_status": [...]},
  "cards": {"field": [...], "my_hand": [...], "opponent_hand_count": "number", "my_depository": [...], "opponent_depository": [...], "deck_remaining": "number"},
  "flow_state": {"state_type": "FlowState", "active_player_id": "string", "context": {...}},
  "action_timeout_seconds": "number (optional)"  // ✅ NEW
}
```

**Description Update:**
> GameSnapshotRestore 在斷線重連時發送。若當前狀態需要玩家操作且 `action_timeout_seconds` 存在，表示剩餘操作時限。

---

## 3. Events NOT Modified

以下事件不需要時限欄位：

| Event | Reason |
|-------|--------|
| GameStarted | 無操作需求，僅初始化 |
| TurnCompleted | 回合已完成，無操作需求 |
| DecisionMade | 決策已完成 |
| TurnError | 錯誤訊息 |
| GameFinished | 遊戲結束 |

---

## 4. Backward Compatibility

### 4.1 Strategy

所有新增欄位均設為 **optional**，確保：
- 舊版後端（無此欄位）不會導致前端解析錯誤
- 前端在欄位不存在時不顯示倒數計時器

### 4.2 Frontend Handling

```typescript
// 範例：處理 RoundDealt 事件
function handleRoundDealt(event: RoundDealtEvent) {
  // ... existing logic

  // 新增：處理倒數（optional field）
  if (event.action_timeout_seconds !== undefined) {
    triggerUIEffectPort.startActionCountdown(event.action_timeout_seconds)
  }
}
```

---

## 5. Summary Table

| Event | New Field | Type | Required |
|-------|-----------|------|----------|
| RoundDealt | `action_timeout_seconds` | number | No |
| SelectionRequired | `action_timeout_seconds` | number | No |
| TurnProgressAfterSelection | `action_timeout_seconds` | number | No |
| DecisionRequired | `action_timeout_seconds` | number | No |
| RoundScored | `display_timeout_seconds` | number | No |
| RoundEndedInstantly | `display_timeout_seconds` | number | No |
| RoundDrawn | `display_timeout_seconds` | number | No |
| GameSnapshotRestore | `action_timeout_seconds` | number | No |
