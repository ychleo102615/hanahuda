# Tasks: 遊戲大廳與操作面板

**Input**: Design documents from `/specs/007-lobby-settings-panel/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Tests**: 此功能需要測試覆蓋率 > 70%，包含單元測試與組件測試

**Organization**: 任務根據用戶故事組織，每個故事可獨立實作與測試

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可平行執行（不同檔案，無依賴）
- **[Story]**: 所屬用戶故事（US1, US2, US3, US4）
- 包含完整檔案路徑

## Path Conventions

專案結構：`front-end/src/` 為主要程式碼目錄，`front-end/tests/` 為測試目錄

---

## Phase 1: Setup（共用基礎設施）

**Purpose**: 專案初始化與基本結構準備

- [X] T001 確認 Vue Router 配置檔案存在於 front-end/src/router/index.ts
- [X] T002 [P] 確認 Pinia stores 目錄結構於 front-end/src/user-interface/adapter/stores/
- [X] T003 [P] 確認 DI Container 配置檔案於 front-end/src/user-interface/adapter/di/container.ts

---

## Phase 2: Foundational（阻塞性前置條件）

**Purpose**: 所有用戶故事依賴的核心基礎設施

**⚠️ CRITICAL**: 所有用戶故事必須等此階段完成後才能開始

### Application Layer - Ports 定義

- [X] T004 [P] 定義 MatchmakingStatePort 於 front-end/src/user-interface/application/ports/output/matchmaking-state.port.ts
- [X] T005 [P] 定義 NavigationPort 於 front-end/src/user-interface/application/ports/output/navigation.port.ts
- [X] T006 [P] 更新 Output Ports 匯出於 front-end/src/user-interface/application/ports/output/index.ts
- [X] T007 新增 GameErrorEvent 介面於 front-end/src/user-interface/application/types/events.ts
- [X] T008 定義 HandleGameErrorPort 於 front-end/src/user-interface/application/ports/input/event-handlers.port.ts

### Application Layer - Use Cases

- [X] T009 實作 HandleGameErrorUseCase 於 front-end/src/user-interface/application/use-cases/event-handlers/HandleGameErrorUseCase.ts
- [X] T010 修改 HandleGameStartedUseCase 新增 matchmakingStatePort 依賴於 front-end/src/user-interface/application/use-cases/event-handlers/HandleGameStartedUseCase.ts
- [X] T011 修改 HandleReconnectionUseCase 新增 matchmakingStatePort 依賴於 front-end/src/user-interface/application/use-cases/event-handlers/HandleReconnectionUseCase.ts

### Adapter Layer - Stores

- [X] T012 建立 matchmakingState.ts Pinia Store 於 front-end/src/user-interface/adapter/stores/matchmakingState.ts

### Adapter Layer - Router Guards

- [X] T013 [P] 建立 lobbyPageGuard 於 front-end/src/user-interface/adapter/router/guards.ts
- [X] T014 [P] 修改 gamePageGuard 重定向目標改為 lobby 於 front-end/src/user-interface/adapter/router/guards.ts
- [X] T015 更新路由配置新增 /lobby 路由於 front-end/src/router/index.ts

### Adapter Layer - API Client

- [X] T016 新增 leaveGame() 方法於 front-end/src/user-interface/adapter/api/GameApiClient.ts

### Adapter Layer - DI Container

- [X] T017 註冊 MatchmakingStatePort 實作於 front-end/src/user-interface/adapter/di/registry.ts
- [X] T018 註冊 NavigationPort 實作於 front-end/src/user-interface/adapter/di/registry.ts
- [X] T019 註冊 HandleGameErrorUseCase 於 front-end/src/user-interface/adapter/di/registry.ts
- [X] T020 更新 EventRouter 註冊 GameError 事件處理器於 front-end/src/user-interface/adapter/di/registry.ts

**Checkpoint**: 基礎設施就緒 - 用戶故事實作可平行開始

---

## Phase 3: User Story 1 - 進入遊戲大廳並開始配對 (Priority: P1) 🎯 MVP

**Goal**: 使用者從首頁進入大廳，點擊「Find Match」開始配對，收到 GameStarted 事件後進入遊戲

**Independent Test**: 從首頁點擊「Start Game」→ 驗證大廳畫面顯示 → 點擊「Find Match」→ 驗證配對狀態提示 → 模擬收到 GameStarted 事件 → 驗證成功進入遊戲畫面

### Tests for User Story 1

> **NOTE: 先寫測試，確保測試失敗後再實作**

- [X] T021 [P] [US1] 單元測試 matchmakingState.ts store 於 front-end/tests/adapter/stores/matchmakingState.spec.ts
- [X] T022 [P] [US1] 單元測試 HandleGameErrorUseCase 於 front-end/tests/application/use-cases/HandleGameErrorUseCase.spec.ts
- [X] T023 [P] [US1] 組件測試 GameLobby.vue 於 front-end/tests/views/GameLobby.spec.ts

### Implementation for User Story 1

- [X] T024 [US1] 建立 GameLobby.vue 頁面於 front-end/src/views/GameLobby.vue
- [X] T025 [US1] 實作大廳三種狀態 UI（idle、finding、error）於 GameLobby.vue
- [X] T026 [US1] 實作「Find Match」按鈕點擊處理於 GameLobby.vue
- [X] T027 [US1] 實作 UX 倒數計時器（30秒）於 GameLobby.vue
- [X] T028 [US1] 實作配對錯誤重試按鈕於 GameLobby.vue
- [X] T029 [US1] 修改 HomePage.vue 將「Start Game」導航目標改為 /lobby

**Checkpoint**: 此時 User Story 1 應完全可獨立運作並測試

---

## Phase 4: User Story 2 - 在大廳使用操作面板返回首頁 (Priority: P2)

**Goal**: 使用者在大廳可點擊選單按鈕，開啟操作面板，點擊「Back to Home」返回首頁

**Independent Test**: 進入大廳 → 點擊選單按鈕 → 驗證面板從右側滑出 → 點擊「Back to Home」→ 驗證成功返回首頁

### Tests for User Story 2

- [ ] T030 [P] [US2] 組件測試 ActionPanel.vue (lobby context) 於 front-end/tests/components/ActionPanel.spec.ts

### Implementation for User Story 2

- [ ] T031 [P] [US2] 建立 ActionPanel.vue 可重用組件於 front-end/src/components/ActionPanel.vue
- [ ] T032 [US2] 實作選單按鈕與開關邏輯於 ActionPanel.vue
- [ ] T033 [US2] 實作面板滑出動畫（@vueuse/motion）於 ActionPanel.vue
- [ ] T034 [US2] 實作遮罩與點擊外部關閉功能於 ActionPanel.vue
- [ ] T035 [US2] 實作大廳 context 的「Back to Home」選項於 ActionPanel.vue
- [ ] T036 [US2] 整合 ActionPanel 至 GameLobby.vue

**Checkpoint**: User Story 1 與 2 應都能獨立運作

---

## Phase 5: User Story 3 - 在遊戲中使用操作面板退出遊戲 (Priority: P2)

**Goal**: 使用者在遊戲中可開啟操作面板，點擊「Leave Game」經確認後退出遊戲返回首頁

**Independent Test**: 在遊戲畫面點擊選單按鈕 → 驗證面板內容包含「Leave Game」→ 點擊後驗證確認對話框 → 確認後驗證成功退出

### Tests for User Story 3

- [ ] T037 [P] [US3] 組件測試 ActionPanel.vue (game context) 於 front-end/tests/components/ActionPanel.spec.ts
- [ ] T038 [P] [US3] 單元測試 GameApiClient.leaveGame() 方法於 front-end/tests/unit/GameApiClient.spec.ts
- [ ] T039 [P] [US3] 整合測試完整退出遊戲流程（API 呼叫 + 狀態清除 + 導航）於 front-end/tests/integration/leaveGame.spec.ts

### Implementation for User Story 3

- [ ] T040 [US3] 實作遊戲 context 的「Leave Game」選項於 ActionPanel.vue
- [ ] T041 [US3] 實作「Leave Game」確認對話框於 ActionPanel.vue
- [ ] T042 [US3] 實作確認退出邏輯（調用 leaveGame API、清除狀態、中斷 SSE）於 ActionPanel.vue
- [ ] T043 [US3] 整合 ActionPanel 至 GamePage.vue

**Checkpoint**: 所有用戶故事應都能獨立運作

---

## Phase 6: User Story 4 - 斷線重連直接回到遊戲 (Priority: P3)

**Goal**: 使用者在遊戲中斷線並重連成功後，直接恢復到遊戲畫面而不經過大廳

**Independent Test**: 透過模擬斷線情境測試 - 在遊戲中觸發斷線 → 驗證重連後直接回到遊戲畫面而非大廳

### Tests for User Story 4

- [ ] T044 [P] [US4] 單元測試 lobbyPageGuard 重連邏輯於 front-end/tests/unit/lobbyPageGuard.spec.ts
- [ ] T045 [P] [US4] 整合測試完整重連流程

### Implementation for User Story 4

- [ ] T046 [US4] 驗證 lobbyPageGuard 檢查 gameState.gameId 邏輯是否正確實作
- [ ] T047 [US4] 驗證 HandleReconnectionUseCase 清除 matchmakingState 邏輯是否正確實作
- [ ] T048 [US4] 測試斷線重連時跳過大廳的完整流程

**Checkpoint**: 所有用戶故事應都能獨立且正確運作

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: 影響多個用戶故事的改進與優化

- [ ] T049 [P] 更新 protocol.md 新增 GameError 事件規格於 doc/shared/protocol.md
- [ ] T050 [P] 程式碼清理與重構（移除 TODO 註解、優化命名）
- [ ] T051 [P] 新增缺失的單元測試（目標覆蓋率 > 70%）
- [ ] T052 [P] 樣式優化與響應式設計調整
- [ ] T053 [P] 可訪問性改進（鍵盤導航、ARIA 標籤）
- [ ] T054 執行 quickstart.md 驗證（手動測試完整流程）
- [ ] T055 效能優化（動畫流暢度、記憶體洩漏檢查）
- [ ] T056 [P] 錯誤訊息國際化準備（i18n keys）

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 無依賴 - 可立即開始
- **Foundational (Phase 2)**: 依賴 Setup 完成 - 阻塞所有用戶故事
- **User Stories (Phase 3-6)**: 所有依賴 Foundational 完成
  - 用戶故事可平行進行（若有多人）
  - 或依優先級順序執行（P1 → P2 → P3）
- **Polish (Phase 7)**: 依賴所有期望的用戶故事完成

### User Story Dependencies

- **User Story 1 (P1)**: Foundational 完成後可開始 - 無其他故事依賴
- **User Story 2 (P2)**: Foundational 完成後可開始 - 需 ActionPanel 組件（可於 US2 階段建立）
- **User Story 3 (P2)**: 依賴 US2（需 ActionPanel 組件） - 可擴充 ActionPanel 功能
- **User Story 4 (P3)**: 依賴 Foundational（路由守衛與 Use Cases 已實作） - 主要為驗證測試

### Within Each User Story

- 測試必須先寫並確保失敗
- Application Layer（Ports、Use Cases）優先於 Adapter Layer
- Stores 與 Guards 優先於 Components
- Components 優先於整合
- 故事完成後再進入下一優先級

### Parallel Opportunities

- Phase 1 所有任務可平行
- Phase 2 標記 [P] 的任務可平行
- Foundational 完成後，所有用戶故事可平行開始（若團隊容量允許）
- 每個用戶故事內的測試（標記 [P]）可平行
- 不同用戶故事可由不同團隊成員平行處理

---

## Parallel Example: User Story 1

```bash
# 同時啟動 User Story 1 的所有測試：
Task: "單元測試 matchmakingState.ts store 於 front-end/tests/unit/matchmakingState.spec.ts"
Task: "單元測試 HandleGameErrorUseCase 於 front-end/tests/unit/HandleGameErrorUseCase.spec.ts"
Task: "組件測試 GameLobby.vue 於 front-end/tests/components/GameLobby.spec.ts"
```

---

## Parallel Example: Foundational Phase

```bash
# 同時啟動 Foundational 的 Port 定義任務：
Task: "定義 MatchmakingStatePort 於 front-end/src/user-interface/application/ports/output/matchmaking-state.port.ts"
Task: "定義 NavigationPort 於 front-end/src/user-interface/application/ports/output/navigation.port.ts"
Task: "更新 Output Ports 匯出於 front-end/src/user-interface/application/ports/output/index.ts"
Task: "新增 GameErrorEvent 介面於 front-end/src/user-interface/application/types/events.ts"

