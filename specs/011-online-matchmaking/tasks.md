# Tasks: Online Matchmaking with Tiered Fallback

**Input**: Design documents from `/specs/011-online-matchmaking/`
**Prerequisites**: plan.md, spec.md, data-model.md, contracts/matchmaking-api.yaml, research.md

**Tests**: Included per Constitution V (Test-First Development, >80% coverage on Domain/Application layers)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Backend**: `front-end/server/` (Nuxt 4 Nitro)
- **Frontend**: `front-end/app/` (Vue 3.5)
- **Shared Types**: `front-end/server/shared/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create Event Bus infrastructure in Shared Infrastructure layer (required by all BCs)

- [X] T001 Create directory structure for Matchmaking BC in `front-end/server/matchmaking/` with domain/, application/, adapters/ subdirectories
- [X] T002 [P] Create Shared Infrastructure event bus types in `front-end/server/shared/infrastructure/event-bus/types.ts` (MatchFoundPayload, RoomCreatedPayload per research.md)
- [X] T003 [P] Implement InternalEventBus singleton in `front-end/server/shared/infrastructure/event-bus/internalEventBus.ts` (in-memory EventEmitter pattern)
- [X] T004 Create barrel export in `front-end/server/shared/infrastructure/event-bus/index.ts`

---

## Phase 2: Foundational (Domain Layer + All Ports)

**Purpose**: Domain entities, value objects, and all port interfaces that ALL user stories depend on

**CRITICAL**: No user story work can begin until this phase is complete

### Domain Layer

- [X] T005 [P] Create MatchmakingEntry entity in `front-end/server/matchmaking/domain/matchmakingEntry.ts` (id, playerId, playerName, roomType, status, enteredAt per data-model.md)
- [X] T006 [P] Create MatchResult value object in `front-end/server/matchmaking/domain/matchResult.ts` (player1Id, player2Id, roomType, matchType, matchedAt)
- [X] T007 [P] Create MatchmakingStatus value object in `front-end/server/matchmaking/domain/matchmakingStatus.ts` (status, message, elapsedSeconds)
- [X] T008 [P] Create domain events in `front-end/server/matchmaking/domain/matchmakingEvents.ts` (PlayerEnteredQueue, MatchFound, PlayerLeftQueue)
- [X] T009 Create MatchmakingPool aggregate root in `front-end/server/matchmaking/domain/matchmakingPool.ts` (add, remove, findByPlayerId, findMatch, getByRoomType, updateStatus per data-model.md)

### Domain Layer Tests

- [X] T010 [P] Write unit tests for MatchmakingEntry in `front-end/tests/server/matchmaking/domain/matchmakingEntry.test.ts`
- [X] T011 [P] Write unit tests for MatchResult in `front-end/tests/server/matchmaking/domain/matchResult.test.ts`
- [X] T012 Write unit tests for MatchmakingPool in `front-end/tests/server/matchmaking/domain/matchmakingPool.test.ts` (FIFO ordering, no duplicate playerIds, room type grouping)

### Application Ports (Contracts)

- [X] T013 [P] Create EnterMatchmakingInputPort in `front-end/server/matchmaking/application/ports/input/enterMatchmakingInputPort.ts`
- [X] T014 [P] Create CancelMatchmakingInputPort in `front-end/server/matchmaking/application/ports/input/cancelMatchmakingInputPort.ts`
- [X] T015 [P] Create CheckMatchmakingStatusInputPort in `front-end/server/matchmaking/application/ports/input/checkMatchmakingStatusInputPort.ts`
- [X] T016 [P] Create MatchmakingPoolPort (output) in `front-end/server/matchmaking/application/ports/output/matchmakingPoolPort.ts`
- [X] T017 [P] Create MatchmakingEventPublisherPort in `front-end/server/matchmaking/application/ports/output/matchmakingEventPublisherPort.ts`
- [X] T018 [P] Create PlayerGameStatusPort in `front-end/server/matchmaking/application/ports/output/playerGameStatusPort.ts` (hasActiveGame method per research.md Section 7)

**Checkpoint**: Foundation ready - Domain contracts established, user story implementation can begin

---

## Phase 3: User Story 1 - Successful Human Player Match (Priority: P1)

**Goal**: Two players can enter matchmaking and get matched together within 10 seconds

**Independent Test**: Have two browser windows enter matchmaking simultaneously; both should be matched and see each other's names

### Tests for User Story 1

- [X] T019 Write unit tests for EnterMatchmakingUseCase in `front-end/tests/server/matchmaking/application/use-cases/enterMatchmakingUseCase.test.ts` (success, already in queue, already in game)
- [X] T020 [P] Write unit tests for ProcessMatchmakingUseCase in `front-end/tests/server/matchmaking/application/use-cases/processMatchmakingUseCase.test.ts` (human match found, no match available)

### Implementation for User Story 1

- [X] T021 Implement EnterMatchmakingUseCase in `front-end/server/matchmaking/application/use-cases/enterMatchmakingUseCase.ts` (validate player not in queue/game, add to pool, trigger matching)
- [X] T022 Implement ProcessMatchmakingUseCase in `front-end/server/matchmaking/application/use-cases/processMatchmakingUseCase.ts` (find match in same room type, publish MATCH_FOUND)
- [X] T023 Implement InMemoryMatchmakingPool adapter in `front-end/server/matchmaking/adapters/persistence/inMemoryMatchmakingPool.ts`
- [X] T024 [P] Implement MatchmakingEventBusAdapter in `front-end/server/matchmaking/adapters/event-publisher/matchmakingEventBusAdapter.ts` (delegate to shared event bus)
- [X] T025 [P] Create MatchmakingMapper in `front-end/server/matchmaking/adapters/mappers/matchmakingMapper.ts` (domain to DTO conversions)
- [X] T026 Implement gameCreationHandler in `front-end/server/core-game/adapters/event-subscriber/gameCreationHandler.ts` (subscribe to MATCH_FOUND, create game session)
- [X] T027 [P] Implement PlayerGameStatusAdapter in `front-end/server/core-game/adapters/query/playerGameStatusAdapter.ts` (check if player has active game)
- [X] T028 Implement POST /matchmaking/enter endpoint in `front-end/server/api/v1/matchmaking/enter.post.ts` (per contracts/matchmaking-api.yaml)
- [X] T029 Create Matchmaking plugin in `front-end/server/plugins/matchmaking.ts` (initialize adapters and registry)

**Checkpoint**: Human-to-human matching works; two players can be matched together

---

## Phase 4: User Story 2 - Tiered Status Messages (Priority: P1)

**Goal**: Player sees progressive status updates (0-10s: SEARCHING, 10-15s: LOW_AVAILABILITY)

**Independent Test**: Single player enters matchmaking; observe status changes at 10s threshold

### Tests for User Story 2

- [X] T030 Write unit tests for MatchmakingRegistry timer logic in `front-end/tests/server/matchmaking/adapters/registry/matchmakingRegistry.test.ts` (status transitions at 10s)

### Implementation for User Story 2

- [X] T031 Implement MatchmakingRegistry in `front-end/server/matchmaking/adapters/registry/matchmakingRegistry.ts` (per-entry timers, 10s LOW_AVAILABILITY transition per research.md Section 3)
- [X] T032 Implement GET /matchmaking/status SSE endpoint in `front-end/server/api/v1/matchmaking/status.get.ts` (stream MatchmakingStatusEvent per contracts/)
- [X] T033 [P] Create HandleMatchmakingStatusUseCase in `front-end/app/user-interface/application/use-cases/matchmaking/HandleMatchmakingStatusUseCase.ts` (update UI state on status events)
- [X] T034 Extend game page in `front-end/app/pages/game/index.vue` to handle matchmaking state and display status messages

**Checkpoint**: Status messages update correctly at time thresholds

---

## Phase 5: User Story 3 - Automatic Bot Fallback (Priority: P1)

**Goal**: After 15 seconds without human match, player is automatically matched with Bot

**Independent Test**: Single player enters matchmaking; after 15s, game starts with "Computer" opponent

### Tests for User Story 3

- [X] T035 Write unit tests for bot fallback in `front-end/tests/server/matchmaking/adapters/registry/matchmakingRegistry.test.ts` (15s timeout triggers bot match)

### Implementation for User Story 3

- [X] T036 Add 15s bot fallback timer logic to MatchmakingRegistry in `front-end/server/matchmaking/adapters/registry/matchmakingRegistry.ts` (publish MATCH_FOUND with matchType='BOT')
- [X] T037 Update gameCreationHandler in `front-end/server/core-game/adapters/event-subscriber/gameCreationHandler.ts` to trigger ROOM_CREATED for bot matches (existing Opponent BC flow)
- [X] T038 [P] Create HandleMatchFoundUseCase in `front-end/app/user-interface/application/use-cases/matchmaking/HandleMatchFoundUseCase.ts` (navigate to game SSE on match found)
- [X] T039 Update game page in `front-end/app/pages/game/index.vue` to transition from matchmaking SSE to game SSE on MatchFound event

**Checkpoint**: Bot fallback works; single player always gets a game after 15s

---

## Phase 6: User Story 4 - Cancel Matchmaking (Priority: P2)

**Goal**: Player can cancel matchmaking at any time and return to lobby

**Independent Test**: Enter matchmaking, click cancel at various stages; player should return to lobby cleanly

### Tests for User Story 4

- [X] T040 Write unit tests for CancelMatchmakingUseCase in `front-end/tests/server/matchmaking/application/use-cases/cancelMatchmakingUseCase.test.ts` (success, not in queue)

### Implementation for User Story 4

- [X] T041 Implement CancelMatchmakingUseCase in `front-end/server/matchmaking/application/use-cases/cancelMatchmakingUseCase.ts` (remove from pool, clear timers, publish PlayerLeftQueue)
- [X] T042 Implement POST /matchmaking/cancel endpoint in `front-end/server/api/v1/matchmaking/cancel.post.ts` (per contracts/matchmaking-api.yaml)
- [X] T043 Add cancel logic to MatchmakingRegistry in `front-end/server/matchmaking/adapters/registry/matchmakingRegistry.ts` (clearMatchmakingTimers, send MatchmakingCancelled event)
- [X] T044 Add cancel button and handler to game page in `front-end/app/pages/game/index.vue` (navigate back to lobby on cancel)

**Checkpoint**: Cancel works at any matchmaking stage; player returns to lobby cleanly

---

## Phase 7: User Story 5 - Same Room Type Matching (Priority: P2)

**Goal**: Players are only matched with others who selected the same room type

**Independent Test**: Two players select different room types; verify they are NOT matched despite being available

### Tests for User Story 5

- [X] T045 Write unit tests for room type segregation in `front-end/tests/server/matchmaking/domain/matchmakingPool.test.ts` (players with different room types not matched)

### Implementation for User Story 5

- [X] T046 Verify MatchmakingPool.findMatch() respects room type in `front-end/server/matchmaking/domain/matchmakingPool.ts` (already designed, add explicit test assertions)
- [X] T047 Add integration test for cross-room-type rejection in `front-end/tests/server/matchmaking/domain/matchmakingPool.test.ts`

**Checkpoint**: Room type segregation works; 0% cross-room-type matches

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Edge cases, cleanup, and validation

- [ ] T048 Add disconnect handling to MatchmakingRegistry in `front-end/server/matchmaking/adapters/registry/matchmakingRegistry.ts` (remove player on SSE disconnect)
- [ ] T049 [P] Add session expiry handling in `front-end/server/api/v1/matchmaking/enter.post.ts` (redirect to re-authenticate)
- [ ] T050 [P] Add human match priority at 15s boundary in `front-end/server/matchmaking/adapters/registry/matchmakingRegistry.ts` (per FR-010)
- [ ] T051 Run quickstart.md validation (test 2-browser flow, single-player bot fallback, API cURL commands)
- [ ] T052 Run type-check and lint across all new files

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1: Setup
    ↓
Phase 2: Foundational (BLOCKS all user stories)
    ↓
    ├── Phase 3: US1 (Human Match) ←── MVP Core
    │       ↓
    ├── Phase 4: US2 (Status Messages) ←── Depends on US1 infrastructure
    │       ↓
    └── Phase 5: US3 (Bot Fallback) ←── Depends on US1+US2 infrastructure
            ↓
Phase 6: US4 (Cancel) ←── Can start after Phase 2, independent of US1-US3
    ↓
Phase 7: US5 (Room Type) ←── Inherent in domain design, verification only
    ↓
Phase 8: Polish
```

