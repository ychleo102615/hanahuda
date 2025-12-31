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
  - ✅ **已重新實作**：Server 中立配對邏輯
  - **實作內容**：
    1. 查找等待中的遊戲（status: WAITING）
    2. 若無等待中遊戲 → 建立新遊戲，狀態為 WAITING，返回 game_id
    3. 若有等待中遊戲 → 加入成為 Player 2，狀態改為 IN_PROGRESS
  - ✅ **不直接建立 AI**：AI 配對由 OpponentService 透過事件監聽處理（T056）
  - ✅ **已預留**：InternalEventPublisherPort 注入點（TODO 標記）
  - **連鎖修改**：T030（addSecondPlayerAndStart）、T031/T036（findWaitingGame, saveSession）

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

- [x] T040 [P] [US2] Create `front-end/server/domain/services/matchingService.ts` with canMatch() and findMatchableTargets()
- [x] T041 [P] [US2] Create `front-end/server/domain/services/yakuDetectionService.ts` with detectYaku() and detectNewYaku()
- [x] T042 [US2] Extend `front-end/server/domain/round/round.ts` with playHandCard(), selectTarget(), handleDecision() methods
- [x] T042b [US2] Create FlowState transition validator in `front-end/server/domain/round/flowStateTransitions.ts` with valid state paths (AWAITING_HAND_PLAY → AWAITING_SELECTION/AWAITING_DECISION, etc.)
- [x] T043 [US2] Extend `front-end/server/domain/game/game.ts` with turn execution and state transition logic

### Application Layer for US2

- [x] T044 [US2] Create `front-end/server/application/use-cases/playHandCardUseCase.ts` with card play validation and event generation
- [x] T045 [US2] Create `front-end/server/application/use-cases/selectTargetUseCase.ts` with target selection logic
- [x] T046 [US2] Create `front-end/server/application/use-cases/makeDecisionUseCase.ts` with Koi-Koi decision handling

### Adapter Layer for US2

- [x] T047 [US2] Extend `front-end/server/adapters/mappers/eventMapper.ts` with TurnCompleted, SelectionRequired, DecisionRequired event mapping
- [x] T048 [US2] Create middleware for session token validation in `front-end/server/utils/sessionValidation.ts`

### API Layer for US2

- [x] T049 [US2] Create `front-end/server/api/v1/games/[gameId]/turns/play-card.post.ts` with PlayHandCardUseCase call
- [x] T050 [US2] Create `front-end/server/api/v1/games/[gameId]/turns/select-target.post.ts` with SelectTargetUseCase call
- [x] T051 [US2] Create `front-end/server/api/v1/games/[gameId]/rounds/decision.post.ts` with MakeDecisionUseCase call

**Checkpoint**: User Story 2 complete - players can execute full turn operations

---

## Phase 5: User Story 3 - 假玩家自動執行回合（模擬思考時間）(Priority: P1)

**Goal**: 假玩家在輪到自己時自動執行打牌、配對選擇和 Koi-Koi 決策，帶有模擬延遲

**Independent Test**: 觀察假玩家回合時 SSE 事件在模擬延遲（4.5-6秒）後自動推送

**Architecture Note**: 採用事件驅動架構，Server 保持中立不區分玩家類型。OpponentService 監聽內部事件並呼叫 Use Cases（與人類玩家相同路徑）。

### 架構設計 - 事件通道語意區分

| 通道類型 | 用途 | 發布者 | 訂閱者 |
|---------|------|--------|--------|
| **InternalEventBus** | 僅限 `ROOM_CREATED` | JoinGameUseCase | OpponentService |
| **OpponentEventBus** | AI 專用遊戲事件路由 | SSEEventPublisher | OpponentService |
| **SSE (connectionStore)** | Normal Client 遊戲事件 | SSEEventPublisher | Browser SSE Client |

### Application Layer for US3

- [x] T052 [P] [US3] Create `front-end/server/application/ports/output/internalEventPublisherPort.ts` with InternalEventPublisherPort interface
  - ✅ **僅包含 `publishRoomCreated`**：其他遊戲事件透過 EventPublisher 路由
