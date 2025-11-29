# Tasks: 事件時間倒數功能

**Input**: Design documents from `/specs/006-event-countdown-timer/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Tests**: 本功能包含測試任務（依據 TDD 原則）

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- Frontend: `front-end/src/user-interface/`
- Tests: `front-end/tests/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 更新事件型別定義與倒數計時基礎設施

- [X] T001 更新事件型別定義，新增 timeout 欄位至 front-end/src/user-interface/application/types/events.ts
- [X] T002 建立 UIStateStore 擴展，新增 timeout 狀態與 actions 至 front-end/src/user-interface/adapter/stores/uiState.ts
- [X] T003 [P] 實作 useCountdown composable (可選) 於 front-end/src/user-interface/adapter/composables/useCountdown.ts - SKIPPED (UIStateStore 已直接實作)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 核心事件處理整合，所有 User Stories 依賴此階段完成

**⚠️ CRITICAL**: 此階段必須完成後才能實作任何 User Story

- [X] T004 更新 HandleRoundDealtUseCase 處理 action_timeout_seconds 於 front-end/src/user-interface/application/use-cases/event-handlers/HandleRoundDealtUseCase.ts
- [X] T005 [P] 更新 HandleSelectionRequiredUseCase 處理 action_timeout_seconds 於 front-end/src/user-interface/application/use-cases/event-handlers/HandleSelectionRequiredUseCase.ts
- [X] T006 [P] 更新 HandleTurnProgressAfterSelectionUseCase 處理 action_timeout_seconds 於 front-end/src/user-interface/application/use-cases/event-handlers/HandleTurnProgressAfterSelectionUseCase.ts
- [X] T007 [P] 更新 HandleDecisionRequiredUseCase 處理 action_timeout_seconds 於 front-end/src/user-interface/application/use-cases/event-handlers/HandleDecisionRequiredUseCase.ts
- [X] T008 [P] 更新 HandleRoundScoredUseCase 處理 display_timeout_seconds 於 front-end/src/user-interface/application/use-cases/event-handlers/HandleRoundScoredUseCase.ts
- [X] T009 [P] 更新 HandleRoundEndedInstantlyUseCase 處理 display_timeout_seconds 於 front-end/src/user-interface/application/use-cases/event-handlers/HandleRoundEndedInstantlyUseCase.ts
- [X] T010 [P] 更新 HandleRoundDrawnUseCase 處理 display_timeout_seconds 於 front-end/src/user-interface/application/use-cases/event-handlers/HandleRoundDrawnUseCase.ts
- [X] T011 [P] 更新 HandleGameSnapshotRestoreUseCase 處理 action_timeout_seconds 於 front-end/src/user-interface/application/use-cases/event-handlers/HandleReconnectionUseCase.ts

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - 玩家回合倒數顯示 (Priority: P1) 🎯 MVP

**Goal**: 玩家在自己的回合時能看到剩餘操作時間的倒數顯示

**Independent Test**: 模擬玩家回合狀態 (AWAITING_HAND_PLAY)，驗證頂部資訊列顯示倒數計時並持續遞減

### Tests for User Story 1 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T012 [P] [US1] 撰寫 UIStateStore 倒數狀態測試於 front-end/tests/adapter/stores/uiState.spec.ts
- [X] T013 [P] [US1] 撰寫 useCountdown composable 測試 (若使用) 於 front-end/tests/adapter/composables/useCountdown.spec.ts - SKIPPED (無 useCountdown composable)
- [ ] T014 [P] [US1] 撰寫 TopInfoBar 倒數顯示測試於 front-end/tests/views/TopInfoBar.spec.ts - DEFERRED (UI 層整合測試可後續補充)

### Implementation for User Story 1

- [X] T015 [US1] 修改 TopInfoBar.vue 顯示操作倒數於 front-end/src/views/GamePage/components/TopInfoBar.vue
- [X] T016 [US1] 實作低於 5 秒警示色邏輯 (text-red-500) 於 front-end/src/views/GamePage/components/TopInfoBar.vue
- [ ] T017 [US1] 手動測試驗證：模擬玩家回合，確認倒數每秒遞減，新事件觸發時正確重置 - 需要後端整合

