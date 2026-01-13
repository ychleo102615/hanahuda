# Implementation Plan: Leaderboard and Records

**Branch**: `012-leaderboard-records` | **Date**: 2026-01-13 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/012-leaderboard-records/spec.md`

## Summary

建立 Leaderboard & Records Bounded Context，統一管理玩家遊戲統計與排行榜功能。將 `player_stats` 表的擁有權從 Core-Game BC 轉移至本 BC，並新增 `daily_player_scores` 快照表支援日/週排行榜。後端採用事件驅動架構訂閱 Core-Game 的 GameFinishedEvent 同時更新累計統計與每日快照；前端簡化 NavigationBar 並新增 NavigationSection 與 RecordSection 展示排行榜與統計資料。

## Technical Context

**Language/Version**: TypeScript 5.x (Nuxt 4 / Vue 3)
**Primary Dependencies**: Nuxt 4, Vue 3, Pinia, Drizzle ORM, Tailwind CSS v4
**Storage**: PostgreSQL 14+ (`player_stats` 表轉移 + 新增 `daily_player_scores` 表)
**Testing**: Vitest (Domain/Application Layer 單元測試)
**Target Platform**: Web (響應式設計，支援桌面與行動裝置)
**Project Type**: Web application (frontend + backend monorepo)
**Performance Goals**: API P95 < 500ms, 排行榜查詢 < 200ms
**Constraints**: 資料延遲 < 1 分鐘 (SC-003)，首頁載入增量 < 500ms (SC-004)
**Scale/Scope**: 預設顯示前 10 名，支援 100+ 並發查詢

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Clean Architecture | ✅ PASS | BC 分層：Domain → Application → Adapter |
| II. Domain-Driven Development | ✅ PASS | 新 BC: Leaderboard，明確實體定義 |
| III. Server Authority | ✅ PASS | 排行榜數據由伺服器計算，前端僅呈現 |
| IV. Command-Event Architecture | ✅ PASS | 訂閱 GameFinishedEvent 更新統計 |
| V. Test-First Development | ✅ PASS | Domain/Application Layer TDD |
| VI. Bounded Context Isolation | ✅ PASS | 透過 InternalEventBus 訂閱，不直接依賴 Core-Game |
| VII. Microservice-Ready Design | ✅ PASS | UUID 主鍵，事件驅動，無狀態 API |
| VIII. API Contract Adherence | ✅ PASS | 新增端點遵循 RESTful 風格 |

**Pre-Design Gate**: ✅ PASSED
**Post-Design Re-check**: ✅ PASSED

## Project Structure

### Documentation (this feature)

```text
specs/012-leaderboard-records/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0 output - technical research
├── data-model.md        # Phase 1 output - entity definitions
├── quickstart.md        # Phase 1 output - development guide
├── contracts/           # Phase 1 output - API contracts
│   ├── leaderboard-api.yaml
│   └── stats-api.yaml
└── tasks.md             # Phase 2 output (via /speckit.tasks)
```

### Source Code (repository root)

```text
# Backend - New Bounded Context
front-end/server/leaderboard/
├── domain/
│   ├── daily-score/
│   │   └── daily-player-score.ts      # Entity
│   ├── player-stats/
│   │   └── player-stats.ts            # Entity (從 Core-Game 轉移)
│   ├── leaderboard/
│   │   ├── leaderboard-entry.ts       # Value Object
│   │   └── leaderboard-type.ts        # Value Object
│   └── statistics/
│       ├── player-statistics.ts       # Aggregate (組合查詢結果)
│       └── time-range.ts              # Value Object
├── application/
│   ├── use-cases/
│   │   ├── get-daily-leaderboard-use-case.ts
│   │   ├── get-weekly-leaderboard-use-case.ts
│   │   ├── get-player-statistics-use-case.ts
│   │   └── update-player-records-use-case.ts  # 統一更新 player_stats + daily_player_scores
│   └── ports/
│       ├── input/
│       │   ├── get-leaderboard-input-port.ts
│       │   ├── get-player-statistics-input-port.ts
│       │   └── update-player-records-input-port.ts
│       └── output/
│           ├── daily-player-score-repository-port.ts
│           └── player-stats-repository-port.ts  # 從 Core-Game 轉移
└── adapters/
    ├── di/
    │   └── container.ts
    ├── persistence/
    │   ├── drizzle-daily-player-score-repository.ts
    │   └── drizzle-player-stats-repository.ts   # 從 Core-Game 轉移
    └── event-subscriber/
        └── game-finished-subscriber.ts

