# 日本花牌「來來」(Koi-Koi) 前後端交互規格

## 概述

本規格遵循**最小增量原則**(Minimal Incremental Principle)和**命令-事件模式**(Command-Event Model)。客戶端僅發送命令(Command)，伺服器在狀態變更時推送最小化的原子事件(Event)。

伺服器負責所有遊戲邏輯、狀態管理和驗證。客戶端在斷線重連後可透過 `GameRequestJoin` 命令獲取完整狀態快照(Snapshot)以恢復遊戲，無需重放歷史事件。

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

## II. 常數定義 (Constants & Enums)

### A. 客戶端命令類型 (C2S Command Types)

```typescript
enum CommandType {
  GAME_REQUEST_JOIN = "GameRequestJoin",
  TURN_PLAY_HAND_CARD = "TurnPlayHandCard",
  TURN_SELECT_TARGET = "TurnSelectTarget",
  ROUND_MAKE_DECISION = "RoundMakeDecision",
  CLIENT_ACKNOWLEDGE = "ClientAcknowledge"
}
```

### B. 伺服器事件類型 (S2C Event Types)

```typescript
// 遊戲/局級事件
enum GameLevelEvent {
  GAME_STARTED = "GameStarted",
  ROUND_DEALT = "RoundDealt",
  ROUND_ENDED_INSTANTLY = "RoundEndedInstantly",
  ROUND_SCORED = "RoundScored",
  ROUND_DRAWN = "RoundDrawn",
  GAME_FINISHED = "GameFinished"
}

// 回合級事件
enum TurnLevelEvent {
  TURN_COMPLETED = "TurnCompleted",
  SELECTION_REQUIRED = "SelectionRequired",
  TURN_PROGRESS_AFTER_SELECTION = "TurnProgressAfterSelection",
  DECISION_REQUIRED = "DecisionRequired",
  DECISION_MADE = "DecisionMade",
  TURN_ERROR = "TurnError"
}

// 重連事件
enum ReconnectionEvent {
  GAME_SNAPSHOT_RESTORE = "GameSnapshotRestore"
}
```

### C. 流程狀態類型 (Flow State Types)

```typescript
enum FlowStateType {
  AWAITING_HAND_PLAY = "AWAITING_HAND_PLAY",
  AWAITING_SELECTION = "AWAITING_SELECTION",
  AWAITING_DECISION = "AWAITING_DECISION"
}
```

### D. 卡片類型 (Card Types)

```typescript
enum CardType {
  BRIGHT = 1,  // 光札, 20點
  ANIMAL = 2,  // 種札, 10點
  RIBBON = 3,  // 短札, 5點
  DREG = 4     // かす札, 1點
}

const CARD_TYPE_POINTS: Record<CardType, number> = {
  [CardType.BRIGHT]: 20,
  [CardType.ANIMAL]: 10,
  [CardType.RIBBON]: 5,
  [CardType.DREG]: 1
};
```

### E. 決策類型 (Decision Types)

```typescript
enum DecisionType {
  KOI_KOI = "KOI_KOI",
  END_ROUND = "END_ROUND"
}
```

### F. 回合階段 (Turn Phase)

```typescript
enum TurnPhase {
  HAND_PLAY = "hand_play",
  DECK_FLIP = "deck_flip"
}
```

### G. 局結束原因 (Round End Reasons)

```typescript
enum RoundEndReason {
  // 立即結束
  TESHI = "TESHI",                    // 手四，手牌4張同月
  FIELD_KUTTSUKI = "FIELD_KUTTSUKI",  // 場上4張同月

  // 平局
  NO_YAKU = "NO_YAKU"                 // 手牌用罄無役
}
```

### H. 錯誤碼 (Error Codes)

```typescript
enum ErrorCode {
  INVALID_CARD = "INVALID_CARD",
  INVALID_TARGET = "INVALID_TARGET",
  WRONG_PLAYER = "WRONG_PLAYER",
  INVALID_STATE = "INVALID_STATE",
  INVALID_SELECTION = "INVALID_SELECTION"
}
```

### I. 卡片移動目標 (Card Destination)

