# Tasks: Backend Testing & Logging Enhancement

**Input**: Design documents from `/specs/009-backend-testing-logging/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: This feature is explicitly about unit testing, so test tasks are the PRIMARY deliverables.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

- **Project structure**: Nuxt 4 fullstack - backend code in `front-end/server/`
- **Tests**: `front-end/server/__tests__/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and test infrastructure setup

- [ ] T001 Create Vitest server configuration in `front-end/vitest.server.config.ts`
- [ ] T002 Add test scripts to `front-end/package.json` (test:unit:server, test:unit:domain, test:unit:application)
- [ ] T003 Create test directory structure: `front-end/server/__tests__/{mocks,fixtures,domain,application}`
- [ ] T004 [P] Create card test fixtures in `front-end/server/__tests__/fixtures/cards.ts`
- [ ] T005 [P] Create game state test fixtures in `front-end/server/__tests__/fixtures/games.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared mock implementations required by all Application Layer tests

**⚠️ CRITICAL**: US2 (Application Layer tests) cannot proceed without these mocks

- [ ] T006 [P] Create GameStoreMock in `front-end/server/__tests__/mocks/gameStoreMock.ts`
- [ ] T007 [P] Create EventPublisherMock in `front-end/server/__tests__/mocks/eventPublisherMock.ts`
- [ ] T008 [P] Create GameRepositoryMock in `front-end/server/__tests__/mocks/gameRepositoryMock.ts`
- [ ] T009 [P] Create InternalEventPublisherMock in `front-end/server/__tests__/mocks/internalEventPublisherMock.ts`
- [ ] T010 [P] Create GameTimeoutMock in `front-end/server/__tests__/mocks/gameTimeoutMock.ts`
- [ ] T011 [P] Create EventMapperMock in `front-end/server/__tests__/mocks/eventMapperMock.ts`
- [ ] T012 [P] Create PlayerStatsRepositoryMock in `front-end/server/__tests__/mocks/playerStatsRepositoryMock.ts`
- [ ] T013 Create mock index barrel in `front-end/server/__tests__/mocks/index.ts`

**Checkpoint**: Test infrastructure ready - User Story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Domain Layer Unit Testing (Priority: P1) 🎯 MVP

**Goal**: 驗證 Domain Layer 核心業務邏輯正確性，達到 80%+ 測試覆蓋率

**Independent Test**: `npm run test:unit:domain` - 無需啟動伺服器或資料庫

### Domain Services Tests

- [ ] T014 [P] [US1] Create yakuDetectionService tests in `front-end/server/__tests__/domain/services/yakuDetectionService.test.ts`
  - Test all 12 standard yaku detection
  - Test 五光 (Gokou), 四光 (Shikou), 三光 (Sankou)
  - Test edge cases for overlapping yakus
- [ ] T015 [P] [US1] Create matchingService tests in `front-end/server/__tests__/domain/services/matchingService.test.ts`
  - Test findMatchableTargets for single/double/triple matches
  - Test no-match scenarios
- [ ] T016 [P] [US1] Create scoringService tests in `front-end/server/__tests__/domain/services/scoringService.test.ts`
  - Test score calculation for each yaku
  - Test Koi-Koi multiplier application
- [ ] T017 [P] [US1] Create deckService tests in `front-end/server/__tests__/domain/services/deckService.test.ts`
  - Test deck creation (48 cards)
  - Test shuffle randomness
  - Test deal operations
- [ ] T018 [P] [US1] Create specialRulesService tests in `front-end/server/__tests__/domain/services/specialRulesService.test.ts`
  - Test Teshi detection
  - Test Kuttsuki detection
- [ ] T019 [P] [US1] Create roundTransitionService tests in `front-end/server/__tests__/domain/services/roundTransitionService.test.ts`
  - Test round state transitions
  - Test turn switching

### Domain Entities Tests

- [ ] T020 [P] [US1] Create Game Aggregate tests in `front-end/server/__tests__/domain/game/game.test.ts`
  - Test game creation
  - Test player management
  - Test round progression
- [ ] T021 [P] [US1] Create Round Entity tests in `front-end/server/__tests__/domain/game/round.test.ts`
  - Test round initialization
  - Test flow state transitions
  - Test card collection

### Verification

- [ ] T022 [US1] Run coverage report for Domain Layer and verify 80%+ coverage

**Checkpoint**: User Story 1 complete - Domain Layer fully tested and independently verifiable

---

## Phase 4: User Story 2 - Application Layer Unit Testing (Priority: P1)

**Goal**: 驗證 Application Layer Use Cases 能正確協調 Domain 物件，達到 80%+ 測試覆蓋率

**Independent Test**: `npm run test:unit:application` - 使用 mock 的 Output Ports

### Use Case Tests

- [ ] T023 [P] [US2] Create joinGameUseCase tests in `front-end/server/__tests__/application/use-cases/joinGameUseCase.test.ts`
  - Test player join flow
  - Test room creation
  - Test event publishing
- [ ] T024 [P] [US2] Create joinGameAsAiUseCase tests in `front-end/server/__tests__/application/use-cases/joinGameAsAiUseCase.test.ts`
  - Test AI player creation
  - Test game start trigger
- [ ] T025 [P] [US2] Create playHandCardUseCase tests in `front-end/server/__tests__/application/use-cases/playHandCardUseCase.test.ts`
  - Test card play with matching
  - Test SelectionRequiredEvent for double match
  - Test automatic collection for single match
- [ ] T026 [P] [US2] Create selectTargetUseCase tests in `front-end/server/__tests__/application/use-cases/selectTargetUseCase.test.ts`
  - Test target selection
  - Test invalid selection rejection
- [ ] T027 [P] [US2] Create makeDecisionUseCase tests in `front-end/server/__tests__/application/use-cases/makeDecisionUseCase.test.ts`
  - Test KOI_KOI decision
  - Test END_ROUND decision
  - Test multiplier accumulation
- [ ] T028 [P] [US2] Create leaveGameUseCase tests in `front-end/server/__tests__/application/use-cases/leaveGameUseCase.test.ts`
  - Test player leave
  - Test game cleanup
- [ ] T029 [P] [US2] Create autoActionUseCase tests in `front-end/server/__tests__/application/use-cases/autoActionUseCase.test.ts`
  - Test timeout handling
  - Test minimum impact strategy
- [ ] T030 [P] [US2] Create confirmContinueUseCase tests in `front-end/server/__tests__/application/use-cases/confirmContinueUseCase.test.ts`
  - Test round continuation
  - Test game end handling

### Verification

- [ ] T031 [US2] Run coverage report for Application Layer and verify 80%+ coverage

**Checkpoint**: User Story 2 complete - Application Layer fully tested and independently verifiable

---

## Phase 5: User Story 3 - Log Standardization (Priority: P2)

**Goal**: 統一所有 Domain 和 Application 層的日誌使用，確保 100% 使用 loggers 工廠函數

**Independent Test**: 程式碼審查 + grep 驗證無直接 console.* 呼叫

### Domain Layer Logger Audit

- [ ] T032 [P] [US3] Audit and refactor yakuDetectionService.ts to use `loggers.domain()`
- [ ] T033 [P] [US3] Audit and refactor matchingService.ts to use `loggers.domain()`
- [ ] T034 [P] [US3] Audit and refactor scoringService.ts to use `loggers.domain()`
- [ ] T035 [P] [US3] Audit and refactor deckService.ts to use `loggers.domain()`
- [ ] T036 [P] [US3] Audit and refactor specialRulesService.ts to use `loggers.domain()`
- [ ] T037 [P] [US3] Audit and refactor roundTransitionService.ts to use `loggers.domain()`

### Application Layer Logger Audit

- [ ] T038 [P] [US3] Audit and refactor joinGameUseCase.ts to use `loggers.useCase()` with start/end logging
- [ ] T039 [P] [US3] Audit and refactor joinGameAsAiUseCase.ts to use `loggers.useCase()`
- [ ] T040 [P] [US3] Audit and refactor playHandCardUseCase.ts to use `loggers.useCase()`
- [ ] T041 [P] [US3] Audit and refactor selectTargetUseCase.ts to use `loggers.useCase()`
- [ ] T042 [P] [US3] Audit and refactor makeDecisionUseCase.ts to use `loggers.useCase()`
- [ ] T043 [P] [US3] Audit and refactor leaveGameUseCase.ts to use `loggers.useCase()`
- [ ] T044 [P] [US3] Audit and refactor autoActionUseCase.ts to use `loggers.useCase()`
- [ ] T045 [P] [US3] Audit and refactor confirmContinueUseCase.ts to use `loggers.useCase()`

### Verification

- [ ] T046 [US3] Verify no direct console.* calls remain in Domain/Application layers using grep

**Checkpoint**: User Story 3 complete - All logging standardized

---

## Phase 6: User Story 4 - Event/Command Database Logging (Priority: P3)

**Goal**: 實作遊戲 Commands/Events 的資料庫日誌系統，用於稽核和問題分析

**Independent Test**: 發送遊戲命令並查詢資料庫驗證記錄完整性

### Database Schema

- [ ] T047 [US4] Create gameLogs schema in `front-end/server/database/schema/gameLogs.ts`
  - Define table with id, gameId, playerId, eventType, payload, createdAt
  - Add B-tree index on gameId
  - Document BRIN index for createdAt (to be added in migration)
- [ ] T048 [US4] Export gameLogs from `front-end/server/database/schema/index.ts`
- [ ] T049 [US4] Generate database migration with `npm run db:generate`

### Application Layer Port

- [ ] T050 [US4] Create GameLogRepositoryPort in `front-end/server/application/ports/output/gameLogRepositoryPort.ts`
  - Define logAsync(entry: GameLogEntry): void
  - Define findByGameId(gameId: string): Promise<GameLog[]>
- [ ] T051 [US4] Export GameLogRepositoryPort from ports/output/index.ts

### Adapter Layer Implementation

- [ ] T052 [US4] Implement DrizzleGameLogRepository in `front-end/server/adapters/persistence/drizzleGameLogRepository.ts`
  - Implement fire-and-forget logAsync with error catching
  - Implement findByGameId with order by createdAt
- [ ] T053 [US4] Wire GameLogRepository in `front-end/server/utils/container.ts`

### Event Publisher Integration

- [ ] T054 [US4] Integrate GameLogRepository into CompositeEventPublisher for event logging
- [ ] T055 [US4] Add command logging to API handlers (play-card, select-target, decision)

### Edge Case Verification

- [ ] T056 [US4] Verify log failure resilience: DrizzleGameLogRepository must catch errors and not propagate to caller
- [ ] T057 [US4] Verify sensitive data protection: GameLog payload must not contain opponent's hand cards or deck order
- [ ] T058 [US4] Verify async non-blocking: Log write latency must not exceed 10ms impact on game operations

### Integration Verification

- [ ] T059 [US4] Test event/command logging by playing a game and querying game_logs table

**Checkpoint**: User Story 4 complete - Database logging implemented

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final verification and cleanup

- [ ] T060 Run full test suite and verify all tests pass: `npm run test:unit:server`
- [ ] T061 Generate and review final coverage report
- [ ] T062 Verify Domain Layer coverage ≥ 80%
- [ ] T063 Verify Application Layer coverage ≥ 80%
- [ ] T064 Verify test execution time < 30 seconds
- [ ] T065 Run database migration in development: `npm run db:migrate`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup (T001-T003) - BLOCKS US2
- **User Story 1 (Phase 3)**: Depends on Setup (T001-T005) - Does NOT require mocks
- **User Story 2 (Phase 4)**: Depends on Foundational (T006-T013) - Requires all mocks
- **User Story 3 (Phase 5)**: No blocking dependencies - can start after Setup
- **User Story 4 (Phase 6)**: No blocking dependencies - can start after Setup
- **Polish (Phase 7)**: Depends on all user stories complete

### User Story Dependencies

| User Story | Depends On | Can Run In Parallel With |
|------------|------------|--------------------------|
| US1 (Domain Tests) | Setup only | US3, US4 |
| US2 (Application Tests) | Setup + Foundational | US3, US4 |
| US3 (Log Standardization) | Setup only | US1, US4 |
| US4 (DB Logging) | Setup only | US1, US3 |

### Parallel Opportunities

**Within Phase 1 (Setup)**:
- T004, T005 can run in parallel

**Within Phase 2 (Foundational)**:
- T006-T012 can ALL run in parallel (different mock files)

**Within Phase 3 (US1)**:
- T014-T021 can ALL run in parallel (different test files)

**Within Phase 4 (US2)**:
- T023-T030 can ALL run in parallel (different test files)

**Within Phase 5 (US3)**:
- T032-T037 can run in parallel (Domain audit)
- T038-T045 can run in parallel (Application audit)

---

## Parallel Example: User Story 1

```bash
# Launch all Domain Service tests together:
Task: "Create yakuDetectionService tests in front-end/server/__tests__/domain/services/yakuDetectionService.test.ts"
Task: "Create matchingService tests in front-end/server/__tests__/domain/services/matchingService.test.ts"
Task: "Create scoringService tests in front-end/server/__tests__/domain/services/scoringService.test.ts"
Task: "Create deckService tests in front-end/server/__tests__/domain/services/deckService.test.ts"
Task: "Create specialRulesService tests in front-end/server/__tests__/domain/services/specialRulesService.test.ts"
Task: "Create roundTransitionService tests in front-end/server/__tests__/domain/services/roundTransitionService.test.ts"

