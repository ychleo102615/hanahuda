# Feature Specification: 遊戲大廳與操作面板

**Feature Branch**: `007-lobby-settings-panel`
**Created**: 2025-11-30
**Status**: Draft
**Input**: User description: "建立點擊開始遊戲之後，與遊戲畫面之間的中轉畫面。此時畫面可以點擊提示開始配對的按鈕，隨即發送 GameRequestJoin，在收到server傳來 GameStarted 事件之前提示使用者正在連線配對。斷線重連時不會進入此畫面。此外，建立一個在中轉畫面、遊戲中的畫面都持續存在按鈕，使用者可以點擊，藉此開啟從螢幕右側跳出的操作面板。中轉畫面時，面板中有返回 HomePage 的按鈕，遊戲中的時候則新增退出遊戲的按鈕。面板保留可於未來擴充其他按鈕的設計。"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 進入遊戲大廳並開始配對 (Priority: P1)

使用者從首頁點擊「Start Game」後，進入遊戲大廳（中轉畫面）。在這個畫面中，使用者看到一個清晰的「Find Match」按鈕。點擊按鈕後，系統開始配對流程，使用者看到「Finding match...」的提示訊息。當伺服器成功配對並發送 GameStarted 事件後，使用者自動進入遊戲畫面。

**Why this priority**: 這是整個功能的核心價值 - 提供清晰的遊戲啟動流程，讓使用者知道目前的狀態（等待 → 配對中 → 已連線）。沒有這個流程，使用者會直接從首頁跳到遊戲，體驗會很突兀。

**Independent Test**: 可以完全獨立測試此功能 - 從首頁點擊「Start Game」，驗證大廳畫面顯示，點擊「Find Match」，驗證配對狀態提示，最後驗證成功進入遊戲畫面。

**Acceptance Scenarios**:

1. **Given** 使用者在首頁，**When** 點擊「Start Game」按鈕，**Then** 系統導航到遊戲大廳畫面
2. **Given** 使用者在遊戲大廳，**When** 看到畫面，**Then** 顯示清晰的「Find Match」按鈕和說明文字
3. **Given** 使用者在遊戲大廳，**When** 點擊「Find Match」按鈕，**Then** 系統發送 GameRequestJoin 命令並顯示「Finding match...」提示
4. **Given** 系統正在配對中，**When** 收到伺服器的 GameStarted 事件，**Then** 自動導航到遊戲畫面
5. **Given** 系統正在配對中，**When** 配對超過 30 秒未成功，**Then** 顯示錯誤訊息「Matchmaking timeout, please retry」並重置為初始狀態

---

### User Story 2 - 在大廳使用操作面板返回首頁 (Priority: P2)

使用者在遊戲大廳畫面時，看到螢幕上有一個選單按鈕（如漢堡選單圖示）。點擊此按鈕後，操作面板從螢幕右側滑出。面板中包含「Back to Home」選項。使用者點擊後，系統導航回首頁。

**Why this priority**: 提供使用者退出流程的能力很重要，避免使用者被困在大廳畫面。這是基本的導航需求。

**Independent Test**: 可以獨立測試 - 進入大廳後，點擊選單按鈕，驗證面板從右側滑出，點擊「Back to Home」，驗證成功返回首頁。

**Acceptance Scenarios**:

1. **Given** 使用者在遊戲大廳，**When** 看到畫面，**Then** 顯示操作選單按鈕（位於畫面右上角或固定位置）
2. **Given** 使用者在遊戲大廳，**When** 點擊選單按鈕，**Then** 操作面板從螢幕右側滑出並覆蓋部分畫面
3. **Given** 操作面板已開啟，**When** 使用者查看面板內容，**Then** 顯示「Back to Home」選項
4. **Given** 操作面板已開啟，**When** 使用者點擊「Back to Home」，**Then** 系統導航回首頁
5. **Given** 操作面板已開啟，**When** 使用者點擊面板外的區域，**Then** 面板滑回並關閉

---

### User Story 3 - 在遊戲中使用操作面板退出遊戲 (Priority: P2)

使用者在遊戲進行中時，同樣看到操作選單按鈕。點擊後，操作面板從右側滑出，此時面板中除了「Back to Home」外，還顯示「Leave Game」選項。使用者點擊「Leave Game」後，系統顯示確認對話框，詢問是否確定退出（並說明退出後遊戲將結束）。確認後，系統結束遊戲會話並返回首頁。

**Why this priority**: 遊戲中的退出功能同樣重要，但優先級略低於大廳的返回功能，因為遊戲中退出涉及遊戲狀態的處理。

