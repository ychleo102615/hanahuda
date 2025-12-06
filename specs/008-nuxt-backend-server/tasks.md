# Tasks: Nuxt Backend Server

**Input**: Design documents from `/specs/008-nuxt-backend-server/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Tests are NOT included as they were not explicitly requested in the feature specification.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Frontend/Backend**: `front-end/` directory (Nuxt fullstack)
- **Shared Types**: `front-end/shared/types/`
- **Server Code**: `front-end/server/`
- **Database**: `front-end/server/database/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and dependency installation

- [x] T001 Install Drizzle ORM and related dependencies via `pnpm add drizzle-orm postgres && pnpm add -D drizzle-kit @types/pg` in `front-end/`
- [x] T002 [P] Install Zod for request validation via `pnpm add zod` in `front-end/`
- [x] T003 Create directory structure per plan.md in `front-end/server/` (api, application, domain, adapters, database)
- [x] T004 Create `.env` file with DATABASE_URL and game timing settings in `front-end/`
- [x] T005 Create Drizzle config file in `front-end/drizzle.config.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Shared Types Migration

- [x] T006 Create `front-end/shared/types/` directory and move SSE event types from existing frontend types
- [x] T007 [P] Create `front-end/shared/types/commands.ts` with command type definitions
- [x] T008 [P] Create `front-end/shared/types/shared.ts` with shared data structures (CardPlay, Yaku, PlayerScore, Ruleset, etc.)
- [x] T009 [P] Create `front-end/shared/types/flow-state.ts` with FlowState type definition
- [x] T010 [P] Create `front-end/shared/types/errors.ts` with error code types (ErrorCode, GameErrorCode)
- [x] T011 [P] Create `front-end/shared/types/events.ts` with SSE event type definitions (GameStartedEvent, RoundDealtEvent, etc.)
- [x] T012 Create `front-end/shared/types/index.ts` to re-export all shared types
- [x] T013 Update `front-end/app/user-interface/application/types/index.ts` to re-export from `~/shared/types`

### Database Schema

- [x] T014 Create `front-end/server/database/schema/games.ts` with games table schema (Drizzle)
- [x] T015 [P] Create `front-end/server/database/schema/gameSnapshots.ts` with game_snapshots table schema
- [x] T016 [P] Create `front-end/server/database/schema/playerStats.ts` with player_stats table schema
- [x] T017 [P] Create `front-end/server/database/schema/sessions.ts` with sessions table schema
- [x] T018 Create `front-end/server/database/schema/index.ts` to export all schemas
- [x] T019 Create `front-end/server/utils/db.ts` with Drizzle client initialization
- [x] T020 Run `pnpm drizzle-kit generate` and `pnpm drizzle-kit migrate` to create database tables

### Core Infrastructure

- [x] T021 Create `front-end/server/utils/config.ts` with environment configuration (timeouts, delays)
- [x] T022 [P] Create `front-end/server/adapters/event-publisher/connectionStore.ts` with SSE connection management
- [x] T023 [P] Create `front-end/server/adapters/event-publisher/gameEventBus.ts` with EventEmitter-based pub/sub
- [x] T024 Create `front-end/server/adapters/persistence/inMemoryGameStore.ts` with Map-based active game storage
- [x] T025 Create `front-end/server/api/health.get.ts` health check endpoint for verification

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - 玩家從 GameLobby 加入遊戲並與假玩家配對 (Priority: P1) 🎯 MVP

**Goal**: 玩家可發送 GameRequestJoin 請求，系統建立遊戲會話並自動配對假玩家，透過 SSE 接收遊戲開始事件

**Independent Test**: 發送 POST /api/v1/games/join → 收到 game_id 和 session_token → 建立 SSE 連線 → 收到 GameStarted 和 RoundDealt 事件

### Domain Layer for US1

- [x] T026 [P] [US1] Create `front-end/server/domain/game/player.ts` with Player entity (id, name, isAi)
- [x] T027 [P] [US1] Create `front-end/server/domain/round/koiStatus.ts` with KoiStatus value object
- [x] T028 [P] [US1] Create `front-end/server/domain/services/deckService.ts` with createShuffledDeck() and deal() methods
- [x] T029 [US1] Create `front-end/server/domain/round/round.ts` with Round entity (field, deck, playerStates, flowState)
- [x] T030 [US1] Create `front-end/server/domain/game/game.ts` with Game aggregate root (players, ruleset, currentRound, status)

### Application Layer for US1

- [x] T031 [P] [US1] Create `front-end/server/application/ports/output/gameRepositoryPort.ts` with GameRepository interface
- [x] T032 [P] [US1] Create `front-end/server/application/ports/output/eventPublisherPort.ts` with EventPublisher interface
- [x] T033 [US1] Create `front-end/server/application/use-cases/joinGameUseCase.ts` with execute() method for joining/creating games

### Adapter Layer for US1

- [x] T034 [P] [US1] Create `front-end/server/adapters/mappers/dtos.ts` with ScoreMultipliers, NextState, YakuUpdate DTOs
- [x] T035 [P] [US1] Create `front-end/server/adapters/mappers/eventMapper.ts` with Domain → SSE Event conversion
- [x] T036 [US1] Implement `front-end/server/adapters/persistence/drizzleGameRepository.ts` with GameRepositoryPort
- [x] T037 [US1] Implement `front-end/server/adapters/event-publisher/sseEventPublisher.ts` with EventPublisherPort

### API Layer for US1

- [x] T038 [US1] Create `front-end/server/api/v1/games/join.post.ts` with Zod validation and JoinGameUseCase call
- [x] T039 [US1] Create `front-end/server/api/v1/games/[gameId]/events.get.ts` with SSE eventStream and session validation

**Checkpoint**: User Story 1 complete - players can join games and receive GameStarted/RoundDealt events

---

## Phase 4: User Story 2 - 玩家執行回合操作（打牌、配對、決策）(Priority: P1)

**Goal**: 玩家可在回合中打出手牌、選擇配對目標、並在形成役種時決策 Koi-Koi

**Independent Test**: 模擬完整回合流程（打牌 → 翻牌 → 配對選擇 → Koi-Koi 決策）並驗證對應 SSE 事件

### Domain Layer for US2

- [ ] T040 [P] [US2] Create `front-end/server/domain/services/matchingService.ts` with canMatch() and findMatchableTargets()
- [ ] T041 [P] [US2] Create `front-end/server/domain/services/yakuDetectionService.ts` with detectYaku() and detectNewYaku()
- [ ] T042 [US2] Extend `front-end/server/domain/round/round.ts` with playHandCard(), selectTarget(), handleDecision() methods
- [ ] T042b [US2] Create FlowState transition validator in `front-end/server/domain/round/flowStateTransitions.ts` with valid state paths (AWAITING_HAND_PLAY → AWAITING_SELECTION/AWAITING_DECISION, etc.)
- [ ] T043 [US2] Extend `front-end/server/domain/game/game.ts` with turn execution and state transition logic

### Application Layer for US2

- [ ] T044 [US2] Create `front-end/server/application/use-cases/playHandCardUseCase.ts` with card play validation and event generation
- [ ] T045 [US2] Create `front-end/server/application/use-cases/selectTargetUseCase.ts` with target selection logic
- [ ] T046 [US2] Create `front-end/server/application/use-cases/makeDecisionUseCase.ts` with Koi-Koi decision handling

### Adapter Layer for US2

- [ ] T047 [US2] Extend `front-end/server/adapters/mappers/eventMapper.ts` with TurnCompleted, SelectionRequired, DecisionRequired event mapping
- [ ] T048 [US2] Create middleware for session token validation in `front-end/server/middleware/` or inline in handlers

### API Layer for US2

- [ ] T049 [US2] Create `front-end/server/api/v1/games/[gameId]/turns/play-card.post.ts` with PlayHandCardUseCase call
- [ ] T050 [US2] Create `front-end/server/api/v1/games/[gameId]/turns/select-target.post.ts` with SelectTargetUseCase call
- [ ] T051 [US2] Create `front-end/server/api/v1/games/[gameId]/rounds/decision.post.ts` with MakeDecisionUseCase call

**Checkpoint**: User Story 2 complete - players can execute full turn operations

---

## Phase 5: User Story 3 - 假玩家自動執行回合（模擬思考時間）(Priority: P1)

**Goal**: 假玩家在輪到自己時自動執行打牌、配對選擇和 Koi-Koi 決策，帶有模擬延遲

**Independent Test**: 觀察假玩家回合時 SSE 事件在模擬延遲（4.5-6秒）後自動推送

### Application Layer for US3

- [ ] T052 [US3] Create `front-end/server/application/ports/output/opponentActionPort.ts` with OpponentActionPort interface

### Adapter Layer for US3

- [ ] T053 [US3] Create `front-end/server/adapters/opponent/randomOpponentService.ts` with random strategy and simulated delays
- [ ] T054 [US3] Create `front-end/server/adapters/timeout/actionTimeoutManager.ts` with timer management (action_timeout_seconds + 3s buffer before triggering timeout)
- [ ] T055 [US3] Integrate opponent service into Use Cases - modify `front-end/server/application/use-cases/playHandCardUseCase.ts` to trigger opponent turn

**Checkpoint**: User Story 3 complete - AI opponent executes turns automatically with realistic delays

---

## Phase 6: User Story 4 - 完成一場遊戲（多局制）(Priority: P2)

**Goal**: 玩家與假玩家完成指定局數的遊戲，系統計算最終勝負

**Independent Test**: 模擬完整 2 局遊戲流程並驗證 GameFinished 事件

### Domain Layer for US4

- [ ] T056 [US4] Extend `front-end/server/domain/game/game.ts` with startNextRound(), finishGame(), calculateWinner() methods
- [ ] T056b [US4] Implement Teshi (手四) and Kuttsuki (場牌流局) detection in `front-end/server/domain/services/specialRulesService.ts` with RoundEndedInstantly event trigger
- [ ] T057 [US4] Extend `front-end/server/domain/round/round.ts` with endRound() and score calculation logic

### Application Layer for US4

- [ ] T058 [US4] Create `front-end/server/application/use-cases/transitionRoundUseCase.ts` with display_timeout delay and next round initialization
- [ ] T059 [US4] Create `front-end/server/application/use-cases/leaveGameUseCase.ts` with early game termination handling

### Adapter Layer for US4

- [ ] T060 [US4] Extend `front-end/server/adapters/mappers/eventMapper.ts` with RoundScored, RoundDrawn, RoundEndedInstantly, GameFinished mapping
- [ ] T061 [US4] Create display timeout scheduler in `front-end/server/adapters/timeout/displayTimeoutManager.ts`

### API Layer for US4

- [ ] T062 [US4] Create `front-end/server/api/v1/games/[gameId]/leave.post.ts` with LeaveGameUseCase call

**Checkpoint**: User Story 4 complete - full multi-round games can be completed

---

## Phase 7: User Story 5 - 斷線重連與後端代管操作 (Priority: P2)

**Goal**: 玩家斷線後後端持續遊戲流程，玩家可在遊戲結束前重連恢復狀態

**Independent Test**: 模擬斷線（關閉 SSE）並重新發送 GameRequestJoin（含 session_token）驗證 GameSnapshotRestore

### Domain Layer for US5

- [ ] T063 [US5] Extend `front-end/server/domain/game/game.ts` with toSnapshot() method for state serialization

### Application Layer for US5

- [ ] T064 [US5] Extend `front-end/server/application/use-cases/joinGameUseCase.ts` with reconnection logic (session_token validation)
- [ ] T065 [US5] Create `front-end/server/application/use-cases/autoActionUseCase.ts` with minimal impact strategy for timeout actions

### Adapter Layer for US5

- [ ] T066 [US5] Extend `front-end/server/adapters/timeout/actionTimeoutManager.ts` with auto-action trigger on timeout
- [ ] T067 [US5] Create disconnect timeout handler in `front-end/server/adapters/timeout/disconnectTimeoutManager.ts` (60s limit)
- [ ] T068 [US5] Extend `front-end/server/adapters/mappers/eventMapper.ts` with GameSnapshotRestore and GameError mapping
- [ ] T069 [US5] Extend `front-end/server/adapters/persistence/drizzleGameRepository.ts` with snapshot save/load

### API Layer for US5

- [ ] T070 [US5] Create `front-end/server/api/v1/games/[gameId]/snapshot.get.ts` with snapshot retrieval (SSE fallback)

**Checkpoint**: User Story 5 complete - reconnection and auto-action work correctly

---

## Phase 8: User Story 6 - 記錄玩家遊戲統計 (Priority: P3)

**Goal**: 系統記錄玩家的遊戲統計數據，包含總分、對局次數、勝敗等

**Independent Test**: 完成遊戲後查詢資料庫驗證統計數據更新

### Application Layer for US6

- [ ] T071 [P] [US6] Create `front-end/server/application/ports/output/playerStatsRepositoryPort.ts` with PlayerStatsRepository interface
- [ ] T072 [US6] Create `front-end/server/application/use-cases/recordGameStatsUseCase.ts` with stats calculation and recording

### Adapter Layer for US6

- [ ] T073 [US6] Create `front-end/server/adapters/persistence/drizzlePlayerStatsRepository.ts` with PlayerStatsRepositoryPort implementation
- [ ] T074 [US6] Integrate stats recording into game finish flow in `front-end/server/application/use-cases/transitionRoundUseCase.ts`

**Checkpoint**: User Story 6 complete - player statistics are recorded after each game

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T075 [P] Add comprehensive error handling and logging across all API endpoints
- [ ] T076 [P] Implement rate limiting as specified in contracts/rest-api.md (10 req/min for join, 60 req/min for turns)
- [ ] T077 Add SSE heartbeat (keepalive every 30 seconds) in `front-end/server/api/v1/games/[gameId]/events.get.ts`
- [ ] T078 Implement game cleanup scheduler to remove expired games from memory
- [ ] T079 Run quickstart.md validation - verify all commands work as documented
- [ ] T080 Final integration test - complete a full game manually from join to finish

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-8)**: All depend on Foundational phase completion
  - US1, US2, US3 are all P1 priority but have logical dependencies:
    - US2 depends on US1 (need game/SSE before turns)
    - US3 depends on US2 (need turn logic before AI)
  - US4, US5 are P2 priority and can proceed after P1 stories
  - US6 is P3 priority and can proceed after US4
- **Polish (Phase 9)**: Depends on all user stories being complete

### User Story Dependencies

```
Phase 2 (Foundational)
       │
       ▼
   ┌───────┐
   │  US1  │ ← MVP entry point
   └───────┘
       │
       ▼
   ┌───────┐
   │  US2  │ ← Requires game/SSE from US1
   └───────┘
       │
       ▼
   ┌───────┐
   │  US3  │ ← Requires turn logic from US2
   └───────┘
       │
   ┌───┴───┐
   ▼       ▼
