# Implementation Plan: Backend Testing & Logging Enhancement

**Branch**: `009-backend-testing-logging` | **Date**: 2025-12-23 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/009-backend-testing-logging/spec.md`

## Summary

為後端程式碼的 Domain Layer 和 Application Layer 建立完整的單元測試（覆蓋率 80%+），統一 logger 使用規範，並實作遊戲 Commands/Events 的資料庫日誌系統，用於稽核和問題分析。

## Technical Context

**Language/Version**: TypeScript 5.9 (Nuxt 4 / Nitro)
**Primary Dependencies**: Vitest, Drizzle ORM, PostgreSQL driver (postgres.js)
**Storage**: PostgreSQL 14+ (game_logs table with BRIN index and time partitioning)
**Testing**: Vitest with coverage-v8
**Target Platform**: Node.js server (Nitro runtime)
**Project Type**: Web application (Nuxt 4 fullstack)
**Performance Goals**: Async log writes < 1ms, query single game < 50ms
**Constraints**: Log writes must not block game flow (< 10ms impact)
**Scale/Scope**: ~90 server TypeScript files, 8 Use Cases, 6 Domain Services

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Clean Architecture | ✅ Pass | 測試遵循分層：Domain (純函數) / Application (mock ports) |
| II. Domain-Driven Development | ✅ Pass | GameLog 作為新 Entity 加入 Core Game BC |
| III. Server Authority | ✅ Pass | 日誌記錄在 server 端 |
| IV. Command-Event Architecture | ✅ Pass | Event Sourcing 符合此原則 |
| V. Test-First Development | ✅ Pass | 此 feature 的核心目標 |
| VI. Bounded Context Isolation | ✅ Pass | GameLog 屬於 Core Game BC |
| VII. Microservice-Ready Design | ✅ Pass | UUID 作為 ID，append-only 設計 |
| VIII. API Contract Adherence | ✅ Pass | 無新外部 API，內部 Port 介面已定義 |

## Project Structure

### Documentation (this feature)

```text
specs/009-backend-testing-logging/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0: Technical research
├── data-model.md        # Phase 1: GameLog entity design
├── quickstart.md        # Phase 1: Developer guide
├── contracts/           # Phase 1: Internal port contracts
│   └── game-log-port.md
└── tasks.md             # Phase 2 output (pending)
```

### Source Code (repository root)

```text
front-end/
├── server/
│   ├── __tests__/                    # NEW: Server tests root
│   │   ├── mocks/                    # Shared mock implementations
│   │   │   ├── gameStoreMock.ts
│   │   │   ├── eventPublisherMock.ts
│   │   │   └── ...
│   │   ├── fixtures/                 # Test data fixtures
│   │   │   ├── cards.ts
│   │   │   └── games.ts
│   │   ├── domain/                   # Domain Layer tests
│   │   │   ├── services/
│   │   │   │   ├── yakuDetectionService.test.ts
│   │   │   │   ├── matchingService.test.ts
│   │   │   │   ├── scoringService.test.ts
│   │   │   │   ├── deckService.test.ts
│   │   │   │   ├── specialRulesService.test.ts
│   │   │   │   └── roundTransitionService.test.ts
│   │   │   └── game/
│   │   │       ├── game.test.ts
│   │   │       └── round.test.ts
│   │   └── application/              # Application Layer tests
│   │       └── use-cases/
│   │           ├── joinGameUseCase.test.ts
│   │           ├── joinGameAsAiUseCase.test.ts
│   │           ├── playHandCardUseCase.test.ts
│   │           ├── selectTargetUseCase.test.ts
│   │           ├── makeDecisionUseCase.test.ts
│   │           ├── leaveGameUseCase.test.ts
│   │           ├── autoActionUseCase.test.ts
│   │           └── confirmContinueUseCase.test.ts
│   ├── application/
│   │   └── ports/
│   │       └── output/
│   │           └── gameLogRepositoryPort.ts   # NEW: Output port
│   ├── adapters/
│   │   └── persistence/
│   │       └── drizzleGameLogRepository.ts    # NEW: Adapter
│   ├── database/
│   │   └── schema/
│   │       ├── index.ts                       # MODIFY: Add gameLogs export
│   │       └── gameLogs.ts                    # NEW: Schema definition
│   └── utils/
│       └── container.ts                       # MODIFY: Wire GameLogRepository
├── vitest.server.config.ts                    # NEW: Server test config
└── package.json                               # MODIFY: Add test scripts
```

**Structure Decision**: 使用 Nuxt 4 fullstack 結構，後端程式碼位於 `front-end/server/`。測試放置於 `server/__tests__/` 下，按層級組織。

## Complexity Tracking

> **無複雜度違規** - 此 feature 完全符合 Constitution 原則

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| (none) | - | - |

## Phase 1 Artifacts Generated

- ✅ `research.md` - 技術研究與決策
- ✅ `data-model.md` - GameLog Entity 設計
- ✅ `contracts/game-log-port.md` - GameLogRepositoryPort 介面契約
- ✅ `quickstart.md` - 開發者快速入門指南

## Next Step

執行 `/speckit.tasks` 生成具體的實作任務清單。
