# Feature Specification: Leaderboard and Records

**Feature Branch**: `012-leaderboard-records`
**Created**: 2026-01-13
**Status**: Draft
**Input**: User description: "建立排行榜功能和紀錄檢視功能

後端
- 此功能為另外一個 BC
- 以天、週為單位，排名分數靠前的玩家
- 讓玩家查詢一段時間內的總分、役種獲得數、勝利場數、來來宣告次數等

前端
- 將 NavigationBar 中的 Rules, About 移除
- 在 Heros Section 下方新增 Navigation Section
- 在 Navigation Section 下方新增 Record Section
- Record Section 用來顯示排行榜和基本的玩家遊玩紀錄"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Daily/Weekly Leaderboard (Priority: P1)

玩家想要查看排行榜，了解自己與其他玩家的排名差異，激發競爭動力。

**Why this priority**: 排行榜是此功能的核心價值，讓玩家能看到自己在社群中的排名位置，這是提升用戶黏著度的關鍵功能。

**Independent Test**: 可以透過訪問首頁的 Record Section，切換日榜/週榜來驗證排行榜數據正確顯示，並確認排名順序正確。

**Acceptance Scenarios**:

1. **Given** 玩家在首頁, **When** 頁面載入完成, **Then** 系統顯示 Record Section 包含排行榜區塊，預設顯示當日排行榜
2. **Given** 玩家查看排行榜, **When** 玩家點擊「週排行」標籤, **Then** 排行榜切換顯示本週累計分數排名
3. **Given** 排行榜載入中, **When** 資料尚未回傳, **Then** 顯示載入狀態（如骨架屏或載入動畫）
4. **Given** 排行榜載入失敗, **When** 發生網路錯誤, **Then** 顯示友善的錯誤訊息並提供重試選項

---

### User Story 2 - View Personal Game Statistics (Priority: P2)

已登入的玩家想要查看自己的遊戲統計數據，包含總分、勝率、役種達成等資訊。

**Why this priority**: 個人紀錄讓玩家能追蹤自己的進步，增加遊戲成就感，但優先度低於排行榜因為它屬於個人化功能。

**Independent Test**: 可以透過登入帳號後在 Record Section 查看個人統計區塊，確認各項數據正確顯示。

**Acceptance Scenarios**:

1. **Given** 已登入玩家在首頁, **When** 頁面載入完成, **Then** Record Section 顯示該玩家的個人統計摘要（總分、勝場數、Koi-Koi 宣告次數）
2. **Given** 已登入玩家, **When** 玩家選擇時間範圍（如「本週」「本月」「全部」）, **Then** 統計數據更新為該時間範圍的累計資料
3. **Given** 未登入訪客, **When** 訪客查看 Record Section, **Then** 個人統計區塊顯示提示訊息引導登入
4. **Given** 玩家沒有任何遊戲紀錄, **When** 查看個人統計, **Then** 顯示「尚無遊戲紀錄」的空狀態畫面

---

### User Story 3 - View Yaku Achievement Statistics (Priority: P3)

玩家想要查看自己達成各種役種的次數，了解自己的遊戲風格與強項。

**Why this priority**: 役種統計是進階功能，提供更深入的遊戲數據分析，對核心玩家有吸引力但非必要。

**Independent Test**: 可以透過查看個人統計中的役種達成區塊，確認各役種名稱和達成次數正確顯示。

**Acceptance Scenarios**:

1. **Given** 已登入玩家在 Record Section, **When** 展開役種統計區塊, **Then** 顯示所有役種的達成次數列表
2. **Given** 玩家有役種達成紀錄, **When** 查看役種統計, **Then** 役種按達成次數由高到低排序
3. **Given** 玩家尚未達成任何役種, **When** 查看役種統計, **Then** 顯示所有役種名稱，達成次數皆為 0

---

### User Story 4 - Simplified Navigation (Priority: P1)

簡化首頁導航，移除不必要的連結，讓使用者更專注於核心功能。

**Why this priority**: UI 精簡化與新增 Navigation Section 是前端架構調整的基礎，必須先完成才能正確整合 Record Section。

**Independent Test**: 可以透過檢視首頁 NavigationBar，確認 Rules 和 About 連結已移除，並驗證新的 Navigation Section 正確顯示在 Hero Section 下方。

**Acceptance Scenarios**:

1. **Given** 玩家在首頁, **When** 查看 NavigationBar, **Then** 僅顯示 Logo、Sign In/Player Badge、Start Game 按鈕
2. **Given** 玩家在首頁, **When** 滾動頁面通過 Hero Section, **Then** 看到新的 Navigation Section 提供頁內導航（如 Records、Rules 等錨點連結）
3. **Given** 玩家點擊 Navigation Section 中的連結, **When** 點擊「Records」, **Then** 頁面平滑滾動至 Record Section

---

### Edge Cases

