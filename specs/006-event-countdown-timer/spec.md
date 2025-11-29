# Feature Specification: 事件時間倒數功能

**Feature Branch**: `006-event-countdown-timer`
**Created**: 2025-11-28
**Status**: Draft
**Input**: 為專案的事件協定新增時間倒數功能，讓玩家知道可操作的剩餘時間

## Clarifications

### Session 2025-11-28

- Q: 倒數計時的視覺緊急程度 → A: 低於 5 秒時數字變為警示色（text-red-500, Tailwind CSS）
- Q: 回合結束面板是否允許玩家提前跳過 → A: 不允許跳過，必須等待倒數結束才能繼續

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 玩家回合倒數顯示 (Priority: P1)

玩家在自己的回合時，需要看到剩餘操作時間的倒數顯示，以便掌握時間壓力並及時做出決策。

**Why this priority**: 這是最核心的功能，玩家回合是遊戲中最頻繁的操作狀態，倒數計時直接影響遊戲體驗和公平性。

**Independent Test**: 可透過模擬玩家回合狀態，驗證倒數顯示是否正確出現並持續遞減。

**Acceptance Scenarios**:

1. **Given** 遊戲進入玩家的手牌出牌階段（AWAITING_HAND_PLAY），**When** 畫面渲染完成，**Then** 頂部資訊列顯示倒數計時器，以整數秒數格式顯示（如「30」）
2. **Given** 倒數計時器正在運行，**When** 每經過 1 秒，**Then** 計時器數字減少 1
3. **Given** 玩家選擇了手牌但需要選擇配對目標（AWAITING_SELECTION），**When** 收到選擇需求事件，**Then** 倒數計時器重置為新的時限並繼續倒數

---

### User Story 2 - Koi-Koi 決策倒數顯示 (Priority: P1)

當玩家形成役種後需要決定是否 Koi-Koi 時，顯示決策的剩餘時間。

**Why this priority**: Koi-Koi 決策是遊戲的關鍵時刻，時間限制確保遊戲流暢進行，與回合倒數同等重要。

**Independent Test**: 可透過模擬 DecisionRequired 事件，驗證決策面板上的倒數顯示。

**Acceptance Scenarios**:

1. **Given** 玩家形成役種進入決策階段（AWAITING_DECISION），**When** 決策面板顯示，**Then** 面板內顯示決策倒數計時器
2. **Given** 決策倒數進行中，**When** 玩家點選 Koi-Koi 或結束回合，**Then** 倒數計時器停止

---

### User Story 3 - 回合結束面板倒數顯示 (Priority: P2)

當回合結束時（RoundEndedInstantly、RoundScored、RoundDrawn），跳出的結果面板需要顯示自動關閉或進入下一回合的倒數時間。

**Why this priority**: 提升使用者體驗，讓玩家知道何時會自動進入下一回合，但不影響核心遊戲操作。

**Independent Test**: 可透過模擬各種回合結束事件，驗證面板上的倒數顯示。

**Acceptance Scenarios**:

1. **Given** 收到 RoundScored 事件，**When** 結果面板顯示，**Then** 面板底部顯示「下一回合倒數：X 秒」
2. **Given** 收到 RoundEndedInstantly 事件（手四或場牌流局），**When** 結果面板顯示，**Then** 面板底部顯示「下一回合倒數：X 秒」
3. **Given** 收到 RoundDrawn 事件（平局），**When** 結果面板顯示，**Then** 面板底部顯示「下一回合倒數：X 秒」
4. **Given** 結果面板倒數進行中，**When** 倒數歸零，**Then** 面板自動關閉並進入下一回合
5. **Given** 結果面板倒數進行中，**When** 玩家點擊面板或嘗試其他操作，**Then** 無任何反應，必須等待倒數結束

---

### User Story 4 - 對手回合狀態顯示 (Priority: P3)

當對手正在操作時，玩家可以看到對手剩餘的思考時間。

**Why this priority**: 增強玩家對遊戲進度的掌握，但對自己的操作沒有直接影響。

**Independent Test**: 可透過模擬對手回合狀態，驗證頂部資訊列顯示對手倒數。

**Acceptance Scenarios**:

1. **Given** 遊戲進入對手的回合，**When** 收到包含時限的事件，**Then** 頂部資訊列顯示對手剩餘時間
2. **Given** 對手倒數顯示中，**When** 對手完成操作，**Then** 倒數顯示消失或切換為玩家回合倒數

---

### Edge Cases

