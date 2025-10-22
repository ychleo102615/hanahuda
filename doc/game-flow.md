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

---

## III. 核心數據結構

### 基礎結構

#### NextState（流程狀態）
```typescript
{
  state_type: FlowState,      // 流程狀態類型
  active_player_id: string    // 當前行動玩家 ID
}
```

#### CardDestination（卡片移動目標）
```typescript
{type: "field"}                       // 移至場上
{type: "depository", player_id: string}  // 移至玩家捕獲區
```

---

### 卡片操作

#### CardPlay（卡片操作）
```typescript
{
  card: string,              // 打出/翻開的卡片 ID
  captured: string[],        // 捕獲的卡片（空陣列表示移至場上）
  to: CardDestination        // 目標位置
}
```

#### CardSelection（卡片選擇）
```typescript
{
  source: string,     // 翻出的卡片 ID
  options: string[]   // 可選擇的配對目標
}
```

---

### 分數相關

#### PlayerScore（玩家分數）
```typescript
{
  player_id: string,
  score: number       // 累計分數
}
```

#### ScoreMultipliers（分數倍數）
```typescript
{
  seven_plus?: number,      // 7分以上倍數（通常為2）
  winner_koi?: number,      // 勝者 Koi-Koi 倍數
  opponent_koi?: number     // 對手 Koi-Koi 倍數
}
```

---

### 役型相關

#### Yaku（役型）
```typescript
{
  type: string,         // 役型名稱（AKATAN, AOTAN, GOKO 等）
  base_points: number   // 基礎分數
}
```

#### YakuUpdate（役型更新）
```typescript
{
  new: Yaku[],          // 新獲得的役型
  total_base: number    // 累計基礎分數
}
```

#### KoiStatus（Koi-Koi 狀態）
```typescript
{
  player_id: string,
  multiplier: number,      // 當前倍數
  called_count: number     // 呼叫 Koi-Koi 次數
}
```

---

### 遊戲配置

#### Ruleset（規則集）
```typescript
{
  total_rounds: number,          // 總局數
  koi_koi_multiplier: number,    // Koi-Koi 倍數增量
  seven_point_double: boolean    // 是否啟用7分倍增規則
}
```

#### PlayerHand（玩家手牌）
```typescript
{
  player_id: string,
  cards?: string[],    // 自己的手牌才有完整陣列
  count?: number       // 對手手牌只有數量
}
```

---

### 重連快照專用

#### GameState（遊戲狀態）
```typescript
{
  id: string,
  ruleset: Ruleset,
  cumulative_scores: PlayerScore[],
  rounds_played: number
}
```

#### RoundState（局狀態）
```typescript
{
  dealer_id: string,
  koi_status: KoiStatus[]
}
```

#### CardsState（卡片狀態）
```typescript
{
  field: string[],
  my_hand: string[],
  opponent_hand_count: number,
  my_depository: string[],
  opponent_depository: string[],
  deck_remaining: number
}
```

#### CurrentFlowState（當前流程狀態）
```typescript
{
  state_type: FlowState,
  active_player_id: string,
  context?: {
    selection?: CardSelection    // 僅在 AWAITING_SELECTION 時存在
  }
}
```

---

## IV. 客戶端命令 (C2S)

| 命令 | 流程狀態 | Payload | 說明 |
|------|---------|---------|------|
| **GameRequestJoin** | 任意 | `{player_id, session_token}` | 加入或重連 |
| **TurnPlayHandCard** | `AWAITING_HAND_PLAY` | `{card, target?}` | 打手牌，`target` 為配對目標或 `null` |
| **TurnSelectTarget** | `AWAITING_SELECTION` | `{source, target}` | 翻牌雙重配對時選擇目標 |
| **RoundMakeDecision** | `AWAITING_DECISION` | `{decision}` | `"KOI_KOI"` → `DecisionMade`，`"END_ROUND"` → `RoundScored` |

---

## V. 伺服器事件 (S2C)

> 所有事件包含 `{event, event_id, timestamp}` 通用欄位

### A. 遊戲/局級事件

#### GameStarted
遊戲會話開始
```json
{
  my_player_id: string,
  players: [{player_id: string, name: string}],
  ruleset: Ruleset
}
```

#### RoundDealt
新局發牌
```json
{
  dealer_id: string,
  field: string[],
  hands: PlayerHand[],              // 自己手牌傳 cards 陣列，對手僅傳 count
  deck_remaining: number,
  next_state: NextState             // active_player_id 指明第一個行動玩家
}
```

#### RoundEndedInstantly
Teshi 或場牌流局立即結束
```json
{
  reason: RoundEndReason,              // TESHI | FIELD_KUTTSUKI
  winner_id?: string,                  // Teshi 時才有勝者
  points_earned?: number,              // 勝者獲得的分數
  cumulative_scores: PlayerScore[]
}
```

#### RoundScored
局結束計分
```json
{
  winner_id: string,
  yakus: Yaku[],
  base_total: number,
  multipliers: ScoreMultipliers,
  final_points: number,                // 勝者實際獲得分數（base_total × 倍數）
  cumulative_scores: PlayerScore[]
}
```

