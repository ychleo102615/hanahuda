# Feature Specification: UI Animation Refactor

**Feature Branch**: `005-ui-animation-refactor`
**Created**: 2025-11-21
**Status**: Draft
**Input**: 重構 front-end ui 動畫功能：牌堆視圖、獲得區分組、發牌動畫、拖曳配對、配對成功動畫

## Clarifications

### Session 2025-11-21

- Q: 獲得區中四種卡片類型的排列順序為何？ → A: 光牌 → 種牌 → 短冊 → かす（按點數由高到低）
- Q: 牌堆組件應放在遊戲畫面的哪個位置？ → A: 場牌區旁邊（中央區域左側或右側）
- Q: 配對成功時，兩張牌應如何移動到獲得區？ → A: 合併後移動：兩張牌先在場中合併，再一起移動；拖曳時手牌從拖曳放開位置開始動畫
- Q: 拖曳手牌時，卡片應有什麼視覺效果？ → A: 半透明 + 輕微放大（opacity 0.8, scale 1.1）

## User Scenarios & Testing

### User Story 1 - 獲得區牌種分組顯示 (Priority: P1)

玩家希望在已獲得牌區看到卡片按類型分組（光牌、種牌、短冊、かす），以便快速評估役種進度和策略。

**Why this priority**: 這是最基礎的 UI 改進，不依賴動畫系統，可獨立實現並立即提升遊戲體驗。玩家需要清楚了解自己收集的牌組成，這直接影響 Koi-Koi 決策。

**Independent Test**: 可透過觀察獲得區顯示來測試，無需任何動畫功能即可驗證分組邏輯和視覺呈現。

**Acceptance Scenarios**:

1. **Given** 玩家已獲得包含不同類型的卡片, **When** 查看獲得區, **Then** 卡片應按光牌、種牌、短冊、かす四組分開顯示
2. **Given** 某類型卡片數量為零, **When** 查看獲得區, **Then** 該類型區域應顯示空白或佔位符，保持佈局一致性
3. **Given** 玩家獲得新卡片, **When** 卡片加入獲得區, **Then** 卡片應出現在對應類型分組中
4. **Given** 對手已獲得卡片, **When** 查看對手獲得區, **Then** 對手卡片同樣按類型分組顯示

---

### User Story 2 - Output Ports 重構 (Priority: P2)

系統需要重構 Application Layer 的 Output Ports，將 TriggerUIEffectPort 拆分為 AnimationPort 和 NotificationPort，實現更清晰的職責分離。

**Why this priority**: 這是所有動畫功能的架構基礎。AnimationPort 提供可 await 的動畫 API，讓 Use Case 能正確協調「先動畫後狀態更新」的流程。若不先重構 Ports，後續動畫實作會與現有架構衝突。

**Independent Test**: 可透過單元測試驗證新 Port 介面定義和 DI 註冊是否正確。

**Acceptance Scenarios**:

1. **Given** 新的 Port 介面定義完成, **When** 編譯專案, **Then** 所有 Port 介面應無型別錯誤
2. **Given** AnimationPort 實作完成, **When** Use Case 調用動畫方法, **Then** 應返回 Promise 並可被 await
3. **Given** NotificationPort 實作完成, **When** Use Case 調用通知方法, **Then** 應正確顯示 Modal/Toast
4. **Given** 原有 TriggerUIEffectPort 標記為 deprecated, **When** 編譯專案, **Then** 應顯示棄用警告但不影響功能
5. **Given** DI Container 更新完成, **When** 注入新 Ports, **Then** 所有 Use Case 應能正確獲取依賴

---

### User Story 3 - 牌堆視圖 (Priority: P3)

玩家希望看到牌堆的視覺呈現，了解剩餘牌數，並作為發牌動畫的視覺起點。

**Why this priority**: 牌堆是遊戲重要元素，目前缺少視覺呈現。此功能為發牌動畫提供基礎，但本身可獨立展示牌堆狀態。

**Independent Test**: 可透過開始新回合並觀察牌堆顯示來測試，無需完整動畫功能即可驗證。