```typescript
enum CardDestinationType {
  FIELD = "field",
  DEPOSITORY = "depository"
}

interface CardDestination {
  type: CardDestinationType;
  player_id?: string;  // 僅在 type === "depository" 時需要
}

// 範例:
// - { type: "field" }: 卡片移至場上
// - { type: "depository", player_id: "p1" }: 卡片移至 p1 的捕獲區
// - { type: "depository", player_id: "p2" }: 卡片移至 p2 的捕獲區
```

### J. 役型定義 (Yaku Types)

```typescript
enum YakuType {
  // 光札役
  GOKOU = "GOKOU",           // 五光, 15點
  SHIKOU = "SHIKOU",         // 四光, 10點
  AMESHIKOU = "AMESHIKOU",   // 雨四光, 8點
  SANKOU = "SANKOU",         // 三光, 6點

  // 種札役
  INOSHIKACHOU = "INOSHIKACHOU",  // 猪鹿蝶, 5點
  TANE = "TANE",                  // 種, 1點

  // 短札役
  AKATAN = "AKATAN",         // 赤短, 5點
  AOTAN = "AOTAN",           // 青短, 5點
  TANZAKU = "TANZAKU",       // 短, 1點

  // かす札役
  KASU = "KASU"              // かす, 1點
}
```

---

## III. 客戶端命令 (C2S Commands)

客戶端僅在伺服器處於特定 `flow_state` 時發送命令。

### 1. GameRequestJoin
**描述**: 請求加入遊戲或重連
**流程狀態**: 任意
**Payload**:
```json
{
  "command": "GameRequestJoin",
  "player_id": "p1",
  "session_token": "abc123"
}
```

### 2. TurnPlayHandCard
**描述**: 打出手牌並指定配對目標（如有）
**流程狀態**: `AWAITING_HAND_PLAY`
**Payload**:
```json
{
  "command": "TurnPlayHandCard",
  "card": "0341",
  "target": "0342"
}
```
**備註**:
- `target` 為 `null` 表示無配對或送至場上
- 雙重配對時，客戶端需在命令中明確選擇目標
- 伺服器會驗證 `target` 是否與 `card` 月份相同

### 3. TurnSelectTarget
**描述**: 選擇翻牌時雙重配對的捕獲目標
**流程狀態**: `AWAITING_SELECTION`
**Payload**:
```json
{
  "command": "TurnSelectTarget",
  "source": "0841",
  "target": "0842"
}
```

### 4. RoundMakeDecision
**描述**: 形成役後決策 Koi-Koi 或結束
**流程狀態**: `AWAITING_DECISION`
**Payload**:
```json
{
  "command": "RoundMakeDecision",
  "decision": "KOI_KOI"
}
```
**備註**: `decision` 可為 `"KOI_KOI"` 或 `"END_ROUND"`

### 5. ClientAcknowledge
**描述**: 確認已渲染事件，準備接收下一狀態
**流程狀態**: 任意
**Payload**:
```json
{
  "command": "ClientAcknowledge",
  "event_id": "evt_789"
}
```

---

## IV. 伺服器事件 (S2C Events)

所有事件包含通用欄位：
```json
{
  "event": "EventName",
  "event_id": "evt_123",
  "timestamp": 1678901234567
}
```

### A. 遊戲局級事件 (Game/Round Level)

#### 1. GameStarted
**描述**: 遊戲會話開始
**Payload**:
```json
{
  "event": "GameStarted",
  "event_id": "evt_001",
  "my_player_id": "p1",
  "players": [
    {"id": "p1", "name": "Player1"},
    {"id": "p2", "name": "Player2"}
  ],
  "ruleset": {
    "total_rounds": 12,
    "koi_koi_multiplier": 2,
    "seven_point_double": true
  }
}
```
**備註**: `my_player_id` 標識當前客戶端的玩家身份