#### RoundDrawn
手牌用罄無役平局
```json
{
  reason: RoundEndReason,              // NO_YAKU
  cumulative_scores: PlayerScore[]     // 分數無變化，僅返回當前分數
}
```

#### GameFinished
遊戲結束
```json
{
  final_scores: PlayerScore[],
  winner_id: string
}
```

---

### B. 回合級事件

#### TurnCompleted
打手牌、翻牌均完成（無中斷）
```json
{
  player_id: string,
  hand_play: CardPlay,                 // 打手牌操作
  deck_flip: CardPlay,                 // 翻牌操作
  deck_remaining: number,
  yaku_update?: YakuUpdate | null,     // 有新役型時才有值
  next_state: NextState
}
```

#### SelectionRequired
翻牌雙重配對，需選擇目標（僅 `deck_flip` 階段）
```json
{
  player_id: string,
  phase: "deck_flip",
  completed: {
    hand_play: CardPlay                // 已完成的打手牌操作
  },
  selection: CardSelection,            // 需要選擇的配對
  next_state: NextState
}
```

#### TurnProgressAfterSelection
翻牌選擇完成，繼續流程
```json
{
  selected_capture: CardPlay,         // 選擇後的翻牌操作
  deck_remaining: number,
  yaku_update?: YakuUpdate | null,    // 有新役型時才有值
  next_state: NextState
}
```

#### DecisionRequired
形成役型，需決策 Koi-Koi（隱含狀態：`AWAITING_DECISION`，行動玩家為 `player_id`）
```json
{
  player_id: string,
  yaku_update: YakuUpdate
}
```

#### DecisionMade
完成決策（**僅在 `KOI_KOI` 時發送**，`END_ROUND` 直接發送 `RoundScored`）
```json
{
  player_id: string,
  decision: "KOI_KOI",
  koi_multiplier_update: number,       // 玩家更新後的 Koi-Koi 倍數
  next_state: NextState                // 繼續遊戲，返回 AWAITING_HAND_PLAY
}
```

#### TurnError
無效命令
```json
{error_code, message, retry_allowed}
```

---

## VI. 斷線重連

### GameSnapshotRestore

重連時（`GameRequestJoin` + 有效 `session_token`）獲取完整狀態

```json
{
  my_player_id: string,
  game: GameState,
  round: RoundState,
  cards: CardsState,
  flow_state: CurrentFlowState       // context.selection 在 AWAITING_SELECTION 時存在
}
```

---

## VII. 事件流程範例

### 1. 無中斷完整回合
```
C→S: TurnPlayHandCard {card: "0341", target: "0342"}
S→C: TurnCompleted {
       player_id: "p1",
       hand_play: {card: "0341", captured: ["0342"], to: {type: "depository", player_id: "p1"}},
       deck_flip: {card: "0843", captured: [], to: {type: "field"}},
       deck_remaining: 23,
       next_state: {state_type: "AWAITING_HAND_PLAY", active_player_id: "p2"}
     }
```

### 2. 翻牌雙重配對（中斷選擇）
```
C→S: TurnPlayHandCard {card: "0341", target: "0342"}
S→C: SelectionRequired {
       player_id: "p1",
       phase: "deck_flip",
       completed: {
         hand_play: {card: "0341", captured: ["0342"], to: {type: "depository", player_id: "p1"}}
       },
       selection: {source: "0841", options: ["0842", "0843"]},
       next_state: {state_type: "AWAITING_SELECTION", active_player_id: "p1"}
     }
C→S: TurnSelectTarget {source: "0841", target: "0842"}
S→C: TurnProgressAfterSelection {
       selected_capture: {card: "0841", captured: ["0842"], to: {type: "depository", player_id: "p1"}},
       deck_remaining: 23,
       next_state: {state_type: "AWAITING_HAND_PLAY", active_player_id: "p2"}
     }
```

### 3. 形成役型 → Koi-Koi
```
C→S: TurnPlayHandCard {card: "0331", target: null}
S→C: DecisionRequired {
       player_id: "p1",
       yaku_update: {new: [{type: "AKATAN", base_points: 5}], total_base: 5}
     }
C→S: RoundMakeDecision {decision: "KOI_KOI"}
S→C: DecisionMade {
       player_id: "p1",
       decision: "KOI_KOI",
       koi_multiplier_update: 2,
       next_state: {state_type: "AWAITING_HAND_PLAY", active_player_id: "p2"}
     }
```

### 4. 形成役型 → 結束局
```
C→S: TurnPlayHandCard {card: "0131", target: "0132"}
S→C: DecisionRequired {
       player_id: "p1",
       yaku_update: {new: [{type: "AOTAN", base_points: 5}], total_base: 10}
     }
C→S: RoundMakeDecision {decision: "END_ROUND"}
S→C: RoundScored {
       winner_id: "p1",
       yakus: [{type: "AKATAN", base_points: 5}, {type: "AOTAN", base_points: 5}],
       base_total: 10,
       multipliers: {seven_plus: 2},
       final_points: 20,
       cumulative_scores: [{player_id: "p1", score: 20}, {player_id: "p2", score: 0}]
     }
     // END_ROUND 時直接發送 RoundScored，省略 DecisionMade
```