**Acceptance Scenarios**:

1. **Given** 遊戲開始時牌堆有 24 張牌, **When** 查看遊戲畫面, **Then** 應顯示牌堆組件及剩餘牌數「24」
2. **Given** 回合進行中翻牌後, **When** 牌堆減少, **Then** 剩餘牌數應即時更新
3. **Given** 牌堆剩餘 0 張, **When** 查看牌堆, **Then** 應顯示空牌堆狀態

---

### User Story 4 - 動畫系統重構 (Priority: P4)

系統需要重構現有的 AnimationService 和 AnimationQueue，實作 AnimationPort 介面，支援實際的卡片位置追蹤和視覺動畫效果。

**Why this priority**: 現有動畫系統只有時序控制，缺乏位置追蹤和實際視覺效果。這是 P5、P6 動畫功能的基礎設施。

**Independent Test**: 可透過單元測試驗證位置追蹤和動畫參數計算是否正確。

**Acceptance Scenarios**:

1. **Given** 遊戲畫面載入完成, **When** 各區域組件掛載, **Then** 系統應自動註冊各區域（牌堆、場牌、手牌、獲得區）的位置
2. **Given** 需要播放卡片移動動畫, **When** 呼叫動畫服務, **Then** 系統應能計算卡片從起點到終點的正確螢幕座標
3. **Given** 視窗大小改變, **When** 重新計算佈局, **Then** 各區域位置應自動更新
4. **Given** 卡片移動動畫執行, **When** 動畫播放, **Then** 卡片應在螢幕上實際移動（而非只有 console.log）
5. **Given** 需要中斷動畫（如重連）, **When** 調用 interrupt(), **Then** 所有進行中動畫應立即停止，pending Promise 應 reject

---

### User Story 5 - 配對成功卡片移動動畫 (Priority: P5)

玩家希望看到配對成功的卡片從場牌/手牌區飛向獲得區的動畫，提供視覺回饋確認操作成功。

**Why this priority**: 動畫提升遊戲體驗和操作確認感，依賴 P4 動畫系統重構。

**Independent Test**: 可透過執行配對操作並觀察卡片移動動畫來測試。

**Acceptance Scenarios**:

1. **Given** 玩家手牌與場牌配對成功, **When** 配對完成, **Then** 兩張卡片應以動畫形式移動至玩家獲得區
2. **Given** 翻牌與場牌配對成功, **When** 配對完成, **Then** 兩張卡片應以動畫形式移動至對應玩家獲得區
3. **Given** 卡片正在執行移動動畫, **When** 動畫進行中, **Then** 玩家無法進行下一步操作直到動畫完成
4. **Given** 網路延遲或狀態更新, **When** 需要立即同步狀態, **Then** 動畫可被中斷，卡片直接出現在目標位置

---

### User Story 6 - 發牌動畫 (Priority: P6)

玩家希望看到從牌堆發牌至場牌和手牌的動畫，增強遊戲沉浸感。

**Why this priority**: 發牌動畫提升視覺體驗，依賴牌堆視圖（P3）和動畫系統重構（P4）。

**Independent Test**: 可透過開始新回合並觀察發牌過程來測試。

**Acceptance Scenarios**:

1. **Given** 新回合開始, **When** 收到 RoundDealt 事件, **Then** 應依序播放發牌動畫：牌堆 → 場牌（8張）、牌堆 → 手牌（8張）
2. **Given** 發牌動畫進行中, **When** 動畫未完成, **Then** 玩家無法進行任何操作
3. **Given** 發牌動畫進行中, **When** 收到中斷指令（如重連）, **Then** 動畫應立即停止，卡片直接出現在目標位置

---

### User Story 7 - 拖曳手牌配對功能 (Priority: P7)

玩家希望能夠拖曳手牌到場牌上進行配對，提供更直覺的操作方式，同時保留點擊配對選項。

**Why this priority**: 拖曳是進階交互功能，提升體驗但非必要。現有點擊配對功能已足夠完成遊戲。依賴 P4 動畫系統重構。

