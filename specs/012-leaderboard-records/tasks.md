# Tasks: Leaderboard and Records

**Input**: Design documents from `/specs/012-leaderboard-records/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Domain/Application 層單元測試（依據 Constitution V: Test-First Development）

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

- **Backend BC**: `front-end/server/leaderboard/`
- **Database**: `front-end/server/database/schema/`
- **API**: `front-end/server/api/v1/`
- **Frontend**: `front-end/app/pages/index/components/`
- **Shared Infrastructure**: `front-end/server/shared/infrastructure/`

## Naming Conventions

**PlayerStats vs PlayerStatistics 區分**:
- `PlayerStats`: **Entity** - 對應 `player_stats` 表的領域實體，包含累計統計數據
- `PlayerStatistics`: **Aggregate** - 組合查詢結果的聚合物件，包含計算後的統計數據（如勝率）

---

## Phase 1: Setup (BC Scaffolding)

**Purpose**: Create Leaderboard BC directory structure

- [ ] T001 Create Leaderboard BC directory structure per plan.md in `front-end/server/leaderboard/`
- [ ] T002 [P] Create domain layer directories: `domain/types.ts`, `domain/daily-score/`, `domain/player-stats/`, `domain/leaderboard/`, `domain/statistics/`
- [ ] T003 [P] Create application layer directories: `application/use-cases/`, `application/ports/input/`, `application/ports/output/`
- [ ] T004 [P] Create adapter layer directories: `adapters/di/`, `adapters/persistence/`, `adapters/event-subscriber/`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**CRITICAL**: No user story work can begin until this phase is complete

### 2.1 Shared Infrastructure Extension

- [ ] T005 Add `GameFinishedPayload` interface to `front-end/server/shared/infrastructure/event-bus/types.ts`
- [ ] T006 Add `GAME_FINISHED` to `EVENT_TYPES` constant in `front-end/server/shared/infrastructure/event-bus/types.ts`
- [ ] T007 Extend `InternalEventBus` to support `GAME_FINISHED` event in `front-end/server/shared/infrastructure/event-bus/internalEventBus.ts`

### 2.2 Database Schema

- [ ] T008 Create `daily_player_scores` table schema in `front-end/server/database/schema/dailyPlayerScores.ts`
- [ ] T009 Export new schema from `front-end/server/database/schema/index.ts`
- [ ] T010 Run database migration: `pnpm --prefix front-end db:generate && pnpm --prefix front-end db:migrate`

### 2.3 Core-Game BC Cleanup

**Affected Files Analysis**:
```
recordGameStatsUseCase 被引用於:
├── turnFlowService.ts:21,55,354-356
├── selectTargetUseCase.ts:41,68
├── playHandCardUseCase.ts:41,68
├── makeDecisionUseCase.ts:25,58
├── leaveGameUseCase.ts:22,55
├── ports/input/index.ts:16
└── utils/container.ts
```

- [ ] T011 Update `TurnFlowService` to remove `recordGameStatsUseCase` dependency and calls in `front-end/server/core-game/domain/services/turnFlowService.ts`
- [ ] T012 [P] Update `selectTargetUseCase.ts` to remove optional `recordGameStatsUseCase` parameter in `front-end/server/core-game/application/use-cases/selectTargetUseCase.ts`
- [ ] T013 [P] Update `playHandCardUseCase.ts` to remove optional `recordGameStatsUseCase` parameter in `front-end/server/core-game/application/use-cases/playHandCardUseCase.ts`
- [ ] T014 [P] Update `makeDecisionUseCase.ts` to remove optional `recordGameStatsUseCase` parameter in `front-end/server/core-game/application/use-cases/makeDecisionUseCase.ts`
- [ ] T015 [P] Update `leaveGameUseCase.ts` to remove optional `recordGameStatsUseCase` parameter in `front-end/server/core-game/application/use-cases/leaveGameUseCase.ts`
- [ ] T016 Update `ports/input/index.ts` to remove `RecordGameStatsInputPort` export in `front-end/server/core-game/application/ports/input/index.ts`
- [ ] T017 Delete `front-end/server/core-game/application/use-cases/recordGameStatsUseCase.ts`
- [ ] T018 Delete `front-end/server/core-game/application/ports/input/recordGameStatsInputPort.ts`
- [ ] T019 Delete `front-end/server/core-game/application/ports/output/playerStatsRepositoryPort.ts`
- [ ] T020 Delete `front-end/server/core-game/adapters/persistence/drizzlePlayerStatsRepository.ts`
- [ ] T021 Update Core-Game DI container to remove player stats related bindings in `front-end/server/utils/container.ts`

### 2.4 Core-Game Event Integration (GAME_FINISHED Publisher)

**CRITICAL**: Must complete before US2 can be independently tested

- [ ] T022 Identify game completion flow in Core-Game BC (locate where game ends and stats were recorded)
- [ ] T023 Modify Core-Game BC to publish `GAME_FINISHED` event on game completion (replace `recordGameStatsUseCase` calls)
- [ ] T024 Ensure event payload includes `achievedYaku`, `koiKoiCalls`, `isMultiplierWin` fields per `GameFinishedPayload` interface

### 2.5 Domain Layer Foundation (TDD)

**Note**: `YakuCounts` type 與 DB Schema 中的 `yakuCounts` 欄位定義可並存。Domain 層定義用於業務邏輯，DB Schema 定義用於資料庫映射。兩者語意相同但位置不同，符合 Clean Architecture 的層級隔離原則。

- [ ] T025 [P] Create `YakuCounts` type in `front-end/server/leaderboard/domain/types.ts` (Domain 層獨立定義，不 import DB Schema)
- [ ] T026 [P] Create `LeaderboardType` value object in `front-end/server/leaderboard/domain/leaderboard/leaderboard-type.ts`
- [ ] T027 [P] Create `TimeRange` value object with `getTimeRangeStartDate` in `front-end/server/leaderboard/domain/statistics/time-range.ts`
- [ ] T028 [P] Write unit tests for `TimeRange` in `front-end/server/leaderboard/domain/statistics/__tests__/time-range.spec.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 4 - Simplified Navigation (Priority: P1)

