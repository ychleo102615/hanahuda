# Feature Specification: User Interface BC - Application Layer

**Feature Branch**: `003-ui-application-layer`
**Created**: 2025-11-14
**Status**: Draft
**Input**: User description: "根據 @doc/readme.md @doc/frontend/user-interface/application.md @doc/frontend/user-interface/domain.md @doc/shared/ @doc/quality/ 開發 user-interface BC application layer"

## Feature Overview

User Interface BC 的 Application Layer 負責編排 Domain Layer 與 Adapter Layer 之間的業務流程，控制 UI 流程與業務協調，採用純 TypeScript 實作，不依賴任何框架（Vue、Pinia 等）。

**核心職責**：
- 協調玩家操作流程（打牌、選擇配對、Koi-Koi 決策）
- 處理後端推送的 SSE 事件（15+ 種遊戲事件）
- 通過 Port 介面更新 UI 狀態和觸發視覺效果
- 統一錯誤處理（操作錯誤、網路錯誤、狀態不一致）

**與其他層的關係**：
- **依賴 Domain Layer**：調用卡片配對驗證、役種檢測等純業務邏輯
- **被 Adapter Layer 調用**：通過 Input Ports 接收命令和事件
- **調用 Adapter Layer**：通過 Output Ports 發送命令、更新 UI、觸發效果

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 玩家打牌流程編排 (Priority: P1)

前端開發者需要實作玩家打出手牌的完整流程編排，包括配對檢查、多重配對選擇和命令發送協調。

**Why this priority**: 這是遊戲的核心操作流程，沒有此功能玩家無法進行遊戲。所有遊戲互動都從打牌開始。

**Independent Test**: 可以通過 Mock Domain Layer 和 Output Ports 來獨立測試打牌流程的編排邏輯，驗證是否正確觸發選擇 UI 或發送命令。

**Acceptance Scenarios**:

1. **Given** 玩家手牌可與場上單一卡片配對，**When** 調用 PlayHandCardUseCase，**Then** 調用 Domain Layer 驗證配對並直接發送 `TurnPlayHandCard` 命令到後端
2. **Given** 玩家手牌可與場上多張卡片配對，**When** 調用 PlayHandCardUseCase，**Then** 調用 Domain Layer 找出可配對目標並觸發選擇 UI，高亮所有可選目標
3. **Given** 玩家選擇了配對目標，**When** 調用 SelectMatchTargetUseCase，**Then** 驗證選擇合法性並發送 `TurnSelectTarget` 命令
4. **Given** 玩家需要做 Koi-Koi 決策，**When** 調用 MakeKoiKoiDecisionUseCase，**Then** 計算當前分數並發送 `RoundMakeDecision` 命令

---

### User Story 2 - SSE 遊戲事件處理 (Priority: P1)

前端需要處理後端推送的所有遊戲事件，包括遊戲初始化、回合更新、役種形成、分數結算等，並協調 UI 狀態更新和動畫觸發。

**Why this priority**: 這是前後端通訊的核心機制，沒有此功能前端無法接收和反映遊戲狀態變化，玩家將無法看到遊戲進行。

**Independent Test**: 可以通過 Mock SSE 事件流和 Output Ports 來獨立測試每種事件的處理邏輯，驗證 UI 狀態更新和動畫觸發是否正確。

**Acceptance Scenarios**:

1. **Given** 收到 `GameStarted` 事件，**When** 調用 HandleGameStartedUseCase，**Then** 初始化遊戲上下文並顯示「遊戲開始」訊息
2. **Given** 收到 `RoundDealt` 事件，**When** 調用 HandleRoundDealtUseCase，**Then** 觸發發牌動畫並更新場牌、手牌、牌堆狀態
3. **Given** 收到 `TurnCompleted` 事件，**When** 調用 HandleTurnCompletedUseCase，**Then** 觸發卡片移動動畫並更新遊戲狀態
4. **Given** 收到 `SelectionRequired` 事件，**When** 調用 HandleSelectionRequiredUseCase，**Then** 顯示選擇配對 UI 並高亮可選目標
5. **Given** 收到 `DecisionRequired` 事件，**When** 調用 HandleDecisionRequiredUseCase，**Then** 計算當前役種與分數並顯示決策 Modal
6. **Given** 收到 `RoundScored` 事件，**When** 調用 HandleRoundScoredUseCase，**Then** 驗證分數計算並觸發分數動畫和結算畫面
7. **Given** 收到 `GameFinished` 事件，**When** 調用 HandleGameFinishedUseCase，**Then** 顯示遊戲結束畫面並提供重新開始選項