**Independent Test**: 可透過拖曳手牌至場牌並觀察配對結果來測試。

**Acceptance Scenarios**:

1. **Given** 玩家輪到出牌, **When** 拖曳手牌, **Then** 場上同月份的牌應高亮顯示為可配對目標
2. **Given** 玩家拖曳手牌至有效配對目標, **When** 放開手牌, **Then** 系統應執行配對操作
3. **Given** 玩家拖曳手牌至無效區域, **When** 放開手牌, **Then** 手牌應返回原位置（無任何操作）
4. **Given** 場上有多張可配對牌, **When** 拖曳手牌, **Then** 所有可配對牌都應高亮，玩家可選擇其一放置
5. **Given** 拖曳功能可用, **When** 玩家偏好點擊, **Then** 點擊配對功能仍正常運作

---

### Edge Cases

- 動畫播放中斷線重連時，如何處理？（中斷動畫，直接恢復最終狀態）
- 多個動畫同時觸發時，如何排序？（使用 AnimationQueue 依序執行）
- 拖曳過程中對手回合開始，如何處理？（取消拖曳，手牌返回原位）
- 牌堆剩餘 0 張時翻牌階段如何處理？（根據遊戲規則，應觸發回合結束）

## Requirements

### Functional Requirements

**Output Ports 重構**
- **FR-000**: 系統 MUST 將 TriggerUIEffectPort 拆分為 AnimationPort 和 NotificationPort
- **FR-000a**: AnimationPort MUST 提供返回 Promise 的動畫方法（playDealAnimation、playMatchAnimation、playToDepositoryAnimation）
- **FR-000b**: AnimationPort MUST 提供 interrupt() 方法立即停止所有動畫
- **FR-000c**: 系統 MUST 提供 Adapter 層的 ZoneRegistry 機制供組件註冊位置（不經過 AnimationPort，由組件直接調用）
- **FR-000d**: NotificationPort MUST 提供 showSelectionUI、showDecisionModal、showErrorMessage 等方法
- **FR-000e**: 原有 TriggerUIEffectPort MUST 標記為 @deprecated 並保持向後相容
- **FR-000f**: 所有 Use Case MUST 更新為注入新的 Ports

**牌堆視圖**
- **FR-001**: 系統 MUST 在場牌區旁邊（中央區域左側或右側）顯示牌堆組件
- **FR-002**: 牌堆 MUST 顯示剩餘牌數數字
- **FR-003**: 牌堆數字 MUST 在翻牌後即時更新

**獲得區分組**
- **FR-004**: 玩家獲得區 MUST 將卡片按類型分為四組，由左至右依序為：光牌(BRIGHT) → 種牌(ANIMAL) → 短冊(RIBBON) → かす(PLAIN)
- **FR-005**: 對手獲得區 MUST 同樣按四種類型分組顯示，順序與玩家獲得區一致
- **FR-006**: 每個分組 MUST 顯示該類型卡片數量
- **FR-007**: 空分組 MUST 保持佔位空間以維持佈局一致性

**動畫系統重構**
- **FR-008**: 系統 MUST 提供區域位置註冊機制，讓各區域組件（牌堆、場牌、手牌、獲得區）可註冊其螢幕位置
- **FR-009**: 系統 MUST 能根據區域名稱查詢該區域的螢幕座標
- **FR-010**: 系統 MUST 在視窗大小改變時自動更新已註冊區域的位置
- **FR-011**: 卡片移動動畫 MUST 使用實際螢幕座標（而非硬編碼值）
- **FR-012**: 動畫 MUST 使用 AnimationQueue 系統進行排程
- **FR-013**: 動畫進行中 MUST 阻止玩家操作
- **FR-014**: 動畫 MUST 支援中斷機制以處理狀態同步需求

