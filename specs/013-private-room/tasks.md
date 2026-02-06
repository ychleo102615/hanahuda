# Tasks: 遊戲私房功能

**Input**: Design documents from `/specs/013-private-room/`
**Prerequisites**: plan.md, spec.md, data-model.md, research.md, contracts/, quickstart.md

**Tests**: Included (Constitution Principle V: Test-First, Domain/Application >80% coverage)

**Organization**: Tasks grouped by user story. US2 and US6 combined (join triggers game flow).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: Install dependencies and shared type extensions

- [ ] T001 Install nanoid dependency via `pnpm --prefix front-end add nanoid`
- [ ] T002 Extend MatchType with 'PRIVATE' in `front-end/server/shared/infrastructure/event-bus/types.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Domain model, repository, ports, and in-memory store that ALL user stories depend on

**CRITICAL**: No user story work can begin until this phase is complete

### Tests for Foundational

> **Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T003 [P] PrivateRoom aggregate unit tests: create, join (→FULL), state transitions, validation rules in `front-end/server/matchmaking/domain/__tests__/privateRoom.spec.ts`
- [ ] T004 [P] RoomInvitation value object unit tests: creation, shareUrl generation in `front-end/server/matchmaking/domain/__tests__/roomInvitation.spec.ts`
- [ ] T005 [P] InMemoryPrivateRoomStore unit tests: save, findByRoomId, findByPlayerId, findAllWaiting, findAllFull, delete in `front-end/server/matchmaking/adapters/persistence/__tests__/inMemoryPrivateRoomStore.spec.ts`

### Implementation for Foundational

- [ ] T006 [P] Create PrivateRoom aggregate root with state machine (WAITING/FULL/IN_GAME/EXPIRED/DISSOLVED), factory methods (create/reconstitute), transition methods, Room ID generation (NanoID + custom alphabet per R-002) in `front-end/server/matchmaking/domain/privateRoom.ts`
- [ ] T007 [P] Create RoomInvitation value object with roomId, shareUrl, expiresAt in `front-end/server/matchmaking/domain/roomInvitation.ts`
- [ ] T008 [P] Create PrivateRoomRepositoryPort abstract class (save, findByRoomId, findById, findByPlayerId, delete, findAllWaiting, findAllFull) in `front-end/server/matchmaking/application/ports/output/privateRoomRepositoryPort.ts`
- [ ] T009 [P] Create PlayerConnectionPort abstract class (isConnected) in `front-end/server/matchmaking/application/ports/output/playerConnectionPort.ts`
- [ ] T010 Create InMemoryPrivateRoomStore implementing PrivateRoomRepositoryPort, with singleton pattern (getInMemoryPrivateRoomStore/resetInMemoryPrivateRoomStore) in `front-end/server/matchmaking/adapters/persistence/inMemoryPrivateRoomStore.ts`

**Checkpoint**: Foundation ready - Domain model tested, repository operational

---

## Phase 3: User Story 1 - 建立私人房間 (Priority: P1) MVP

**Goal**: 玩家在大廳建立房間，獲得 roomId/shareUrl，導航至 Game Page 看到等待畫面

**Independent Test**: 單一玩家建立房間 → 獲得 roomId → 導航到 Game Page → 看到等待畫面（含分享連結、倒數計時）

### Tests for User Story 1

- [ ] T011 [P] [US1] CreatePrivateRoomUseCase unit tests: success case, PLAYER_IN_GAME error, PLAYER_IN_MATCHMAKING error, PLAYER_IN_ROOM error in `front-end/server/matchmaking/application/use-cases/__tests__/createPrivateRoomUseCase.spec.ts`
- [ ] T012 [P] [US1] POST /api/private-room/create integration test in `front-end/server/matchmaking/adapters/__tests__/createPrivateRoomApi.spec.ts`
- [ ] T013 [P] [US1] privateRoomStore unit tests: setWaitingState, clearState in `front-end/app/game-client/adapter/stores/__tests__/privateRoomStore.spec.ts`

### Implementation for User Story 1

- [ ] T014 [P] [US1] Create CreatePrivateRoomInputPort abstract class (execute with playerId, playerName, roomType → success/error response) in `front-end/server/matchmaking/application/ports/input/createPrivateRoomInputPort.ts`
- [ ] T015 [US1] Implement CreatePrivateRoomUseCase: mutual exclusion checks (hasActiveGame, hasPlayer in pool, findByPlayerId in repo), create PrivateRoom, save, return roomId/shareUrl/expiresAt in `front-end/server/matchmaking/application/use-cases/createPrivateRoomUseCase.ts`
- [ ] T016 [US1] Create POST /api/private-room/create.post.ts endpoint: cookie auth, Zod validation, call use case, return response per API contract in `front-end/server/api/private-room/create.post.ts`
- [ ] T017 [US1] Register CreatePrivateRoomUseCase in DI container, extend MatchmakingContainer type in `front-end/server/matchmaking/adapters/di/container.ts`
- [ ] T018 [US1] Extend PlayerStatusService to detect private room status (IN_PRIVATE_ROOM) by checking InMemoryPrivateRoomStore.findByPlayerId in `front-end/server/gateway/playerStatusService.ts`
- [ ] T019 [US1] Extend HandleGatewayConnectedUseCase to handle IN_PRIVATE_ROOM status (set privateRoomStore state) in `front-end/app/game-client/application/use-cases/HandleGatewayConnectedUseCase.ts`
- [ ] T020 [P] [US1] Create privateRoomStore (Pinia): roomId, shareUrl, expiresAt, hostName, status (waiting/full/playing), actions for setWaitingState/clearState in `front-end/app/game-client/adapter/stores/privateRoomStore.ts`
- [ ] T021 [US1] Create PrivateRoomPanel component: display roomId, shareUrl (copy button), countdown timer, shown on Game Page when privateRoomStore.status === 'waiting' in `front-end/app/game-client/adapter/components/PrivateRoomPanel.vue`

**Checkpoint**: Player can create a room from lobby, navigate to Game Page, see waiting UI with share link and countdown

---

## Phase 4: User Story 2 + User Story 6 - 加入私房 & 遊戲流程 (Priority: P1)

**Goal**: 訪客透過 ID 加入房間 → 雙方 SSE 就位 → MATCH_FOUND → 遊戲自動開始（與普通配對一致）

**Independent Test**: 房主建立房間 → 訪客輸入 roomId 加入 → 雙方在 Game Page → 遊戲自動開始 → 完整遊戲流程

### Tests for User Story 2 + 6

- [ ] T022 [P] [US2] JoinPrivateRoomUseCase unit tests: success (→FULL), ROOM_NOT_FOUND, ROOM_EXPIRED, ROOM_FULL, CANNOT_JOIN_OWN_ROOM, player mutual exclusion errors in `front-end/server/matchmaking/application/use-cases/__tests__/joinPrivateRoomUseCase.spec.ts`
- [ ] T023 [P] [US6] StartPrivateRoomGameUseCase unit tests: both connected → publish MATCH_FOUND, one not connected → no-op, room not FULL → no-op in `front-end/server/matchmaking/application/use-cases/__tests__/startPrivateRoomGameUseCase.spec.ts`

### Implementation for User Story 2 + 6

- [ ] T024 [P] [US2] Create JoinPrivateRoomInputPort abstract class in `front-end/server/matchmaking/application/ports/input/joinPrivateRoomInputPort.ts`
- [ ] T025 [P] [US6] Create StartPrivateRoomGameInputPort abstract class in `front-end/server/matchmaking/application/ports/input/startPrivateRoomGameInputPort.ts`
- [ ] T026 [US2] Implement JoinPrivateRoomUseCase: validate room exists/not expired/not full, mutual exclusion checks, add guest, transition WAITING→FULL (do NOT publish MATCH_FOUND) in `front-end/server/matchmaking/application/use-cases/joinPrivateRoomUseCase.ts`
- [ ] T027 [US6] Implement StartPrivateRoomGameUseCase: check room FULL + both players SSE connected via PlayerConnectionPort → publish MATCH_FOUND via MatchmakingEventPublisherPort, transition FULL→IN_GAME in `front-end/server/matchmaking/application/use-cases/startPrivateRoomGameUseCase.ts`
- [ ] T028 [US2] Create POST /api/private-room/[roomId]/join.post.ts endpoint: cookie auth, path param validation, call use case in `front-end/server/api/private-room/[roomId]/join.post.ts`
- [ ] T029 [US6] Create PlayerConnectionPort adapter wrapping playerConnectionManager.isConnected() in `front-end/server/matchmaking/adapters/connection/playerConnectionAdapter.ts`
- [ ] T030 [US6] Add FULL room trigger in events.get.ts: after registerConnection + getPlayerStatus, if status is IN_PRIVATE_ROOM and room is FULL, call startPrivateRoomGameUseCase in `front-end/server/api/v1/events.get.ts`
- [ ] T031 [US2] Register JoinPrivateRoomUseCase, StartPrivateRoomGameUseCase, PlayerConnectionAdapter in DI container in `front-end/server/matchmaking/adapters/di/container.ts`

**Checkpoint**: Full end-to-end flow works - create room → join → both SSE connect → MatchFound → GameStarted → RoundDealt → play game

---

## Phase 5: User Story 5 - 解散房間 (Priority: P2)

**Goal**: 房主可以在等待階段主動解散房間，所有房內玩家返回大廳

**Independent Test**: 房主建立房間 → 點擊解散 → 房間消失 → 返回大廳

### Tests for User Story 5

- [ ] T032 [P] [US5] DissolvePrivateRoomUseCase unit tests: success (host dissolves), NOT_HOST error, ROOM_IN_GAME error, notify guest via SSE in `front-end/server/matchmaking/application/use-cases/__tests__/dissolvePrivateRoomUseCase.spec.ts`

### Implementation for User Story 5

- [ ] T033 [P] [US5] Create DissolvePrivateRoomInputPort abstract class in `front-end/server/matchmaking/application/ports/input/dissolvePrivateRoomInputPort.ts`
- [ ] T034 [US5] Implement DissolvePrivateRoomUseCase: verify host, transition to DISSOLVED, publish RoomDissolved SSE event to room players, clear timeouts in `front-end/server/matchmaking/application/use-cases/dissolvePrivateRoomUseCase.ts`
- [ ] T035 [US5] Create POST /api/private-room/[roomId]/dissolve.post.ts endpoint in `front-end/server/api/private-room/[roomId]/dissolve.post.ts`
- [ ] T036 [US5] Register DissolvePrivateRoomUseCase in DI container in `front-end/server/matchmaking/adapters/di/container.ts`
- [ ] T037 [US5] Add RoomDissolved event handler on frontend: register in MatchmakingEventRouter, create HandleRoomDissolvedUseCase (clear privateRoomStore, navigate to lobby) in `front-end/app/game-client/application/use-cases/private-room/HandleRoomDissolvedUseCase.ts` and register in `front-end/app/game-client/adapter/router/MatchmakingEventRouter.ts`

**Checkpoint**: Host can dissolve room, both players return to lobby

---

## Phase 6: User Story 4 - 有效期限管理 (Priority: P2)

**Goal**: 房間 10 分鐘自動過期，剩餘 2 分鐘時提醒

**Independent Test**: 建立房間 → 等待 8 分鐘 → 收到 RoomExpiring → 等待 2 分鐘 → 房間自動解散

### Tests for User Story 4

- [ ] T038 [P] [US4] PrivateRoomTimeoutManager unit tests: expiration timer fires, warning timer fires at 8min, clearAllTimeouts works, disconnection timer in `front-end/server/matchmaking/adapters/timeout/__tests__/privateRoomTimeoutManager.spec.ts`

### Implementation for User Story 4

- [ ] T039 [US4] Create PrivateRoomTimeoutManager: expirationTimers (Map), warningTimers (Map), disconnectionTimers (Map), setExpirationTimeout/setWarningTimeout/setDisconnectionTimeout/clearAllTimeouts per R-003 in `front-end/server/matchmaking/adapters/timeout/privateRoomTimeoutManager.ts`
- [ ] T040 [US4] Integrate TimeoutManager with CreatePrivateRoomUseCase: start expiration (10min) and warning (8min) timers on room creation in `front-end/server/matchmaking/application/use-cases/createPrivateRoomUseCase.ts`
- [ ] T041 [US4] Implement expiry callback: transition room to EXPIRED, publish RoomDissolved (reason: EXPIRED) SSE event, clean up room in `front-end/server/matchmaking/application/use-cases/createPrivateRoomUseCase.ts`
- [ ] T042 [US4] Implement warning callback: publish RoomExpiring SSE event with remaining_seconds in `front-end/server/matchmaking/application/use-cases/createPrivateRoomUseCase.ts`
- [ ] T043 [US4] Add RoomExpiring event handler on frontend: register in MatchmakingEventRouter, create HandleRoomExpiringUseCase (show warning in PrivateRoomPanel) in `front-end/app/game-client/application/use-cases/private-room/HandleRoomExpiringUseCase.ts` and register in `front-end/app/game-client/adapter/router/MatchmakingEventRouter.ts`
- [ ] T044 [US4] Clear timeouts on dissolve and game start: integrate with DissolvePrivateRoomUseCase and StartPrivateRoomGameUseCase in respective use case files

**Checkpoint**: Room auto-expires at 10 minutes, warning shown at 8 minutes

---

## Phase 7: User Story 3 - 透過連結加入私房 (Priority: P2)

**Goal**: 玩家點擊分享連結直接加入房間

**Independent Test**: 點擊房間連結 → (若未登入先登入) → 自動加入房間 → 遊戲開始

### Implementation for User Story 3

- [ ] T045 [US3] Create room/[roomId].vue page: extract roomId from route, POST join API, handle errors (show toast + redirect to lobby), navigateTo('/game') on success in `front-end/app/pages/room/[roomId].vue`
- [ ] T046 [US3] Handle unauthenticated access: redirect to login with return URL query param, after login redirect back to /room/{roomId} in `front-end/app/pages/room/[roomId].vue`

**Checkpoint**: Share link flow works end-to-end, including login redirect

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Edge cases, status API, mutual exclusion enforcement

- [ ] T047 Create GET /api/private-room/[roomId]/status.get.ts endpoint per API contract in `front-end/server/api/private-room/[roomId]/status.get.ts`
- [ ] T048 Add private room mutual exclusion check to enterMatchmakingUseCase: reject if player has active private room (findByPlayerId) in `front-end/server/matchmaking/application/use-cases/enterMatchmakingUseCase.ts`
- [ ] T049 Implement host disconnection timeout (30s): detect SSE disconnect in playerConnectionManager, start disconnection timer, auto-dissolve room in `front-end/server/matchmaking/adapters/timeout/privateRoomTimeoutManager.ts` and `front-end/server/api/v1/events.get.ts`
- [ ] T050 Add shared SSE event type contracts for RoomDissolved, RoomExpiring in `front-end/shared/contracts/privateRoomEvents.ts`
- [ ] T051 Run quickstart.md validation: verify all API endpoints respond correctly, SSE events fire as expected

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies
- **Foundational (Phase 2)**: Depends on Phase 1
- **US1 (Phase 3)**: Depends on Phase 2
- **US2+US6 (Phase 4)**: Depends on Phase 3 (need room to join)
- **US5 (Phase 5)**: Depends on Phase 3 (need room to dissolve)
- **US4 (Phase 6)**: Depends on Phase 3 (need room creation for timers)
- **US3 (Phase 7)**: Depends on Phase 4 (reuses join logic)
- **Polish (Phase 8)**: Depends on Phases 3-7

### User Story Dependencies

- **US1 (P1)**: After Foundational → independently testable
- **US2+US6 (P1)**: After US1 → independently testable (create + join + play)
- **US5 (P2)**: After US1 → independently testable (create + dissolve)
- **US4 (P2)**: After US1 → independently testable (create + wait for expiry)
- **US3 (P2)**: After US2+US6 → independently testable (link join + play)

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Ports before use cases
- Use cases before API endpoints
- Backend before frontend
- DI registration after use case implementation

### Parallel Opportunities

- T003, T004, T005 (all foundational tests) in parallel
- T006, T007, T008, T009 (domain + ports) in parallel
- T011, T012, T013 (US1 tests) in parallel
- T014, T020 (US1 port + store) in parallel
- T022, T023 (US2+US6 tests) in parallel
- T024, T025 (US2+US6 ports) in parallel
- Phase 5, Phase 6 can run in parallel (both depend only on Phase 3)

---

## Parallel Example: Foundational Phase

```
# Launch all foundational tests together:
T003: PrivateRoom aggregate tests
T004: RoomInvitation VO tests
T005: InMemoryPrivateRoomStore tests