- [x] T057b [P] [US3] Create Input Ports for Use Cases (DIP 依賴反轉)
  - `front-end/server/application/ports/input/joinGameInputPort.ts`
  - `front-end/server/application/ports/input/playHandCardInputPort.ts`
  - `front-end/server/application/ports/input/selectTargetInputPort.ts`
  - `front-end/server/application/ports/input/makeDecisionInputPort.ts`
  - `front-end/server/application/ports/input/index.ts`
  - ✅ **Use Cases implements Input Ports**：`JoinGameUseCase implements JoinGameInputPort`

### Adapter Layer for US3

- [x] T053 [US3] Create `front-end/server/adapters/event-publisher/internalEventBus.ts` implementing InternalEventPublisherPort
  - ✅ **僅處理 ROOM_CREATED**：不處理遊戲進行中的事件
- [x] T053b [US3] Create `front-end/server/adapters/event-publisher/opponentEventBus.ts` AI 專用遊戲事件匯流排
  - ✅ **語意區分**：與 gameEventBus（SSE 用）平行的通道，專門給 OpponentService 使用
- [x] T054 [US3] Create `front-end/server/adapters/opponent/opponentService.ts` AI 對手服務
  - ✅ **定位**：Adapter Layer Controller（類似 REST Controller，接收事件並呼叫 Use Cases）
  - ✅ **依賴 Input Ports**：非 Use Case 實作類別，遵循 DIP
  - ✅ **監聽 ROOM_CREATED**：透過 InternalEventBus → 自動建立 AI 並加入遊戲
  - ✅ **訂閱 OpponentEventBus**：監聽遊戲事件，判斷是否該 AI 行動
  - ✅ **時序控制**：3s 動畫延遲 + 1.5-3s 隨機思考延遲
  - ✅ **AI 策略**：隨機選牌、隨機選擇配對目標、MVP 直接 END_ROUND
- [x] T055 [US3] Create `front-end/server/adapters/timeout/actionTimeoutManager.ts` 操作超時管理器
  - ✅ **scheduleAction**：用於 AI 操作的延遲排程
  - ✅ **startTimeout/clearTimeout**：預留給 Phase 7 的 autoAction 功能
- [x] T056 [US3] Update `front-end/server/application/use-cases/joinGameUseCase.ts`
  - ✅ 注入 `InternalEventPublisherPort` 依賴
  - ✅ 建立新遊戲時（WAITING 狀態）→ 發布 `ROOM_CREATED` 內部事件
  - ✅ `implements JoinGameInputPort`
- [x] T057 [US3] Update `front-end/server/adapters/event-publisher/sseEventPublisher.ts` 事件路由
  - ✅ **不在 Use Cases 發布內部事件**：事件路由由 SSEEventPublisher 負責
  - ✅ **路由邏輯**：若 `next_state.active_player_id` 是 AI → 額外發布到 `opponentEventBus`
  - ✅ **SSE 永遠廣播**：所有 Normal Clients 透過 SSE 收到事件
- [x] T058 [US3] Create Composition Root
  - ✅ `front-end/server/utils/container.ts`：依賴注入容器，建立和組裝所有依賴
  - ✅ `front-end/server/plugins/opponent.ts`：Nitro Plugin，初始化 OpponentService
  - ✅ **API 端點更新**：`join.post.ts`、`play-card.post.ts`、`select-target.post.ts`、`decision.post.ts` 改用 `container` 取得 Use Cases

**Checkpoint**: User Story 3 complete - AI opponent executes turns automatically with realistic delays via event-driven architecture

---

## Phase 6: User Story 4 - 完成一場遊戲（多局制）(Priority: P2)

**Goal**: 玩家與假玩家完成指定局數的遊戲，系統計算最終勝負

**Independent Test**: 模擬完整 2 局遊戲流程並驗證 GameFinished 事件

### Domain Layer for US4

- [x] T059 [US4] Extend `front-end/server/domain/game/game.ts` with startNextRound(), finishGame(), calculateWinner() methods
- [x] T059b [US4] Implement Teshi (手四) and Kuttsuki (場牌流局) detection in `front-end/server/domain/services/specialRulesService.ts` with RoundEndedInstantly event trigger
- [x] T060 [US4] Extend `front-end/server/domain/round/round.ts` with endRound() and score calculation logic

