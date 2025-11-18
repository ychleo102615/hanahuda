# Tasks: User Interface BC - Application Layer

**Input**: Design documents from `/specs/003-ui-application-layer/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Context**: ultrathink

**Tests**: Tests are REQUIRED per spec.md Testing Strategy (覆蓋率目標 > 80%)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

專案結構：
- Source: `front-end/src/user-interface/application/`
- Tests: `front-end/src/__tests__/user-interface/application/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 專案初始化與基礎目錄結構

- [X] T001 Create Application Layer directory structure: `front-end/src/user-interface/application/{types,ports,use-cases}` and test structure: `front-end/src/__tests__/user-interface/application/{test-helpers,use-cases}`
- [X] T002 [P] Configure TypeScript for Application Layer in `front-end/tsconfig.json` (strict mode, no framework dependencies)
- [X] T003 [P] Verify Vitest configuration for Application Layer tests in `front-end/vitest.config.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 核心型別與介面定義 - 所有 User Stories 的依賴基礎

**⚠️ CRITICAL**: 此階段必須完成後才能開始任何 User Story 實作

### Protocol Type Definitions

- [X] T004 [P] Define FlowState enum and type in `front-end/src/user-interface/application/types/flow-state.ts`
- [X] T005 [P] Define Result type for synchronous operations in `front-end/src/user-interface/application/types/result.ts`
- [X] T006 [P] Define ErrorCode type and ERROR_MESSAGES mapping in `front-end/src/user-interface/application/types/errors.ts`
- [X] T007 Define shared data structures (PlayerInfo, PlayerHand, PlayerDepository, PlayerScore, etc.) in `front-end/src/user-interface/application/types/shared.ts`
- [X] T008 Define command types (TurnPlayHandCard, TurnSelectTarget, RoundMakeDecision) in `front-end/src/user-interface/application/types/commands.ts`
- [X] T009 Define 13 SSE event types (GameStartedEvent through GameSnapshotRestore) in `front-end/src/user-interface/application/types/events.ts`
- [X] T010 [P] Define DomainFacade interface wrapping Domain Layer functions in `front-end/src/user-interface/application/types/domain-facade.ts`
- [X] T011 Export all types via barrel file in `front-end/src/user-interface/application/types/index.ts`

### Port Interface Definitions

- [X] T012 [P] Define SendCommandPort interface (3 methods) in `front-end/src/user-interface/application/ports/output/send-command.port.ts`
- [X] T013 [P] Define UpdateUIStatePort interface (7 methods) in `front-end/src/user-interface/application/ports/output/update-ui-state.port.ts`
- [X] T014 [P] Define TriggerUIEffectPort interface with AnimationType and AnimationParams in `front-end/src/user-interface/application/ports/output/trigger-ui-effect.port.ts`
- [X] T015 Export all Output Ports in `front-end/src/user-interface/application/ports/output/index.ts`
- [X] T016 [P] Define 3 player operation Input Ports (PlayHandCardPort, SelectMatchTargetPort, MakeKoiKoiDecisionPort) in `front-end/src/user-interface/application/ports/input/player-operations.port.ts`
- [X] T017 Define 15 event handler Input Ports in `front-end/src/user-interface/application/ports/input/event-handlers.port.ts`
- [X] T018 Export all Input Ports in `front-end/src/user-interface/application/ports/input/index.ts`
- [X] T019 Export all Ports via barrel file in `front-end/src/user-interface/application/ports/index.ts`

### Test Infrastructure

- [X] T020 [P] Create Mock factory functions (createMockSendCommandPort, createMockUpdateUIStatePort, createMockTriggerUIEffectPort, createMockDomainFacade) in `front-end/src/__tests__/user-interface/application/test-helpers/mock-factories.ts`

**Checkpoint**: ✅ Foundation ready - User Story implementation can now begin in parallel

---

## Phase 3: User Story 1 - 玩家操作流程 (Priority: P1) 🎯 MVP

**Goal**: 實作玩家打牌、選擇配對、Koi-Koi 決策的完整流程編排

**Independent Test**: Mock Domain Layer 和 Output Ports，驗證業務流程編排邏輯（配對檢查 → 觸發選擇 UI 或發送命令）

### Tests for User Story 1 (TDD - Write FIRST, ensure they FAIL)

- [X] T021 [P] [US1] Write test for PlayHandCardUseCase multi-match scenario in `front-end/src/__tests__/user-interface/application/use-cases/player-operations/PlayHandCardUseCase.test.ts`
- [X] T022 [P] [US1] Write test for SelectMatchTargetUseCase validation in `front-end/src/__tests__/user-interface/application/use-cases/player-operations/SelectMatchTargetUseCase.test.ts`
- [X] T023 [P] [US1] Write test for MakeKoiKoiDecisionUseCase score calculation in `front-end/src/__tests__/user-interface/application/use-cases/player-operations/MakeKoiKoiDecisionUseCase.test.ts`

### Implementation for User Story 1

- [X] T024 [P] [US1] Implement PlayHandCardUseCase (pre-validation, match checking, trigger selection UI or send command) in `front-end/src/user-interface/application/use-cases/player-operations/PlayHandCardUseCase.ts`
- [X] T025 [P] [US1] Implement SelectMatchTargetUseCase (validate target, send TurnSelectTarget command) in `front-end/src/user-interface/application/use-cases/player-operations/SelectMatchTargetUseCase.ts`
- [X] T026 [P] [US1] Implement MakeKoiKoiDecisionUseCase (calculate score, send RoundMakeDecision command) in `front-end/src/user-interface/application/use-cases/player-operations/MakeKoiKoiDecisionUseCase.ts`
- [X] T027 [US1] Export all player operation Use Cases in `front-end/src/user-interface/application/use-cases/player-operations/index.ts`
- [X] T028 [US1] Verify all US1 tests pass (coverage > 90% for business logic)

**Checkpoint**: User Story 1 完成 - 玩家操作流程可獨立測試

---

## Phase 4: User Story 2 - SSE 遊戲事件處理 (Priority: P1)

**Goal**: 處理所有後端推送的遊戲事件，協調 UI 狀態更新和動畫觸發

**Independent Test**: Mock Output Ports 和 SSE 事件 payload，驗證事件處理邏輯和 UI 更新順序

### Core Game Flow Events (Tests - Write FIRST)

- [X] T029 [P] [US2] Write test for HandleGameStartedUseCase in `front-end/src/__tests__/user-interface/application/use-cases/event-handlers/HandleGameStartedUseCase.test.ts`
- [X] T030 [P] [US2] Write test for HandleRoundDealtUseCase animation trigger in `front-end/src/__tests__/user-interface/application/use-cases/event-handlers/HandleRoundDealtUseCase.test.ts`
- [X] T031 [P] [US2] Write test for HandleTurnCompletedUseCase card move logic in `front-end/src/__tests__/user-interface/application/use-cases/event-handlers/HandleTurnCompletedUseCase.test.ts`
- [X] T032 [P] [US2] Write test for HandleSelectionRequiredUseCase selection UI display in `front-end/src/__tests__/user-interface/application/use-cases/event-handlers/HandleSelectionRequiredUseCase.test.ts`
- [X] T033 [P] [US2] Write test for HandleTurnProgressAfterSelectionUseCase yaku effect trigger in `front-end/src/__tests__/user-interface/application/use-cases/event-handlers/HandleTurnProgressAfterSelectionUseCase.test.ts`
- [X] T034 [P] [US2] Write test for HandleDecisionRequiredUseCase modal display in `front-end/src/__tests__/user-interface/application/use-cases/event-handlers/HandleDecisionRequiredUseCase.test.ts`
- [X] T035 [P] [US2] Write test for HandleDecisionMadeUseCase multiplier update in `front-end/src/__tests__/user-interface/application/use-cases/event-handlers/HandleDecisionMadeUseCase.test.ts`

### Round Ending Events (Tests - Write FIRST)

- [X] T036 [P] [US2] Write test for HandleRoundScoredUseCase score calculation validation in `front-end/src/__tests__/user-interface/application/use-cases/event-handlers/HandleRoundScoredUseCase.test.ts`
- [X] T037 [P] [US2] Write test for HandleRoundDrawnUseCase draw message display in `front-end/src/__tests__/user-interface/application/use-cases/event-handlers/HandleRoundDrawnUseCase.test.ts`
- [X] T038 [P] [US2] Write test for HandleRoundEndedInstantlyUseCase (Teshi/流局) reason handling in `front-end/src/__tests__/user-interface/application/use-cases/event-handlers/HandleRoundEndedInstantlyUseCase.test.ts`
- [X] T039 [P] [US2] Write test for HandleGameFinishedUseCase final screen display in `front-end/src/__tests__/user-interface/application/use-cases/event-handlers/HandleGameFinishedUseCase.test.ts`

### Error & Reconnection Events (Tests - Write FIRST, part of US3 but implemented here)

- [X] T040 [P] [US2] Write test for HandleTurnErrorUseCase error message mapping in `front-end/src/__tests__/user-interface/application/use-cases/event-handlers/HandleTurnErrorUseCase.test.ts`
- [X] T041 [P] [US2] Write test for HandleReconnectionUseCase snapshot restore in `front-end/src/__tests__/user-interface/application/use-cases/event-handlers/HandleReconnectionUseCase.test.ts`

### Core Game Flow Events (Implementation)

- [X] T042 [P] [US2] Implement HandleGameStartedUseCase (initialize game context) in `front-end/src/user-interface/application/use-cases/event-handlers/HandleGameStartedUseCase.ts`
- [X] T043 [P] [US2] Implement HandleRoundDealtUseCase (trigger DEAL_CARDS animation, update field/hand/deck) in `front-end/src/user-interface/application/use-cases/event-handlers/HandleRoundDealtUseCase.ts`
- [X] T044 [P] [US2] Implement HandleTurnCompletedUseCase (trigger CARD_MOVE animation, update state) in `front-end/src/user-interface/application/use-cases/event-handlers/HandleTurnCompletedUseCase.ts`
- [X] T045 [P] [US2] Implement HandleSelectionRequiredUseCase (show selection UI, highlight targets) in `front-end/src/user-interface/application/use-cases/event-handlers/HandleSelectionRequiredUseCase.ts`
- [X] T046 [P] [US2] Implement HandleTurnProgressAfterSelectionUseCase (trigger YAKU_EFFECT if yaku_update exists) in `front-end/src/user-interface/application/use-cases/event-handlers/HandleTurnProgressAfterSelectionUseCase.ts`
- [X] T047 [P] [US2] Implement HandleDecisionRequiredUseCase (calculate yaku score, show decision modal) in `front-end/src/user-interface/application/use-cases/event-handlers/HandleDecisionRequiredUseCase.ts`
- [X] T048 [P] [US2] Implement HandleDecisionMadeUseCase (update Koi-Koi multiplier, show continue message) in `front-end/src/user-interface/application/use-cases/event-handlers/HandleDecisionMadeUseCase.ts`

### Round Ending Events (Implementation)

- [X] T049 [P] [US2] Implement HandleRoundScoredUseCase (validate score, trigger SCORE_UPDATE animation, show round result) in `front-end/src/user-interface/application/use-cases/event-handlers/HandleRoundScoredUseCase.ts`
- [X] T050 [P] [US2] Implement HandleRoundDrawnUseCase (show draw message) in `front-end/src/user-interface/application/use-cases/event-handlers/HandleRoundDrawnUseCase.ts`
- [X] T051 [P] [US2] Implement HandleRoundEndedInstantlyUseCase (handle TESHI/FIELD_KUTTSUKI/NO_YAKU) in `front-end/src/user-interface/application/use-cases/event-handlers/HandleRoundEndedInstantlyUseCase.ts`
- [X] T052 [P] [US2] Implement HandleGameFinishedUseCase (show game over screen) in `front-end/src/user-interface/application/use-cases/event-handlers/HandleGameFinishedUseCase.ts`

### Error & Reconnection Events (Implementation)

- [X] T053 [P] [US2] Implement HandleTurnErrorUseCase (map error code to friendly message, show error toast) in `front-end/src/user-interface/application/use-cases/event-handlers/HandleTurnErrorUseCase.ts`
- [X] T054 [P] [US2] Implement HandleReconnectionUseCase (restore full game state from snapshot, render UI based on flow_stage) in `front-end/src/user-interface/application/use-cases/event-handlers/HandleReconnectionUseCase.ts`

### Finalization

- [X] T055 [US2] Export all event handler Use Cases in `front-end/src/user-interface/application/use-cases/event-handlers/index.ts`
- [X] T056 [US2] Verify all US2 tests pass (coverage > 85% for event handlers)

**Checkpoint**: User Story 2 完成 - 所有 SSE 事件處理器可獨立測試

---

## Phase 5: User Story 3 - 錯誤處理與重連機制 (Priority: P2)

**Goal**: 整合錯誤處理邏輯（操作錯誤、網路錯誤、狀態不一致）和重連機制

**Independent Test**: 模擬各種錯誤場景和斷線重連情境

### Integration & Edge Case Testing

- [ ] T057 [US3] Write integration test for network error handling and exponential backoff retry logic in `front-end/src/__tests__/user-interface/application/use-cases/integration/error-handling.test.ts`
- [ ] T058 [US3] Write integration test for reconnection flow (disconnect → retry → snapshot restore → UI sync) in `front-end/src/__tests__/user-interface/application/use-cases/integration/reconnection.test.ts`

### Implementation & Validation

- [ ] T059 [US3] Implement exponential backoff retry strategy constants (1s → 2s → 4s → 8s, max 30s) in `front-end/src/user-interface/application/types/errors.ts`
- [ ] T060 [US3] Verify all US3 integration tests pass (error handling coverage > 85%)

**Checkpoint**: User Story 3 完成 - 錯誤處理與重連機制完整

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: 最終整合、文檔更新、品質保證

- [ ] T061 [P] Export all Use Cases via barrel file in `front-end/src/user-interface/application/use-cases/index.ts`
- [ ] T062 [P] Export all public APIs (types, ports, use-cases) in `front-end/src/user-interface/application/index.ts`
- [ ] T063 [P] Run ESLint and fix any linting issues in `front-end/src/user-interface/application/`
- [ ] T064 Run TypeScript type-check: `pnpm type-check` (ensure zero errors)
- [ ] T065 Run test coverage report: `pnpm test --coverage` (verify > 80% coverage for Application Layer)
- [ ] T066 [P] Update CLAUDE.md with new tech stack entry: "TypeScript 5.9 + 無（Pure functions, 零框架依賴） (003-ui-application-layer)"
- [ ] T067 Validate quickstart.md examples against actual implementation

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - **BLOCKS all user stories**
- **User Stories (Phase 3-5)**: All depend on Foundational phase completion
  - User Story 1 (US1, P1): Can start after Foundational
  - User Story 2 (US2, P1): Can start after Foundational (parallel with US1)
  - User Story 3 (US3, P2): Can start after Foundational (integrates with US2)
- **Polish (Phase 6)**: Depends on all desired user stories being complete

### User Story Dependencies

- **US1 (P1)**: Independent - no dependencies on other stories
- **US2 (P1)**: Independent - can run in parallel with US1 (different files)
- **US3 (P2)**: Integrates with US2 (HandleTurnErrorUseCase, HandleReconnectionUseCase are event handlers)

### Within Each User Story

- **TDD Approach**: Tests MUST be written first and FAIL before implementation
- **US1 Flow**: Tests (T021-T023) → Implementation (T024-T026) → Export & Verify (T027-T028)
- **US2 Flow**: Tests (T029-T041) → Implementation (T042-T054) → Export & Verify (T055-T056)
- **US3 Flow**: Integration tests (T057-T058) → Implementation (T059) → Verify (T060)

### Parallel Opportunities

**Phase 2 (Foundational)** - All type definition files can run in parallel:
- T004 (flow-state.ts), T005 (result.ts), T006 (errors.ts), T007 (shared.ts), T008 (commands.ts), T009 (events.ts), T010 (domain-facade.ts) can all run in parallel
- T012 (send-command.port.ts), T013 (update-ui-state.port.ts), T014 (trigger-ui-effect.port.ts) can run in parallel
- T016 (player-operations.port.ts), T017 (event-handlers.port.ts) can run in parallel
- T020 (mock-factories.ts) can run in parallel with port definitions

**Phase 3 (US1)** - Tests and implementations can run in parallel:
- T021, T022, T023 (all tests) can run in parallel
- T024, T025, T026 (all implementations) can run in parallel after tests are written

**Phase 4 (US2)** - Tests and implementations can run in parallel:
- T029-T041 (all tests) can run in parallel
- T042-T054 (all implementations) can run in parallel after tests are written

**Phase 6 (Polish)** - Independent tasks can run in parallel:
- T061, T062, T063, T066 can all run in parallel

---

## Parallel Example: User Story 1

```bash
# Launch all tests for US1 together (write first, ensure they FAIL):
Task T021: "Write test for PlayHandCardUseCase..."
Task T022: "Write test for SelectMatchTargetUseCase..."
Task T023: "Write test for MakeKoiKoiDecisionUseCase..."

