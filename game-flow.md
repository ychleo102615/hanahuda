# 日本花牌「來來」(Koi-Koi) 前後端交互規格

## 概述

本規格遵循**最小增量原則**(Minimal Incremental Principle)和**命令-事件模式**(Command-Event Model)。客戶端僅發送命令(Command),伺服器在狀態變更時推送原子化事件(Event)。只有在斷線重連或遊戲初始化時,才會發送完整的狀態快照(Snapshot)。

---

## I. 核心數據結構 (Core Reusable Payloads)

這些結構用於組成更複雜的命令和事件,確保資料傳輸的精簡性。

### Card (Object)
- **包含欄位**: `card_id` (UUID), `month` (Int 1-12), `type` (Enum: BRIGHT/ANIMAL/RIBBON/DREG)
- **描述**: 卡牌元數據

### YakuScore (Object)
- **包含欄位**: `yaku_type` (Enum), `base_points` (Int)
- **描述**: 描述單一役型(Yaku)的基礎得分

### CardCapture (Object)
- **包含欄位**: `source_card` (Card), `captured_cards` (Card List), `target_zone` (Enum: FIELD/DEPOSITORY)
- **描述**: 描述單次捕獲操作,包含移動的卡牌和目標區域

---

## II. 客戶端發送到伺服器的命令 (C2S Commands)

客戶端僅在伺服器處於特定 `FlowStage` 時發送這些命令。

| 命令名稱 | 描述 | 預期 Payload | 限制 Flow Stage |
|---------|------|-------------|----------------|
| `GameRequestJoin` | 請求加入遊戲會話或斷線重連 | `player_id`, `session_token` | N/A |
| `TurnPlayHandCard` | 玩家從手牌打出一張牌到場上 | `card_id_to_play` | `AWAITING_HAND_PLAY` |
| `TurnSelectMatchedCard` | 當打出或翻開的牌導致雙重匹配時,玩家選擇要捕獲的目標卡牌 | `source_card_id`, `selected_target_id` (來自場牌) | `AWAITING_SELECTION` |
| `RoundMakeDecision` | 玩家形成 Yaku 後,決定來來(Koi-Koi)或結束(Shobu) | `decision_type` (Enum: KOI_KOI / END_ROUND) | `AWAITING_DECISION` |
| `ClientAcknowledgeEvent` | 客戶端確認已渲染並處理流程事件,準備接收下一個狀態 | `event_id` | N/A |

---

## III. 伺服器發送到客戶端的事件 (S2C Events)

伺服器推送的事件以最小增量方式更新狀態和流程。

### A. 遊戲局級事件 (Round Session Events)

| 事件名稱 | 描述 | 核心 Payload (增量資訊) | 參考規則 |
|---------|------|----------------------|---------|
| `GameStarted` | 遊戲會話開始 | `player_details`, `game_ruleset`, `total_rounds` | N/A |
| `RoundDealt` | 新的一局發牌完成 | `current_dealer_id`, `initial_field_cards` (8張場牌), `hand_size` (雙方皆8張) | |
| `RoundEndedInstantly` | 局開始時因 `Teshi/Kuttsuki` 或場牌流局而立即結束 | `winner_id` (或 N/A), `reason` (Enum), `score_change` | |
| `RoundDecisionMade` | 玩家叫了 Koi-Koi 或選擇結束 | `player_id`, `decision_type`, `new_koi_koi_multiplier` | |
| `RoundScored` | 局最終分數結算 | `winning_player_id`, `yaku_list` (YakuScore List), `total_multipliers` (包含7+點和對手 Koi-Koi 的倍率), `final_score_change` | |
| `RoundDrawn` | 雙方手牌用罄且無人形成 Yaku | `score_change` (基於平局規則變體) | |
| `GameFinished` | 整個遊戲會話結束 | `final_scores`, `winner_id` | |

### B. 遊戲回合級事件 (Turn Session Events)

這些事件描述單一玩家操作的微觀狀態變更,即時更新卡牌移動。

| 事件名稱 | 描述 | 核心 Payload (增量資訊) | 參考規則 |
|---------|------|----------------------|---------|
| `TurnStarted` | 通知當前回合開始,以及應等待的下一個命令類型 | `active_player_id`, `required_stage` (Enum: `AWAITING_HAND_PLAY`) | |
| `CardPlayedFromHand` | 玩家打出卡牌並完成捕獲判定 | `player_id`, `CardCapture` (卡牌移動) | |
| `CardFlippedFromDeck` | 伺服器從牌堆翻牌並完成捕獲判定 | `player_id`, `CardCapture` (卡牌移動), `is_deck_empty` | |
| `TurnSelectionRequired` | 流程中斷:打出或翻出的牌與場上兩張牌匹配,要求玩家選擇目標 | `player_id`, `source_card_id`, `possible_targets` (Card ID List) | |
| `TurnYakuFormed` | 玩家的得分牌堆組成了新的 Yaku | `player_id`, `newly_formed_yaku` (YakuScore List), `current_base_score`, `required_stage` (`AWAITING_DECISION`) | |
| `TurnEnded` | 回合結束,控制權轉移給下一玩家 | `next_player_id` | |
| `TurnError` | 玩家發送了無效指令或操作 | `error_code`, `message` | N/A |

---

## IV. 斷線重連機制:狀態快照 (Snapshot)

當客戶端發送 `GameRequestJoin` 且伺服器判定為重連時,將推送以下完整的狀態快照,以供客戶端立即恢復遊戲畫面。

### GameSnapshotRestore

包含恢復遊戲所需的所有上下文和卡牌位置。

**核心 Payload (完整狀態)**:

- **Game Context**: 
  - `game_id`
  - `ruleset`
  - `player_scores` (總分)

- **Round Context**: 
  - `dealer_id`
  - `koi_koi_status` (叫牌次數和對手狀態)

- **Card State**: 
  - `field_cards` (所有場牌)
  - `player_hand_cards` (自己的8張手牌)
  - `opponent_hand_card_count`
  - `player_depositories` (雙方的得分牌堆)

- **Flow Control**: 
  - `current_flow_stage` (`AWAITING_DECISION` 或 `AWAITING_HAND_PLAY` 等)
  - `active_player_id`
  - `required_selection_context` (如果處於選擇階段,需提供 `source_card_id` 和 `possible_targets`)