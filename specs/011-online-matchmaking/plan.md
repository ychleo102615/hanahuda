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
│   │   │   │       └── matchmakingEventPublisherPort.ts
│   │   │   └── use-cases/
│   │   │       ├── enterMatchmakingUseCase.ts
│   │   │       ├── cancelMatchmakingUseCase.ts
│   │   │       └── processMatchmakingUseCase.ts
│   │   │
│   │   └── adapters/
│   │       ├── persistence/
│   │       │   └── inMemoryMatchmakingPool.ts
│   │       ├── event-publisher/
│   │       │   └── matchmakingEventBus.ts
│   │       ├── registry/
│   │       │   └── matchmakingRegistry.ts    # Listens to events, processes queue
│   │       └── mappers/
│   │           └── matchmakingMapper.ts
│   │
│   ├── core-game/
│   │   ├── application/
│   │   │   └── ports/output/
│   │   │       └── internalEventPublisherPort.ts  # Add MATCH_FOUND event
│   │   └── adapters/
│   │       └── event-publisher/
│   │           └── internalEventBus.ts            # Extend with new events
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

**Structure Decision**: Web application structure with Matchmaking BC as a new server-side bounded context under `front-end/server/matchmaking/`, following the existing pattern of `core-game/` and `identity/`. Frontend additions are minimal as we reuse the existing game page's waiting state UI.

## Complexity Tracking

> **Required: Adding 4th Bounded Context**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| 4th BC (Matchmaking) | User requirement: "配對機制是另一外一個 BC，與 core-game, opponent BC 在檔案架構上就做好區別" + Future microservice migration path | Embedding in Core Game BC would violate SRP and make microservice extraction harder |

**Justification Details**:
1. **Explicit User Requirement**: The spec explicitly requires Matchmaking to be a separate BC
2. **Single Responsibility**: Matchmaking has distinct domain concepts (queue, timeout tiers, pool management) separate from game rules
3. **Microservice Readiness**: The Constitution (VII) requires microservice-ready design; separate BC enables independent deployment
4. **Event-Driven Communication**: Using InternalEventBus for MATCH_FOUND events enables future message queue migration

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
| VI. Bounded Context Isolation | ✅ PASS | Separate `server/matchmaking/` directory; MATCH_FOUND event for cross-BC communication; no direct imports |
| VII. Microservice-Ready Design | ✅ PASS | UUIDs for all IDs; InternalEventBus for event-driven communication; stateless API |
| VIII. API Contract Adherence | ✅ PASS | OpenAPI 3.0 contract in `contracts/matchmaking-api.yaml` following existing conventions |

**Complexity Justification**: 4th BC (Matchmaking) is justified per Complexity Tracking section above.

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