---

### User Story 3 - 錯誤處理與重連機制 (Priority: P2)

前端需要處理各種錯誤情況（操作錯誤、網路錯誤、狀態不一致），並在斷線時自動重連並恢復遊戲狀態。

**Why this priority**: 這是用戶體驗的關鍵，確保玩家在遇到錯誤時能得到清晰反饋並恢復遊戲，但不影響核心遊戲流程的實作。

**Independent Test**: 可以通過模擬各種錯誤情況（Mock 錯誤事件、網路中斷）來獨立測試錯誤處理邏輯和重連機制。

**Acceptance Scenarios**:

1. **Given** 收到 `TurnError` 事件（INVALID_CARD 錯誤），**When** 調用 HandleTurnErrorUseCase，**Then** 顯示友善錯誤訊息「該卡片不在您的手牌中」
2. **Given** SSE 連線中斷，**When** 偵測到連線錯誤，**Then** 顯示「連線中斷，正在重連」訊息並使用指數退避策略重連（1s → 2s → 4s → 8s）
3. **Given** 重連成功後收到 `GameSnapshotRestore` 事件，**When** 調用 HandleReconnectionUseCase，**Then** 恢復完整遊戲狀態並顯示「連線已恢復」訊息
4. **Given** 偵測到客戶端與伺服器狀態不一致，**When** 驗證 FlowStage 不匹配，**Then** 觸發快照恢復流程並記錄錯誤日誌

---

### Edge Cases

- **空輸入情況**：手牌為空、場牌為空時如何處理？
- **無配對情況**：手牌與場牌月份完全不同時的處理流程？
- **多事件並發**：同時收到多個 SSE 事件時的處理順序？
- **快照恢復失敗**：重連後無法獲取完整快照數據時的降級策略？
- **重連逾時**：使用指數退避策略後仍無法連線時的處理（最大重試時間 30s）？
- **動畫進行中收到新事件**：卡片移動動畫尚未完成時收到新的回合更新事件？

## Requirements *(mandatory)*

### Functional Requirements

#### 玩家操作流程需求

- **FR-001**: 系統必須處理玩家打出手牌的完整流程，包括調用 Domain Layer 驗證卡片存在性、檢查配對邏輯，並根據配對結果觸發選擇 UI 或發送命令
- **FR-002**: 系統必須在手牌可與場上多張卡片配對時，調用 Domain Layer 找出所有可配對目標，並通過 TriggerUIEffectPort 顯示選擇 UI 並高亮所有可選目標
- **FR-003**: 系統必須處理玩家選擇配對目標的流程，調用 Domain Layer 驗證選擇是否在可選目標列表中，並通過 SendCommandPort 發送 `TurnSelectTarget` 命令
- **FR-004**: 系統必須處理 Koi-Koi 決策流程，調用 Domain Layer 計算當前役種與得分，並通過 TriggerUIEffectPort 顯示決策 Modal（包含當前分數和決策選項）
- **FR-005**: 系統必須在發送任何命令前調用 Domain Layer 進行預驗證（如檢查卡片是否在手牌中、目標是否合法），提供即時 UI 反饋

#### SSE 事件處理需求