#### 2. RoundDealt
**描述**: 新局發牌完成
**Payload**:
```json
{
  "event": "RoundDealt",
  "event_id": "evt_002",
  "dealer": "p1",
  "field": ["0341", "0342", "0221", "0831", "1041", "0441", "0541", "0741"],
  "hands": [
    {"player_id": "p1", "cards": ["0111", "0331", "0431", "0531", "0631", "0931", "1031", "1131"]},
    {"player_id": "p2", "count": 8}
  ],
  "deck_remaining": 24,
  "first_player": "p1",
  "next_state": {
    "type": "AWAITING_HAND_PLAY",
    "active_player": "p1"
  }
}
```
**備註**:
- 自己的手牌傳具體 `cards` 陣列，對手手牌僅傳 `count` 數量

#### 3. RoundEndedInstantly
**描述**: 局開始時因 Teshi 或場牌流局立即結束
**Payload**:
```json
{
  "event": "RoundEndedInstantly",
  "event_id": "evt_003",
  "reason": "TESHI",
  "winner": "p1",
  "score_changes": [
    {"player_id": "p1", "change": 6},
    {"player_id": "p2", "change": 0}
  ],
  "cumulative_scores": [
    {"player_id": "p1", "score": 6},
    {"player_id": "p2", "score": 0}
  ]
}
```
**備註**:
- `reason` 可為 `"TESHI"` 或 `"FIELD_KUTTSUKI"`
- `winner` 為 `null` 表示平局
- 後續會發送新的 `RoundDealt` 或 `GameFinished`

#### 4. RoundScored
**描述**: 局結束，分數結算
**Payload**:
```json
{
  "event": "RoundScored",
  "event_id": "evt_004",
  "winner": "p1",
  "yakus": [
    {"type": "AKATAN", "base_points": 5},
    {"type": "TANZAKU", "base_points": 5}
  ],
  "base_total": 10,
  "multipliers": {
    "seven_plus": 2,
    "opponent_koi": 2
  },
  "final_points": 40,
  "score_changes": [
    {"player_id": "p1", "change": 40},
    {"player_id": "p2", "change": 0}
  ],
  "cumulative_scores": [
    {"player_id": "p1", "score": 40},
    {"player_id": "p2", "score": 15}
  ]
}
```

#### 5. RoundDrawn
**描述**: 雙方手牌用罄且無人形成役
**Payload**:
```json
{
  "event": "RoundDrawn",
  "event_id": "evt_005",
  "reason": "NO_YAKU",
  "score_changes": [
    {"player_id": "p1", "change": 0},
    {"player_id": "p2", "change": 0}
  ]
}
```

#### 6. GameFinished
**描述**: 遊戲會話結束
**Payload**:
```json
{
  "event": "GameFinished",
  "event_id": "evt_006",
  "final_scores": [
    {"player_id": "p1", "score": 156},
    {"player_id": "p2", "score": 142}
  ],
  "winner": "p1"
}
```

---

### B. 回合級事件 (Turn Level)

#### 7. TurnCompleted
**描述**: 完整回合執行完畢（無中斷）
**使用時機**: 打手牌、翻牌均完成，且無役形成或不需決策
**Payload**:
```json
{
  "event": "TurnCompleted",
  "event_id": "evt_101",
  "player": "p1",
  "hand_play": {
    "played": "0341",
    "captured": ["0342", "0343"],
    "to": {"type": "depository", "player_id": "p1"}
  },
  "deck_flip": {
    "flipped": "0221",
    "captured": ["0222"],
    "to": {"type": "depository", "player_id": "p1"},
    "deck_remaining": 23
  },
  "yaku_update": null,
  "next_state": {
    "type": "AWAITING_HAND_PLAY",
    "active_player": "p2"
  }
}
```
**備註**:
- `captured` 為空陣列表示無捕獲，卡片送至場上
- `to` 可為 `{"type": "field"}` 或 `{"type": "depository", "player_id": "..."}`
- `yaku_update` 為 `null` 或 `{"new": [...], "total_base": 7}`

#### 8. SelectionRequired
**描述**: 翻牌時雙重配對，需要客戶端選擇捕獲目標
**使用時機**: 僅在 `deck_flip` 階段，翻出的牌與場上2張牌月份相同
**Payload**:
```json
{
  "event": "SelectionRequired",
  "event_id": "evt_102",
  "player": "p1",
  "phase": "deck_flip",
  "completed": {
    "hand_play": {
      "played": "0341",
      "captured": ["0342"],
      "to": {"type": "depository", "player_id": "p1"}
    }
  },
  "selection": {
    "source": "0841",
    "options": ["0842", "0843"]
  },
  "next_state": {
    "type": "AWAITING_SELECTION",
    "active_player": "p1"
  }
}
```