# Launch domain + ports together:
T006: PrivateRoom aggregate root
T007: RoomInvitation value object
T008: PrivateRoomRepositoryPort
T009: PlayerConnectionPort
```

## Parallel Example: User Story 1

```
# Launch tests together:
T011: CreatePrivateRoomUseCase tests
T012: API integration tests
T013: privateRoomStore tests

# Launch port + frontend store together:
T014: CreatePrivateRoomInputPort
T020: privateRoomStore (Pinia)
```

---

## Implementation Strategy

### MVP First (US1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: US1 - 建立私人房間
4. **STOP and VALIDATE**: Player can create room, see waiting UI
5. Demo ready

### Core Complete (US1 + US2 + US6)

6. Complete Phase 4: US2+US6 - 加入 & 遊戲流程
7. **STOP and VALIDATE**: Full game flow works end-to-end

### Full Feature

8. Complete Phase 5: US5 - 解散房間
9. Complete Phase 6: US4 - 有效期限管理
10. Complete Phase 7: US3 - 透過連結加入
11. Complete Phase 8: Polish
12. **FINAL VALIDATION**: All acceptance scenarios pass

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story
- NanoID alphabet: `23456789ABCDEFGHJKLMNPQRSTUVWXYZ` (R-002)
- SSE events use `createMatchmakingEvent()` helper (R-004)
- PlayerConnectionPort wraps existing `playerConnectionManager.isConnected()` (R-006)
- FULL state is the key differentiator from regular matchmaking (R-006)
- Existing `GameCreationHandler` and `GameStartService` are NOT modified
