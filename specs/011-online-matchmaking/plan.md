# Implementation Plan: Online Matchmaking with Tiered Fallback

**Branch**: `011-online-matchmaking` | **Date**: 2026-01-06 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/011-online-matchmaking/spec.md`

## Summary

Implement a new Matchmaking BC (Bounded Context) that enables real-time player-to-player matching with a tiered fallback mechanism. Players entering matchmaking will first attempt to find human opponents (0-10s), then see a "low availability" status (10-15s), and finally auto-match with Bot via existing Opponent BC (15s+). The Matchmaking BC will be architecturally separated and communicate via InternalEventBus events, following the same pattern as OpponentRegistry.

## Technical Context

**Language/Version**: TypeScript 5.9
**Primary Dependencies**: Nuxt 4 (Nitro), Vue 3.5, Pinia 3.x
**Storage**: In-memory (InMemoryMatchmakingPool) for MVP, consistent with existing GameStore pattern
**Testing**: Vitest (unit tests for Domain/Application layers)
**Target Platform**: Web (Linux server deployment)
**Project Type**: Web application (frontend + backend in Nuxt 4 monorepo)
**Performance Goals**: Matchmaking within 15s, status updates within 1s tolerance
**Constraints**: Event-driven communication via InternalEventBus, microservice-ready design
**Scale/Scope**: 100+ concurrent players in matchmaking queue (MVP)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Clean Architecture | PASS | Matchmaking BC follows Domain → Application → Adapter layering |
| II. Domain-Driven Development | PASS | New BC with clear Aggregate (MatchmakingPool), Entities (MatchmakingEntry), Events |
| III. Server Authority | PASS | All matchmaking logic server-side; frontend only displays status via SSE |
| IV. Command-Event Architecture | PASS | REST command to enter queue, SSE events for status updates |
| V. Test-First Development | PASS | Domain/Application layers will have >80% test coverage |
| VI. Bounded Context Isolation | PASS | Separate BC directory; DTOs for cross-BC communication |
| VII. Microservice-Ready Design | PASS | UUIDs, event-driven, stateless API design |
| VIII. API Contract Adherence | PASS | New endpoints will follow protocol.md conventions |

**Complexity Justification Required**: Adding a 4th Bounded Context (Matchmaking BC)

## Project Structure

### Documentation (this feature)

```text
specs/011-online-matchmaking/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── matchmaking-api.yaml
└── tasks.md             # Phase 2 output (not created by /speckit.plan)
```

### Source Code (repository root)

```text
front-end/
├── server/
│   ├── shared/                           # ★ NEW: Shared Infrastructure (不屬於任何 BC)
│   │   └── infrastructure/
│   │       └── event-bus/
│   │           ├── internalEventBus.ts   # Event Bus 實作 (MVP: in-memory)
│   │           ├── types.ts              # 共用事件 Payload 類型定義
│   │           └── index.ts              # 匯出單例
│   │
│   ├── matchmaking/                      # ★ NEW: Matchmaking BC
│   │   ├── domain/
│   │   │   ├── matchmakingEntry.ts       # Entity: player in queue
│   │   │   ├── matchmakingPool.ts        # Aggregate Root: queue per room type
│   │   │   ├── matchResult.ts            # Value Object: match outcome
│   │   │   └── matchmakingEvents.ts      # Domain Events
│   │   │
│   │   ├── application/
│   │   │   ├── ports/
│   │   │   │   ├── input/
│   │   │   │   │   ├── enterMatchmakingInputPort.ts
│   │   │   │   │   ├── cancelMatchmakingInputPort.ts
│   │   │   │   │   └── checkMatchmakingStatusInputPort.ts
│   │   │   │   └── output/
│   │   │   │       ├── matchmakingPoolPort.ts
│   │   │   │       ├── matchmakingEventPublisherPort.ts  # Matchmaking 自己的 Port
│   │   │   │       └── playerGameStatusPort.ts           # 查詢玩家是否有進行中的遊戲
│   │   │   └── use-cases/
│   │   │       ├── enterMatchmakingUseCase.ts
│   │   │       ├── cancelMatchmakingUseCase.ts
│   │   │       └── processMatchmakingUseCase.ts
│   │   │
│   │   └── adapters/
│   │       ├── persistence/
│   │       │   └── inMemoryMatchmakingPool.ts
│   │       ├── event-publisher/
│   │       │   └── matchmakingEventBusAdapter.ts  # 委派給 shared event bus
│   │       ├── registry/
│   │       │   └── matchmakingRegistry.ts    # Listens to events, processes queue
│   │       └── mappers/
│   │           └── matchmakingMapper.ts
│   │
│   ├── core-game/
│   │   ├── application/
│   │   │   └── ports/output/
│   │   │       └── gameEventPublisherPort.ts     # Core Game 自己的 Port (重新命名)
│   │   └── adapters/
│   │       ├── event-publisher/
│   │       │   └── gameEventBusAdapter.ts        # 委派給 shared event bus
│   │       ├── event-subscriber/
│   │       │   └── gameCreationHandler.ts        # 訂閱 MATCH_FOUND 事件
│   │       └── query/
│   │           └── playerGameStatusAdapter.ts    # 實作 Matchmaking BC 的 PlayerGameStatusPort
│   │
│   ├── opponent/
│   │   └── adapters/
│   │       └── event-subscriber/
│   │           └── opponentEventSubscriberAdapter.ts  # 訂閱 shared event bus
│   │
│   ├── api/v1/
│   │   └── matchmaking/                   # ★ NEW: API routes
│   │       ├── enter.post.ts              # POST /api/v1/matchmaking/enter
│   │       ├── cancel.post.ts             # POST /api/v1/matchmaking/cancel
│   │       └── status.get.ts              # GET /api/v1/matchmaking/status (SSE)
│   │
│   └── plugins/
│       └── matchmaking.ts                 # ★ NEW: Plugin to start registry
│
└── app/
    ├── user-interface/
    │   └── application/
    │       └── use-cases/
    │           └── matchmaking/           # ★ NEW: Frontend use cases
    │               ├── HandleMatchmakingStatusUseCase.ts
    │               └── HandleMatchFoundUseCase.ts
    └── pages/
        └── game/
            └── index.vue                  # Extend to handle matchmaking state