# After tests are written and failing, launch all implementations together:
Task T024: "Implement PlayHandCardUseCase..."
Task T025: "Implement SelectMatchTargetUseCase..."
Task T026: "Implement MakeKoiKoiDecisionUseCase..."
```

---

## Parallel Example: User Story 2 (Core Game Flow Events)

```bash
# Launch all core game flow tests together:
Task T029: "Write test for HandleGameStartedUseCase..."
Task T030: "Write test for HandleRoundDealtUseCase..."
Task T031: "Write test for HandleTurnCompletedUseCase..."
Task T032: "Write test for HandleSelectionRequiredUseCase..."
Task T033: "Write test for HandleTurnProgressAfterSelectionUseCase..."
Task T034: "Write test for HandleDecisionRequiredUseCase..."
Task T035: "Write test for HandleDecisionMadeUseCase..."

# Launch all core game flow implementations together (after tests fail):
Task T042: "Implement HandleGameStartedUseCase..."
Task T043: "Implement HandleRoundDealtUseCase..."
Task T044: "Implement HandleTurnCompletedUseCase..."
Task T045: "Implement HandleSelectionRequiredUseCase..."
Task T046: "Implement HandleTurnProgressAfterSelectionUseCase..."
Task T047: "Implement HandleDecisionRequiredUseCase..."
Task T048: "Implement HandleDecisionMadeUseCase..."
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T003)
2. Complete Phase 2: Foundational (T004-T020) - **CRITICAL BLOCKER**
3. Complete Phase 3: User Story 1 (T021-T028)
4. **STOP and VALIDATE**: Test User Story 1 independently
5. MVP Ready: 玩家操作流程可完整運作