**Goal**: 簡化首頁導航，移除不必要的連結，讓使用者更專注於核心功能

**Independent Test**: 檢視首頁 NavigationBar，確認 Rules 和 About 連結已移除，並驗證新的 Navigation Section 正確顯示在 Hero Section 下方

### Implementation for User Story 4

- [ ] T029 [US4] Modify `NavigationBar.vue` to remove Rules and About anchor links
- [ ] T030 [US4] Create `NavigationSection.vue` component with anchor links (Records, Rules, About) in `front-end/app/pages/index/components/NavigationSection.vue`
- [ ] T031 [US4] Update `front-end/app/pages/index.vue` to include NavigationSection below HeroSection
- [ ] T032 [US4] Style NavigationSection for responsive design (mobile/desktop)

**Checkpoint**: User Story 4 complete - NavigationBar simplified, NavigationSection added

---

## Phase 4: User Story 1 - View Daily/Weekly Leaderboard (Priority: P1)

**Goal**: 玩家可查看日/週排行榜，了解自己與其他玩家的排名差異

**Independent Test**: 訪問首頁 Record Section，切換日榜/週榜驗證排行榜數據正確顯示，確認排名順序正確

### 4.1 Domain Layer for US1 (TDD)

- [ ] T033 [P] [US1] Write unit tests for `DailyPlayerScore` entity in `front-end/server/leaderboard/domain/daily-score/__tests__/daily-player-score.spec.ts`
- [ ] T034 [P] [US1] Write unit tests for `LeaderboardEntry` and `calculateRanks` in `front-end/server/leaderboard/domain/leaderboard/__tests__/leaderboard-entry.spec.ts`
- [ ] T035 [P] [US1] Implement `DailyPlayerScore` entity with `updateDailyScore` function in `front-end/server/leaderboard/domain/daily-score/daily-player-score.ts`
- [ ] T036 [P] [US1] Implement `LeaderboardEntry` value object with `calculateRanks` in `front-end/server/leaderboard/domain/leaderboard/leaderboard-entry.ts`

### 4.2 Application Layer for US1 (TDD)

- [ ] T037 [P] [US1] Create `DailyPlayerScoreRepositoryPort` interface in `front-end/server/leaderboard/application/ports/output/daily-player-score-repository-port.ts`
- [ ] T038 [P] [US1] Create `GetLeaderboardInputPort` interface in `front-end/server/leaderboard/application/ports/input/get-leaderboard-input-port.ts`
- [ ] T039 [P] [US1] Write unit tests for `GetDailyLeaderboardUseCase` in `front-end/server/leaderboard/application/use-cases/__tests__/get-daily-leaderboard-use-case.spec.ts`
- [ ] T040 [P] [US1] Write unit tests for `GetWeeklyLeaderboardUseCase` in `front-end/server/leaderboard/application/use-cases/__tests__/get-weekly-leaderboard-use-case.spec.ts`
- [ ] T041 [US1] Implement `GetDailyLeaderboardUseCase` in `front-end/server/leaderboard/application/use-cases/get-daily-leaderboard-use-case.ts`
- [ ] T042 [US1] Implement `GetWeeklyLeaderboardUseCase` in `front-end/server/leaderboard/application/use-cases/get-weekly-leaderboard-use-case.ts`

