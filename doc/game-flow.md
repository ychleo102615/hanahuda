# 日本花牌「來來」(Koi-Koi) 前後端交互規格

## 概述

### 核心設計原則

1. **命令-事件模式**: 客戶端發送命令，伺服器推送事件
2. **最小增量傳輸**: 僅傳遞變化數據，無冗余
3. **伺服器權威**: 所有邏輯、狀態、驗證均在伺服器
4. **快照恢復**: 斷線重連時一次性獲取完整狀態，無需重放歷史
5. **明確狀態流轉**: 每個事件指明 `next_state`，客戶端無需推測
6. **前置選擇**: 手牌雙重配對在命令中解決，翻牌雙重配對需中斷等待

---

## I. 卡片 ID 編碼規則

### MMTI 格式 (4位字串)

- **MM**: 月份 `01`-`12`
- **T**: 牌型
  - `1` = 光札 (BRIGHT, 20點)
  - `2` = 種札 (ANIMAL, 10點)
  - `3` = 短札 (RIBBON, 5點)
  - `4` = かす札 (DREG, 1點)
- **I**: 該月該類型的第幾張 `1`-`4`

**範例**：
```json
"0111"  // 1月松上鶴（光札）
"0221"  // 2月梅上鶯（種札第1張）
"0331"  // 3月赤短（短札第1張）
"0841"  // 8月芒かす（第1張）
```

---

## II. 常數定義

### 命令與事件類型

**客戶端命令 (C2S)**:
- `GameRequestJoin` - 加入遊戲/重連
- `TurnPlayHandCard` - 打出手牌
- `TurnSelectTarget` - 選擇翻牌配對目標
- `RoundMakeDecision` - Koi-Koi 決策

**伺服器事件 (S2C)**:
- 遊戲級: `GameStarted` | `RoundDealt` | `RoundEndedInstantly` | `RoundScored` | `RoundDrawn` | `GameFinished`
- 回合級: `TurnCompleted` | `SelectionRequired` | `TurnProgressAfterSelection` | `DecisionRequired` | `DecisionMade` | `TurnError`
- 重連: `GameSnapshotRestore`

### 關鍵枚舉值

| 類型 | 值 | 說明 |
|------|-----|------|
| **FlowState** | `AWAITING_HAND_PLAY` | 等待打手牌 |
| | `AWAITING_SELECTION` | 等待選擇翻牌配對 |
| | `AWAITING_DECISION` | 等待 Koi-Koi 決策 |
| **CardType** | `1` BRIGHT | 光札 (20點) |
| | `2` ANIMAL | 種札 (10點) |
| | `3` RIBBON | 短札 (5點) |
| | `4` DREG | かす札 (1點) |
| **TurnPhase** | `hand_play` | 打手牌階段 |
| | `deck_flip` | 翻牌階段 |
| **Decision** | `KOI_KOI` | 繼續遊戲 |
| | `END_ROUND` | 結束本局 |
| **RoundEndReason** | `TESHI` | 手四（手牌4張同月） |
| | `FIELD_KUTTSUKI` | 場牌流局（4張同月） |
| | `NO_YAKU` | 手牌用罄無役 |
| **ErrorCode** | `INVALID_CARD` `INVALID_TARGET` `WRONG_PLAYER` `INVALID_STATE` `INVALID_SELECTION` | 錯誤類型 |

### 卡片移動目標 (CardDestination)

```typescript
{type: "field"}                         // 移至場上
{type: "depository", player_id: "p1"}  // 移至玩家捕獲區
```


---

## III. 客戶端命令 (C2S)

| 命令 | 流程狀態 | Payload | 說明 |
|------|---------|---------|------|
| **GameRequestJoin** | 任意 | `{player_id, session_token}` | 加入或重連 |
| **TurnPlayHandCard** | `AWAITING_HAND_PLAY` | `{card, target?}` | 打手牌，`target` 為配對目標或 `null` |
| **TurnSelectTarget** | `AWAITING_SELECTION` | `{source, target}` | 翻牌雙重配對時選擇目標 |
| **RoundMakeDecision** | `AWAITING_DECISION` | `{decision}` | `"KOI_KOI"` → `DecisionMade`，`"END_ROUND"` → `RoundScored` |

---

## IV. 伺服器事件 (S2C)

> 所有事件包含 `{event, event_id, timestamp}` 通用欄位

### A. 遊戲/局級事件