### User Story Dependencies

| Story | Depends On | Can Start After |
|-------|------------|-----------------|
| US1 (Human Match) | Foundational | Phase 2 complete |
| US2 (Status Messages) | US1 infrastructure | T031 after T029 |
| US3 (Bot Fallback) | US1 + US2 | T036 after T031 |
| US4 (Cancel) | Foundational only | Phase 2 complete (parallel with US1) |
| US5 (Room Type) | Domain design | Phase 2 (verification in T045-T047) |

### Within Each Phase

- Tests written FIRST, verify they FAIL before implementation
- Domain before Application
- Ports before Use Cases
- Use Cases before Adapters
- Adapters before API endpoints
- Backend before Frontend

### Parallel Opportunities

**Phase 1 (all [P] tasks)**:
```
T002: Event bus types
T003: InternalEventBus
```

**Phase 2 (all [P] tasks)**:
```
T005: MatchmakingEntry    T010: Entry tests
T006: MatchResult         T011: Result tests
T007: MatchmakingStatus
T008: Domain events
T013-T018: All ports (parallel)
```

**Phase 3 (after T021)**:
```
T024: EventBusAdapter     T025: Mapper
T027: PlayerGameStatusAdapter
```

---

## Parallel Example: Phase 2 Domain Layer

```bash
# Launch all domain entities in parallel:
Task T005: "Create MatchmakingEntry entity"
Task T006: "Create MatchResult value object"
Task T007: "Create MatchmakingStatus value object"
Task T008: "Create domain events"

# Then aggregate root (depends on entities):
Task T009: "Create MatchmakingPool aggregate root"

# Launch all ports in parallel:
Task T013-T018: "All input/output ports"
```