# Launch all Entity tests together:
Task: "Create Game Aggregate tests in front-end/server/__tests__/domain/game/game.test.ts"
Task: "Create Round Entity tests in front-end/server/__tests__/domain/game/round.test.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T005)
2. Complete Phase 3: User Story 1 (T014-T022)
3. **STOP and VALIDATE**: `npm run test:unit:domain`
4. Domain Layer testing complete - 80%+ coverage achieved

### Incremental Delivery

1. Setup → US1 (Domain Tests) → Verify 80% coverage ✓
2. Add Foundational → US2 (Application Tests) → Verify 80% coverage ✓
3. Add US3 (Log Standardization) → Verify no console.* calls ✓
4. Add US4 (DB Logging) → Test database logging ✓
5. Each story adds value independently

### Parallel Team Strategy

With multiple developers:
1. Team completes Setup together
2. Once Setup is done:
   - Developer A: User Story 1 (Domain Tests)
   - Developer B: Foundational Mocks → User Story 2 (Application Tests)
   - Developer C: User Story 3 (Log Audit) or User Story 4 (DB Logging)

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- US1 and US2 are both P1 priority but US1 should complete first (Domain before Application)
- Test files should follow TDD: write test, see it fail, then (if needed) fix source
- Commit after each test file completion
- Coverage reports should be generated incrementally