- **FR-006**: 系統必須處理 `GameStarted` 事件，解析玩家資訊與規則集，通過 UpdateUIStatePort 初始化遊戲上下文，並顯示「遊戲開始」訊息
- **FR-007**: 系統必須處理 `RoundDealt` 事件，通過 TriggerUIEffectPort 觸發發牌動畫，並通過 UpdateUIStatePort 更新場牌、手牌、牌堆剩餘數量和 FlowStage
- **FR-008**: 系統必須處理 `TurnCompleted` 事件（無中斷、無役種形成），解析手牌操作與翻牌操作，觸發卡片移動動畫，並更新場牌、手牌、獲得區狀態
- **FR-009**: 系統必須處理 `SelectionRequired` 事件（翻牌雙重配對），解析已完成的手牌操作，觸發手牌移動動畫，並顯示選擇配對 UI 並高亮可選目標
- **FR-010**: 系統必須處理 `TurnProgressAfterSelection` 事件，解析選擇後的翻牌操作，觸發卡片移動動畫，並在有新役種形成時調用 Domain Layer 驗證並觸發役種特效
- **FR-011**: 系統必須處理 `DecisionRequired` 事件（形成役種，需決策），解析本回合操作，觸發動畫，調用 Domain Layer 計算當前役種與得分，並顯示 Koi-Koi 決策 Modal
- **FR-012**: 系統必須處理 `DecisionMade` 事件（僅在選擇 `KOI_KOI` 時），通過 UpdateUIStatePort 更新玩家 Koi-Koi 倍率，並顯示「繼續遊戲」訊息
- **FR-013**: 系統必須處理 `RoundScored` 事件（局結束計分），解析勝者、役種列表、倍率、最終得分，調用 Domain Layer 驗證分數計算，並觸發分數動畫和顯示局結算畫面
- **FR-014**: 系統必須處理 `RoundDrawn` 事件（平局），顯示「本局平局」訊息並更新當前分數（無變化）
- **FR-015**: 系統必須處理 `RoundEndedInstantly` 事件（Teshi 或場牌流局），解析結束原因並顯示特殊結束訊息，若為 Teshi 則顯示勝者與獲得分數
- **FR-016**: 系統必須處理 `GameFinished` 事件（遊戲結束），解析最終分數與勝者，顯示遊戲結束畫面並提供「重新開始」與「返回首頁」選項
- **FR-017**: 系統必須處理 `TurnError` 事件（操作錯誤），解析錯誤代碼與訊息，調用 Domain Layer 提供友善的錯誤說明，並顯示錯誤提示
- **FR-018**: 系統必須處理 `GameSnapshotRestore` 事件（斷線重連），解析快照數據，恢復遊戲上下文、牌面狀態、流程控制，並根據 current_flow_stage 渲染對應 UI

#### 錯誤處理需求

- **FR-019**: 系統必須處理 5 種操作錯誤類型（`INVALID_CARD`、`INVALID_TARGET`、`WRONG_PLAYER`、`INVALID_STATE`、`INVALID_SELECTION`），並為每種錯誤提供友善的錯誤說明
- **FR-020**: 系統必須處理網路錯誤（SSE 連線中斷、API 請求超時、伺服器錯誤），偵測錯誤類型並顯示對應錯誤提示（如「連線中斷，正在嘗試重連...」）
- **FR-021**: 系統必須偵測狀態不一致（如 FlowStage 與伺服器不匹配），記錄錯誤日誌並觸發快照恢復流程
- **FR-022**: 系統必須使用指數退避策略進行重連（1s → 2s → 4s → 8s → 16s，最大延遲 30s），並在重連成功後觸發快照恢復

### Key Entities

#### Use Cases（18 個）

**玩家操作 Use Cases（3 個）**:
- **PlayHandCardUseCase**: 處理玩家打出手牌的完整流程（驗證 → 檢查配對 → 觸發選擇或發送命令）
- **SelectMatchTargetUseCase**: 處理玩家選擇配對目標（驗證選擇 → 發送命令）
- **MakeKoiKoiDecisionUseCase**: 處理 Koi-Koi 決策（計算分數 → 發送命令）

**SSE 事件處理 Use Cases（15 個）**:
- **HandleGameStartedUseCase**: 處理遊戲開始事件
- **HandleRoundDealtUseCase**: 處理發牌事件
- **HandleTurnCompletedUseCase**: 處理回合完成事件（無中斷）
- **HandleSelectionRequiredUseCase**: 處理選擇需求事件（翻牌雙重配對）
- **HandleTurnProgressAfterSelectionUseCase**: 處理選擇後回合進展事件
- **HandleDecisionRequiredUseCase**: 處理決策需求事件（役種形成）
- **HandleDecisionMadeUseCase**: 處理決策完成事件（選擇 Koi-Koi）
- **HandleRoundScoredUseCase**: 處理局結算事件
- **HandleRoundDrawnUseCase**: 處理平局事件
- **HandleRoundEndedInstantlyUseCase**: 處理特殊結束事件（Teshi/流局）
- **HandleGameFinishedUseCase**: 處理遊戲結束事件
- **HandleTurnErrorUseCase**: 處理操作錯誤事件
- **HandleReconnectionUseCase**: 處理斷線重連快照恢復