---

## Implementation Strategy

### MVP First (US1 + US2 + US3)

1. Complete Phase 1: Setup (T001-T004)
2. Complete Phase 2: Foundational (T005-T018)
3. Complete Phase 3: US1 Human Match (T019-T029)
4. Complete Phase 4: US2 Status Messages (T030-T034)
5. Complete Phase 5: US3 Bot Fallback (T035-T039)
6. **VALIDATE**: Test with quickstart.md scenarios
7. Deploy MVP

### Incremental Delivery

1. Setup + Foundational → Domain contracts established
2. Add US1 → Human matching works
3. Add US2 → Status feedback works
4. Add US3 → Bot fallback works → **MVP Complete!**
5. Add US4 → Cancel works
6. Add US5 → Room type verification
7. Polish → Production ready

---

## Summary

| Metric | Count | Completed |
|--------|-------|-----------|
| Total Tasks | 52 | 47 |
| Phase 1 (Setup) | 4 | 4 ✅ |
| Phase 2 (Foundational) | 14 | 14 ✅ |
| Phase 3 (US1) | 11 | 11 ✅ |
| Phase 4 (US2) | 5 | 5 ✅ |
| Phase 5 (US3) | 5 | 5 ✅ |
| Phase 6 (US4) | 5 | 5 ✅ |
| Phase 7 (US5) | 3 | 3 ✅ |
| Phase 8 (Polish) | 5 | 0 |
| Parallelizable [P] | 18 | - |

**MVP Scope**: Phases 1-7 (US1-US5) = 47 tasks ✅ Complete
**Full Feature**: All 52 tasks

### MVP Status: ✅ Complete (716 tests passing)
- All API endpoints implemented (Backend + Frontend)
- All Use Cases implemented
- All Domain entities and aggregates
- Event Bus integration complete
- Room type segregation verified
- Frontend matchmaking UI implemented
- Cancel button and navigation working

### Remaining Tasks (Phase 8: Polish):
- T048: Disconnect handling
- T049: Session expiry handling
- T050: Human match priority at 15s
- T051: End-to-end validation
- T052: Type-check and lint verification
