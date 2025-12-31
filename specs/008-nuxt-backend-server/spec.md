# Feature Specification: Nuxt Backend Server

**Feature Branch**: `008-nuxt-backend-server`
**Created**: 2024-12-04
**Status**: Draft
**Input**: User description: "建立花牌遊戲後端專案：在 Nuxt 中開發後端服務，實現 SSE 連線、遊戲房間配對、假玩家服務、完整遊戲規則引擎、以及資料庫統計功能"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 玩家從 GameLobby 加入遊戲並與假玩家配對 (Priority: P1)

玩家在 GameLobby 頁面選擇遊戲房間後，系統建立遊戲會話並自動配對假玩家，遊戲開始。

**Why this priority**: 這是核心遊戲流程的入口點，沒有這個功能，後續所有遊戲邏輯都無法運作。

**Independent Test**: 可透過發送 GameRequestJoin 請求並驗證 SSE 連線建立、GameStarted 事件接收、以及 RoundDealt 事件接收來完整測試。

**Acceptance Scenarios**:

1. **Given** 玩家在 GameLobby 頁面選擇遊戲房間，**When** 發送 GameRequestJoin 請求，**Then** 伺服器回傳 game_id 和 session_token
2. **Given** 玩家收到 game_id，**When** 建立 SSE 連線，**Then** SSE 連線成功建立
3. **Given** SSE 連線建立成功，**When** 假玩家服務自動加入配對，**Then** 玩家收到 GameStarted 事件，包含雙方玩家資訊和遊戲規則集
4. **Given** 配對完成，**When** 系統發牌，**Then** 玩家收到 RoundDealt 事件，包含場牌、手牌和下一狀態

---

### User Story 2 - 玩家執行回合操作（打牌、配對、決策）(Priority: P1)

玩家在回合中打出手牌、選擇配對目標、並在形成役種時決策是否 Koi-Koi。

**Why this priority**: 這是遊戲的核心互動循環，是遊戲可玩性的基礎。

**Independent Test**: 可透過模擬完整回合流程（打牌 → 翻牌 → 配對選擇 → Koi-Koi 決策）來測試。

**Acceptance Scenarios**:

1. **Given** 玩家處於 AWAITING_HAND_PLAY 狀態，**When** 發送 TurnPlayHandCard 命令（含配對目標），**Then** 伺服器驗證操作有效性並推送 TurnCompleted 或 SelectionRequired 事件
2. **Given** 翻牌出現雙重配對，**When** 玩家發送 TurnSelectTarget 命令選擇目標，**Then** 伺服器推送 TurnProgressAfterSelection 事件
3. **Given** 玩家形成役種，**When** 玩家選擇 KOI_KOI，**Then** 伺服器推送 DecisionMade 事件，倍率增加，遊戲繼續
4. **Given** 玩家形成役種，**When** 玩家選擇 END_ROUND，**Then** 伺服器推送 RoundScored 事件，計算最終得分

---

### User Story 3 - 假玩家自動執行回合（模擬思考時間）(Priority: P1)

當輪到假玩家時，系統自動執行打牌、配對選擇和 Koi-Koi 決策，並模擬合理的「思考時間」後再行動。

**Why this priority**: MVP 版本必須有對手才能完成遊戲，假玩家是最基本的對手實現。

**Independent Test**: 可透過觀察假玩家回合時 SSE 事件的自動推送來測試。

**Acceptance Scenarios**:

1. **Given** 假玩家處於 AWAITING_HAND_PLAY 狀態，**When** 輪到假玩家行動，**Then** 系統在模擬思考延遲後自動選擇手牌打出並推送對應事件
2. **Given** 假玩家需要選擇配對目標，**When** 存在多個配對選項，**Then** 系統隨機選擇一個有效目標
3. **Given** 假玩家形成役種，**When** 需要做 Koi-Koi 決策，**Then** 系統根據策略（MVP 隨機）做出決策
4. **Given** 後端等待假玩家操作，**When** 超過 action_timeout_seconds 加上冗餘時間仍無回應，**Then** 系統判定超時並處理錯誤情況