#### Port 介面（3 組）

**Input Ports（18 個）** - 由 Adapter Layer 呼叫：
- 玩家操作 Ports（3 個）：PlayHandCardPort、SelectMatchTargetPort、MakeKoiKoiDecisionPort
- 事件處理 Ports（15 個）：對應 15 個事件處理 Use Cases

**Output Ports（3 個介面）** - 由 Application Layer 呼叫，Adapter Layer 實作：
- **SendCommandPort**: 發送命令到後端（playHandCard、selectTarget、makeDecision）
- **UpdateUIStatePort**: 更新 UI 狀態（setFlowStage、updateFieldCards、updateHandCards、updateDepositoryCards、updateScores、updateDeckRemaining、updateKoiKoiMultiplier）
- **TriggerUIEffectPort**: 觸發 UI 效果（showSelectionUI、showDecisionModal、showErrorMessage、showReconnectionMessage、triggerAnimation）

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 所有 Use Cases 的單元測試覆蓋率達到 80% 以上（業務編排邏輯 > 90%、錯誤處理邏輯 > 85%）
- **SC-002**: 15 種 SSE 事件都能在 100ms 內完成處理並觸發對應的 UI 更新
- **SC-003**: 玩家操作流程（從點擊卡片到觸發 UI 反饋）的響應時間在 50ms 以內
- **SC-004**: 網路斷線後能在 2 秒內偵測到並開始重連流程，重連成功後能在 500ms 內恢復完整遊戲狀態
- **SC-005**: 所有錯誤情況（操作錯誤、網路錯誤、狀態不一致）都有對應的處理邏輯和使用者友善的錯誤提示
- **SC-006**: Use Cases 的業務編排邏輯完全獨立於框架，可以在不同的前端環境中重複使用（透過 Mock 測試驗證）
- **SC-007**: 90% 的 Use Cases 測試案例能通過 Mock 依賴獨立測試，無需啟動完整的前端環境

## Dependencies *(mandatory)*

### Internal Dependencies

- **User Interface BC - Domain Layer**:
  - 依賴卡片配對驗證邏輯（findMatchableCards、canMatch）
  - 依賴役種進度計算（calculateYakuProgress）
  - 依賴基本驗證功能（validateCardExists、validateTargetInList）

- **Shared Protocol Definitions**:
  - 依賴 protocol.md 定義的所有事件類型（GameStartedEvent、RoundDealtEvent 等）
  - 依賴 FlowState 定義（AWAITING_HAND_PLAY、AWAITING_SELECTION、AWAITING_DECISION）
  - 依賴命令格式定義（TurnPlayHandCard、TurnSelectTarget、RoundMakeDecision）

- **Shared Data Contracts**:
  - 依賴 YakuScore、Card 等數據結構定義

### External Dependencies (Adapter Layer)

Application Layer **不直接依賴**任何外部框架或技術，所有外部依賴通過 Output Ports 抽象：

- **Adapter Layer 實作 Output Ports**:
  - SendCommandPort: REST API 客戶端實作
  - UpdateUIStatePort: Pinia Store 或 Vue Reactive State 實作
  - TriggerUIEffectPort: Vue 組件方法實作

## Assumptions *(mandatory)*

基於文檔分析，做出以下合理假設：

1. **AnimationType 定義**: Application Layer 定義抽象的動畫類型枚舉（`DEAL_CARDS`、`CARD_MOVE`、`YAKU_EFFECT`、`SCORE_UPDATE`），具體的動畫參數（AnimationParams）由 Adapter Layer 根據 UI 框架實作決定

2. **FlowStage 與 FlowState 對應**: Application Layer 使用的 `FlowStage` 與 protocol.md 定義的 `FlowState` 是同一概念，使用相同的值（`AWAITING_HAND_PLAY`、`AWAITING_SELECTION`、`AWAITING_DECISION`）

3. **潛在分數預測功能**: `MakeKoiKoiDecisionUseCase` 的潛在分數預測功能作為 optional feature，MVP 階段先實作基本的決策流程（顯示當前役種和分數），預測邏輯可在 Domain Layer 補充後再整合