# Backend - Database Schema (共享基礎設施層，Schema 檔案位置不變)
front-end/server/database/schema/
├── playerStats.ts                     # 既有表 (擁有權轉移至 Leaderboard BC)
└── dailyPlayerScores.ts               # 新表

# Backend - Server Plugin
front-end/server/plugins/
└── dailyScoreCleanup.ts               # 30-day cleanup job

# Backend - Core-Game BC (需移除的檔案)
front-end/server/core-game/
├── application/use-cases/
│   └── recordGameStatsUseCase.ts      # [DELETE] 移至 Leaderboard BC
├── application/ports/output/
│   └── playerStatsRepositoryPort.ts   # [DELETE] 移至 Leaderboard BC
└── adapters/persistence/
    └── drizzlePlayerStatsRepository.ts # [DELETE] 移至 Leaderboard BC

# Backend - API Endpoints
front-end/server/api/v1/
├── leaderboard/
│   └── index.get.ts                   # GET /api/v1/leaderboard
└── stats/
    └── me.get.ts                      # GET /api/v1/stats/me

# Frontend - New Components
front-end/app/pages/index/components/
├── NavigationSection.vue              # New section
├── RecordSection.vue                  # New section
├── LeaderboardBlock.vue               # Leaderboard display
├── PersonalStatsBlock.vue             # Stats display
└── YakuStatsAccordion.vue             # Yaku details

# Frontend - BC Integration (optional)
front-end/app/leaderboard/
├── adapter/
│   ├── api/
│   │   └── leaderboard-api-client.ts
│   └── composables/
│       ├── use-leaderboard.ts
│       └── use-player-stats.ts
└── domain/
    └── types.ts
```

**Structure Decision**: 後端採用獨立 BC 目錄 (`front-end/server/leaderboard/`)，遵循現有 Identity/Core-Game/Matchmaking BC 的分層模式。前端可選擇建立輕量級 BC 或直接在 components 中處理。

## Complexity Tracking

> No Constitution violations requiring justification.

| Item | Rationale |
|------|-----------|
| 新增第 4 個後端 BC (Leaderboard) | 符合 Constitution II - 明確的 Bounded Context 邊界；排行榜與統計為獨立業務領域 |
| 將 `player_stats` 從 Core-Game 轉移 | 符合 Constitution VI - BC 資料擁有權明確；「玩家統計」屬於 Records 領域而非 Game 領域 |

---

## Phase 0: Research Summary

詳見 [research.md](./research.md)

### Key Decisions

1. **Player Stats Ownership**: 將 `player_stats` 表的擁有權從 Core-Game BC 轉移至 Leaderboard BC，統一管理所有玩家統計資料
2. **Unified Record Update**: 建立 `UpdatePlayerRecordsUseCase` 同時更新 `player_stats`（累計）和 `daily_player_scores`（每日快照）
3. **Daily Score Snapshot**: 使用 `daily_player_scores` 表儲存每日分數，支援日/週排行榜查詢
4. **BC Integration**: 透過 InternalEventBus 訂閱 Core-Game 的 GameFinishedEvent，維持鬆耦合
5. **Weekly Calculation**: SQL 聚合當週 daily_player_scores 資料
6. **Data Cleanup**: Server Plugin 定時清理 30 天以上資料
7. **Frontend Structure**: NavigationSection + RecordSection 雙區塊設計
8. **Core-Game Cleanup**: 移除 Core-Game BC 中的 `RecordGameStatsUseCase` 及相關 Port/Adapter

---

## Phase 1: Design Artifacts

- [data-model.md](./data-model.md) - Entity definitions and relationships
- [contracts/](./contracts/) - API specifications
- [quickstart.md](./quickstart.md) - Development setup guide