**Independent Test**: 可以獨立測試 - 在遊戲畫面中點擊選單按鈕，驗證面板內容包含「Leave Game」，點擊後驗證確認對話框，確認後驗證成功退出。

**Acceptance Scenarios**:

1. **Given** 使用者在遊戲畫面，**When** 點擊選單按鈕，**Then** 操作面板從右側滑出
2. **Given** 操作面板在遊戲中開啟，**When** 使用者查看面板內容，**Then** 顯示「Leave Game」和「Back to Home」選項
3. **Given** 操作面板在遊戲中開啟，**When** 使用者點擊「Leave Game」，**Then** 顯示確認對話框，說明「The game will end if you leave. Are you sure?」
4. **Given** 確認對話框已顯示，**When** 使用者點擊「Confirm」，**Then** 系統結束遊戲會話並導航回首頁
5. **Given** 確認對話框已顯示，**When** 使用者點擊「Cancel」，**Then** 關閉對話框，繼續遊戲

---

### User Story 4 - 斷線重連直接回到遊戲 (Priority: P3)

使用者在遊戲進行中時發生斷線。系統嘗試重新連線。當重連成功後，系統直接將使用者帶回遊戲畫面（恢復遊戲狀態），而不是返回遊戲大廳。

**Why this priority**: 這是重要的使用者體驗優化，避免使用者在斷線重連後需要重新配對。但相對於基本流程，這是次要的。

**Independent Test**: 可以透過模擬斷線情境獨立測試 - 在遊戲中觸發斷線，驗證重連後直接回到遊戲畫面而非大廳。

**Acceptance Scenarios**:

1. **Given** 使用者在遊戲中，**When** 發生網路斷線，**Then** 系統顯示「Connection lost, reconnecting...」橫幅
2. **Given** 系統正在嘗試重連，**When** 重連成功，**Then** 系統恢復遊戲狀態並直接顯示遊戲畫面（不經過大廳）
3. **Given** 系統正在嘗試重連，**When** 重連失敗超過 3 次，**Then** 顯示錯誤訊息並提供「Back to Home」選項

---

### Edge Cases

- **配對超時處理**: 如果配對請求發送後 30 秒內未收到 GameStarted 事件，系統應顯示「Matchmaking Timeout」錯誤訊息，並將大廳重置為初始狀態（可重新點擊「Find Match」）
- **配對中返回首頁**: 如果使用者在配對進行中（「Finding match...」狀態）打開操作面板並點擊「Back to Home」，系統應取消配對請求並返回首頁
- **操作面板關閉方式**: 使用者可以透過以下方式關閉操作面板：
  - 點擊面板外的任何區域
  - 點擊面板上的關閉按鈕（X 圖示）
  - 按下 ESC 鍵（可選）
- **遊戲中誤觸退出**: 為防止誤操作，「Leave Game」必須經過確認對話框，並清楚說明退出的後果
- **面板在不同畫面的內容差異**: 系統必須根據當前畫面（大廳 vs 遊戲中）動態顯示不同的操作選項

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 系統必須在使用者從首頁點擊「Start Game」後，導航到遊戲大廳畫面（而非直接進入遊戲）
- **FR-002**: 遊戲大廳畫面必須顯示清晰的「Find Match」按鈕和說明文字（如「Click to find an opponent」）
- **FR-003**: 當使用者點擊「Find Match」按鈕時，系統必須發送 GameRequestJoin 命令到伺服器
- **FR-004**: 發送配對請求後，系統必須顯示「Finding match...」提示訊息（可包含載入動畫）
- **FR-005**: 當系統收到伺服器的 GameStarted 事件時，必須自動導航到遊戲畫面
- **FR-006**: 如果配對請求發送後 30 秒內未收到 GameStarted 事件，系統必須顯示「Matchmaking timeout, please retry」錯誤訊息並重置大廳為初始狀態
- **FR-007**: 系統必須在遊戲大廳和遊戲畫面都顯示操作選單按鈕（建議位置：螢幕右上角）
- **FR-008**: 當使用者點擊選單按鈕時，系統必須從螢幕右側滑出操作面板（滑動動畫）
- **FR-009**: 操作面板在遊戲大廳時，必須顯示「Back to Home」選項
- **FR-010**: 操作面板在遊戲畫面時，必須顯示「Leave Game」和「Back to Home」選項
- **FR-011**: 當使用者點擊「Back to Home」時，系統必須導航回首頁（如在配對中，先取消配對）
- **FR-012**: 當使用者點擊「Leave Game」時，系統必須顯示確認對話框，說明「The game will end if you leave. Are you sure?」
- **FR-013**: 確認退出後，系統必須發送 GameLeave 命令到伺服器以結束遊戲會話
- **FR-014**: 發送 GameLeave 命令後，系統必須導航回首頁
- **FR-015**: 操作面板必須在使用者點擊面板外區域時自動關閉（滑回）
- **FR-016**: 操作面板必須包含關閉按鈕（X 圖示），點擊後關閉面板
- **FR-017**: 當使用者在遊戲中斷線並重連成功時，系統必須直接恢復到遊戲畫面，而不經過遊戲大廳
- **FR-018**: 操作面板的設計必須支援未來擴充（如新增「Settings」、「Rules」等選項），使用可擴展的清單結構

