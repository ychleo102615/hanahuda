# Tasks: User Interface BC - Adapter Layer

**Feature Branch**: `004-ui-adapter-layer`
**Input**: Design documents from `/specs/004-ui-adapter-layer/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Organization**: Tasks are organized by user story to enable independent implementation and testing of each story.

**Tests**: Test tasks are included as this feature has specific test coverage requirements (Adapter Layer >70%, Stores >80%, API Client >85%, SSE Client >75%).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and foundational structure

- [X] T001 Create adapter directory structure in front-end/src/user-interface/adapter/
- [X] T002 [P] Create DI container tokens file in front-end/src/user-interface/adapter/di/tokens.ts
- [X] T003 [P] Create error type definitions in front-end/src/user-interface/adapter/api/errors.ts
- [X] T004 [P] Create animation types in front-end/src/user-interface/adapter/animation/types.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### DI Container (Foundational)

- [X] T005 Implement DIContainer class in front-end/src/user-interface/adapter/di/container.ts
- [X] T006 [P] Write unit tests for DIContainer in front-end/tests/adapter/di/container.spec.ts
- [X] T007 Create DependencyRegistry in front-end/src/user-interface/adapter/di/registry.ts

### Pinia Stores (Foundational)

- [X] T008 [P] Implement GameStateStore in front-end/src/user-interface/adapter/stores/gameState.ts
- [X] T009 [P] Implement UIStateStore in front-end/src/user-interface/adapter/stores/uiState.ts
- [X] T010 [P] Write unit tests for GameStateStore in front-end/tests/adapter/stores/gameState.spec.ts
- [X] T011 [P] Write unit tests for UIStateStore in front-end/tests/adapter/stores/uiState.spec.ts

### Output Port Adapters (Foundational)

- [X] T012 [P] Create UIStatePortAdapter in front-end/src/user-interface/adapter/stores/gameState.ts
- [X] T013 [P] Create TriggerUIEffectPortAdapter in front-end/src/user-interface/adapter/stores/uiState.ts

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - 玩家啟動遊戲並加入對局 (Priority: P1) 🎯 MVP

**Goal**: 玩家點擊「開始遊戲」按鈕後,系統建立與後端的連線,接收遊戲初始化事件,並在螢幕上顯示遊戲介面。玩家可以看到自己的手牌、場牌與對手資訊。

**Independent Test**: 可獨立測試,只需實作 API 客戶端(加入遊戲)、SSE 客戶端(接收 GameStarted 與 RoundDealt 事件)、基礎 Pinia Stores 與遊戲頁面組件。測試者可驗證「點擊開始遊戲 → 看到發牌動畫 → 顯示手牌與場牌」。

### Tests for User Story 1 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T014 [P] [US1] Contract test for joinGame API in front-end/tests/adapter/api/GameApiClient.spec.ts
- [X] T015 [P] [US1] Contract test for GameStarted SSE event in front-end/tests/adapter/sse/EventRouter.spec.ts
- [X] T016 [P] [US1] Contract test for RoundDealt SSE event in front-end/tests/adapter/sse/EventRouter.spec.ts

### Implementation for User Story 1

#### REST API Client

- [X] T017 [P] [US1] Implement GameApiClient class in front-end/src/user-interface/adapter/api/GameApiClient.ts
- [X] T018 [P] [US1] Implement joinGame method with retry logic in front-end/src/user-interface/adapter/api/GameApiClient.ts
- [X] T019 [P] [US1] Implement error handling and timeout in front-end/src/user-interface/adapter/api/GameApiClient.ts
- [X] T020 [US1] Write unit tests for GameApiClient in front-end/tests/adapter/api/GameApiClient.spec.ts

#### SSE Client

- [X] T021 [P] [US1] Implement GameEventClient class in front-end/src/user-interface/adapter/sse/GameEventClient.ts
- [X] T022 [P] [US1] Implement EventRouter class in front-end/src/user-interface/adapter/sse/EventRouter.ts
- [X] T023 [US1] Implement SSE connection management and event listeners in GameEventClient
- [X] T024 [US1] Write unit tests for GameEventClient in front-end/tests/adapter/sse/GameEventClient.spec.ts
- [X] T025 [US1] Write unit tests for EventRouter in front-end/tests/adapter/sse/EventRouter.spec.ts

#### Router Integration

- [X] T026 [US1] Implement gamePageGuard in front-end/src/user-interface/adapter/router/guards.ts
- [X] T027 [US1] Integrate gamePageGuard with Vue Router in front-end/src/router/index.ts

#### DI Container Registration

- [X] T028 [US1] Register GameApiClient in DI Container in front-end/src/user-interface/adapter/di/registry.ts
- [X] T029 [US1] Register GameEventClient in DI Container in front-end/src/user-interface/adapter/di/registry.ts
- [X] T030 [US1] Register event handlers for GameStarted and RoundDealt in EventRouter
- [X] T031 [US1] Initialize DI Container in front-end/src/main.ts

#### Vue Components - Basic Structure

- [X] T032 [P] [US1] Create GamePage.vue container in front-end/src/views/GamePage.vue
- [X] T033 [P] [US1] Create TopInfoBar component in front-end/src/views/GamePage/components/TopInfoBar.vue
- [X] T034 [P] [US1] Create FieldZone component in front-end/src/views/GamePage/components/FieldZone.vue
- [X] T035 [P] [US1] Create PlayerHandZone component in front-end/src/views/GamePage/components/PlayerHandZone.vue
- [X] T036 [P] [US1] Create CardComponent in front-end/src/views/GamePage/components/CardComponent.vue
- [X] T037 [US1] Integrate components in GamePage.vue layout

#### Basic Animation (P1 MVP)

- [X] T038 [P] [US1] Implement AnimationQueue class in front-end/src/user-interface/adapter/animation/AnimationQueue.ts
- [X] T039 [P] [US1] Implement AnimationService class in front-end/src/user-interface/adapter/animation/AnimationService.ts
- [X] T040 [US1] Implement DEAL_CARDS animation using Vue Transition in AnimationService
- [X] T041 [US1] Write unit tests for AnimationQueue in front-end/tests/adapter/animation/AnimationQueue.spec.ts
- [X] T042 [US1] Write unit tests for AnimationService in front-end/tests/adapter/animation/AnimationService.spec.ts

**Checkpoint**: At this point, User Story 1 should be fully functional - player can join game and see initial deal

---

## Phase 4: User Story 2 - 玩家打出手牌並處理配對邏輯 (Priority: P1)

**Goal**: 玩家在自己的回合點擊一張手牌,系統高亮場上可配對的牌(同月份)。若有多張可配對,顯示選擇介面讓玩家選擇目標;若只有一張或無配對,直接發送打牌命令。命令發送後,玩家等待後端事件確認,UI 顯示卡片飛行動畫並更新牌面狀態。

**Independent Test**: 可獨立測試,需實作玩家手牌區組件、場牌區組件、選擇配對介面、打牌命令 API、SSE 事件處理(TurnCompleted、SelectionRequired、TurnProgressAfterSelection)、卡片移動動畫。測試者可驗證「點擊手牌 → 看到高亮 → 選擇配對 → 看到動畫 → 牌面更新」。

### Tests for User Story 2 ⚠️

- [X] T043 [P] [US2] Contract test for playHandCard API in front-end/tests/adapter/api/GameApiClient.spec.ts
- [X] T044 [P] [US2] Contract test for selectTarget API in front-end/tests/adapter/api/GameApiClient.spec.ts
- [X] T045 [P] [US2] Contract test for TurnCompleted event in front-end/tests/adapter/sse/EventRouter.spec.ts
- [X] T046 [P] [US2] Contract test for SelectionRequired event in front-end/tests/adapter/sse/EventRouter.spec.ts

### Implementation for User Story 2

#### API Commands

- [X] T047 [P] [US2] Implement playHandCard method in front-end/src/user-interface/adapter/api/GameApiClient.ts
- [X] T048 [P] [US2] Implement selectTarget method in front-end/src/user-interface/adapter/api/GameApiClient.ts
- [X] T049 [US2] Add unit tests for playHandCard and selectTarget in front-end/tests/adapter/api/GameApiClient.spec.ts

#### SSE Event Handlers

- [X] T050 [US2] Register TurnCompleted event handler in EventRouter
- [X] T051 [US2] Register SelectionRequired event handler in EventRouter
- [X] T052 [US2] Register TurnProgressAfterSelection event handler in EventRouter
- [X] T053 [US2] Write tests for event routing in front-end/tests/adapter/sse/EventRouter.spec.ts

#### Vue Components - Interaction

- [X] T054 [P] [US2] Add click handlers to PlayerHandZone for card selection
- [X] T055 [P] [US2] Create SelectionOverlay component in front-end/src/views/GamePage/components/SelectionOverlay.vue
- [X] T056 [P] [US2] Implement card highlighting in FieldZone component
- [X] T057 [US2] Integrate SelectionOverlay with UIStateStore
- [X] T058 [US2] Inject PlayHandCardPort into PlayerHandZone component
- [X] T059 [US2] Inject SelectMatchTargetPort into SelectionOverlay component

#### Animation - Card Movement

- [X] T060 [US2] Implement CARD_MOVE animation in AnimationService (使用 @vueuse/motion)
- [X] T061 [US2] Add CSS transitions for card movement in CardComponent (使用 @vueuse/motion)
- [X] T062 [US2] Write tests for CARD_MOVE animation in front-end/tests/adapter/animation/AnimationService.spec.ts

**Checkpoint**: At this point, User Story 2 should work independently - player can play cards and see matching

---

## Phase 5: User Story 3 - 玩家做出 Koi-Koi 決策 (Priority: P1)

**Goal**: 當玩家獲得牌後形成役種時,系統顯示決策 Modal,展示當前役種名稱、得分、以及繼續遊戲的潛在分數。玩家可選擇「繼續遊戲」或「結束本局」。選擇後,系統發送決策命令並接收確認事件。

**Independent Test**: 可獨立測試,需實作決策 Modal 組件、makeDecision API、DecisionRequired 與 DecisionMade 事件處理、役種顯示邏輯。測試者可驗證「形成役種 → 看到決策 Modal → 選擇繼續/結束 → 接收確認」。

### Tests for User Story 3 ⚠️

- [ ] T063 [P] [US3] Contract test for makeDecision API in front-end/tests/adapter/api/GameApiClient.spec.ts
- [ ] T064 [P] [US3] Contract test for DecisionRequired event in front-end/tests/adapter/sse/EventRouter.spec.ts
- [ ] T065 [P] [US3] Contract test for DecisionMade event in front-end/tests/adapter/sse/EventRouter.spec.ts

### Implementation for User Story 3

#### API Command

- [ ] T066 [US3] Implement makeDecision method in front-end/src/user-interface/adapter/api/GameApiClient.ts
- [ ] T067 [US3] Add unit tests for makeDecision in front-end/tests/adapter/api/GameApiClient.spec.ts

#### SSE Event Handlers

- [ ] T068 [US3] Register DecisionRequired event handler in EventRouter
- [ ] T069 [US3] Register DecisionMade event handler in EventRouter
- [ ] T070 [US3] Register YakuFormed event handler in EventRouter
- [ ] T071 [US3] Write tests for decision event routing in front-end/tests/adapter/sse/EventRouter.spec.ts

#### Vue Components - Decision UI

- [ ] T072 [US3] Create DecisionModal component in front-end/src/views/GamePage/components/DecisionModal.vue
- [ ] T073 [US3] Integrate DecisionModal with UIStateStore.decisionModalVisible
- [ ] T074 [US3] Inject MakeKoiKoiDecisionPort into DecisionModal component
- [ ] T075 [US3] Display current yaku information in DecisionModal
- [ ] T076 [US3] Add decision buttons (KOI_KOI / END_ROUND) in DecisionModal

**Checkpoint**: At this point, User Story 3 should work independently - player can make koi-koi decisions

---

## Phase 6: User Story 4 - 系統接收 SSE 事件並即時更新 UI (Priority: P1)

**Goal**: 系統建立 SSE 連線後,持續監聽後端推送的遊戲事件(共 13 種)。每個事件對應特定的 UI 更新邏輯:更新牌面狀態、觸發動畫、顯示提示訊息、變更流程階段等。所有更新需在接收事件後 1 秒內完成,確保流暢的遊戲體驗。

**Independent Test**: 可獨立測試,需實作 SSE 客戶端、事件路由邏輯、13 個事件處理 Use Cases、Pinia Stores 狀態更新。可使用 Mock SSE 伺服器發送測試事件,驗證「事件發送 → Use Case 觸發 → UI 更新」。

### Tests for User Story 4 ⚠️

- [ ] T077 [P] [US4] Contract test for RoundScored event in front-end/tests/adapter/sse/EventRouter.spec.ts
- [ ] T078 [P] [US4] Contract test for GameFinished event in front-end/tests/adapter/sse/EventRouter.spec.ts
- [ ] T079 [P] [US4] Contract test for TurnError event in front-end/tests/adapter/sse/EventRouter.spec.ts
- [ ] T080 [P] [US4] Integration test for complete event flow in front-end/tests/adapter/sse/integration.spec.ts

### Implementation for User Story 4

#### Remaining SSE Event Handlers

- [ ] T081 [P] [US4] Register RoundScored event handler in EventRouter
- [ ] T082 [P] [US4] Register RoundEndedInstantly event handler in EventRouter
- [ ] T083 [P] [US4] Register RoundDrawn event handler in EventRouter
- [ ] T084 [P] [US4] Register GameFinished event handler in EventRouter
- [ ] T085 [P] [US4] Register TurnError event handler in EventRouter
- [ ] T086 [P] [US4] Register GameSnapshotRestore event handler in EventRouter
- [ ] T087 [US4] Write comprehensive event routing tests in front-end/tests/adapter/sse/EventRouter.spec.ts

#### Error Handling UI

- [ ] T088 [P] [US4] Create ErrorToast component in front-end/src/views/GamePage/components/ErrorToast.vue
- [ ] T089 [P] [US4] Create GameFinishedModal component in front-end/src/views/GamePage/components/GameFinishedModal.vue
- [ ] T090 [US4] Integrate ErrorToast with UIStateStore.errorMessage
- [ ] T091 [US4] Integrate GameFinishedModal with UIStateStore.gameFinishedData

#### Additional Components

- [ ] T092 [P] [US4] Create OpponentDepositoryZone component in front-end/src/views/GamePage/components/OpponentDepositoryZone.vue
- [ ] T093 [P] [US4] Create PlayerDepositoryZone component in front-end/src/views/GamePage/components/PlayerDepositoryZone.vue
- [ ] T094 [US4] Update TopInfoBar to show scores and current player
- [ ] T095 [US4] Add component tests for error handling in front-end/tests/adapter/components/

**Checkpoint**: At this point, all 13 SSE events should be handled correctly with UI updates

---

## Phase 7: User Story 5 - 系統處理網路中斷與自動重連 (Priority: P2)

**Goal**: 當 SSE 連線意外中斷時(例如網路不穩定),系統自動偵測斷線並嘗試重連。重連使用指數退避策略(1s、2s、4s、8s、16s),最大等待 30 秒。重連成功後,系統自動恢復遊戲狀態,玩家可繼續遊戲。

**Independent Test**: 可獨立測試,需實作 SSE 重連邏輯、指數退避算法、快照恢復 Use Case、連線狀態 UI。可模擬斷線場景(關閉 SSE 伺服器),驗證「偵測斷線 → 顯示重連中 → 嘗試重連 → 恢復狀態」。

### Tests for User Story 5 ⚠️

- [ ] T096 [P] [US5] Unit test for reconnection logic in front-end/tests/adapter/sse/GameEventClient.spec.ts
- [ ] T097 [P] [US5] Unit test for exponential backoff in front-end/tests/adapter/sse/GameEventClient.spec.ts
- [ ] T098 [P] [US5] Contract test for snapshot restoration in front-end/tests/adapter/stores/gameState.spec.ts

### Implementation for User Story 5

#### Reconnection Logic

- [ ] T099 [US5] Implement reconnection mechanism in GameEventClient
- [ ] T100 [US5] Implement exponential backoff strategy in GameEventClient
- [ ] T101 [US5] Implement onConnectionLost callback in GameEventClient
- [ ] T102 [US5] Implement onConnectionEstablished callback in GameEventClient
- [ ] T103 [US5] Implement onConnectionFailed callback in GameEventClient
- [ ] T104 [US5] Write comprehensive reconnection tests in front-end/tests/adapter/sse/GameEventClient.spec.ts

#### Snapshot Restoration

- [ ] T105 [US5] Implement restoreGameState in GameStateStore
- [ ] T106 [US5] Implement interrupt() method in AnimationQueue
- [ ] T107 [US5] Integrate snapshot restoration with joinGame API
- [ ] T108 [US5] Write tests for snapshot restoration in front-end/tests/adapter/stores/gameState.spec.ts

#### Connection Status UI

- [ ] T109 [P] [US5] Create ReconnectionBanner component in front-end/src/views/GamePage/components/ReconnectionBanner.vue
- [ ] T110 [US5] Integrate ReconnectionBanner with UIStateStore.reconnecting
- [ ] T111 [US5] Update connectionStatus in UIStateStore during reconnection
- [ ] T112 [US5] Add component tests for ReconnectionBanner in front-end/tests/adapter/components/

**Checkpoint**: At this point, reconnection should work reliably with proper UI feedback

---

## Phase 8: Mock 模式實作 (Priority: P3) ✅ **提前完成**

**Purpose**: Development and testing infrastructure for frontend-only work

- [X] T113 [P] Implement MockApiClient in front-end/src/user-interface/adapter/mock/MockApiClient.ts
- [X] T114 [P] Implement MockEventEmitter in front-end/src/user-interface/adapter/mock/MockEventEmitter.ts
- [X] T115 Create mockEventScript with full game scenario in front-end/src/user-interface/adapter/mock/mockEventScript.ts
- [X] T116 Register Mock adapters in DI registry for 'mock' mode
- [X] T117 Update gamePageGuard to support mock mode initialization
- [ ] T118 [P] Write unit tests for MockApiClient in front-end/tests/adapter/mock/MockApiClient.spec.ts
- [ ] T119 [P] Write unit tests for MockEventEmitter in front-end/tests/adapter/mock/MockEventEmitter.spec.ts

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

### Code Quality

- [ ] T120 [P] Add JSDoc comments to all public APIs in adapter/
- [ ] T121 [P] Run ESLint and fix all warnings in adapter/
- [ ] T122 [P] Add TypeScript strict mode checks for adapter layer
- [ ] T123 Run test coverage report and ensure >70% for adapter layer

### Integration & Validation

- [ ] T124 Perform end-to-end test with real backend (if available)
- [ ] T125 Validate all contract specifications are met in contracts/
- [ ] T126 Run quickstart.md validation steps
- [ ] T127 Update CLAUDE.md with any new architectural decisions

### Performance Optimization

- [ ] T128 [P] Profile animation performance using Chrome DevTools
- [ ] T129 [P] Optimize SSE event parsing performance
- [ ] T130 Verify API response times meet <500ms P95 requirement
- [ ] T131 Check bundle size and ensure no unexpected dependencies

### Documentation

- [ ] T132 [P] Update README with adapter layer architecture
- [ ] T133 [P] Document environment variables in .env.example
- [ ] T134 [P] Create troubleshooting guide in quickstart.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies - can start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 completion - BLOCKS all user stories
- **Phase 3-7 (User Stories)**: All depend on Phase 2 completion
  - US1 (Phase 3): Can start after Phase 2 - No dependencies on other stories
  - US2 (Phase 4): Depends on US1 (needs basic components and API client)
  - US3 (Phase 5): Depends on US1 (needs basic SSE infrastructure)
  - US4 (Phase 6): Depends on US1-3 (completes event handling)
  - US5 (Phase 7): Depends on US1 and US4 (needs SSE client and all event handlers)
- **Phase 8 (Mock)**: Can be done in parallel with US2-5 once US1 is complete
- **Phase 9 (Polish)**: Depends on all desired user stories being complete

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- API client methods before SSE event handlers
- DI registration after component implementation
- Animation service after basic components
- Each story should be independently testable after completion

### Parallel Opportunities

- Phase 1: All tasks (T001-T004) can run in parallel
- Phase 2: T008-T011 (stores and tests) can run in parallel after T005-T007
- US1: T014-T016 (tests), T032-T036 (components), T038-T039 (animation classes) can run in parallel
- US2: T043-T046 (tests), T047-T048 (API methods), T054-T056 (components) can run in parallel
- US3: T063-T065 (tests) can run in parallel
- US4: T077-T079 (tests), T081-T086 (event handlers), T088-T089, T092-T093 (components) can run in parallel
- US5: T096-T098 (tests), T109 (component) can run in parallel
- Phase 8: T113-T114, T118-T119 can run in parallel
- Phase 9: T120-T122, T128-T129, T132-T134 can run in parallel

---

## Parallel Example: User Story 1

```bash
# Launch all tests for US1 together:
Task: "Contract test for joinGame API in front-end/tests/adapter/api/GameApiClient.spec.ts"
Task: "Contract test for GameStarted SSE event in front-end/tests/adapter/sse/EventRouter.spec.ts"
Task: "Contract test for RoundDealt SSE event in front-end/tests/adapter/sse/EventRouter.spec.ts"