#### 9. TurnProgressAfterSelection
**描述**: 翻牌選擇完成後，繼續執行剩餘流程
**使用時機**: 收到 `TurnSelectTarget` 命令後
**Payload**:
```json
{
  "event": "TurnProgressAfterSelection",
  "event_id": "evt_103",
  "selected_capture": {
    "source": "0841",
    "captured": ["0842"],
    "to": {"type": "depository", "player_id": "p1"}
  },
  "deck_remaining": 22,
  "yaku_update": null,
  "next_state": {
    "type": "AWAITING_HAND_PLAY",
    "active_player": "p2"
  }
}
```

#### 10. DecisionRequired
**描述**: 玩家形成役型，需決策是否 Koi-Koi
**使用時機**: 回合結束時檢測到新役型形成
**Payload**:
```json
{
  "event": "DecisionRequired",
  "event_id": "evt_104",
  "player": "p1",
  "yaku_update": {
    "new": [{"type": "AKATAN", "base_points": 5}],
    "total_base": 5
  },
  "next_state": {
    "type": "AWAITING_DECISION",
    "active_player": "p1"
  }
}
```

#### 11. DecisionMade
**描述**: 玩家完成 Koi-Koi 決策
**使用時機**: 收到 `RoundMakeDecision` 命令後
**Payload**:
```json
{
  "event": "DecisionMade",
  "event_id": "evt_105",
  "player": "p1",
  "decision": "KOI_KOI",
  "koi_multiplier_update": 2,
  "next_state": {
    "type": "AWAITING_HAND_PLAY",
    "active_player": "p2"
  }
}
```
**備註**: 若 `decision` 為 `"END_ROUND"`，後續會發送 `RoundScored` 事件

#### 12. TurnError
**描述**: 客戶端發送無效命令
**Payload**:
```json
{
  "event": "TurnError",
  "event_id": "evt_199",
  "error_code": "INVALID_CARD",
  "message": "Card 0341 not in player's hand",
  "retry_allowed": true
}
```

---

## V. 斷線重連：狀態快照 (Snapshot)

當客戶端重連時（`GameRequestJoin` 且 `session_token` 有效），伺服器發送完整狀態快照。

### GameSnapshotRestore

**Payload**:
```json
{
  "event": "GameSnapshotRestore",
  "event_id": "evt_snapshot",
  "my_player_id": "p1",
  "game": {
    "id": "game_abc",
    "ruleset": {
      "total_rounds": 12,
      "koi_koi_multiplier": 2,
      "seven_point_double": true
    },
    "cumulative_scores": [
      {"player_id": "p1", "score": 28},
      {"player_id": "p2", "score": 15}
    ],
    "rounds_played": 3
  },
  "round": {
    "dealer": "p2",
    "koi_status": [
      {"player_id": "p1", "multiplier": 1, "called_count": 0},
      {"player_id": "p2", "multiplier": 2, "called_count": 1}
    ]
  },
  "cards": {
    "field": ["0341", "0441"],
    "my_hand": ["0111", "0331", "0531"],
    "opponent_hand_count": 5,
    "my_depository": ["0342", "0343", "0344", "0221"],
    "opponent_depository": ["0831", "0832", "0231"],
    "deck_remaining": 18
  },
  "flow_state": {
    "type": "AWAITING_HAND_PLAY",
    "active_player": "p1",
    "context": null
  }
}
```
**備註**:
- `my_player_id` 標識當前客戶端的玩家身份
- `context` 在 `AWAITING_SELECTION` 時包含 `selection` 物件
- 客戶端收到快照後可直接渲染並發送命令，無需等待新事件

---

## VI. 事件流程範例

### 範例 1: 無中斷的完整回合