┌─────┐ ┌─────┐
│ US4 │ │ US5 │ ← Can be parallel after US3
└─────┘ └─────┘
   │
   ▼
┌─────┐
│ US6 │ ← Requires game completion from US4
└─────┘
```

### Within Each User Story

- Domain layer before Application layer
- Application layer before Adapter layer
- Adapter layer before API layer
- Core implementation before integration

### Parallel Opportunities

**Phase 1 (Setup)**:
- T001 and T002 can run in parallel (different dependencies)

**Phase 2 (Foundational)**:
- T007, T008, T009, T010, T011 can run in parallel (different type files)
- T014, T015, T016, T017 can run in parallel (different schema files)
- T022, T023 can run in parallel (different infrastructure files)

**Each User Story**:
- Domain entities marked [P] within same story can run in parallel
- Different user stories should be done sequentially due to dependencies

---

## Parallel Example: Foundational Phase

```bash
# Launch all type definitions together:
Task: "Create front-end/shared/types/commands.ts"
Task: "Create front-end/shared/types/shared.ts"
Task: "Create front-end/shared/types/flow-state.ts"
Task: "Create front-end/shared/types/errors.ts"
Task: "Create front-end/shared/types/events.ts"

# Launch all database schemas together:
Task: "Create front-end/server/database/schema/games.ts"
Task: "Create front-end/server/database/schema/gameSnapshots.ts"
Task: "Create front-end/server/database/schema/playerStats.ts"
Task: "Create front-end/server/database/schema/sessions.ts"
```

---

## Implementation Strategy

### MVP First (User Stories 1-3 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (Join + SSE)
4. Complete Phase 4: User Story 2 (Turn Operations)
5. Complete Phase 5: User Story 3 (AI Opponent)
6. **STOP and VALIDATE**: Test a complete player-vs-AI game
7. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add US1 → Test SSE connection → Demo: "Players can join"
3. Add US2 → Test turn operations → Demo: "Players can play cards"
4. Add US3 → Test AI turns → Demo: "AI opponent works" (MVP!)
5. Add US4 → Test multi-round → Demo: "Full games work"
6. Add US5 → Test reconnection → Demo: "Reconnection works"
7. Add US6 → Test stats → Demo: "Stats are recorded"

### Suggested MVP Scope

**MVP = User Stories 1, 2, 3 (all P1)**

This provides:
- Player can join game and connect via SSE
- Player can play turns (hand play, target selection, Koi-Koi decision)
- AI opponent responds with realistic delays
- A complete single-round game experience

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
- All file paths are relative to repository root
- Remember: Domain Layer has NO framework dependencies (pure TypeScript)
