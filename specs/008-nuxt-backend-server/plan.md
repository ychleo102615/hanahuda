# Implementation Plan: Nuxt Backend Server

**Branch**: `008-nuxt-backend-server` | **Date**: 2024-12-04 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/008-nuxt-backend-server/spec.md`

---

## Summary

在 Nuxt 4 (Nitro) 中建立花牌遊戲後端服務，實現：
- SSE 連線與事件推送
- 遊戲房間配對（MVP：自動配對假玩家）
- 完整遊戲規則引擎（發牌、配對、役種檢測、計分）
- 假玩家服務（隨機策略 + 模擬延遲）
- 斷線重連與代管操作
- 資料庫統計功能

技術方案：Nuxt 4 Nitro Server + Drizzle ORM + PostgreSQL，遵循 Clean Architecture 分層。

---

## Technical Context

**Language/Version**: TypeScript 5.9
**Primary Dependencies**: Nuxt 4 (Nitro), Drizzle ORM, Zod, H3
**Storage**: PostgreSQL 14+ (Drizzle ORM)
**Testing**: Vitest
**Target Platform**: Node.js Server (Railway / Fly.io)
**Project Type**: Web (Fullstack Nuxt)
**Performance Goals**: 50+ 並發遊戲, SSE 延遲 < 200ms, API 回應 < 500ms P95
**Constraints**: 不支援 Serverless（SSE 需要長連接）
**Scale/Scope**: MVP 階段單伺服器部署

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Clean Architecture | ✅ PASS | Domain → Application → Adapter 嚴格分層 |
| II. Domain-Driven Design | ✅ PASS | Core Game BC + Opponent Service，明確 Aggregate/Entity/VO |
| III. Server Authority | ✅ PASS | 後端為遊戲狀態唯一真相來源，前端僅渲染 |
| IV. Command-Event Architecture | ✅ PASS | REST Commands + SSE Events，遵循 protocol.md |
| V. Test-First Development | ⚠️ PENDING | Domain/Application Layer 需 TDD，Adapter Layer 選擇性測試 |
| VI. Bounded Context Isolation | ✅ PASS | Core Game BC 獨立，Opponent Service 在 BC 外作為 Adapter |
| VII. Microservice-Ready Design | ✅ PASS | UUID IDs，無狀態 API，事件驅動模式 |
| VIII. API Contract Adherence | ✅ PASS | 遵循 protocol.md，以現有程式碼型別為準 |

---

## Project Structure

### Documentation (this feature)

```text
specs/008-nuxt-backend-server/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0 research findings
├── data-model.md        # Domain model & database schema
├── quickstart.md        # Development setup guide
├── contracts/
│   ├── rest-api.md      # REST API contracts
│   └── sse-events.md    # SSE event contracts (with DTOs)
└── tasks.md             # (Phase 2 - /speckit.tasks)
```

### Source Code (repository root)

```text
front-end/
├── shared/                              # 前後端共用型別
│   └── types/
│       ├── events.ts                    # SSE 事件型別（從 app/.../types/ 移動）
│       ├── commands.ts                  # 命令型別
│       ├── shared.ts                    # 共用資料結構
│       ├── flow-state.ts                # FlowState 定義
│       └── errors.ts                    # 錯誤型別
│
├── server/                              # Nitro 後端
│   ├── api/v1/                          # Framework Layer (REST endpoints)
│   │   └── games/
│   │       ├── join.post.ts             # POST /api/v1/games/join
│   │       └── [gameId]/
│   │           ├── events.get.ts        # GET /api/v1/games/{id}/events (SSE)
│   │           ├── leave.post.ts        # POST /api/v1/games/{id}/leave
│   │           ├── snapshot.get.ts      # GET /api/v1/games/{id}/snapshot
│   │           └── turns/
│   │               ├── play-card.post.ts
│   │               └── select-target.post.ts
│   │
│   ├── application/                     # Application Layer
│   │   ├── use-cases/
│   │   │   ├── joinGameUseCase.ts
│   │   │   ├── playHandCardUseCase.ts
│   │   │   ├── selectTargetUseCase.ts
│   │   │   └── makeDecisionUseCase.ts
│   │   └── ports/
│   │       ├── input/                   # Input Port interfaces
│   │       └── output/                  # Output Port interfaces
│   │           ├── gameRepositoryPort.ts
│   │           ├── eventPublisherPort.ts
│   │           └── internalEventPublisherPort.ts  # 內部事件發布
│   │
│   ├── domain/                          # Domain Layer (Core Game BC)
│   │   ├── game/
│   │   │   ├── game.ts                  # Game Aggregate Root
│   │   │   └── player.ts                # Player Entity
│   │   ├── round/
│   │   │   ├── round.ts                 # Round Entity
│   │   │   └── koiStatus.ts             # KoiStatus Value Object
│   │   └── services/
│   │       ├── deckService.ts           # 發牌、洗牌
│   │       ├── matchingService.ts       # 配對驗證
│   │       └── yakuDetectionService.ts  # 役種檢測
│   │
│   ├── adapters/                        # Adapter Layer
│   │   ├── persistence/
│   │   │   ├── drizzleGameRepository.ts
│   │   │   └── inMemoryGameStore.ts
│   │   ├── event-publisher/
│   │   │   ├── sseEventPublisher.ts
│   │   │   ├── connectionStore.ts
│   │   │   ├── gameEventBus.ts
│   │   │   └── internalEventBus.ts      # 實作 InternalEventPublisherPort
│   │   ├── opponent/                    # Opponent Service (事件監聽模式)
│   │   │   └── opponentService.ts       # 監聽事件，呼叫 Use Cases
│   │   ├── timeout/
│   │   │   └── actionTimeoutManager.ts
│   │   └── mappers/
│   │       ├── eventMapper.ts           # Domain → SSE Event DTO
│   │       └── dtos.ts                  # ScoreMultipliers 等 DTOs
│   │
│   ├── plugins/                         # Nitro plugins
│   │   └── opponent.ts                  # OpponentService 初始化
│   │
│   ├── database/
│   │   ├── schema/
│   │   │   ├── games.ts
│   │   │   ├── gameSnapshots.ts
│   │   │   ├── playerStats.ts
│   │   │   └── sessions.ts
│   │   └── migrations/
│   │
│   └── utils/
│       ├── db.ts                        # Drizzle client
│       └── config.ts                    # Environment config
│
├── app/
│   └── user-interface/
│       └── application/
│           └── types/
│               └── index.ts             # Re-export from ~/shared/types
│
├── drizzle.config.ts
└── nuxt.config.ts
```

**Structure Decision**: 採用 Nuxt Fullstack 架構，`server/` 目錄實作後端，`shared/` 目錄放置前後端共用型別。Domain Layer 在 `server/domain/` 中獨立實作，不與前端 `user-interface/domain` 共用（職責不同）。

---

## Clean Architecture Flow

```
[Client REST Request]
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│  Framework Layer (server/api/v1/)                           │
│  - 驗證請求格式（Zod）                                       │
│  - 解析 session_token                                       │
│  - 呼叫 Use Case                                            │
└─────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│  Application Layer (server/application/use-cases/)          │
│  1. 從 Repository (Output Port) 載入 Game Aggregate         │
│  2. 呼叫 Domain Layer 執行業務邏輯                          │
│  3. Domain 返回結果 + 產生 Events                           │
│  4. 透過 EventPublisher (Output Port) 推送 SSE 事件         │
│  5. 透過 InternalEventPublisher (Output Port) 發布內部事件  │
│  6. 透過 Repository (Output Port) 持久化                    │
└─────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│  Domain Layer (server/domain/)                              │
│  - Game Aggregate 執行業務規則                              │
│  - Domain Services（發牌、配對、役種檢測）                   │
│  - 返回操作結果                                             │
│  - 純 TypeScript，無框架依賴                                │
└─────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│  Adapter Layer (server/adapters/)                           │
│  - DrizzleGameRepository: 實作 GameRepositoryPort           │
│  - SSEEventPublisher: 實作 EventPublisherPort               │
│  - InternalEventBus: 實作 InternalEventPublisherPort        │
│  - OpponentService: 監聽內部事件，呼叫 Use Cases (BC 外)     │
│  - EventMapper: Domain → DTO 轉換                           │
└─────────────────────────────────────────────────────────────┘
```

---

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| 記憶體 + 資料庫雙重儲存 | 效能（記憶體）+ 持久化（斷線重連） | 純資料庫：每次操作都需查詢，延遲過高 |
| Opponent Service 在 BC 外 | 未來可獨立為 Opponent BC | 放入 Core Game BC：違反單一職責，難以擴展 |

---

## Generated Artifacts

| Artifact | Path | Description |
|----------|------|-------------|
| Research | [research.md](./research.md) | 技術決策與最佳實踐研究 |
| Data Model | [data-model.md](./data-model.md) | Domain Model + Database Schema |
| REST API Contract | [contracts/rest-api.md](./contracts/rest-api.md) | REST endpoints 規格 |
| SSE Events Contract | [contracts/sse-events.md](./contracts/sse-events.md) | SSE events + DTOs 規格 |
| Quickstart | [quickstart.md](./quickstart.md) | 開發環境設置指南 |

---

## Next Steps

1. **Phase 2**: 執行 `/speckit.tasks` 生成 tasks.md
2. **Phase 3**: 執行 `/speckit.implement` 開始實作