### 4.3 Adapter Layer for US1

- [ ] T043 [US1] Implement `DrizzleDailyPlayerScoreRepository` in `front-end/server/leaderboard/adapters/persistence/drizzle-daily-player-score-repository.ts`
- [ ] T044 [US1] Register leaderboard dependencies in `front-end/server/leaderboard/adapters/di/container.ts`

### 4.4 API Endpoint for US1

- [ ] T045 [US1] Create `GET /api/v1/leaderboard` endpoint in `front-end/server/api/v1/leaderboard/index.get.ts`
- [ ] T046 [US1] Add parameter validation (type: daily/weekly, limit: 1-100)
- [ ] T047 [US1] Add error handling for invalid parameters (400 response)

### 4.5 Frontend for US1

- [ ] T048 [P] [US1] Create `LeaderboardBlock.vue` component in `front-end/app/pages/index/components/LeaderboardBlock.vue`
- [ ] T049 [US1] Implement daily/weekly tab switching in LeaderboardBlock
- [ ] T050 [US1] Implement loading state (skeleton screen) in LeaderboardBlock
- [ ] T051 [US1] Implement error state with retry option in LeaderboardBlock
- [ ] T052 [US1] Implement empty state ("目前無排行資料") in LeaderboardBlock
- [ ] T053 [US1] Display current player rank if not in top N (for logged-in users)
- [ ] T054 [P] [US1] Create `RecordSection.vue` container component in `front-end/app/pages/index/components/RecordSection.vue`
- [ ] T055 [US1] Integrate LeaderboardBlock into RecordSection
- [ ] T056 [US1] Update `front-end/app/pages/index.vue` to include RecordSection below NavigationSection

**Checkpoint**: User Story 1 complete - Leaderboard fully functional and testable

---

## Phase 5: User Story 2 - View Personal Game Statistics (Priority: P2)

**Goal**: 已登入玩家可查看個人遊戲統計數據（總分、勝率、Koi-Koi 次數）

**Independent Test**: 登入帳號後在 Record Section 查看個人統計區塊，確認各項數據正確顯示

**Prerequisite Check**: Phase 2.4 (GAME_FINISHED Publisher) must be complete for event-driven updates

### 5.1 Domain Layer for US2 (TDD)

**Naming Note**:
- `PlayerStats` = Entity 對應 DB 表
- `PlayerStatistics` = Aggregate 組合查詢結果（含計算欄位如勝率）

- [ ] T057 [P] [US2] Write unit tests for `PlayerStats` entity in `front-end/server/leaderboard/domain/player-stats/__tests__/player-stats.spec.ts`
- [ ] T058 [P] [US2] Write unit tests for `PlayerStatistics` aggregate in `front-end/server/leaderboard/domain/statistics/__tests__/player-statistics.spec.ts`
- [ ] T059 [P] [US2] Implement `PlayerStats` entity with `updatePlayerStats` in `front-end/server/leaderboard/domain/player-stats/player-stats.ts`
- [ ] T060 [P] [US2] Implement `PlayerStatistics` aggregate with `calculateWinRate`, `createEmptyStatistics` in `front-end/server/leaderboard/domain/statistics/player-statistics.ts`

### 5.2 Application Layer for US2 (TDD)

- [ ] T061 [P] [US2] Create `PlayerStatsRepositoryPort` interface in `front-end/server/leaderboard/application/ports/output/player-stats-repository-port.ts`
- [ ] T062 [P] [US2] Create `GetPlayerStatisticsInputPort` interface in `front-end/server/leaderboard/application/ports/input/get-player-statistics-input-port.ts`
- [ ] T063 [P] [US2] Create `UpdatePlayerRecordsInputPort` interface in `front-end/server/leaderboard/application/ports/input/update-player-records-input-port.ts`
- [ ] T064 [P] [US2] Write unit tests for `GetPlayerStatisticsUseCase` in `front-end/server/leaderboard/application/use-cases/__tests__/get-player-statistics-use-case.spec.ts`
- [ ] T065 [P] [US2] Write unit tests for `UpdatePlayerRecordsUseCase` in `front-end/server/leaderboard/application/use-cases/__tests__/update-player-records-use-case.spec.ts`
- [ ] T066 [US2] Implement `GetPlayerStatisticsUseCase` in `front-end/server/leaderboard/application/use-cases/get-player-statistics-use-case.ts`
- [ ] T067 [US2] Implement `UpdatePlayerRecordsUseCase` (unified update for player_stats + daily_player_scores) in `front-end/server/leaderboard/application/use-cases/update-player-records-use-case.ts`