# Launch all basic components for US1 together:
Task: "Create TopInfoBar component in front-end/src/views/GamePage/components/TopInfoBar.vue"
Task: "Create FieldZone component in front-end/src/views/GamePage/components/FieldZone.vue"
Task: "Create PlayerHandZone component in front-end/src/views/GamePage/components/PlayerHandZone.vue"
Task: "Create CardComponent in front-end/src/views/GamePage/components/CardComponent.vue"
```

---

## Implementation Strategy

### MVP First (US1-US3 Only)

1. Complete Phase 1: Setup (~1 hour)
2. Complete Phase 2: Foundational (~8 hours) - CRITICAL, blocks everything
3. Complete Phase 3: User Story 1 (~16 hours)
4. **STOP and VALIDATE**: Test US1 independently
5. Complete Phase 4: User Story 2 (~12 hours)
6. Complete Phase 5: User Story 3 (~8 hours)
7. **STOP and VALIDATE**: Full game loop works (join → play → decide)

### Incremental Delivery

1. Setup + Foundational → Foundation ready (~9 hours)
2. Add US1 → Test independently → Basic game visible (MVP milestone 1!)
3. Add US2 → Test independently → Can play cards (MVP milestone 2!)
4. Add US3 → Test independently → Complete game loop (MVP milestone 3!)
5. Add US4 → Test independently → All events handled (Complete MVP!)
6. Add US5 → Test independently → Resilient to network issues (Polish)
7. Add Mock mode → Development efficiency (Developer experience)

### Parallel Team Strategy

With multiple developers after Phase 2 completes:

1. **Team completes Setup + Foundational together** (~9 hours)
2. **Once Foundational is done**:
   - Developer A: US1 - Game initialization (~16 hours)
   - Developer B: US2 - Card playing (waits for US1 basics, then ~12 hours)
   - Developer C: US3 - Decision making (waits for US1 basics, then ~8 hours)
3. **After US1-3 complete**:
   - Developer A: US5 - Reconnection (~10 hours)
   - Developer B: US4 - Remaining events (~10 hours)
   - Developer C: Mock mode (~6 hours)
4. **Polish together** (~8 hours)

### Test Coverage Targets

- **Adapter Layer Overall**: >70%
- **Pinia Stores (gameState.ts, uiState.ts)**: >80%
- **API Client (GameApiClient.ts)**: >85%
- **SSE Client (GameEventClient.ts)**: >75%
- **Vue Components**: >60%
- **DI Container**: >90%

---

## Notes

- [P] tasks = different files, no dependencies, can run in parallel
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- **ALWAYS write tests FIRST** - verify they fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Follow TDD cycle: Red (failing test) → Green (minimal implementation) → Refactor
- Use contract specifications in contracts/ directory as implementation guide
- All TypeScript code must use strict mode and have proper type annotations
- Follow Clean Architecture principles - Adapter Layer must not contain business logic