---

### User Story 4 - 完成一場遊戲（多局制）(Priority: P2)

玩家與假玩家完成指定局數的遊戲，系統計算最終勝負。

**Why this priority**: 完整遊戲流程是使用者體驗的關鍵，但依賴於 P1 功能。

**Independent Test**: 可透過模擬完整 2 局遊戲流程並驗證 GameFinished 事件來測試。

**Acceptance Scenarios**:

1. **Given** 遊戲規則設定為 2 局，**When** 第一局結束，**Then** 系統在 display_timeout_seconds 後自動開始第二局並推送 RoundDealt 事件
2. **Given** 所有局數完成，**When** 計算最終分數，**Then** 系統推送 GameFinished 事件，包含最終分數和勝者
3. **Given** 遊戲進行中，**When** 玩家主動離開（GameLeave），**Then** 遊戲結束，對手獲勝

---

### User Story 5 - 斷線重連與後端代管操作 (Priority: P2)

玩家在遊戲進行中斷線，後端持續進行遊戲流程（代管操作），玩家可在遊戲結束前重連恢復狀態。

**Why this priority**: 提升使用者體驗，確保遊戲不會因斷線而卡住。

**Independent Test**: 可透過模擬斷線（關閉 SSE）並重新發送 GameRequestJoin（含 session_token）來測試。

**Acceptance Scenarios**:

1. **Given** 玩家斷線且遊戲進行中，**When** action_timeout_seconds 到期，**Then** 後端自動為該玩家判定操作（代管模式）
2. **Given** 玩家斷線但遊戲尚未結束，**When** 發送 GameRequestJoin 重連請求，**Then** 伺服器回傳 GameSnapshotRestore 事件，包含當前遊戲狀態
3. **Given** 玩家斷線超過 60 秒，**When** 系統偵測到持續斷線，**Then** 視為玩家放棄遊戲，該場遊戲結束，對手獲勝
4. **Given** 遊戲已結束，**When** 玩家嘗試重連，**Then** 伺服器回傳 GameError（SESSION_INVALID），會話已清除

---

### User Story 6 - 記錄玩家遊戲統計 (Priority: P3)

系統記錄玩家的遊戲統計數據，包含總分、對局次數、勝敗等。

**Why this priority**: 統計功能增強遊戲深度，但不是 MVP 核心功能。

**Independent Test**: 可透過完成遊戲後查詢資料庫驗證統計數據更新。

**Acceptance Scenarios**:

1. **Given** 遊戲結束，**When** 系統儲存遊戲結果，**Then** 玩家的總分、對局次數、勝/敗次數正確更新
2. **Given** 玩家形成役種，**When** 遊戲結束，**Then** 各役種取得次數正確累計
3. **Given** 玩家宣告 Koi-Koi，**When** 遊戲結束，**Then** Koi-Koi 宣告次數正確累計
4. **Given** 玩家透過倍率獲勝，**When** 遊戲結束，**Then** 有效倍率獲勝次數正確累計

---

### Edge Cases

- 當配對超時 30 秒時，系統推送 GameError（MATCHMAKING_TIMEOUT）
- 當玩家在非輪到自己的狀態發送命令時，系統推送 TurnError（WRONG_PLAYER）
- 當玩家發送無效的卡片 ID 時，系統推送 TurnError（INVALID_CARD）
- 當玩家選擇無效的配對目標時，系統推送 TurnError（INVALID_TARGET）
- 當牌堆耗盡且雙方均無役種時，系統推送 RoundDrawn 事件（平局）
- 當出現手四（Teshi）或場牌流局（Kuttsuki）時，系統推送 RoundEndedInstantly 事件
- 當玩家斷線超過 60 秒時，系統判定玩家放棄，推送 GameFinished 事件（對手獲勝）
- 當玩家斷線且 action_timeout 到期時，系統自動為該玩家執行代管操作（最小影響策略：打出最低價值牌、END_ROUND）

## Requirements *(mandatory)*

### Functional Requirements