**配對成功動畫**
- **FR-015**: 配對成功時，系統 MUST 先將兩張牌移動至場牌區合併，再一起移動至獲得區
- **FR-016**: 點擊配對時，手牌 MUST 從手牌區原位置移動至場牌區合併點
- **FR-016a**: 拖曳配對時，手牌 MUST 從拖曳放開位置移動至場牌區合併點（不回到手牌原位）
- **FR-016b**: 合併後的兩張牌 MUST 一起移動至獲得區對應的類型分組位置

**發牌動畫**
- **FR-017**: 回合開始時，系統 MUST 播放從牌堆發牌的動畫
- **FR-018**: 發牌動畫 MUST 依序發放場牌和手牌
- **FR-019**: 每張牌 MUST 從牌堆位置移動到目標位置（場牌區或手牌區）

**拖曳配對**
- **FR-020**: 手牌 MUST 支援拖曳操作
- **FR-020a**: 拖曳中的卡片 MUST 顯示半透明 + 輕微放大效果（opacity 0.8, scale 1.1）
- **FR-021**: 拖曳時系統 MUST 高亮顯示可配對的場牌
- **FR-022**: 放置於有效目標時 MUST 執行配對操作
- **FR-023**: 放置於無效區域時 MUST 將手牌返回原位
- **FR-024**: 點擊配對功能 MUST 保持可用

### Key Entities

**Output Ports（重構）**
- **AnimationPort**: 動畫系統介面，提供可 await 的動畫 API（playDealAnimation、playMatchAnimation 等）
- **NotificationPort**: 通知系統介面，管理 Modal、Toast、選擇 UI 等
- **GameStatePort**: 遊戲狀態介面（原 UIStatePort 重新命名，職責不變）

**動畫系統**
- **DeckZone**: 牌堆顯示區域，包含剩餘牌數狀態
- **DepositoryGroup**: 獲得區內的卡片分組，包含類型(CardType)和卡片列表
- **ZoneRegistry**（Adapter 層專用）: 區域位置註冊表，管理各區域的螢幕座標，由 Vue 組件直接調用，不暴露到 Application Port
- **ZonePosition**（Adapter 層專用）: 區域位置資訊，包含區域名稱和螢幕矩形座標（x, y, width, height）
- **CardAnimation**: 卡片移動動畫實例，包含卡片ID、起點區域、終點區域、動畫參數
- **DragState**（Adapter 層專用）: 拖曳狀態，包含拖曳中的卡片、當前位置、可放置目標

## Success Criteria

### Measurable Outcomes

- **SC-001**: 玩家能在 1 秒內識別獲得區中特定類型卡片的數量
- **SC-002**: 發牌動畫在 2 秒內完成全部 16 張卡片的發放
- **SC-003**: 配對成功動畫在 500ms 內完成卡片移動
- **SC-004**: 拖曳操作的響應延遲低於 16ms（60fps）
- **SC-005**: 90% 的玩家能在首次遊戲中成功使用拖曳或點擊完成配對
- **SC-006**: 動畫中斷後狀態恢復在 100ms 內完成

## Assumptions

- @vueuse/motion 庫能夠滿足所有動畫效果需求
- 卡片類型分類邏輯已在 Domain Layer 實現（CardType enum 和 getCardType 函數）
- 遊戲狀態（deckRemaining, depository）已在 GameStateStore 中維護
- 現有 AnimationQueue 基礎架構（佇列管理、中斷機制）可保留，但 AnimationService 需大幅重構

## Dependencies

- 依賴 GameStateStore 中的 myDepository、opponentDepository、deckRemaining 狀態
- 依賴 Domain Layer 的 CardType 定義和 getCardType 函數
- 依賴現有 CardComponent 組件
- 依賴 Vue 3 的 ref/reactive 響應式系統進行位置追蹤
- 依賴瀏覽器 ResizeObserver API 進行視窗大小監聯
- 需重構 Output Ports（TriggerUIEffectPort → AnimationPort + NotificationPort）

## Out of Scope

- 役種視覺化提示（如已形成役種高亮）- 未來功能
- 音效支援 - 未來功能
- 觸控手勢支援（僅限拖曳） - 未來功能
- 動畫速度用戶自訂 - 未來功能
