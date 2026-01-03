# Tasks: 玩家帳號功能 (Player Account System)

**Input**: Design documents from `/specs/010-player-account/`
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/ ✓

**Tests**: 根據 spec.md 中的 Test-First Development 要求，Domain/Application Layer 需 TDD，覆蓋率 > 80%

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Backend**: `front-end/server/` (Nitro)
- **Frontend**: `front-end/app/` (Nuxt)
- **Database**: `front-end/server/database/schema/`
- **Shared**: `front-end/shared/contracts/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and dependency installation

- [x] T001 Install new dependencies (bcryptjs, arctic, @types/bcryptjs) in `front-end/package.json`
- [x] T002 [P] Create shared type definitions at `front-end/shared/contracts/identity-types.ts` (copy from contracts/)
- [x] T003 [P] Create shared auth commands at `front-end/shared/contracts/auth-commands.ts`
- [x] T004 [P] Add OAuth environment variables template to `.env.example`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### 2.1 Core Game BC 隔離 (Pre-requisite Refactoring)

- [x] T005 Create `front-end/server/core-game/` directory structure
- [x] T006 Move `front-end/server/domain/` to `front-end/server/core-game/domain/`
- [x] T007 Move `front-end/server/application/` to `front-end/server/core-game/application/`
- [x] T008 Move `front-end/server/adapters/` to `front-end/server/core-game/adapters/`
- [x] T009 Update all import paths in Core Game BC files
- [x] T010 Update API routes in `front-end/server/api/v1/games/` to reference new paths
- [x] T011 Run existing tests to verify refactoring success

### 2.2 Identity BC Directory Structure

- [x] T012 [P] Create backend Identity BC structure at `front-end/server/identity/{domain,application,adapters}/`
- [x] T013 [P] Create frontend Identity BC structure at `front-end/app/identity/{domain,application,adapter}/`

### 2.3 Database Schema

- [x] T014 Create `front-end/server/database/schema/players.ts` (Player table)
- [x] T015 Create `front-end/server/database/schema/accounts.ts` (Account table, depends on players)
- [x] T016 Create `front-end/server/database/schema/oauthLinks.ts` (OAuthLink table, depends on accounts)
- [x] T017 Update `front-end/server/database/schema/index.ts` to export new schemas
- [x] T018 Run `pnpm db:push` to sync schema to database

**Checkpoint**: Foundation ready - user story implementation can now begin ✅

---

## Phase 3: User Story 1 - 訪客遊玩 (Priority: P1) 🎯 MVP

**Goal**: 玩家首次造訪無需註冊即可遊玩，系統自動建立臨時身份並透過 Cookie 記住

**Independent Test**: 清除 Cookie 後造訪網站，驗證自動建立臨時身份；不清除 Cookie 重新造訪確認身份保留

**Related FRs**: FR-007, FR-008, FR-010, FR-018, FR-019, FR-020, FR-021

### 3.1 Tests for US1

- [x] T019 [P] [US1] Unit test for Player domain model at `front-end/tests/server/identity/domain/player.test.ts`
- [x] T020 [P] [US1] Unit test for GuestToken value object at `front-end/tests/server/identity/domain/guest-token.test.ts`
- [x] T021 [P] [US1] Unit test for CreateGuestUseCase at `front-end/tests/server/identity/application/create-guest-use-case.test.ts`
- [x] T022 [P] [US1] Unit test for GetCurrentPlayerUseCase at `front-end/tests/server/identity/application/get-current-player-use-case.test.ts`
- [x] T022a [P] [US1] Unit test for Session sliding expiration (FR-012) at `front-end/tests/server/identity/domain/session.test.ts`

### 3.2 Backend Domain Layer for US1

- [x] T023 [P] [US1] Create Player aggregate at `front-end/server/identity/domain/player/player.ts`
- [x] T024 [P] [US1] Create PlayerFactory at `front-end/server/identity/domain/player/player-factory.ts`
- [x] T025 [P] [US1] Create Session value object at `front-end/server/identity/domain/types/session.ts`
- [x] T026 [P] [US1] Create GuestToken value object at `front-end/server/identity/domain/types/guest-token.ts`

### 3.3 Backend Application Layer for US1

- [x] T027 [P] [US1] Create PlayerRepositoryPort at `front-end/server/identity/application/ports/output/player-repository-port.ts`
- [x] T028 [P] [US1] Create SessionStorePort at `front-end/server/identity/application/ports/output/session-store-port.ts`
- [x] T029 [US1] Create CreateGuestUseCase at `front-end/server/identity/application/use-cases/create-guest-use-case.ts`
- [x] T030 [US1] Create GetCurrentPlayerUseCase at `front-end/server/identity/application/use-cases/get-current-player-use-case.ts`

### 3.4 Backend Adapter Layer for US1

- [x] T031 [US1] Implement DrizzlePlayerRepository at `front-end/server/identity/adapters/persistence/drizzle-player-repository.ts`
- [x] T032 [US1] Implement InMemorySessionStore at `front-end/server/identity/adapters/session/in-memory-session-store.ts`
- [x] T033 [US1] Create DI container for Identity BC at `front-end/server/identity/adapters/di/container.ts`

### 3.5 Backend API Routes for US1

- [x] T034 [US1] Create POST `/api/v1/auth/guest` at `front-end/server/api/v1/auth/guest.post.ts`
- [x] T035 [US1] Create GET `/api/v1/auth/me` at `front-end/server/api/v1/auth/me.get.ts`

### 3.6 Frontend Domain Layer for US1

- [x] T036 [P] [US1] Create CurrentPlayer type at `front-end/app/identity/domain/current-player.ts`

### 3.7 Frontend Application Layer for US1

- [x] T037 [P] [US1] Create AuthApiPort at `front-end/app/identity/application/ports/auth-api-port.ts`
- [x] T038 [US1] Create CheckAuthStatusUseCase at `front-end/app/identity/application/use-cases/check-auth-status-use-case.ts`

### 3.8 Frontend Adapter Layer for US1

- [x] T039 [US1] Create AuthApiClient at `front-end/app/identity/adapter/api/auth-api-client.ts`
- [x] T040 [US1] Create authStore (Pinia) at `front-end/app/identity/adapter/stores/auth-store.ts`
- [x] T041 [US1] Create useCurrentPlayer composable at `front-end/app/identity/adapter/composables/use-current-player.ts`
- [x] T042 [US1] Create useAuth composable at `front-end/app/identity/adapter/composables/use-auth.ts`

### 3.9 Frontend UI Integration for US1

- [x] T043 [US1] Create RegisterPrompt component at `front-end/app/identity/adapter/components/RegisterPrompt.vue`
- [x] T044 [US1] Integrate RegisterPrompt in `front-end/app/pages/lobby.vue` (進入大廳前詢問)
- [x] T045 [US1] Remove frontend UUID generation in existing code (FR-021)
- [x] T046 [US1] Add auth middleware at `front-end/app/middleware/auth.ts`

**Checkpoint**: US1 complete - 訪客可無需註冊直接遊玩，系統自動建立並記住臨時身份 ✅

---

## Phase 4: User Story 2 - 帳號密碼註冊 (Priority: P2)

**Goal**: 玩家可使用帳號密碼建立帳號，訪客紀錄自動轉移至新帳號

**Independent Test**: 填寫表單提交，驗證帳號建立成功與重複帳號錯誤提示

**Related FRs**: FR-001, FR-002, FR-003, FR-009, FR-014, FR-015, FR-017

### 4.1 Tests for US2

- [x] T047 [P] [US2] Unit test for Account entity at `front-end/tests/server/identity/domain/account.test.ts`
- [x] T048 [P] [US2] Unit test for PasswordHash value object at `front-end/tests/server/identity/domain/password-hash.test.ts`
- [x] T049 [P] [US2] Unit test for RegisterAccountUseCase at `front-end/tests/server/identity/application/register-account-use-case.test.ts`
- [x] T049a [P] [US2] Unit test for guest data migration (FR-009) - verify guest Player converts to registered Player at `front-end/tests/server/identity/application/register-account-use-case.test.ts`

### 4.2 Backend Domain Layer for US2

- [x] T050 [P] [US2] Create Account entity at `front-end/server/identity/domain/account/account.ts`
- [x] T051 [P] [US2] Create PasswordHash value object at `front-end/server/identity/domain/account/password-hash.ts`

### 4.3 Backend Application Layer for US2

- [x] T052 [US2] Create AccountRepositoryPort at `front-end/server/identity/application/ports/output/account-repository-port.ts`
- [x] T053 [US2] Create RegisterAccountUseCase at `front-end/server/identity/application/use-cases/register-account-use-case.ts`

### 4.4 Backend Adapter Layer for US2

- [x] T054 [US2] Implement DrizzleAccountRepository at `front-end/server/identity/adapters/persistence/drizzle-account-repository.ts`
- [x] T055 [US2] Update DI container with Account dependencies

### 4.5 Backend API Routes for US2

- [x] T056 [US2] Create POST `/api/v1/auth/register` at `front-end/server/api/v1/auth/register.post.ts`

### 4.6 Frontend UI for US2

- [x] T057 [P] [US2] Create RegisterForm component at `front-end/app/identity/adapter/components/RegisterForm.vue`
- [x] T058 [US2] Add registration validation logic (username format, password strength, email format)
- [x] T059 [US2] Integrate RegisterForm in `front-end/app/pages/index.vue` (首頁註冊入口)
- [x] T060 [US2] Update authStore with register action

**Checkpoint**: US2 complete - 玩家可透過帳號密碼註冊，訪客紀錄自動轉移 ✅

---

## Phase 5: User Story 5 - 帳號登入 (Priority: P2)

**Goal**: 已註冊玩家可透過帳號密碼重新登入

**Independent Test**: 登出後重新輸入帳號密碼驗證登入成功

**Related FRs**: FR-011, FR-012, FR-013, FR-013a

### 5.1 Tests for US5

- [x] T061 [P] [US5] Unit test for LoginUseCase at `front-end/tests/server/identity/application/login-use-case.test.ts`
- [x] T062 [P] [US5] Unit test for LogoutUseCase at `front-end/tests/server/identity/application/logout-use-case.test.ts`

### 5.2 Backend Application Layer for US5

- [x] T063 [US5] Create LoginUseCase at `front-end/server/identity/application/use-cases/login-use-case.ts`
- [x] T064 [US5] Create LogoutUseCase at `front-end/server/identity/application/use-cases/logout-use-case.ts`

### 5.3 Backend API Routes for US5

- [x] T065 [US5] Create POST `/api/v1/auth/login` at `front-end/server/api/v1/auth/login.post.ts`
- [x] T066 [US5] Create POST `/api/v1/auth/logout` at `front-end/server/api/v1/auth/logout.post.ts`

### 5.4 Frontend Application Layer for US5

- [x] T067 [US5] Create LogoutUseCase at `front-end/app/identity/application/use-cases/logout-use-case.ts`

### 5.5 Frontend UI for US5

- [x] T068 [P] [US5] Create LoginForm component at `front-end/app/identity/adapter/components/LoginForm.vue`
- [x] T069 [US5] Integrate LoginForm in `front-end/app/pages/index.vue` (首頁登入入口)
- [x] T070 [US5] Update authStore with login/logout actions

**Checkpoint**: US5 complete - 玩家可透過帳號密碼登入登出 ✅

---

## Phase 6: User Story 3 - OAuth 社群登入 (Priority: P2)

**Goal**: 玩家可透過 Google 或 Line 帳號快速註冊與登入

**Independent Test**: 點擊「使用 Google 登入」按鈕，完成 OAuth 流程後驗證帳號建立成功

**Related FRs**: FR-004, FR-005, FR-006, FR-006a, FR-006b, FR-016

### 6.1 Tests for US3

- [x] T071 [P] [US3] Unit test for OAuthLink entity at `front-end/tests/server/identity/domain/oauth-link.test.ts`
- [x] T072 [P] [US3] Unit test for OAuthLoginUseCase at `front-end/tests/server/identity/application/oauth-login-use-case.test.ts`
- [x] T073 [P] [US3] Unit test for LinkAccountUseCase at `front-end/tests/server/identity/application/link-account-use-case.test.ts`
- [x] T074 [P] [US3] Unit test for AccountLinkingService at `front-end/tests/server/identity/domain/account-linking-service.test.ts`

### 6.2 Backend Domain Layer for US3

- [x] T075 [P] [US3] Create OAuthLink entity at `front-end/server/identity/domain/oauth-link/oauth-link.ts`
- [x] T076 [P] [US3] Create AccountLinkingService at `front-end/server/identity/domain/services/account-linking-service.ts`

### 6.3 Backend Application Layer for US3

- [x] T077 [P] [US3] Create OAuthProviderPort at `front-end/server/identity/application/ports/output/oauth-provider-port.ts`
- [x] T078 [P] [US3] Create OAuthLinkRepositoryPort at `front-end/server/identity/application/ports/output/oauth-link-repository-port.ts`
- [x] T079 [US3] Create OAuthLoginUseCase at `front-end/server/identity/application/use-cases/oauth-login-use-case.ts`
- [x] T080 [US3] Create LinkAccountUseCase at `front-end/server/identity/application/use-cases/link-account-use-case.ts`

### 6.4 Backend Adapter Layer for US3

- [x] T081 [P] [US3] Create Google OAuth adapter (Arctic) at `front-end/server/identity/adapters/oauth/google-oauth-adapter.ts`
- [x] T082 [P] [US3] Create Line OAuth adapter (Arctic) at `front-end/server/identity/adapters/oauth/line-oauth-adapter.ts`
- [x] T083 [US3] Implement DrizzleOAuthLinkRepository at `front-end/server/identity/adapters/persistence/drizzle-oauth-link-repository.ts`
- [x] T084 [US3] Update DI container with OAuth dependencies

### 6.5 Backend API Routes for US3

- [x] T085 [P] [US3] Create GET `/api/v1/auth/oauth/google` at `front-end/server/api/v1/auth/oauth/google.get.ts`
- [x] T086 [P] [US3] Create GET `/api/v1/auth/oauth/google/callback` at `front-end/server/api/v1/auth/oauth/google/callback.get.ts`
- [x] T087 [P] [US3] Create GET `/api/v1/auth/oauth/line` at `front-end/server/api/v1/auth/oauth/line.get.ts`
- [x] T088 [P] [US3] Create GET `/api/v1/auth/oauth/line/callback` at `front-end/server/api/v1/auth/oauth/line/callback.get.ts`
- [x] T089 [US3] Create POST `/api/v1/auth/link-account` at `front-end/server/api/v1/auth/link-account.post.ts`

### 6.6 Frontend UI for US3

- [x] T090 [US3] Create OAuthButtons component at `front-end/app/identity/adapter/components/OAuthButtons.vue`
- [x] T091 [US3] Integrate OAuthButtons in RegisterForm and LoginForm
- [x] T092 [US3] Handle OAuth callback redirect and state management
- [x] T093 [US3] Create LinkAccountPrompt component for manual account linking

**Checkpoint**: US3 complete - 玩家可透過 Google/Line 快速註冊登入，支援帳號連結 ✅

---

## Phase 7: User Story 4 - 遊戲畫面顯示玩家名稱 (Priority: P3)

**Goal**: 遊戲進行中顯示玩家與對手名稱

**Independent Test**: 在遊戲畫面中驗證玩家名稱正確顯示

**Related FRs**: FR-022, FR-023

**Note**: US4 為純 Adapter Layer (Vue Components) 整合工作。根據 Constitution V，Adapter Layer 測試為選擇性，但為遵循 Test-First 精神，仍將測試任務置於實作之前。

### 7.1 Tests for US4 (Optional per Constitution V - Adapter Layer)

- [ ] T094 [US4] Integration test for player name display at `front-end/tests/app/identity/player-name-display.test.ts` (SKIPPED - Optional)

### 7.2 Frontend Integration for US4

- [x] T095 [US4] Update game state store to include player display names
- [x] T096 [US4] Modify game page UI to show player name (訪客: Guest_XXXX, 註冊: 帳號名稱)
- [x] T097 [US4] Modify game page UI to show opponent name (AI: "Computer")
- [x] T098 [US4] Add player name display in game header/info area

**Checkpoint**: US4 complete - 遊戲畫面正確顯示玩家與對手名稱 ✅

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T099 [P] Add login failure logging (FR-013a) at `front-end/server/identity/adapters/logging/`
- [x] T100 [P] Add guest data cleanup scheduled task (FR-010a)
- [x] T101 Session sliding expiration integration verification (complements T022a unit test)
- [x] T102 Security review: Cookie settings (HTTP-only, Secure, SameSite)
- [x] T103 [P] Error handling standardization across all auth endpoints
- [ ] T104 [P] Add integration tests for full auth flows (OPTIONAL)
- [ ] T105 Run quickstart.md validation (OPTIONAL)
- [x] T106 Type-check and lint fixes
- [ ] T107 Update API documentation in contracts/auth-api.yaml if needed (OPTIONAL)

**Checkpoint**: Phase 8 complete - 核心 Polish 任務已完成 ✅

---

## Phase 9: Login Modal 體驗優化 (FR-024)

**Purpose**: 將首頁登入改為 Modal 覆蓋式體驗，減少頁面跳轉

**Related FRs**: FR-024, FR-024a, FR-024b, FR-024c, FR-024d

### 9.1 LoginModal 元件開發

- [x] T108 [FR-024a] Create LoginModal.vue at `front-end/app/identity/adapter/components/LoginModal.vue`
  - 使用 Teleport 渲染至 body
  - 套用 Transition 動畫
  - 複用 LoginForm.vue 和 OAuthButtons.vue
  - 提供「建立帳號」連結導向 /register

### 9.2 Navigation 整合

- [x] T109 [FR-024] Modify NavigationBar.vue to emit `loginClick` event for Sign In button
- [x] T110 [FR-024c] Integrate LoginModal in `front-end/app/pages/index.vue` (handle open/close state)

### 9.3 輔助功能

- [x] T111 [FR-024d] Add ESC key listener and backdrop click handler for closing modal (included in T108)
- [x] T112 [FR-024] Update /login page to handle direct navigation fallback (already works as standalone fallback)

**Checkpoint**: Phase 9 complete - 首頁登入改為 Modal 覆蓋式體驗 ✅

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-7)**: All depend on Foundational phase completion
  - US1 (Phase 3): Can start after Foundational
  - US2 (Phase 4): Depends on US1 (builds on Player entity and session infrastructure)
  - US5 (Phase 5): Depends on US2 (uses Account entity)
  - US3 (Phase 6): Depends on US2 (extends Account with OAuthLink)
  - US4 (Phase 7): Depends on US1 (integration only)
- **Polish (Phase 8)**: Depends on all desired user stories being complete
- **Login Modal (Phase 9)**: Depends on Phase 5 (US5 - 帳號登入) completion

### User Story Dependencies

```
Phase 2 (Foundational)
       │
       ▼