**Checkpoint**: 玩家回合倒數顯示應完全正常運作並可獨立測試

---

## Phase 4: User Story 2 - Koi-Koi 決策倒數顯示 (Priority: P1)

**Goal**: 當玩家形成役種需要決定 Koi-Koi 時，顯示決策的剩餘時間

**Independent Test**: 模擬 DecisionRequired 事件，驗證決策面板顯示倒數計時

### Tests for User Story 2 ⚠️

- [ ] T018 [US2] 撰寫 DecisionModal 倒數顯示測試於 front-end/tests/views/DecisionModal.spec.ts

### Implementation for User Story 2

- [ ] T019 [US2] 修改 DecisionModal.vue 顯示決策倒數於 front-end/src/views/GamePage/components/DecisionModal.vue
- [ ] T020 [US2] 實作低於 5 秒警示色邏輯於 DecisionModal.vue
- [ ] T021 [US2] 自動化測試驗證：確認玩家做出決策後 stopActionCountdown() 被正確調用

**Checkpoint**: Koi-Koi 決策倒數應完全正常運作並可獨立測試

---

## Phase 5: User Story 3 - 回合結束面板倒數顯示 (Priority: P2)

**Goal**: 回合結束時顯示自動進入下一回合的倒數時間，玩家不可提前跳過

**Independent Test**: 模擬 RoundScored/RoundEndedInstantly/RoundDrawn 事件，驗證面板顯示倒數並自動關閉

### Tests for User Story 3 ⚠️

- [ ] T022 [P] [US3] 撰寫 RoundEndPanel 倒數顯示測試於 front-end/tests/views/RoundEndPanel.spec.ts
- [ ] T023 [P] [US3] 撰寫面板自動關閉與互動限制測試於 front-end/tests/views/RoundEndPanel.spec.ts

### Implementation for User Story 3

- [ ] T024 [US3] 建立 RoundEndPanel.vue 組件於 front-end/src/views/GamePage/components/RoundEndPanel.vue
- [ ] T025 [US3] 實作倒數顯示與自動關閉邏輯 (displayTimeoutRemaining === 0)
- [ ] T026 [US3] 實作互動限制 (攔截 ESC、背景點擊、無關閉按鈕)
- [ ] T027 [US3] 整合 RoundEndPanel 至 GamePage.vue
- [ ] T028 [US3] 整合測試驗證：模擬 RoundScored/RoundEndedInstantly/RoundDrawn 三種事件，確認面板正確顯示與自動關閉

**Checkpoint**: 回合結束面板倒數應完全正常運作並可獨立測試

---

## Phase 6: User Story 4 - 對手回合狀態顯示 (Priority: P3)

**Goal**: 當對手正在操作時，玩家可以看到對手剩餘的思考時間

**Independent Test**: 模擬對手回合狀態，驗證頂部資訊列顯示對手倒數

### Tests for User Story 4 ⚠️

- [ ] T029 [US4] 撰寫對手回合倒數顯示測試於 front-end/tests/views/TopInfoBar.spec.ts

### Implementation for User Story 4

- [ ] T030 [US4] 擴展 TopInfoBar.vue 支援對手回合倒數顯示於 front-end/src/views/GamePage/components/TopInfoBar.vue
- [ ] T031 [US4] 手動測試驗證：模擬對手回合切換為玩家回合，確認倒數顯示正確更新或消失

**Checkpoint**: 對手回合倒數應完全正常運作並可獨立測試

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: 跨 User Stories 的改善與文檔更新