#### GameStarted
遊戲會話開始
```json
{my_player_id, players: [{id, name}], ruleset: {total_rounds, koi_koi_multiplier, seven_point_double}}
```

#### RoundDealt
新局發牌（自己手牌傳 `cards` 陣列，對手僅傳 `count`）
```json
{dealer, field: [...], hands: [{player_id, cards/count}], deck_remaining, first_player, next_state}
```

#### RoundEndedInstantly
Teshi 或場牌流局立即結束，`reason`: `TESHI` | `FIELD_KUTTSUKI`
```json
{reason, winner?, score_changes: [{player_id, change}], cumulative_scores: [{player_id, score}]}
```

#### RoundScored
局結束計分
```json
{winner, yakus: [{type, base_points}], base_total, multipliers: {seven_plus?, winner_koi?, opponent_koi?},
 final_points, score_changes: [...], cumulative_scores: [...]}
```

#### RoundDrawn
手牌用罄無役平局
```json
{reason: "NO_YAKU", score_changes: [...]}
```

#### GameFinished
遊戲結束
```json
{final_scores: [{player_id, score}], winner}
```

---

### B. 回合級事件

#### TurnCompleted
打手牌、翻牌均完成（無中斷），`captured: []` 表示移至場上，`yaku_update` 可為 `null` 或 `{new: [...], total_base}`
```json
{player, hand_play: {played, captured, to}, deck_flip: {flipped, captured, to, deck_remaining},
 yaku_update?, next_state}
```

#### SelectionRequired
翻牌雙重配對，需選擇目標（僅 `deck_flip` 階段）
```json
{player, phase: "deck_flip", completed: {hand_play: {...}},
 selection: {source, options: [...]}, next_state}
```

#### TurnProgressAfterSelection
翻牌選擇完成，繼續流程
```json
{selected_capture: {source, captured, to}, deck_remaining, yaku_update?, next_state}
```

#### DecisionRequired
形成役型，需決策 Koi-Koi
```json
{player, yaku_update: {new: [{type, base_points}], total_base}, next_state}
```

#### DecisionMade
完成決策（**僅在 `KOI_KOI` 時發送**，`END_ROUND` 直接發送 `RoundScored`）
```json
{player, decision: "KOI_KOI", koi_multiplier_update, next_state}
```

#### TurnError
無效命令
```json
{error_code, message, retry_allowed}
```

---

## V. 斷線重連

### GameSnapshotRestore

重連時（`GameRequestJoin` + 有效 `session_token`）獲取完整狀態，`flow_state.context` 在 `AWAITING_SELECTION` 時包含 `selection` 物件

```json
{
  my_player_id,
  game: {id, ruleset, cumulative_scores: [{player_id, score}], rounds_played},
  round: {dealer, koi_status: [{player_id, multiplier, called_count}]},
  cards: {field, my_hand, opponent_hand_count, my_depository, opponent_depository, deck_remaining},
  flow_state: {type, active_player, context?}
}
```

---

## VI. 事件流程範例

### 1. 無中斷完整回合
```
C→S: TurnPlayHandCard {card: "0341", target: "0342"}
S→C: TurnCompleted {hand_play: {captured: ["0342"]}, deck_flip: {captured: []}, next: p2}
```

### 2. 翻牌雙重配對（中斷選擇）
```
C→S: TurnPlayHandCard {card: "0341", target: "0342"}
S→C: SelectionRequired {selection: {source: "0841", options: ["0842", "0843"]}}
C→S: TurnSelectTarget {source: "0841", target: "0842"}
S→C: TurnProgressAfterSelection {selected_capture: {...}, next: p2}
```

### 3. 形成役型 → Koi-Koi
```
C→S: TurnPlayHandCard {card: "0331", target: null}
S→C: DecisionRequired {yaku_update: {new: ["AKATAN"], total_base: 5}}
C→S: RoundMakeDecision {decision: "KOI_KOI"}
S→C: DecisionMade {koi_multiplier_update: 2, next: p2}
```

### 4. 形成役型 → 結束局
```
C→S: TurnPlayHandCard {card: "0131", target: "0132"}
S→C: DecisionRequired {yaku_update: {total_base: 10}}
C→S: RoundMakeDecision {decision: "END_ROUND"}
S→C: RoundScored {yakus: [...], final_points: 20, cumulative_scores: [...]}
     // END_ROUND 時直接發送 RoundScored，省略 DecisionMade
```