### Key Entities

- **遊戲大廳 (Game Lobby)**: 使用者開始遊戲前的中轉畫面，顯示配對按鈕和配對狀態
  - 狀態：初始（顯示「Find Match」按鈕）、配對中（顯示載入提示）、錯誤（顯示錯誤訊息）

- **操作面板 (Action Panel)**: 從螢幕右側滑出的選單面板
  - 內容：根據當前畫面動態變化（大廳 vs 遊戲中）
  - 操作選項清單：可擴充的項目列表
  - 狀態：開啟、關閉

- **配對請求 (Matchmaking Request)**: 使用者發起的配對命令
  - 超時時間：30 秒
  - 狀態：等待中、成功、超時

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 使用者可以在 3 秒內理解如何開始配對（透過清晰的按鈕和說明文字）
- **SC-002**: 配對狀態變化（初始 → 配對中 → 已連線 → 遊戲開始）對使用者清晰可見，無混淆
- **SC-003**: 使用者可以在 2 次點擊內訪問所有操作選項（點擊選單按鈕 → 點擊選項）
- **SC-004**: 操作面板的滑出與滑回動畫流暢，無明顯卡頓（60fps）
- **SC-005**: 斷線重連後，使用者可以在 1 秒內恢復到遊戲畫面
- **SC-006**: 配對超時後，使用者可以立即重試，無需重新載入頁面
- **SC-007**: 95% 的使用者能夠在首次使用時成功完成「Find Match → 進入遊戲」流程

## Assumptions

1. **配對超時時間**: 假設 30 秒為合理的配對超時時間，基於一般線上遊戲的配對體驗標準
2. **退出遊戲確認**: 假設遊戲中退出需要確認對話框，以防止誤操作導致遊戲意外結束
3. **操作面板關閉方式**: 假設點擊面板外區域可關閉面板，這是標準的 UX 模式（如 Drawer、Sidebar）
4. **斷線重連邏輯**: 假設現有系統已有斷線重連機制（如 ReconnectionBanner），本功能只需確保重連後不進入大廳
5. **操作選單按鈕位置**: 假設按鈕位於螢幕右上角，與現有 TopInfoBar 不衝突（可視需求調整 TopInfoBar 設計）
6. **配對取消**: 假設在配對中途返回首頁時，系統會自動取消配對請求（避免伺服器資源浪費）
7. **GameLeave 命令行為**: GameLeave 命令發送後，伺服器會立即結束遊戲會話，客戶端無需等待確認事件即可導航回首頁。詳細規格參見 [research.md](./research.md#31-新增命令發送機制-gameleave)

## Dependencies

- 現有的路由系統（Vue Router）
- 現有的遊戲狀態管理（Pinia stores）
- 現有的 SSE 事件接收機制（接收 GameStarted 事件）
- 現有的命令發送機制（發送 GameRequestJoin 命令）
- **新增命令支援**：需要後端支援 GameLeave 命令（用於玩家主動離開遊戲會話）
  - 命令格式：`POST /api/v1/games/{gameId}/leave`，payload 為空物件 `{}`
  - 詳細規格參見 [protocol.md](../../doc/shared/protocol.md#iv-客戶端命令-c2s)
- 現有的斷線重連機制（ReconnectionBanner 或類似功能）

## Out of Scope

以下項目不在本功能範圍內：

- 多人線上配對系統的伺服器端邏輯（假設後端已支援 GameRequestJoin 命令和 GameStarted 事件）
- 配對演算法或 ELO 匹配機制
- 操作面板中的其他功能（如「Settings」、「Rules」等），僅保留可擴充的設計
- TopInfoBar 的全面重新設計（可視需求進行小幅調整，但非必須）
- 聊天或社交功能
- 遊戲歷史記錄查詢

## Notes

- 本功能主要聚焦於改善使用者體驗，提供清晰的遊戲啟動流程和便捷的導航操作
- 操作面板的設計應保持簡潔，避免過多選項造成視覺混亂
- 配對流程的狀態提示必須清晰，讓使用者隨時了解目前處於哪個階段
- 考慮未來可能新增的功能（如好友邀請、房間系統），操作面板應保留擴充性