- 當排行榜資料為空時（系統剛上線或時段內無玩家遊戲），如何呈現？**假設**：顯示「目前無排行資料」的空狀態。
- 當同分玩家排名如何處理？**假設**：同分玩家顯示相同排名，下一名玩家順延（如：1, 2, 2, 4）。
- 排行榜顯示多少名玩家？**假設**：預設顯示前 10 名。
- 玩家自己的排名如果不在前 10 名，是否特別顯示？**假設**：若已登入玩家排名在 10 名外，在排行榜底部額外顯示該玩家的排名資訊。
- 時區如何處理日/週的計算？**假設**：以伺服器時區（UTC+8 台灣時間）為準。

## Requirements *(mandatory)*

### Functional Requirements

**後端 - Leaderboard & Records Bounded Context**

- **FR-001**: 系統 MUST 建立獨立的 Leaderboard & Records Bounded Context，遵循 Clean Architecture 原則
- **FR-002**: 系統 MUST 提供查詢日排行榜的能力，返回當日分數排名前 N 名玩家
- **FR-003**: 系統 MUST 提供查詢週排行榜的能力，返回本週累計分數排名前 N 名玩家
- **FR-004**: 系統 MUST 提供查詢玩家個人統計的能力，包含：總分、遊戲場數、勝場數、敗場數、Koi-Koi 宣告次數、各役種達成次數
- **FR-005**: 系統 MUST 支援依時間範圍篩選個人統計（日、週、月、全部）
- **FR-006**: 系統 MUST 在查詢排行榜時，若玩家已登入且排名在顯示範圍外，額外返回該玩家的排名資訊
- **FR-007**: 排行榜 MUST 以分數降序排列，同分者以遊戲場數少者優先（效率較高）
- **FR-015**: 系統 MUST 維護 daily_player_scores 快照表，記錄每位玩家的每日分數
- **FR-016**: 系統 MUST 訂閱 Core-Game BC 的 GameFinishedEvent，於遊戲結束時更新當日快照
- **FR-017**: 系統 MUST 自動清除超過 30 天的每日分數快照資料

**前端 - UI 調整**

- **FR-008**: NavigationBar MUST 移除 Rules 和 About 連結
- **FR-009**: 系統 MUST 在 Hero Section 下方新增 Navigation Section，提供頁內錨點導航
- **FR-010**: 系統 MUST 在 Navigation Section 下方新增 Record Section
- **FR-011**: Record Section MUST 顯示排行榜區塊，支援日榜/週榜切換
- **FR-012**: Record Section MUST 顯示個人統計摘要區塊（已登入用戶）
- **FR-013**: Record Section MUST 在用戶未登入時，於個人統計區塊顯示登入引導
- **FR-014**: 所有資料載入狀態 MUST 有適當的視覺回饋（載入中、錯誤、空狀態）

### Key Entities

- **LeaderboardEntry**: 排行榜條目，包含玩家識別資訊、排名、分數、遊戲場數
- **PlayerStatistics**: 玩家統計數據，包含總分、勝敗場數、Koi-Koi 次數、役種計數等
- **DailyPlayerScore**: 每日玩家分數快照，包含玩家 ID、日期、當日累計分數、遊戲場數；由 GameFinishedEvent 事件驅動更新，保留 30 天
- **TimeRange**: 時間範圍值物件，定義統計的時間區間（日、週、月、全部）
- **LeaderboardType**: 排行榜類型值物件（日榜、週榜）

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 玩家可在 3 秒內完成排行榜的查看與切換操作
- **SC-002**: 已登入玩家可在首頁直接看到個人統計摘要，無需額外點擊
- **SC-003**: 排行榜數據在玩家完成遊戲後 1 分鐘內反映最新排名
- **SC-004**: 首頁新增功能後，頁面載入時間增加不超過 500ms
- **SC-005**: 90% 的用戶能在首次使用時成功找到並使用排行榜功能（無需說明文件）
- **SC-006**: 導航簡化後，用戶從首頁進入遊戲的點擊次數維持不變或減少

## Clarifications

### Session 2026-01-13

- Q: 日/週排行榜的分數數據來源為何？ → A: 新增 daily_player_scores 快照表，由 Core-Game GameFinishedEvent 事件驅動更新，30 天後刪除

## Assumptions

1. **數據來源**：個人統計基於現有 `player_stats` 表格；日/週排行榜基於新增的 `daily_player_scores` 快照表。
2. **即時性**：統計數據允許最多 1 分鐘的延遲，不要求即時更新。
3. **排名範圍**：預設顯示前 10 名，此數值可在實作時調整。
4. **時區**：以 UTC+8（台灣時間）作為日/週計算的基準時區。
5. **現有架構**：此功能建立在現有的 Clean Architecture 基礎上，遵循既有的 BC 分層模式。
6. **認證**：個人統計功能依賴現有的身份驗證機制（Identity BC）。
7. **響應式設計**：所有新增 UI 元件需支援手機與桌面瀏覽器。