```
C→S: TurnPlayHandCard {card: "0341", target: "0342"}

S→C: TurnCompleted
     player: "p1"
     hand_play: {played: "0341", captured: ["0342"], to: {type: "depository", player_id: "p1"}}
     deck_flip: {flipped: "0221", captured: [], to: {type: "field"}, deck_remaining: 23}
     yaku_update: null
     next_state: {type: "AWAITING_HAND_PLAY", active_player: "p2"}
```

### 範例 2: 打手牌時雙重配對（玩家已在命令中選擇）

```
C→S: TurnPlayHandCard {card: "0341", target: "0342"}
     // 場上有 0342 和 0343，玩家選擇 0342

S→C: TurnCompleted
     player: "p1"
     hand_play: {played: "0341", captured: ["0342"], to: {type: "depository", player_id: "p1"}}
     deck_flip: {flipped: "0221", captured: [], to: {type: "field"}, deck_remaining: 23}
     yaku_update: null
     next_state: {type: "AWAITING_HAND_PLAY", active_player: "p2"}
```

### 範例 3: 翻牌時雙重配對（需中斷選擇）

```
C→S: TurnPlayHandCard {card: "0341", target: "0342"}

S→C: SelectionRequired
     phase: "deck_flip"
     completed: {
       hand_play: {played: "0341", captured: ["0342"], to: {type: "depository", player_id: "p1"}}
     }
     selection: {source: "0841", options: ["0842", "0843"]}
     next_state: {type: "AWAITING_SELECTION", active_player: "p1"}

C→S: TurnSelectTarget {source: "0841", target: "0842"}

S→C: TurnProgressAfterSelection
     selected_capture: {source: "0841", captured: ["0842"], to: {type: "depository", player_id: "p1"}}
     deck_remaining: 22
     yaku_update: null
     next_state: {type: "AWAITING_HAND_PLAY", active_player: "p2"}
```

### 範例 4: 形成役型需決策

```
C→S: TurnPlayHandCard {card: "0331", target: null}

S→C: DecisionRequired
     player: "p1"
     yaku_update: {
       new: [{"type": "AKATAN", "base_points": 5}],
       total_base: 5
     }
     next_state: {type: "AWAITING_DECISION", active_player: "p1"}

C→S: RoundMakeDecision {decision: "KOI_KOI"}

S→C: DecisionMade
     player: "p1"
     decision: "KOI_KOI"
     koi_multiplier_update: 2
     next_state: {type: "AWAITING_HAND_PLAY", active_player: "p2"}
```

### 範例 5: 役型形成後選擇結束

```
C→S: TurnPlayHandCard {card: "0131", target: "0132"}

S→C: DecisionRequired
     player: "p1"
     yaku_update: {
       new: [{"type": "TANZAKU", "base_points": 5}],
       total_base: 10
     }
     next_state: {type: "AWAITING_DECISION", active_player: "p1"}

C→S: RoundMakeDecision {decision: "END_ROUND"}

S→C: DecisionMade
     player: "p1"
     decision: "END_ROUND"
     next_state: null

S→C: RoundScored
     winner: "p1"
     yakus: [
       {"type": "AKATAN", "base_points": 5},
       {"type": "TANZAKU", "base_points": 5}
     ]
     base_total: 10
     multipliers: {seven_plus: 2, opponent_koi: 1}
     final_points: 20
     score_changes: [
       {"player_id": "p1", "change": 20},
       {"player_id": "p2", "change": 0}
     ]
     cumulative_scores: [
       {"player_id": "p1", "score": 20},
       {"player_id": "p2", "score": 0}
     ]
```

---

## VII. 最小增量原則總結

1. **僅傳遞變化**: 卡片移動僅傳 ID 陣列，無需完整 Card 物件
2. **合併連續操作**: 無中斷時，手牌+翻牌+役檢查合併為單一事件
3. **前置選擇**: 打手牌時的雙重配對由命令參數解決，無需額外事件
4. **中斷點獨立**: 翻牌雙重配對、役型決策必須中斷等待命令
5. **狀態明確**: 每個事件明確指出 `next_state`，客戶端無需推測
6. **斷線恢復**: 重連時一次快照完整恢復，無需重放歷史事件
