# 前後端數據契約

## 設計原則

- 所有 API 與 SSE 通訊使用 JSON 格式
- 遵循 `protocol.md` 定義的核心結構
- 使用基礎型別（string, number, boolean, array, object）便於跨語言實作
- 資料結構扁平化，便於序列化與傳輸

---

## 核心資料結構（遵循 protocol.md）

### Card（核心可重用結構）

```json
{
  "card_id": "uuid-string",
  "month": 1,
  "type": "BRIGHT",
  "display_name": "松鶴"
}
```

| 欄位 | 型別 | 說明 |
|-----|------|------|
| `card_id` | string | 卡牌唯一識別碼（UUID） |
| `month` | number | 月份（1-12） |
| `type` | string | 卡牌類型：`"BRIGHT"` / `"ANIMAL"` / `"RIBBON"` / `"DREG"` |
| `display_name` | string | 顯示名稱（如「松鶴」、「櫻幕」） |

---

### YakuScore（役種得分）

```json
{
  "yaku_type": "GOKO",
  "base_points": 15
}
```

| 欄位 | 型別 | 說明 |
|-----|------|------|
| `yaku_type` | string | 役種類型（如 `"GOKO"`, `"AKATAN"`, `"INOSHIKACHO"`） |
| `base_points` | number | 基礎得分 |

---

### CardCapture（卡牌捕獲操作）

```json
{
  "source_card": {
    "card_id": "card-1",
    "month": 1,
    "type": "BRIGHT",
    "display_name": "松鶴"
  },
  "captured_cards": [
    {
      "card_id": "card-2",
      "month": 1,
      "type": "ANIMAL",
      "display_name": "松短冊"
    }
  ],
  "target_zone": "DEPOSITORY"
}
```

| 欄位 | 型別 | 說明 |
|-----|------|------|
| `source_card` | Card | 來源牌（打出的手牌或翻出的牌堆牌） |
| `captured_cards` | Card[] | 捕獲的場牌列表（可能為空陣列） |
| `target_zone` | string | 目標區域：`"FIELD"` 或 `"DEPOSITORY"` |

---

## SSE 事件 Payload 格式

所有 SSE 事件的 `data` 欄位均為 JSON 格式。以下為各事件的資料結構範例：

### GameStarted
```json
{
  "player_details": {
    "player-uuid-1": "Player 1",
    "player-uuid-2": "Player 2"
  },
  "game_ruleset": {
    "variant": "KANTO",
    "total_rounds": 12
  },
  "total_rounds": 12
}
```

### RoundDealt
```json
{
  "current_dealer_id": "player-uuid",
  "initial_field_cards": [
    {"card_id": "card-1", "month": 1, "type": "BRIGHT", "display_name": "松鶴"}
  ],
  "hand_size": 8
}
```

### TurnStarted
```json
{
  "active_player_id": "player-uuid",
  "required_stage": "AWAITING_HAND_PLAY",
  "timestamp": "2025-10-20T10:30:00Z"
}
```

### CardPlayedFromHand
```json
{
  "player_id": "player-uuid",
  "capture": {
    "source_card": {"card_id": "card-1", "month": 1, "type": "BRIGHT", "display_name": "松鶴"},
    "captured_cards": [{"card_id": "card-2", "month": 1, "type": "ANIMAL", "display_name": "松短冊"}],
    "target_zone": "DEPOSITORY"
  }
}
```

### TurnSelectionRequired
```json
{
  "player_id": "player-uuid",
  "source_card_id": "card-1",
  "possible_targets": ["card-2", "card-3"]
}
```

### TurnYakuFormed
```json
{
  "player_id": "player-uuid",
  "newly_formed_yaku": [
    {"yaku_type": "GOKO", "base_points": 15}
  ],
  "current_base_score": 15,
  "required_stage": "AWAITING_DECISION"
}
```

### RoundScored
```json
{
  "winning_player_id": "player-uuid",
  "yaku_list": [
    {"yaku_type": "GOKO", "base_points": 15}
  ],
  "total_multipliers": 2,
  "final_score_change": {
    "player-uuid": 30,
    "opponent-uuid": -30
  }
}
```

完整 SSE 事件列表請參考 [protocol.md](./protocol.md)。

---

## REST API Request 格式

### POST /api/v1/games/join
```json
{
  "player_id": "player-uuid",
  "session_token": "optional-token-for-reconnect"
}
```

### POST /api/v1/games/{gameId}/turns/play-card
```json
{
  "card_id_to_play": "card-uuid"
}
```

### POST /api/v1/games/{gameId}/turns/select-match
```json
{
  "source_card_id": "card-uuid-1",
  "selected_target_id": "card-uuid-2"
}
```

### POST /api/v1/games/{gameId}/rounds/decision
```json
{
  "decision_type": "KOI_KOI"
}
```

（`decision_type` 可為 `"KOI_KOI"` 或 `"END_ROUND"`）

---

## 資料格式原則總結

1. ✅ 所有資料結構遵循 `protocol.md` 定義
2. ✅ 使用 JSON 格式，便於跨語言實作
3. ✅ 核心結構（Card, YakuScore, CardCapture）保持一致性
4. ✅ 欄位命名使用 snake_case（JSON 慣例）
5. ✅ 所有 ID 使用 string 型別（UUID）
