# Feature Specification: Backend Testing & Logging Enhancement

**Feature Branch**: `009-backend-testing-logging`
**Created**: 2025-12-23
**Status**: Draft
**Input**: User description: "1. 為後端程式碼的 domain layer, application layer 編寫單元測試。2. 整理後端領域的所有 log。3. 新增遊戲每個 event, command 的 log 到資料庫中。"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Domain Layer Unit Testing (Priority: P1)

開發者需要驗證 Domain Layer 的核心業務邏輯正確性，包含 Game Aggregate、Round 實體、以及六個 Domain Services（yakuDetectionService、deckService、matchingService、scoringService、specialRulesService、roundTransitionService）的行為。

**Why this priority**: Domain Layer 是整個遊戲邏輯的核心，任何錯誤都會直接影響遊戲體驗。優先確保此層的正確性可以建立可靠的測試基礎。

**Independent Test**: 可透過執行 `npm run test:unit:domain` 完全獨立驗證，無需啟動伺服器或資料庫。

**Acceptance Scenarios**:

1. **Given** 存在 yakuDetectionService，**When** 傳入符合「五光」條件的卡牌組合，**Then** 應正確識別並回傳五光役種及其分數
2. **Given** 存在 Game Aggregate，**When** 執行遊戲狀態轉換（如 playHandCard），**Then** 應正確更新遊戲狀態並維持不變性
3. **Given** 存在 matchingService，**When** 傳入手牌與場牌，**Then** 應正確計算可配對的目標牌

---

### User Story 2 - Application Layer Unit Testing (Priority: P1)

開發者需要驗證 Application Layer 的 Use Cases 能正確協調 Domain 物件完成業務流程，包含 8 個 Use Cases（joinGameUseCase、playHandCardUseCase、selectTargetUseCase 等）的行為。

**Why this priority**: Application Layer 負責協調整個遊戲流程，其正確性直接決定 API 是否能正常運作。與 Domain Layer 同等重要。

**Independent Test**: 可透過執行 `npm run test:unit:application` 完全獨立驗證，使用 mock 的 Output Ports 替代實際實作。

**Acceptance Scenarios**:

1. **Given** 存在 playHandCardUseCase 且遊戲處於玩家回合，**When** 玩家出牌且場上有可配對的牌，**Then** 應發布 SelectionRequiredEvent 並更新遊戲狀態
2. **Given** 存在 joinGameUseCase 且房間尚未滿員，**When** 新玩家請求加入，**Then** 應成功建立玩家連線並發布 PlayerJoinedEvent
3. **Given** 存在 makeDecisionUseCase 且玩家剛形成役種，**When** 玩家選擇 Koi-Koi，**Then** 應正確更新 Koi 倍率並繼續遊戲

---

### User Story 3 - Log Standardization (Priority: P2)

開發者需要一致且結構化的日誌輸出，以便進行問題排查和系統監控。目前的 logger.ts 已具備基礎架構，需確保所有 Domain 和 Application 層都正確使用。

**Why this priority**: 統一的日誌格式是後續日誌持久化的前提，且有助於即時問題排查。

**Independent Test**: 可透過審查程式碼和執行整合測試來驗證日誌輸出格式一致性。

**Acceptance Scenarios**:

1. **Given** 存在結構化 logger，**When** Domain Service 執行業務邏輯時發生關鍵事件，**Then** 應輸出包含時間戳、等級、模組名、Request ID 的結構化日誌
2. **Given** 存在結構化 logger，**When** Use Case 開始和結束執行，**Then** 應記錄執行開始、結束及執行結果
3. **Given** 存在結構化 logger，**When** 發生錯誤，**Then** 應記錄 ERROR 級別日誌，包含完整錯誤堆疊

---

### User Story 4 - Event/Command Database Logging (Priority: P3)

系統管理員需要能夠追蹤遊戲中的所有 Events 和 Commands，用於稽核、問題分析和遊戲回放功能的基礎。

**Why this priority**: 這是進階功能，建立在前三個功能的基礎之上。對於 MVP 階段非必要，但對未來的遊戲回放和問題追蹤有重要價值。

**Independent Test**: 可透過發送遊戲命令並查詢資料庫來驗證記錄的完整性。

**Acceptance Scenarios**:

1. **Given** 遊戲進行中，**When** 玩家發送任何 Command（如 play-card、select-target），**Then** 應在資料庫中記錄命令內容、時間戳、玩家 ID、遊戲 ID
2. **Given** 遊戲進行中，**When** 系統發布任何 Event（如 TurnCompleted、RoundEnded），**Then** 應在資料庫中記錄事件類型、事件內容、時間戳、遊戲 ID
3. **Given** 已記錄的 Events/Commands，**When** 查詢特定遊戲的歷史記錄，**Then** 應能按時間順序取得完整的遊戲操作軌跡