Phase 3 (US1 - Guest) ─────────────────┐
       │                                │
       ▼                                ▼
Phase 4 (US2 - Register)          Phase 7 (US4 - Display Names)
       │
       ▼
Phase 5 (US5 - Login)
       │
       ▼
Phase 6 (US3 - OAuth)
```

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Domain models before application layer
- Application layer before adapter layer
- Backend before frontend (for API dependencies)
- Story complete before moving to next priority

### Parallel Opportunities

**Phase 1 (Setup)**: T002, T003, T004 can run in parallel

**Phase 2 (Foundational)**:
- T005-T011 must be sequential (refactoring)
- T012, T013 can run in parallel
- T014-T018 must be sequential (schema dependencies)

**Phase 3 (US1)**:
- All tests (T019-T022, T022a) can run in parallel
- Domain models (T023-T026) can run in parallel
- Port definitions (T027-T028) can run in parallel
- Frontend domain/application (T036-T038) can run in parallel with backend

**Phase 4 (US2)**:
- All tests (T047-T049, T049a) can run in parallel
- Domain models (T050-T051) can run in parallel

**Phase 5 (US5)**:
- All tests (T061-T062) can run in parallel

**Phase 6 (US3)**:
- All tests (T071-T074) can run in parallel
- Domain models (T075-T076) can run in parallel
- Ports (T077-T078) can run in parallel
- OAuth adapters (T081-T082) can run in parallel
- OAuth routes (T085-T088) can run in parallel

**Phase 8 (Polish)**:
- T099, T100, T103, T104 can run in parallel

---

## Implementation Strategy

### MVP First (US1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (訪客遊玩)
4. **STOP and VALIDATE**: Test US1 independently
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add US1 (訪客遊玩) → Test → Deploy/Demo (MVP!)
3. Add US2 (帳號註冊) → Test → Deploy/Demo
4. Add US5 (帳號登入) → Test → Deploy/Demo
5. Add US3 (OAuth 登入) → Test → Deploy/Demo
6. Add US4 (顯示名稱) → Test → Deploy/Demo
7. Each story adds value without breaking previous stories

---

## Summary

| Phase | User Story | Priority | Tasks | Tests | Status |
|-------|------------|----------|-------|-------|--------|
| 1 | Setup | - | 4 | 0 | ✅ Complete |
| 2 | Foundational | - | 14 | 0 | ✅ Complete |
| 3 | US1 - 訪客遊玩 | P1 🎯 | 25 | 5 | ✅ Complete |
| 4 | US2 - 帳號註冊 | P2 | 12 | 4 | ✅ Complete |
| 5 | US5 - 帳號登入 | P2 | 8 | 2 | ✅ Complete |
| 6 | US3 - OAuth 登入 | P2 | 20 | 4 | ✅ Complete |
| 7 | US4 - 顯示名稱 | P3 | 5 | 1 | ✅ Complete |
| 8 | Polish | - | 9 | 0 | ✅ Core Complete |
| 9 | Login Modal | UX | 5 | 0 | ✅ Complete |
| **Total** | | | **102** | **16** | **✅ DONE** |

**Final Status**: 610 tests passing, type-check passing, Phase 9 (Login Modal) complete

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