### Application Layer for US4

- [x] T061 [US4] ~~Create `front-end/server/application/use-cases/transitionRoundUseCase.ts`~~ **實作位置變更**
  - ⚠️ **獨立 Use Case 未建立**：display_timeout delay 和 next round initialization 功能整合於 `makeDecisionUseCase.ts` 行 162-176
  - ✅ 使用 `setTimeout` 延遲發送 `RoundDealt` 事件
  - ✅ 延遲時間由 `gameConfig.display_timeout_seconds` 控制
- [x] T062 [US4] Create `front-end/server/application/use-cases/leaveGameUseCase.ts` with early game termination handling

### Adapter Layer for US4

- [x] T063 [US4] Extend `front-end/server/adapters/mappers/eventMapper.ts` with RoundScored, RoundDrawn, RoundEndedInstantly, GameFinished mapping
- [x] T064 [US4] Create display timeout scheduler in `front-end/server/adapters/timeout/displayTimeoutManager.ts`
  - ✅ 已建立 `DisplayTimeoutPort` 介面 (`ports/output/displayTimeoutPort.ts`)
  - ✅ `displayTimeoutManager` 實作 `DisplayTimeoutPort`
  - ✅ 已整合至 `makeDecisionUseCase.ts`，透過依賴注入使用

### API Layer for US4

- [x] T065 [US4] Create `front-end/server/api/v1/games/[gameId]/leave.post.ts` with LeaveGameUseCase call

**Checkpoint**: User Story 4 complete - full multi-round games can be completed

---

## Phase 7: User Story 5 - 斷線重連與後端代管操作 (Priority: P2)

**Goal**: 玩家斷線後後端持續遊戲流程，玩家可在遊戲結束前重連恢復狀態

**Independent Test**: 模擬斷線（關閉 SSE）並重新發送 GameRequestJoin（含 session_token）驗證 GameSnapshotRestore

### 設計決策：純記憶體快照策略

**決策**：快照不寫入資料庫，僅存於 `inMemoryGameStore`

**原因**：
- MVP 階段簡化實作複雜度
- 避免頻繁 DB 寫入（每次操作都要更新快照）
- 伺服器重啟遺失進行中遊戲 → MVP 可接受

**權衡**：
- ✅ 實作簡單
- ✅ 效能好（無 DB I/O）
- ❌ 伺服器重啟後無法恢復
- ❌ 無法支援多實例部署（需 Redis 等共享儲存）

### Domain Layer for US5

- [x] T066 [US5] Extend `front-end/server/domain/game/game.ts` with toSnapshot() method for state serialization
  - ✅ 新增 `GameSnapshot` 介面
  - ✅ 新增 `toSnapshot(game: Game): GameSnapshot | null` 函數

### Application Layer for US5

- [x] T067 [US5] Extend `front-end/server/application/use-cases/joinGameUseCase.ts` with reconnection logic (session_token validation)
  - ✅ **重連流程**：
    1. 驗證 session_token 是否對應有效遊戲
    2. 驗證玩家是否屬於此遊戲
    3. 遊戲狀態為 FINISHED → 拋出錯誤
    4. 遊戲狀態為 IN_PROGRESS → 排程發送 GameSnapshotRestore 事件（延遲 100ms）
  - ✅ 新增 `scheduleSnapshotEvent()` 方法
  - ✅ 新增 `EventPublisherPort.publishToPlayer()` 方法
- [x] T068 [US5] Create `front-end/server/application/use-cases/autoActionUseCase.ts` with minimal impact strategy for timeout actions
  - ✅ **最小影響策略**：
    - 打牌：選最低價值卡（カス > 短冊 > 種札 > 光札）
    - 選擇配對：選擇第一個有效目標
    - 決策：永遠選擇 END_ROUND
  - ✅ 新增 `front-end/server/application/ports/input/autoActionInputPort.ts`

### Adapter Layer for US5