#### 遊戲房間與配對

- **FR-001**: 系統 MUST 提供 `/api/v1/games/join` 端點接收 GameRequestJoin 請求，請求中包含前端提供的匿名 player_id
- **FR-002**: 系統 MUST 為每個新遊戲生成唯一的 game_id（UUID 格式）和 session_token，並關聯玩家的 player_id
- **FR-003**: 系統 MUST 提供 `/api/v1/games/[gameId]/events` SSE 端點供前端建立連線
- **FR-004**: 系統 MUST 在 MVP 版本自動為單人玩家配對假玩家，無需等待真人配對

#### 遊戲流程控制

- **FR-005**: 系統 MUST 實現三種 FlowState 狀態機：AWAITING_HAND_PLAY、AWAITING_SELECTION、AWAITING_DECISION
- **FR-006**: 系統 MUST 驗證所有玩家操作的合法性（正確的 FlowState、正確的玩家、有效的卡片）
- **FR-007**: 系統 MUST 根據遊戲規則檢測配對關係（相同月份）
- **FR-008**: 系統 MUST 在每次捕獲後檢測役種形成
- **FR-009**: 系統 MUST 正確計算分數（基礎分 × Koi-Koi 倍率 × 7 分以上倍率）

#### 遊戲局數設定

- **FR-010**: 系統 MUST 支援可設定的遊戲局數，預設為 2 局
- **FR-011**: 系統 MUST 在每局結束後等待 display_timeout_seconds（5 秒）再自動開始下一局
- **FR-012**: 系統 MUST 在所有局數完成後推送 GameFinished 事件

#### 假玩家服務

- **FR-013**: 系統 MUST 提供假玩家服務（Bot Service），能自動執行所有遊戲操作
- **FR-014**: 系統 MUST 在每個需要玩家操作的事件中提供 action_timeout_seconds（預設 15 秒），作為前端動畫演出加玩家思考/操作的總時限
- **FR-015**: 假玩家 MUST 模擬「假玩家側的動畫演出時間」（固定 3 秒），確保與真實玩家側的動畫同步
- **FR-016**: 假玩家 MUST 在模擬動畫時間（3 秒）後，再加上模擬思考時間（1500ms-3000ms）才執行操作
- **FR-017**: 後端 MUST 在 action_timeout_seconds 加上冗餘緩衝時間（3 秒）後，才判定玩家操作超時
- **FR-018**: 假玩家 MVP 版本 MUST 使用隨機策略選擇手牌和配對目標
- **FR-019**: 假玩家 MUST 在形成役種時根據隨機策略決策 Koi-Koi

#### SSE 事件推送

- **FR-020**: 系統 MUST 實現所有 protocol.md 定義的 S2C 事件（GameStarted、RoundDealt、TurnCompleted 等）
- **FR-021**: 系統 MUST 確保事件推送的順序性和完整性
- **FR-022**: 系統 MUST 支援斷線重連機制，提供 GameSnapshotRestore 快照
- **FR-023**: 系統 MUST 在玩家斷線且 action_timeout_seconds 到期時，自動為該玩家判定操作（代管模式），採用最小影響策略：打出最低價值的牌、Koi-Koi 決策選擇 END_ROUND
- **FR-024**: 系統 MUST 在玩家斷線超過 60 秒時，判定該玩家放棄遊戲，遊戲結束並由對手獲勝
- **FR-025**: 系統 MUST 在遊戲結束後立即清除該遊戲會話資料

#### 資料庫持久化

- **FR-026**: 系統 MUST 使用 Drizzle ORM 搭配 PostgreSQL 進行資料持久化
- **FR-027**: 系統 MUST 儲存每場遊戲的狀態（用於重連恢復）
- **FR-028**: 系統 MUST 記錄每位玩家的統計數據：
  - 總分
  - 對局次數
  - 勝利次數
  - 敗北次數
  - 各役種取得次數
  - 有效倍率獲勝次數（7 分以上或 Koi-Koi 倍率獲勝）
  - Koi-Koi 宣告總次數

#### 錯誤處理