# 同時啟動 Router Guards 任務：
Task: "建立 lobbyPageGuard 於 front-end/src/user-interface/adapter/router/guards/lobbyPageGuard.ts"
Task: "修改 gamePageGuard 重定向目標改為 lobby 於 front-end/src/user-interface/adapter/router/guards/gamePageGuard.ts"
```

---

## Implementation Strategy

### MVP First (僅 User Story 1)

1. 完成 Phase 1: Setup
2. 完成 Phase 2: Foundational（關鍵 - 阻塞所有故事）
3. 完成 Phase 3: User Story 1
4. **停止並驗證**: 獨立測試 User Story 1
5. 若準備就緒可部署/展示

### Incremental Delivery（漸進交付）

1. 完成 Setup + Foundational → 基礎就緒
2. 新增 User Story 1 → 獨立測試 → 部署/展示（MVP！）
3. 新增 User Story 2 → 獨立測試 → 部署/展示
4. 新增 User Story 3 → 獨立測試 → 部署/展示
5. 新增 User Story 4 → 獨立測試 → 部署/展示
6. 每個故事增加價值且不破壞先前故事

### Parallel Team Strategy（平行團隊策略）

多位開發者時：

1. 團隊共同完成 Setup + Foundational
2. Foundational 完成後：
   - 開發者 A: User Story 1（大廳基本功能）
   - 開發者 B: User Story 2（操作面板 - 大廳）
   - 開發者 C: ActionPanel 組件基礎（支援 B）
3. US1 與 US2 完成後：
   - 開發者 A: User Story 4（重連邏輯）
   - 開發者 B: User Story 3（操作面板 - 遊戲）
4. 故事獨立完成並整合

---

## Summary

### Total Tasks: 56

- **Phase 1 (Setup)**: 3 tasks
- **Phase 2 (Foundational)**: 17 tasks（關鍵阻塞階段）
- **Phase 3 (US1 - MVP)**: 9 tasks（3 tests + 6 implementation）
- **Phase 4 (US2)**: 7 tasks（1 test + 6 implementation）
- **Phase 5 (US3)**: 7 tasks（3 tests + 4 implementation）
- **Phase 6 (US4)**: 5 tasks（2 tests + 3 implementation）
- **Phase 7 (Polish)**: 8 tasks

### Parallel Opportunities Identified

- **Phase 2**: 6 parallel opportunities（Ports 定義、Guards、API Client）
- **User Story 1**: 3 tests 可平行
- **User Story 2**: 1 test + 1 組件建立可平行
- **User Story 3**: 3 tests 可平行（新增 GameLeave 測試）
- **User Story 4**: 2 tests 可平行
- **Polish**: 6 tasks 可平行

### Independent Test Criteria

- **US1**: 可從首頁完整走過配對流程至遊戲開始
- **US2**: 可在大廳開啟面板並返回首頁
- **US3**: 可在遊戲中開啟面板並退出遊戲
- **US4**: 可模擬斷線並驗證重連跳過大廳

### Suggested MVP Scope

**建議 MVP**: User Story 1 only

- 提供完整的大廳配對流程
- 展示 Clean Architecture 實作
- 展示 SSE 事件驅動架構
- 總任務數: Phase 1 (3) + Phase 2 (17) + Phase 3 (9) = **29 tasks**
- 預估工時: 約 6-8 小時（依據 quickstart.md）

**擴充至完整功能**: US1 + US2 + US3 + US4 = 所有 56 tasks

---

## Format Validation ✅

所有任務嚴格遵循 checklist 格式：

- ✅ 每個任務以 `- [ ]` 開頭（markdown checkbox）
- ✅ 每個任務包含 Task ID（T001-T056）
- ✅ 適當標記 [P]（可平行執行）
- ✅ User Story 階段任務標記 [Story]（US1-US4）
- ✅ 所有任務包含完整檔案路徑
- ✅ 描述清晰具體，LLM 可直接執行

---

## Notes

- [P] 任務 = 不同檔案，無依賴關係
- [Story] 標籤將任務對應到特定用戶故事，便於追蹤
- 每個用戶故事應可獨立完成與測試
- 實作前驗證測試失敗
- 每個任務或邏輯組完成後提交
- 可於任何 checkpoint 停止以獨立驗證故事
- 避免：模糊任務、相同檔案衝突、破壞獨立性的跨故事依賴

---

## Reference Documents

- `specs/007-lobby-settings-panel/spec.md` - 功能規格
- `specs/007-lobby-settings-panel/plan.md` - 實作計畫
- `specs/007-lobby-settings-panel/data-model.md` - 數據模型
- `specs/007-lobby-settings-panel/research.md` - 技術研究
- `specs/007-lobby-settings-panel/quickstart.md` - 快速入門指南
- `specs/007-lobby-settings-panel/contracts/game-error-event.md` - GameError 事件規格
- `doc/readme.md` - Clean Architecture 指南
- `doc/shared/protocol.md` - 通訊協議