- [ ] T032 [P] 更新 protocol.md 協議文檔於 doc/shared/protocol.md
- [ ] T033 [P] 執行完整整合測試 (quickstart.md 場景)
- [ ] T034 [P] 執行型別檢查 (npm run type-check)
- [ ] T035 [P] 執行單元測試覆蓋率檢查 (npm run test:unit -- --coverage)
- [ ] T036 Code review 與重構（若需要）
- [ ] T037 驗證所有 User Stories 可獨立運作且不互相影響

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 無依賴 - 可立即開始
- **Foundational (Phase 2)**: 依賴 Phase 1 完成 - BLOCKS 所有 User Stories
- **User Stories (Phase 3-6)**: 所有依賴 Phase 2 完成
  - User Stories 之間無依賴，可並行實作
  - 或依優先順序序列執行 (P1 → P1 → P2 → P3)
- **Polish (Phase 7)**: 依賴所有需要的 User Stories 完成

### User Story Dependencies

- **User Story 1 (P1)**: 可在 Phase 2 後開始 - 無其他 User Story 依賴
- **User Story 2 (P1)**: 可在 Phase 2 後開始 - 無其他 User Story 依賴
- **User Story 3 (P2)**: 可在 Phase 2 後開始 - 無其他 User Story 依賴
- **User Story 4 (P3)**: 可在 Phase 2 後開始 - 無其他 User Story 依賴

### Within Each User Story

- 測試優先 (TDD)：測試必須先寫並確認 FAIL
- 實作邏輯：組件修改 → 視覺回饋 → 行為驗證
- 每個 User Story 完成後才進入下一個

### Parallel Opportunities

- Phase 1: T003 可與 T001-T002 並行
- Phase 2: T005-T011 可並行 (不同 Use Case 檔案)
- User Story 1 Tests: T012-T014 可並行
- User Story 3 Tests: T022-T023 可並行
- Phase 7: T032-T035 可並行
- 不同 User Stories 可由不同開發者並行實作

---

## Parallel Example: Phase 2 (Foundational)

```bash
# Launch all event handler updates together:
Task: "更新 HandleSelectionRequiredUseCase"
Task: "更新 HandleTurnProgressAfterSelectionUseCase"
Task: "更新 HandleDecisionRequiredUseCase"
Task: "更新 HandleRoundScoredUseCase"
Task: "更新 HandleRoundEndedInstantlyUseCase"
Task: "更新 HandleRoundDrawnUseCase"
Task: "更新 HandleGameSnapshotRestoreUseCase"
```

---

## Implementation Strategy

### MVP First (User Stories 1 & 2 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. Complete Phase 4: User Story 2
5. **STOP and VALIDATE**: Test User Stories 1 & 2 independently
6. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo (MVP complete!)
4. Add User Story 3 → Test independently → Deploy/Demo
5. Add User Story 4 → Test independently → Deploy/Demo
6. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (P1)
   - Developer B: User Story 2 (P1)
   - Developer C: User Story 3 (P2)
   - Developer D: User Story 4 (P3)
3. Stories complete and integrate independently

---

## Notes

- [P] tasks = 不同檔案，無依賴關係
- [Story] label 將任務對應到特定 User Story
- 每個 User Story 應可獨立完成與測試
- 測試優先：先寫測試並確認 FAIL 再實作
- 每個任務或邏輯組完成後應 commit
- 可在任何 Checkpoint 停止並獨立驗證 User Story
- 避免：模糊任務、同檔案衝突、破壞獨立性的跨 Story 依賴

---

## Task Count Summary

- **Total Tasks**: 37
- **Setup (Phase 1)**: 3 tasks
- **Foundational (Phase 2)**: 8 tasks
- **User Story 1 (P1)**: 6 tasks (3 tests + 3 implementation)
- **User Story 2 (P1)**: 4 tasks (1 test + 3 implementation)
- **User Story 3 (P2)**: 7 tasks (2 tests + 5 implementation)
- **User Story 4 (P3)**: 3 tasks (1 test + 2 implementation)
- **Polish (Phase 7)**: 6 tasks

**Parallel Opportunities Identified**: 17 tasks marked [P]

**MVP Scope** (建議)：Phase 1 + Phase 2 + User Story 1 + User Story 2 (21 tasks)