- [x] T069 [US5] Extend Use Cases with auto-action timeout integration
  - ✅ `playHandCardUseCase.ts` - 清除當前超時、設定下一玩家/狀態超時
  - ✅ `selectTargetUseCase.ts` - 清除當前超時、設定下一玩家/決策超時
  - ✅ `makeDecisionUseCase.ts` - 清除當前超時、設定下一玩家/新回合超時
  - ✅ 使用 Proxy 模式解決循環依賴（container.ts）
- [x] T070 [US5] Create disconnect timeout handler in `front-end/server/adapters/timeout/disconnectTimeoutManager.ts` (60s limit)
  - ✅ 在 SSE 連線關閉時啟動 60 秒斷線超時
  - ✅ 在 SSE 連線建立時清除斷線超時（重連）
  - ✅ 超時後呼叫 `leaveGameUseCase.execute()` 結束遊戲
- [x] T071 [US5] Extend `front-end/server/adapters/mappers/eventMapper.ts` with GameSnapshotRestore and GameError mapping
  - ✅ 新增 `toGameSnapshotRestoreEvent(game: Game): GameSnapshotRestore`
  - ✅ 新增 `toGameErrorEvent(errorCode, message, recoverable, suggestedAction?): GameErrorEvent`
- [x] T072 [US5] ~~Extend drizzleGameRepository.ts with snapshot save/load~~ **已取消 - 採用純記憶體策略**
  - ⚠️ **設計決策變更**：不使用 DB 持久化快照
  - ✅ 快照從 `inMemoryGameStore` 取得

### API Layer for US5

- [x] T073 [US5] Create `front-end/server/api/v1/games/[gameId]/snapshot.get.ts` with snapshot retrieval (SSE fallback)
  - ✅ 驗證 session token
  - ✅ 回傳 JSON 格式的 GameSnapshotRestore 結構

### Clean Architecture 修正 (Phase 7 後追加)

- [x] T073b [US5] Create `front-end/server/application/ports/output/actionTimeoutPort.ts` with ActionTimeoutPort interface
  - ✅ 將 Port 定義從 Use Case 移至獨立檔案
- [x] T073c [US5] Create `front-end/server/application/ports/output/disconnectTimeoutPort.ts` with DisconnectTimeoutPort interface
  - ✅ 為斷線超時管理器建立標準 Port
- [x] T073d [US5] Update Use Cases and Services to use standard Ports
  - ✅ `playHandCardUseCase.ts` - 使用 ActionTimeoutPort
  - ✅ `selectTargetUseCase.ts` - 使用 ActionTimeoutPort
  - ✅ `makeDecisionUseCase.ts` - 使用 ActionTimeoutPort
  - ✅ `opponentService.ts` - 移除 ActionTimeoutManagerLike，使用標準 Port

**Checkpoint**: User Story 5 complete - reconnection and auto-action work correctly

---

## Phase 8: User Story 6 - 記錄玩家遊戲統計 (Priority: P3)

**Goal**: 系統記錄玩家的遊戲統計數據，包含總分、對局次數、勝敗等

**Independent Test**: 完成遊戲後查詢資料庫驗證統計數據更新

### Application Layer for US6

- [x] T074 [P] [US6] Create `front-end/server/application/ports/output/playerStatsRepositoryPort.ts` with PlayerStatsRepository interface
- [x] T075 [US6] Create `front-end/server/application/use-cases/recordGameStatsUseCase.ts` with stats calculation and recording
  - ✅ 新增 `front-end/server/application/ports/input/recordGameStatsInputPort.ts` Input Port
  - ✅ 只記錄人類玩家統計，不記錄 AI 玩家

### Adapter Layer for US6

- [x] T076 [US6] Create `front-end/server/adapters/persistence/drizzlePlayerStatsRepository.ts` with PlayerStatsRepositoryPort implementation
  - ✅ 使用 PostgreSQL JSONB 合併役種計數
  - ✅ 使用 SQL 原子性累加數值欄位
- [x] T077 [US6] Integrate stats recording into game finish flow
  - ⚠️ **實作位置變更**：整合至 `makeDecisionUseCase.ts` 和 `leaveGameUseCase.ts`（而非 transitionRoundUseCase.ts）
  - ✅ `makeDecisionUseCase.ts` - 遊戲正常結束時記錄統計
  - ✅ `leaveGameUseCase.ts` - 玩家離開/投降時記錄統計
  - ✅ `container.ts` - 新增 recordGameStatsUseCase 依賴注入

