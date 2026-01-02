# Implementation Plan: 玩家帳號功能 (Player Account System)

**Branch**: `010-player-account` | **Date**: 2026-01-02 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/010-player-account/spec.md`

## Summary

實作玩家帳號系統，支援帳號密碼註冊、OAuth 登入（Google、Line）、訪客模式，並於前端整合註冊流程與遊戲畫面顯示玩家名稱。採用 Session-based 認證（HTTP-only Cookie 存 Session ID），Session 有效期 7 天滑動過期。本功能將在前後端各自新增獨立的 Identity Bounded Context。

## Technical Context

**Language/Version**: TypeScript 5.9
**Primary Dependencies**: Nuxt 4 (Nitro), Vue 3.5, Pinia 3.x, Drizzle ORM 0.45+, Zod 4.x, H3
**Storage**: PostgreSQL 14+ (Drizzle ORM)
**Testing**: Vitest (unit/integration), Playwright (E2E)
**Target Platform**: Web (Nuxt fullstack, SSR/SPA hybrid)
**Project Type**: Web (monorepo: frontend + backend in `front-end/`)
**Performance Goals**: API 回應時間 P95 < 500ms, 登入流程 < 2 秒
**Constraints**: Session Cookie HTTP-only, 7 天滑動過期, 訪客 Cookie 30 天有效
**Scale/Scope**: MVP 支援 100+ 並發用戶

### Research Decisions (Phase 0 Completed)

| 項目 | 決策 | 套件/實作 | 詳見 |
|------|------|----------|------|
| Session Store | In-memory + unstorage 抽象 | unstorage (memory driver) | [research.md](./research.md#1-session-store-實作方案) |
| 密碼雜湊 | bcrypt (純 JS) | bcryptjs | [research.md](./research.md#2-密碼雜湊演算法) |
| OAuth 套件 | Arctic | arctic | [research.md](./research.md#3-oauth-library-選擇) |
| Player ID | UUID v4 | crypto.randomUUID() | [research.md](./research.md#4-訪客-id-生成方案) |
| 訪客名稱 | Guest_XXXX | crypto.randomInt() | [research.md](./research.md#4-訪客-id-生成方案) |
| Session ID | 256-bit random | crypto.randomBytes(32) | [research.md](./research.md#5-session-id-生成) |

### New Dependencies

```json
{
  "dependencies": {
    "bcryptjs": "^3.0.0",
    "arctic": "^2.0.0"
  },
  "devDependencies": {
    "@types/bcryptjs": "^3.0.0"
  }
}
```

## Constitution Check

### Pre-Design Check (Phase 0)

*GATE: Must pass before Phase 0 research.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Clean Architecture | ✅ PASS | Identity BC 採用 Domain → Application → Adapter 分層 |
| II. Domain-Driven Development | ✅ PASS | 新增 Identity BC，明確識別 Player Aggregate、Account Entity、OAuthLink Entity |
| III. Server Authority | ✅ PASS | 所有身份驗證、Session 管理皆由後端處理，前端僅處理 UI |
| IV. Command-Event Architecture | ✅ PASS | 登入/註冊為 REST Command，狀態變更透過 Response 返回（非 SSE） |
| V. Test-First Development | ✅ PASS | Domain/Application Layer 需 TDD，覆蓋率 > 80% |
| VI. Bounded Context Isolation | ✅ PASS | Identity BC 獨立於 Core Game BC，透過 Player ID 契約交互 |
| VII. Microservice-Ready Design | ✅ PASS | 使用 UUID 作為 Player ID，無狀態 API 設計 |
| VIII. API Contract Adherence | ✅ PASS | 新增 API 端點將記錄於 contracts/，遵循 REST 規範 |

### Post-Design Check (Phase 1)

*Re-evaluation after data model and API contracts are defined.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Clean Architecture | ✅ PASS | data-model.md 定義清晰的 Domain 物件，與 Adapter 層分離 |
| II. Domain-Driven Development | ✅ PASS | Player (Aggregate)、Account (Entity)、OAuthLink (Entity)、Session (VO) 定義完整 |
| III. Server Authority | ✅ PASS | Session Store 由後端管理，前端僅透過 Cookie 攜帶 Session ID |
| IV. Command-Event Architecture | ✅ PASS | auth-api.yaml 定義 REST 端點，使用標準 HTTP 狀態碼回應 |
| V. Test-First Development | ✅ PASS | quickstart.md 提供測試指南，Domain/Application 需 TDD |
| VI. Bounded Context Isolation | ✅ PASS | Identity BC 透過 PlayerInfo DTO 與 Core Game BC 交互 |
| VII. Microservice-Ready Design | ✅ PASS | UUID 作為所有實體 ID，Session 可獨立擴展至 Redis |
| VIII. API Contract Adherence | ✅ PASS | contracts/auth-api.yaml 完整定義 OpenAPI 3.0 規格 |

**Post-Design Verdict**: ✅ ALL GATES PASSED

### Pre-requisite: Core Game BC 隔離

**IMPORTANT**: 現有後端結構為扁平式（`server/domain/`, `server/application/`, `server/adapters/`），需先重構為 BC 隔離結構後，再新增 Identity BC。

**重構計畫**:
1. 建立 `server/core-game/` 目錄
2. 移動現有 domain/application/adapters 至 `server/core-game/` 下
3. 更新所有 import 路徑
4. 驗證現有功能正常運作

## Project Structure

### Documentation (this feature)

```text
specs/010-player-account/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── auth-api.yaml    # OpenAPI spec for auth endpoints
│   └── identity-types.ts # TypeScript type definitions
└── tasks.md             # Phase 2 output (by /speckit.tasks)
```

### Source Code (repository root)

```text
front-end/
├── server/                            # Nitro 後端
│   ├── core-game/                     # Core Game BC (重構後)
│   │   ├── domain/
│   │   ├── application/
│   │   └── adapters/
│   │
│   ├── identity/                      # Identity BC (新增)
│   │   ├── domain/
│   │   │   ├── player/                # Player Aggregate
│   │   │   │   ├── player.ts
│   │   │   │   └── player-factory.ts
│   │   │   ├── account/               # Account Entity
│   │   │   │   ├── account.ts
│   │   │   │   └── password-hash.ts   # Value Object
│   │   │   ├── oauth-link/            # OAuthLink Entity
│   │   │   │   └── oauth-link.ts
│   │   │   ├── types/
│   │   │   │   ├── auth-result.ts
│   │   │   │   └── session.ts
│   │   │   └── services/
│   │   │       └── account-linking-service.ts
│   │   │
│   │   ├── application/
│   │   │   ├── ports/
│   │   │   │   ├── input/             # Input Ports (Use Case 介面)
│   │   │   │   └── output/            # Output Ports (Repository, OAuth Provider)
│   │   │   └── use-cases/
│   │   │       ├── register-account-use-case.ts
│   │   │       ├── login-use-case.ts
│   │   │       ├── oauth-login-use-case.ts
│   │   │       ├── create-guest-use-case.ts
│   │   │       ├── link-account-use-case.ts
│   │   │       └── get-current-player-use-case.ts
│   │   │
│   │   └── adapters/
│   │       ├── persistence/
│   │       │   ├── drizzle-player-repository.ts
│   │       │   ├── drizzle-account-repository.ts
│   │       │   └── drizzle-oauth-link-repository.ts
│   │       ├── session/
│   │       │   └── in-memory-session-store.ts
│   │       └── oauth/
│   │           ├── oauth-provider-adapter.ts
│   │           ├── google-oauth-adapter.ts
│   │           └── line-oauth-adapter.ts
│   │
│   ├── api/v1/
│   │   ├── games/                     # Core Game BC 路由 (existing)
│   │   └── auth/                      # Identity BC 路由 (新增)
│   │       ├── register.post.ts
│   │       ├── login.post.ts
│   │       ├── logout.post.ts
│   │       ├── me.get.ts
│   │       ├── oauth/
│   │       │   ├── google.get.ts
│   │       │   ├── google/callback.get.ts
│   │       │   ├── line.get.ts
│   │       │   └── line/callback.get.ts
│   │       └── link-account.post.ts
│   │
│   └── database/
│       └── schema/
│           ├── index.ts
│           ├── games.ts               # (existing)
│           ├── players.ts             # (新增)
│           ├── accounts.ts            # (新增)
│           ├── oauth-links.ts         # (新增)
│           └── sessions.ts            # (新增，若使用 DB-backed session)
│
├── app/                               # Nuxt 前端
│   ├── identity/                      # Identity BC (新增)
│   │   ├── domain/
│   │   │   └── current-player.ts
│   │   │
│   │   ├── application/
│   │   │   ├── ports/
│   │   │   │   └── auth-api-port.ts
│   │   │   └── use-cases/
│   │   │       ├── check-auth-status-use-case.ts
│   │   │       └── logout-use-case.ts
│   │   │
│   │   └── adapter/
│   │       ├── stores/
│   │       │   └── auth-store.ts      # Pinia store
│   │       ├── api/
│   │       │   └── auth-api-client.ts
│   │       ├── composables/
│   │       │   ├── use-auth.ts
│   │       │   └── use-current-player.ts
│   │       └── components/
│   │           ├── LoginForm.vue
│   │           ├── RegisterForm.vue
│   │           ├── OAuthButtons.vue
│   │           └── RegisterPrompt.vue
│   │
│   ├── user-interface/                # User Interface BC (existing)
│   │   └── ...
│   │
│   ├── pages/
│   │   ├── index.vue                  # 首頁 (整合登入/註冊入口)
│   │   ├── lobby.vue                  # 大廳 (整合註冊提示)
│   │   └── game/                      # 遊戲頁面 (顯示玩家名稱)
│   │
│   └── middleware/
│       └── auth.ts                    # 認證中介層
│
└── shared/
    └── contracts/
        ├── auth-commands.ts           # 登入/註冊命令類型
        └── player-info.ts             # 玩家資訊類型
```

**Structure Decision**: 採用 Web 應用程式結構，前後端整合於 `front-end/` 目錄。後端採用 Bounded Context 隔離（`server/core-game/`, `server/identity/`），前端亦採用 BC 隔離（`app/identity/`, `app/user-interface/`）。

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| 新增第 3 個 BC (Identity) | 身份認證為獨立關注點，與遊戲邏輯無關聯 | 混入 Core Game BC 違反 SRP，未來拆分困難 |
| 後端結構重構 (BC 隔離) | 現有扁平結構無法支援多 BC | 維持扁平結構會導致命名衝突與依賴混亂 |