### 5.3 Adapter Layer for US2

- [ ] T068 [US2] Implement `DrizzlePlayerStatsRepository` in `front-end/server/leaderboard/adapters/persistence/drizzle-player-stats-repository.ts`
- [ ] T069 [US2] Implement `GameFinishedSubscriber` in `front-end/server/leaderboard/adapters/event-subscriber/game-finished-subscriber.ts`
- [ ] T070 [US2] Update DI container with player stats dependencies in `front-end/server/leaderboard/adapters/di/container.ts`
- [ ] T071 [US2] Create Leaderboard plugin for event subscription in `front-end/server/plugins/leaderboard.ts`

### 5.4 API Endpoint for US2

- [ ] T072 [US2] Create `GET /api/v1/stats/me` endpoint in `front-end/server/api/v1/stats/me.get.ts`
- [ ] T073 [US2] Add authentication check (401 for unauthenticated requests)
- [ ] T074 [US2] Add time range parameter validation (all, day, week, month)

### 5.5 Frontend for US2

- [ ] T075 [P] [US2] Create `PersonalStatsBlock.vue` component in `front-end/app/pages/index/components/PersonalStatsBlock.vue`
- [ ] T076 [US2] Implement time range selector (全部/本週/本月) in PersonalStatsBlock
- [ ] T077 [US2] Display stats summary (總分、勝場數、勝率、Koi-Koi 次數)
- [ ] T078 [US2] Implement login prompt for unauthenticated users ("登入以查看個人統計")
- [ ] T079 [US2] Implement empty state ("尚無遊戲紀錄") for users with no games
- [ ] T080 [US2] Implement loading and error states
- [ ] T081 [US2] Integrate PersonalStatsBlock into RecordSection

**Checkpoint**: User Story 2 complete - Personal statistics fully functional

---

## Phase 6: User Story 3 - View Yaku Achievement Statistics (Priority: P3)

**Goal**: 玩家可查看各役種達成次數，了解遊戲風格與強項

**Independent Test**: 查看個人統計中的役種達成區塊，確認各役種名稱和達成次數正確顯示

### Implementation for User Story 3

- [ ] T082 [P] [US3] Create `YakuStatsAccordion.vue` component in `front-end/app/pages/index/components/YakuStatsAccordion.vue`
- [ ] T083 [US3] Display all yaku types with achievement counts
- [ ] T084 [US3] Sort yaku by count descending (highest first)
- [ ] T085 [US3] Handle empty state (all counts = 0) gracefully
- [ ] T086 [US3] Integrate YakuStatsAccordion into PersonalStatsBlock (expandable section)

**Checkpoint**: User Story 3 complete - Yaku statistics expandable section functional

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements affecting multiple user stories

### 7.1 Data Cleanup

- [ ] T087 Create `dailyScoreCleanup.ts` server plugin for 30-day data retention in `front-end/server/plugins/dailyScoreCleanup.ts`
- [ ] T088 Implement cleanup job to delete records older than 30 days

### 7.2 Responsive Design

- [ ] T089 [P] Verify RecordSection responsive layout on mobile devices
- [ ] T090 [P] Verify LeaderboardBlock responsive layout
- [ ] T091 [P] Verify PersonalStatsBlock responsive layout

### 7.3 Performance & Validation

- [ ] T092 Add database indexes verification for leaderboard queries
- [ ] T093 Run full test suite: `pnpm --prefix front-end test:unit`
- [ ] T094 Run lint check: `pnpm --prefix front-end lint`
- [ ] T095 Validate against quickstart.md verification checklist

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup - **BLOCKS all user stories**
  - 2.1-2.3 can run in parallel
  - 2.4 depends on 2.1 (needs GAME_FINISHED event type defined)
  - 2.5 has no dependencies within Phase 2