### Incremental Delivery

1. Setup + Foundational → Foundation ready (can start any user story)
2. Add US1 → Test independently → **MVP Deliverable** 🎯
3. Add US2 → Test independently → **Full game flow working**
4. Add US3 → Test independently → **Production-ready with error handling**
5. Add Polish → **Release candidate**

### Parallel Team Strategy

With multiple developers (after Foundational phase completes):

1. **Developer A**: User Story 1 (T021-T028)
2. **Developer B**: User Story 2 - Core Flow (T029-T035, T042-T048)
3. **Developer C**: User Story 2 - Endings (T036-T041, T049-T054)
4. **Developer D**: User Story 3 (T057-T060)

All stories integrate independently through well-defined Port interfaces.

---

## Summary

- **Total Tasks**: 67
- **MVP Scope**: Phase 1 + Phase 2 + Phase 3 = 28 tasks (Setup + Foundation + US1)
- **Test Coverage Target**: > 80% (spec.md requirement)
- **Parallel Opportunities**: ~40 tasks can run in parallel (marked [P])
- **Independent Stories**: Each user story is independently testable

### Task Breakdown by Phase

- Phase 1 (Setup): 3 tasks
- Phase 2 (Foundational): 17 tasks
- Phase 3 (US1): 8 tasks 🎯 MVP
- Phase 4 (US2): 28 tasks
- Phase 5 (US3): 4 tasks
- Phase 6 (Polish): 7 tasks

### Key Success Metrics (from spec.md)

- ✅ SC-001: 測試覆蓋率 > 80% (business logic > 90%)
- ✅ SC-002: SSE 事件處理 < 100ms
- ✅ SC-003: 玩家操作響應 < 50ms
- ✅ SC-006: 零框架依賴（框架無關設計）
- ✅ SC-007: 90% Use Cases 可通過 Mock 獨立測試

---

## Notes

- **[P] tasks**: Different files, no dependencies, can run in parallel
- **[Story] label**: Maps task to specific user story for traceability
- **TDD Required**: Tests MUST fail before implementation
- **Commit Frequency**: Commit after each task or logical group
- **Checkpoints**: Stop at any checkpoint to validate story independently
- **Context**: ultrathink - 深度思考每個 Use Case 的業務邏輯編排

**Ready to start**: Phase 1 Setup can begin immediately