---

### Edge Cases

- 日誌記錄失敗時（如資料庫連線中斷），系統應繼續執行遊戲邏輯而不阻斷
- 大量併發操作時，日誌寫入應使用非同步機制，不影響遊戲效能
- 敏感資料（如玩家手牌）在日誌中不應包含可能洩露遊戲策略的敏感資訊

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 系統 MUST 提供 Domain Layer 的單元測試，覆蓋以下模組：
  - game.ts（Game Aggregate）
  - round.ts（Round 實體）
  - yakuDetectionService.ts（役種檢測）
  - deckService.ts（牌組管理）
  - matchingService.ts（配對邏輯）
  - scoringService.ts（計分邏輯）
  - specialRulesService.ts（特殊規則）
  - roundTransitionService.ts（回合轉移）
- **FR-002**: 系統 MUST 提供 Application Layer 的單元測試，覆蓋所有 8 個 Use Cases
- **FR-003**: 所有測試 MUST 使用 mock/stub 隔離外部依賴，確保測試的獨立性和可重複性
- **FR-004**: 系統 MUST 統一使用 loggers 工廠函數記錄日誌，包含：
  - Domain 層使用 `loggers.domain(name)`
  - Application 層使用 `loggers.useCase(name)`
  - Adapter 層使用 `loggers.adapter(name)`
- **FR-005**: 所有日誌 MUST 包含以下結構化欄位：時間戳（ISO 8601）、日誌等級、模組名稱、Request ID（若有）、訊息內容、額外資料（JSON 格式）
- **FR-006**: 系統 MUST 將所有遊戲 Commands 記錄到資料庫，包含：命令類型、命令內容、時間戳、玩家 ID、遊戲 ID、Request ID（若有）
  - 涵蓋命令類型（依 `doc/shared/protocol.md`）：
    - `TurnPlayHandCard` - 打出手牌
    - `TurnSelectTarget` - 選擇翻牌配對目標
    - `RoundMakeDecision` - Koi-Koi 決策
    - `GameLeave` - 離開遊戲
  - 註：`GameRequestJoin` 為連線命令，不在遊戲日誌範圍內
- **FR-007**: 系統 MUST 將所有遊戲 Events 記錄到資料庫，包含：事件類型、事件內容、時間戳、遊戲 ID、相關玩家 ID（若有）
  - 涵蓋事件類型（依 `doc/shared/protocol.md`）：
    - 遊戲級：`GameStarted`、`RoundDealt`、`RoundEndedInstantly`、`RoundScored`、`RoundDrawn`、`GameFinished`
    - 回合級：`TurnCompleted`、`SelectionRequired`、`TurnProgressAfterSelection`、`DecisionRequired`、`DecisionMade`
  - 註：`TurnError`、`GameError`、`GameSnapshotRestore` 為錯誤/重連事件，不在遊戲日誌範圍內
- **FR-008**: Event/Command 的資料庫寫入 MUST 為非同步操作，不得阻斷主要遊戲流程
- **FR-009**: 系統 MUST 提供查詢特定遊戲歷史記錄的能力（按時間排序）

### Key Entities

- **GameLog**: 遊戲日誌記錄，包含 ID、遊戲 ID、記錄類型（command/event）、內容、時間戳、關聯玩家 ID、Request ID（optional）；資料保留 30 天後自動清理
- **TestSuite**: 測試套件，組織 Domain 和 Application 層的測試案例

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Domain Layer 單元測試覆蓋率達到 80% 以上
- **SC-002**: Application Layer 單元測試覆蓋率達到 80% 以上
- **SC-003**: 所有單元測試可在 30 秒內完成執行
- **SC-004**: 100% 的 Domain Services 和 Use Cases 使用統一的 logger 格式
- **SC-005**: 所有遊戲 Commands 和 Events 都被記錄到資料庫，無遺漏
- **SC-006**: Event/Command 資料庫寫入不增加遊戲操作延遲超過 10ms

## Clarifications

### Session 2025-12-23

- Q: GameLog 資料應保留多久？ → A: 保留 30 天後自動清理

## Assumptions

1. 使用 Vitest 作為測試框架（與前端一致）
2. 測試檔案放置於與源碼相鄰的 `__tests__` 目錄或使用 `.test.ts` 後綴
3. Event/Command 日誌使用 PostgreSQL 儲存（與現有資料庫架構一致，使用 Drizzle ORM）
4. 非同步日誌寫入使用「fire-and-forget」模式，寫入失敗時記錄 console error 但不影響主流程
5. Request ID 由中間層自動生成並傳遞，無需手動處理