- **FR-029**: 系統 MUST 在操作錯誤時推送 TurnError 事件，包含具體錯誤代碼
- **FR-030**: 系統 MUST 在遊戲層級錯誤時推送 GameError 事件（配對超時、會話無效、玩家放棄等）

### Key Entities

- **Game（遊戲會話）**: 遊戲的聚合根，包含遊戲 ID、玩家列表、規則集、累計分數、已完成局數
- **Round（局）**: 單局遊戲狀態，包含莊家、場牌、牌堆、玩家手牌、獲得區、Koi-Koi 狀態
- **Player（玩家）**: 玩家資訊，包含匿名 player_id（前端 localStorage UUID）、區分真人玩家和假玩家（AI）；清除 localStorage 後視為新玩家
- **Card（卡片）**: 花牌卡片值物件，使用 MMTI 編碼格式
- **Yaku（役種）**: 役種值物件，包含類型和基礎分數
- **PlayerStats（玩家統計）**: 玩家的歷史遊戲統計數據
- **GameSession（遊戲會話）**: 用於重連的會話記錄，包含 session_token 與 game_id 映射

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 玩家從 GameLobby 發送 GameRequestJoin 到收到 RoundDealt 事件，整體時間不超過 3 秒
- **SC-002**: 系統在 MVP 階段能同時支援 50 場以上的並發遊戲
- **SC-003**: 假玩家的操作延遲（模擬動畫 3 秒 + 模擬思考 1.5-3 秒）為 4.5-6 秒，營造自然的遊戲節奏
- **SC-004**: 玩家操作後，SSE 事件推送延遲不超過 200ms
- **SC-005**: 玩家在遊戲結束前皆可重連恢復狀態；斷線超過 60 秒視為放棄遊戲
- **SC-006**: 遊戲結束後，玩家統計數據在 5 秒內完成更新並可查詢
- **SC-007**: 所有役種（12 種標準役種）的檢測準確率達到 100%

## Assumptions

1. **Nuxt 4 環境已建立**：front-end 專案已經是可運作的 Nuxt 4 專案
2. **後端 Domain Layer 需全新開發**：目前僅有 user-interface BC，遊戲邏輯（規則引擎、役種檢測）需在後端重新實作
3. **資料庫配置**：使用 Drizzle ORM 搭配 PostgreSQL，未來可能遷移至 Supabase
4. **假玩家是同步操作**：MVP 版本假玩家在同一個伺服器進程中執行，不是獨立服務
5. **單一伺服器部署**：MVP 版本採用單體架構，不考慮多伺服器的狀態同步問題
6. **action_timeout_seconds 語意**：此參數為前端動畫演出加玩家思考/操作的總時限，後端會在此時限加上冗餘時間後才判定超時

## Clarifications

### Session 2024-12-04

- Q: 在沒有帳號系統的情況下，如何識別玩家以追蹤其統計數據？ → A: 使用匿名 player_id（前端 localStorage UUID），清除後視為新玩家
- Q: 遊戲會話保留期限與斷線重連機制？ → A: 斷線後後端持續進行流程（action_timeout 到期自動判定操作），遊戲結束前皆可重連；斷線超過 60 秒視為放棄遊戲，該場遊戲結束；遊戲結束後會話立即清除
- Q: 假玩家操作延遲的具體數值？ → A: 模擬動畫時間統一 3 秒，模擬思考時間 1500-3000ms，總延遲 4.5-6 秒
- Q: action_timeout_seconds 與相關時間參數？ → A: action_timeout_seconds=15秒、冗餘緩衝時間=3秒、display_timeout_seconds=5秒
- Q: 代管操作（Auto-Action）的策略？ → A: 最小影響策略（打出最低價值的牌、Koi-Koi 決策選 END_ROUND）

## Out of Scope

1. 多人真人對戰配對系統
2. 進階 AI 策略（非隨機策略）
3. 使用者帳號系統和認證
4. 排行榜和成就系統
5. 多伺服器分散式部署
6. WebSocket 通訊（維持使用 SSE）