```

**Structure Decision**:
- **Shared Infrastructure**: Event Bus 移至 `server/shared/infrastructure/event-bus/`，作為框架級工具，不屬於任何 BC
- **BC 獨立性**: 每個 BC 定義自己的 Event Publisher/Subscriber Port，透過 Adapter 委派給共用基礎設施
- **微服務遷移**: 只需替換 `shared/infrastructure/event-bus/` 的實作（如 Kafka），各 BC 完全不變
- **無跨 BC Import**: BC 之間不直接 import，僅透過共用事件類型溝通

## Complexity Tracking

> **Required: Adding 4th Bounded Context + Shared Infrastructure Layer**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| 4th BC (Matchmaking) | User requirement: "配對機制是另一外一個 BC，與 core-game, opponent BC 在檔案架構上就做好區別" + Future microservice migration path | Embedding in Core Game BC would violate SRP and make microservice extraction harder |
| Shared Infrastructure Layer | Event Bus 不應屬於任何 BC，需獨立於所有 BC 之外 | 將 Event Bus 放在 Core Game BC 會導致其他 BC 依賴 Core Game，違反 BC 隔離原則 |

**Justification Details**:

**4th BC (Matchmaking)**:
1. **Explicit User Requirement**: The spec explicitly requires Matchmaking to be a separate BC
2. **Single Responsibility**: Matchmaking has distinct domain concepts (queue, timeout tiers, pool management) separate from game rules
3. **Microservice Readiness**: The Constitution (VII) requires microservice-ready design; separate BC enables independent deployment

**Shared Infrastructure Layer**:
1. **BC Isolation**: Event Bus 若在 Core Game BC 內，Matchmaking BC 必須 import Core Game 的 Port，違反 Constitution VI
2. **Framework-Level Concern**: Event Bus 是框架級工具，類似 Logger、Database Connection，不應屬於業務 BC
3. **Microservice Migration**: 共用基礎設施設計讓替換 Event Bus 實作（如 Kafka）只需改一處，各 BC 完全不變
4. **Symmetric Design**: 所有 BC 平等地使用共用基礎設施，無主從關係

---

## Post-Design Constitution Re-Check

*Re-evaluated after Phase 1 design completion.*

| Principle | Status | Evidence |
|-----------|--------|----------|
| I. Clean Architecture | ✅ PASS | `data-model.md` shows Domain (MatchmakingEntry, MatchmakingPool) → Application (Use Cases, Ports) → Adapter (InMemoryMatchmakingPool, API routes) |
| II. Domain-Driven Development | ✅ PASS | Clear Aggregate Root (MatchmakingPool), Entity (MatchmakingEntry), Value Objects (MatchResult, MatchmakingStatus), Domain Events defined |
| III. Server Authority | ✅ PASS | All matching logic in server; frontend receives SSE events only; no client-side queue management |
| IV. Command-Event Architecture | ✅ PASS | REST commands (enter, cancel) + SSE events (MatchmakingStatus, MatchFound) per `contracts/matchmaking-api.yaml` |
| V. Test-First Development | ✅ PASS | Domain/Application test files planned in structure; >80% coverage target maintained |
| VI. Bounded Context Isolation | ✅ PASS | Event Bus 移至 Shared Infrastructure；每個 BC 定義自己的 Port；BC 之間無直接 import 依賴 |
| VII. Microservice-Ready Design | ✅ PASS | UUIDs for all IDs; Shared Event Bus 可輕易替換為 Kafka/RabbitMQ; stateless API |
| VIII. API Contract Adherence | ✅ PASS | OpenAPI 3.0 contract in `contracts/matchmaking-api.yaml` following existing conventions |

**Complexity Justification**: 4th BC (Matchmaking) + Shared Infrastructure Layer are justified per Complexity Tracking section above.

---

## Generated Artifacts

| Artifact | Path | Description |
|----------|------|-------------|
| Research | `research.md` | Technical decisions and alternatives considered |
| Data Model | `data-model.md` | Domain entities, value objects, events |
| API Contract | `contracts/matchmaking-api.yaml` | OpenAPI 3.0 specification |
| Quickstart | `quickstart.md` | Development setup and testing guide |

## Next Steps

Run `/speckit.tasks` to generate implementation tasks from this plan.