**Checkpoint**: User Story 6 complete - player statistics are recorded after each game

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T078 [P] Add comprehensive error handling and logging across all API endpoints
  - ✅ 新增 `front-end/server/utils/logger.ts` - 結構化日誌工具
  - ✅ 新增 `front-end/server/utils/requestId.ts` - 請求 ID 追蹤
  - ✅ 更新所有 API endpoints 使用新日誌系統：
    - `join.post.ts`, `leave.post.ts`, `play-card.post.ts`
    - `select-target.post.ts`, `decision.post.ts`, `snapshot.get.ts`
  - ✅ 日誌格式: `[timestamp] [level] [module] [requestId] message {data}`
- [x] T079 [P] Implement rate limiting as specified in contracts/rest-api.md (10 req/min for join, 60 req/min for turns)
  - ✅ 新增 `front-end/server/utils/rateLimiter.ts` - 滑動視窗限速器
  - ✅ 新增 `front-end/server/middleware/rateLimit.ts` - Nitro 中間件
  - ✅ 限制配置: join 10/min, turns 60/min
  - ✅ 返回標準 Rate Limit headers (X-RateLimit-*)
  - ✅ 超限返回 429 Too Many Requests
- [x] T080 Add SSE heartbeat (keepalive every 30 seconds) in `front-end/server/api/v1/games/[gameId]/events.get.ts`
  - ✅ 已實作於 `events.get.ts` 第 106-115 行
  - ✅ 心跳間隔由 `gameConfig.sse_heartbeat_interval_seconds` 控制（預設 30 秒）
  - ✅ 格式: `: heartbeat {ISO-timestamp}`
- [x] T081 Implement game cleanup scheduler to remove expired games from memory
  - ✅ 新增 `front-end/server/plugins/gameCleanup.ts` - Nitro Plugin
  - ✅ 每 5 分鐘執行清理
  - ✅ 清理 updatedAt > 30 分鐘的非 IN_PROGRESS 遊戲
  - ✅ 使用現有的 `inMemoryGameStore.cleanupExpired()` 方法
- [x] T082 Run quickstart.md validation - verify all commands work as documented
  - ✅ `pnpm run type-check` 通過
  - ✅ 更新 quickstart.md 的目錄結構文件（新增 middleware/, plugins/, timeout/）
  - ✅ 驗證伺服器目錄結構與文件描述一致
- [ ] T083 Final integration test - complete a full game manually from join to finish
  - ⚠️ **需手動執行**：需要 PostgreSQL 資料庫運行
  - **測試步驟**：
    1. 啟動開發伺服器：`cd front-end && pnpm dev`
    2. 檢查健康狀態：`curl http://localhost:3000/api/health`
    3. 發送 join 請求：`curl -X POST http://localhost:3000/api/v1/games/join -H "Content-Type: application/json" -d '{"player_id":"uuid","player_name":"Player1"}'`
    4. 建立 SSE 連線並觀察 GameStarted/RoundDealt 事件
    5. 執行遊戲操作（play-card, select-target, decision）
    6. 驗證 AI 對手回應
    7. 測試斷線重連（關閉 SSE 後重新 join）
    8. 驗證遊戲結束和清理

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

### 實作差異記錄

以下任務的實作位置與原始描述不同：

| Task | 原始描述 | 實際實作 |
|------|---------|---------|
| T061 | `transitionRoundUseCase.ts` | 功能整合於 `makeDecisionUseCase.ts` |
| T077 | 整合至 `transitionRoundUseCase.ts` | 整合至 `makeDecisionUseCase.ts` 和 `leaveGameUseCase.ts` |

**原因**：
- `transitionRoundUseCase.ts` 作為獨立 Use Case 的設計未被採用
- Round 轉換邏輯直接在 `makeDecisionUseCase.ts` 的 `END_ROUND` 分支處理
- 這是合理的簡化，因為 round transition 總是在 decision 後立即發生