4. **快照數據完整性**: 根據 protocol.md 的 `GameSnapshotRestore` 定義，快照包含所有必要的遊戲狀態數據（game_id、player_scores、field_cards、hand_cards、depositories、current_flow_stage、active_player_id、ruleset），足以完整恢復遊戲狀態

5. **錯誤處理優先級**: 當多種錯誤同時發生時，處理優先級為：網路錯誤（最高，觸發重連）> 狀態不一致（觸發快照恢復）> 操作錯誤（顯示友善提示）

## Non-Goals *(optional)*

以下功能不在本 Application Layer 的範圍內：

- **Domain 業務邏輯實作**: 卡片配對、役種檢測等邏輯由 Domain Layer 負責，Application Layer 僅調用
- **UI 實作細節**: 動畫實作、組件渲染、狀態管理工具（Pinia）等由 Adapter Layer 負責
- **後端通訊實作**: REST API 客戶端、SSE 連線管理由 Adapter Layer 負責
- **離線遊戲引擎**: 完整的單機遊戲邏輯由 Local Game BC 負責
- **用戶認證與授權**: MVP 階段不涉及用戶系統
- **多人對戰匹配**: MVP 階段僅支援玩家與 AI 對手對戰

## Testing Strategy *(optional)*

### 測試框架與工具

- **測試框架**: Vitest
- **斷言庫**: expect (Vitest 內建)
- **Mock 工具**: vi.fn()、vi.mock()
- **覆蓋率報告**: c8 / istanbul

### 測試重點

1. **Use Case 業務編排邏輯**（覆蓋率目標 > 90%）:
   - 驗證 Use Case 調用 Domain Layer 和 Output Ports 的順序正確
   - 驗證條件分支邏輯（如多重配對時觸發選擇 UI）
   - 驗證錯誤處理流程（如預驗證失敗時的處理）

2. **SSE 事件處理完整性**（覆蓋率目標 > 85%）:
   - 驗證 15 種事件都能正確處理
   - 驗證事件處理後的 UI 狀態更新正確
   - 驗證動畫觸發時機正確

3. **錯誤處理健全性**（覆蓋率目標 > 85%）:
   - 驗證操作錯誤、網路錯誤、狀態不一致都有對應處理
   - 驗證重連邏輯的指數退避策略
   - 驗證快照恢復流程

### 測試範例

```typescript
describe('PlayHandCardUseCase', () => {
  it('應該在有多張可配對場牌時觸發選擇 UI', () => {
    // Arrange
    const mockDomain = {
      findMatchableCards: vi.fn().mockReturnValue(['0343', '0344'])
    }
    const mockTriggerUIEffect = {
      showSelectionUI: vi.fn()
    }
    const useCase = new PlayHandCardUseCase(mockDomain, mockTriggerUIEffect)

    // Act
    const result = useCase.execute({
      cardId: '0341',
      handCards: ['0341', '0342'],
      fieldCards: ['0343', '0344']
    })

    // Assert
    expect(result.needSelection).toBe(true)
    expect(result.possibleTargets).toEqual(['0343', '0344'])
    expect(mockTriggerUIEffect.showSelectionUI).toHaveBeenCalledWith(['0343', '0344'])
  })

  it('應該在單一配對時直接發送命令', () => {
    // Arrange
    const mockDomain = {
      findMatchableCards: vi.fn().mockReturnValue(['0343'])
    }
    const mockSendCommand = {
      playHandCard: vi.fn()
    }
    const useCase = new PlayHandCardUseCase(mockDomain, mockSendCommand)

    // Act
    const result = useCase.execute({
      cardId: '0341',
      handCards: ['0341'],
      fieldCards: ['0343']
    })

    // Assert
    expect(result.needSelection).toBe(false)
    expect(mockSendCommand.playHandCard).toHaveBeenCalledWith('0341', '0343')
  })
})
```

### 邊界情況測試清單

- ✅ 空輸入（空手牌、空場牌、空獲得區）
- ✅ 無配對情況（手牌與場牌月份不同）
- ✅ 多重配對情況（場上有 2-3 張同月份牌）
- ✅ 快照恢復時的狀態同步
- ✅ 網路錯誤重連邏輯（指數退避驗證）
- ✅ 同時收到多個事件的處理順序
- ✅ 動畫進行中收到新事件的處理