- **US4 (Phase 3)**: Depends on Phase 2.5 complete - Frontend navigation prerequisite
- **US1 (Phase 4)**: Depends on Phase 2.5 complete - Can run in parallel with US4
- **US2 (Phase 5)**: Depends on Phase 2.4 complete (GAME_FINISHED publisher) - Can run in parallel with US1
- **US3 (Phase 6)**: Depends on US2 (uses PersonalStatsBlock)
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

```
Phase 1: Setup
    │
    ▼
Phase 2: Foundational (BLOCKING)
    │
    ├─ 2.1 Shared Infrastructure ────┐
    │                                │
    ├─ 2.2 Database Schema          2.4 GAME_FINISHED Publisher
    │                                │
    ├─ 2.3 Core-Game Cleanup         │
    │                                │
    └─ 2.5 Domain Foundation         │
         │                           │
         ├───────────┬───────────────┤
         ▼           ▼               ▼
    Phase 3: US4  Phase 4: US1   Phase 5: US2
    (Navigation)  (Leaderboard)  (Personal Stats)
         │           │               │
         └─────┬─────┘               │
               │                     │
               └──────────┬──────────┘
                          ▼
                    Phase 6: US3
                    (Yaku Stats)
                          │
                          ▼
                    Phase 7: Polish
```

### Critical Path for US2

```
T005-T007 (Shared Infrastructure)
    │
    ▼
T022-T024 (GAME_FINISHED Publisher)  ← Must complete before T069
    │
    ▼
T069 (GameFinishedSubscriber)
    │
    ▼
US2 can be independently tested
```

### Within Each User Story

- Tests (with [P]) MUST be written and FAIL before implementation
- Domain entities before application use cases
- Application use cases before adapters
- Adapters before API endpoints
- API endpoints before frontend components

### Parallel Opportunities

- All Setup tasks (T001-T004) can run in parallel
- All Foundational tasks marked [P] can run in parallel within their sections
- Phase 2.1, 2.2, 2.3 can start in parallel
- US4 and US1 can start in parallel after Phase 2.5 completes
- US2 can start after Phase 2.4 completes (independent of US1/US4)
- All tests marked [P] can run in parallel within a user story
- All domain entities marked [P] can run in parallel
- Frontend components marked [P] can be developed in parallel

---

## Parallel Example: User Story 1

```bash
# Launch all domain tests for US1 together:
Task: T033 "Write unit tests for DailyPlayerScore"
Task: T034 "Write unit tests for LeaderboardEntry"

# Launch all domain implementations for US1 together:
Task: T035 "Implement DailyPlayerScore entity"
Task: T036 "Implement LeaderboardEntry value object"

# Launch all application tests for US1 together:
Task: T039 "Write unit tests for GetDailyLeaderboardUseCase"
Task: T040 "Write unit tests for GetWeeklyLeaderboardUseCase"
```

---

## Implementation Strategy

### MVP First (User Story 4 + 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 4 (Navigation)
4. Complete Phase 4: User Story 1 (Leaderboard)
5. **STOP and VALIDATE**: Test US4 + US1 independently
6. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add US4 → Navigation simplified
3. Add US1 → Leaderboard functional → Deploy/Demo (MVP!)
4. Add US2 → Personal stats → Deploy/Demo
5. Add US3 → Yaku stats → Deploy/Demo
6. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: US4 (Frontend Navigation)
   - Developer B: US1 Backend (Domain + Application + Adapter)
   - Developer C: US1 Frontend (Components)
3. After US1 complete:
   - Developer A: US2 Backend
   - Developer B: US2 Frontend
   - Developer C: US3 (depends on US2)

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing (TDD)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence

## Summary

- **Total Tasks**: 95
- **Phase 1 (Setup)**: T001-T004 (4 tasks)
- **Phase 2 (Foundational)**: T005-T028 (24 tasks)
  - 2.1 Shared Infrastructure: T005-T007
  - 2.2 Database Schema: T008-T010
  - 2.3 Core-Game Cleanup: T011-T021
  - 2.4 Event Publisher: T022-T024
  - 2.5 Domain Foundation: T025-T028
- **Phase 3 (US4)**: T029-T032 (4 tasks)
- **Phase 4 (US1)**: T033-T056 (24 tasks)
- **Phase 5 (US2)**: T057-T081 (25 tasks)
- **Phase 6 (US3)**: T082-T086 (5 tasks)
- **Phase 7 (Polish)**: T087-T095 (9 tasks)