- 當倒數歸零時，玩家尚未做出選擇，系統應如何處理？（此為後端邏輯，前端需能接收超時事件）
- 當網路延遲導致事件接收時間與伺服器時間不同步時，如何處理？（使用事件中的剩餘秒數，而非精確計算）
- 當玩家在面板顯示期間重新整理頁面，重連後如何顯示正確的倒數？（依賴 GameSnapshotRestore 事件中的時限資訊）

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 系統 MUST 在以下事件中包含 `action_timeout_seconds` 欄位：RoundDealt、SelectionRequired、TurnProgressAfterSelection、DecisionRequired、TurnCompleted、DecisionMade
- **FR-002**: 系統 MUST 在以下事件中包含 `display_timeout_seconds` 欄位：RoundEndedInstantly、RoundScored、RoundDrawn
- **FR-003**: 時限欄位 MUST 為正整數，表示剩餘秒數（不含小數）
- **FR-004**: 前端 MUST 在頂部資訊列（Your Turn / Opponent Turn 區域附近）顯示回合操作倒數
- **FR-005**: 前端 MUST 在 Koi-Koi 決策面板內顯示決策倒數
- **FR-006**: 前端 MUST 在回合結束面板底部顯示進入下一回合的倒數
- **FR-007**: 前端 MUST 以整數秒數格式顯示倒數（如「30」或「30秒」）
- **FR-008**: GameSnapshotRestore 事件 MUST 包含當前狀態的剩餘時限，以支援斷線重連
- **FR-009**: 以下事件不需要時限欄位：GameStarted、GameFinished、TurnError
- **FR-010**: 前端 MUST 在倒數剩餘時間低於 5 秒時，將數字顯示為警示色（如紅色或橘色）
- **FR-011**: 前端 MUST NOT 允許玩家在回合結束面板顯示期間跳過或提前關閉面板，必須等待倒數結束

### Key Entities

- **ActionTimeout**: 表示玩家可操作的時限
  - `action_timeout_seconds`: 正整數，剩餘秒數
  - 適用於需要玩家輸入的事件（出牌、選擇配對、Koi-Koi 決策）

- **DisplayTimeout**: 表示面板顯示的時限
  - `display_timeout_seconds`: 正整數，剩餘秒數
  - 適用於回合結束面板，指示自動進入下一回合的時間

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 玩家在自己回合時，100% 能看到倒數計時顯示
- **SC-002**: 倒數計時的顯示誤差不超過 2 秒（考慮網路延遲）
- **SC-003**: 回合結束面板顯示時，100% 包含下一回合倒數提示
- **SC-004**: 斷線重連後，倒數計時能正確恢復顯示
- **SC-005**: 倒數顯示以整數秒呈現，無小數點

## Assumptions

- 時限的具體秒數（如 30 秒、60 秒）由後端決定，前端僅負責顯示
- 時限到期後的行為（自動棄權、隨機選擇等）由後端處理，前端需能接收對應的事件
- 前端的倒數是本地計時，以收到事件時的 `action_timeout_seconds` 為起點遞減
- 網路延遲可能導致顯示與實際剩餘時間有 1-2 秒的誤差，這是可接受的

## UI Display Locations

根據現有遊戲畫面佈局，倒數計時的顯示位置如下：

### 1. 頂部資訊列（回合操作倒數）
- 位置：現有「Your Turn」/「Opponent Turn」文字旁邊或下方
- 格式：「30」或「剩餘 30 秒」
- 顯示時機：AWAITING_HAND_PLAY、AWAITING_SELECTION 狀態
- 視覺回饋：剩餘時間低於 5 秒時，數字變為警示色（紅色/橘色）

### 2. Koi-Koi 決策面板（決策倒數）
- 位置：決策面板內，Koi-Koi/結束按鈕附近
- 格式：與回合倒數一致
- 顯示時機：AWAITING_DECISION 狀態
- 視覺回饋：剩餘時間低於 5 秒時，數字變為警示色（紅色/橘色）

### 3. 回合結束面板（下一回合倒數）
- 位置：面板底部
- 格式：「下一回合：5 秒」或「Next round in: 5s」
- 顯示時機：RoundEndedInstantly、RoundScored、RoundDrawn 事件後
- 互動限制：不允許提前跳過，必須等待倒數結束自動關閉

## Protocol Changes Summary

需要修改的事件（新增欄位）：

| 事件名稱                    | 新增欄位                 | 型別            | 說明                           |
|-----------------------------|--------------------------|-----------------|--------------------------------|
| RoundDealt                  | action_timeout_seconds   | number          | 首位玩家的出牌時限             |
| SelectionRequired           | action_timeout_seconds   | number          | 選擇配對目標的時限             |
| TurnProgressAfterSelection  | action_timeout_seconds   | number          | 若進入下一狀態需操作，包含新時限 |
| DecisionRequired            | action_timeout_seconds   | number          | Koi-Koi 決策時限               |
| TurnCompleted               | action_timeout_seconds   | number          | 下一位玩家的出牌時限           |
| DecisionMade                | action_timeout_seconds   | number          | 下一位玩家的出牌時限           |
| RoundEndedInstantly         | display_timeout_seconds  | number          | 面板顯示時間                   |
| RoundScored                 | display_timeout_seconds  | number          | 面板顯示時間                   |
| RoundDrawn                  | display_timeout_seconds  | number          | 面板顯示時間                   |
| GameSnapshotRestore         | action_timeout_seconds   | number          | 重連時的剩餘時限             |

不需修改的事件：
- GameStarted（無操作需求）
- GameFinished（遊戲結束）
- TurnError（錯誤訊息）
