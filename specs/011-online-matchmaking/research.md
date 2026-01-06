# Research: Online Matchmaking with Tiered Fallback

**Date**: 2026-01-06
**Feature**: 011-online-matchmaking

## Research Topics

### 1. Event Bus 架構設計

**Question**: Event Bus 應該放在哪裡？如何讓各 BC 使用事件通訊而不違反 BC 隔離原則？

**Decision**: Event Bus 移至 Shared Infrastructure 層，不屬於任何 BC。每個 BC 定義自己的 Event Publisher/Subscriber Port，透過 Adapter 委派給共用基礎設施。

**Rationale**:
- **BC 隔離**: Event Bus 若在 Core Game BC 內，其他 BC 必須 import Core Game 的 Port，違反 Constitution VI
- **框架級工具**: Event Bus 是基礎設施，類似 Logger、Database Connection，不應屬於業務 BC
- **對稱設計**: 所有 BC 平等地使用共用基礎設施，無主從關係
- **微服務遷移**: 只需替換 Shared Infrastructure 實作（如 Kafka），各 BC 完全不變

**Implementation Pattern**:
```typescript
// ===== 1. Shared Infrastructure (不屬於任何 BC) =====
// server/shared/infrastructure/event-bus/types.ts
export interface MatchFoundPayload {
  readonly player1Id: string
  readonly player2Id: string
  readonly roomType: RoomTypeId
  readonly matchType: 'HUMAN' | 'BOT'
}

export interface RoomCreatedPayload {
  readonly gameId: string
  readonly waitingPlayerId: string
}

// server/shared/infrastructure/event-bus/internalEventBus.ts
class InternalEventBus {
  private emitter = new EventEmitter()

  publishMatchFound(payload: MatchFoundPayload): void {
    this.emitter.emit('MATCH_FOUND', payload)
  }

  onMatchFound(handler: (p: MatchFoundPayload) => void): Unsubscribe {
    this.emitter.on('MATCH_FOUND', handler)
    return () => this.emitter.off('MATCH_FOUND', handler)
  }

  // 同理 ROOM_CREATED...
}

export const internalEventBus = new InternalEventBus()  // 單例

// ===== 2. Matchmaking BC 自己的 Port =====
// server/matchmaking/application/ports/output/matchmakingEventPublisherPort.ts
import type { MatchFoundPayload } from '~/server/shared/infrastructure/event-bus/types'

export abstract class MatchmakingEventPublisherPort {
  abstract publishMatchFound(payload: MatchFoundPayload): void
}

// ===== 3. Matchmaking BC 的 Adapter =====
// server/matchmaking/adapters/event-publisher/matchmakingEventBusAdapter.ts
import { internalEventBus } from '~/server/shared/infrastructure/event-bus'

export class MatchmakingEventBusAdapter extends MatchmakingEventPublisherPort {
  publishMatchFound(payload: MatchFoundPayload): void {
    internalEventBus.publishMatchFound(payload)  // 委派給共用基礎設施
  }
}

// ===== 4. Core Game BC 訂閱事件 =====
// server/core-game/adapters/event-subscriber/gameCreationHandler.ts
import { internalEventBus } from '~/server/shared/infrastructure/event-bus'

internalEventBus.onMatchFound(async (payload) => {
  // 建立遊戲邏輯
})
```

**Alternatives Considered**:
- ❌ **將 Port 放在 Core Game BC**: Rejected - 其他 BC 必須 import Core Game，違反 BC 隔離
- ❌ **每個 BC 有自己的 Event Bus**: Rejected - 無法跨 BC 通訊
- ❌ **Direct method calls between BCs**: Rejected - 緊耦合，違反微服務設計

---

### 2. Matchmaking Queue Management Strategy

**Question**: How to efficiently manage the matchmaking queue with tiered timeouts?

**Decision**: Use in-memory Map with room-type-keyed queues and per-entry timers.

**Rationale**:
- Consistent with existing InMemoryGameStore pattern
- Simple FIFO matching within same room type
- Per-entry timers enable precise tiered status updates

**Data Structure**:
```typescript
// Queue structure
type MatchmakingPoolData = Map<RoomTypeId, MatchmakingEntry[]>

// Entry with embedded timer references
interface MatchmakingEntry {
  playerId: string
  playerName: string
  roomType: RoomTypeId
  enteredAt: Date
  status: 'SEARCHING' | 'LOW_AVAILABILITY' | 'MATCHED' | 'CANCELLED'
  sseHandler?: (event: MatchmakingEvent) => void  // For status updates
  timers: {
    lowAvailability?: NodeJS.Timeout  // 10s timer
    botFallback?: NodeJS.Timeout      // 15s timer
  }
}
```

**Matching Algorithm**:
1. New player enters → Check if any player waiting in same room type
2. If match found → Create MATCH_FOUND event, remove both from queue
3. If no match → Add to queue, start tiered timers

**Alternatives Considered**:
- Priority queue with ELO: Rejected - out of scope per spec
- Redis-backed queue: Rejected - MVP uses in-memory per constitution

---

### 3. Tiered Timer Management

**Question**: How to implement the 0-10s, 10-15s, 15s+ tiered status updates?

**Decision**: Use NodeJS setTimeout with cascading timers per entry.

**Rationale**:
- Precise timing control per player
- Clean cancellation on match/cancel
- Consistent with existing gameTimeoutManager pattern

**Implementation**:
```typescript
function setupMatchmakingTimers(entry: MatchmakingEntry): void {
  // Timer 1: Low availability status at 10s
  entry.timers.lowAvailability = setTimeout(() => {
    entry.status = 'LOW_AVAILABILITY'
    publishStatusUpdate(entry.playerId, {
      status: 'LOW_AVAILABILITY',
      message: 'Few players online. Still searching...'
    })
  }, 10_000)

  // Timer 2: Bot fallback at 15s
  entry.timers.botFallback = setTimeout(() => {
    triggerBotFallback(entry)
  }, 15_000)
}

function clearMatchmakingTimers(entry: MatchmakingEntry): void {
  if (entry.timers.lowAvailability) clearTimeout(entry.timers.lowAvailability)
  if (entry.timers.botFallback) clearTimeout(entry.timers.botFallback)
}
```

**Alternatives Considered**:
- Central polling loop: Rejected - less precise, more CPU overhead
- External scheduler (node-cron): Rejected - overkill for simple timeouts

---

### 4. Integration with Core Game BC

**Question**: How does Matchmaking BC trigger game creation after match found?

**Decision**: Matchmaking BC 透過自己的 `MatchmakingEventPublisherPort` 發布事件，Adapter 委派給 Shared Infrastructure 的 Event Bus；Core Game BC 訂閱事件並建立遊戲。

**Rationale**:
- **無跨 BC Import**: Matchmaking 不直接依賴 Core Game 的任何程式碼
- **鬆耦合**: 透過共用事件類型定義通訊，BC 可獨立演化
- **微服務遷移**: 只需將 Event Bus 替換為 Message Queue，BC 程式碼不變

**Integration Flow**:
```
1. MatchmakingRegistry finds match
   ↓
2. MatchmakingEventPublisherPort.publishMatchFound(payload)
   ↓
3. MatchmakingEventBusAdapter 委派給 internalEventBus.publishMatchFound()
   ↓
4. Core Game BC 的 gameCreationHandler 監聽 internalEventBus.onMatchFound()
   ↓
5. GameCreationHandler creates game with both players
   ↓
6. 透過 SSE 通知雙方玩家 'game_started'
```

**Dependency Direction**:
```
                    ┌──────────────────────────────┐
                    │   Shared Infrastructure      │
                    │   (Event Bus + Types)        │
                    └──────────────────────────────┘
                           ▲              ▲
                           │              │
              import types │              │ import types + bus
                           │              │
                    ┌──────┴──────┐ ┌─────┴──────┐
                    │ Matchmaking │ │ Core Game  │
                    │ BC          │ │ BC         │
                    └─────────────┘ └────────────┘
                    (無直接依賴)
```

**Key Integration Point**:
- For human matches: GameCreationHandler creates game directly with both players
- For bot fallback: Matchmaking publishes MATCH_FOUND with matchType='BOT', Core Game triggers OpponentRegistry via existing ROOM_CREATED flow

**Alternatives Considered**:
- ❌ Matchmaking directly calls JoinGameUseCase: Rejected - cross-BC direct calls violate isolation
- ❌ Matchmaking imports Core Game's Port: Rejected - creates BC dependency
- ❌ Shared database write: Rejected - eventual consistency issues

---

### 5. SSE Status Updates Architecture

**Question**: How to push matchmaking status updates to clients?

**Decision**: Dedicated SSE endpoint (`/api/v1/matchmaking/status`) separate from game SSE.

**Rationale**:
- Clean separation of concerns
- Client navigates to game page → establishes matchmaking SSE → receives status
- On match found, client transitions to game SSE

**SSE Event Types**:
```typescript
type MatchmakingSSEEvent =
  | { event_type: 'MatchmakingStatus', status: 'SEARCHING', message: string }
  | { event_type: 'MatchmakingStatus', status: 'LOW_AVAILABILITY', message: string }
  | { event_type: 'MatchFound', gameId: string, opponentName: string, isBot: boolean }
  | { event_type: 'MatchmakingCancelled' }
  | { event_type: 'MatchmakingError', error: string }
```

**Connection Flow**:
1. Client POST `/api/v1/matchmaking/enter` (returns entryId)
2. Client GET `/api/v1/matchmaking/status?entry_id=xxx` (SSE stream)
3. Client receives status updates
4. On MatchFound → Client navigates to game SSE `/api/v1/games/connect?game_id=xxx`

**Alternatives Considered**:
- Reuse game SSE endpoint: Rejected - mixing concerns, harder to manage lifecycle
- WebSocket: Rejected - SSE is sufficient, consistent with existing architecture

---

### 6. Duplicate Entry Prevention

**Question**: How to prevent same player entering queue multiple times?

**Decision**: Check existing entry by playerId before adding; return error if exists.

**Rationale**:
- Simple, effective
- Matches clarified spec requirement (reject at lobby stage)

**Implementation**:
```typescript
function enterMatchmaking(input: EnterMatchmakingInput): EnterMatchmakingOutput {
  // Check for existing entry
  const existingEntry = matchmakingPool.findByPlayerId(input.playerId)
  if (existingEntry) {
    return {
      success: false,
      error: 'ALREADY_IN_QUEUE',
      message: 'You are already in the matchmaking queue'
    }
  }
  // Proceed with queue entry
}
```

**Alternatives Considered**:
- Replace existing entry: Rejected - spec says reject, not replace
- Allow multiple entries: Rejected - causes race conditions

---

## Summary of Decisions

| Topic | Decision | Key Benefit |
|-------|----------|-------------|
| Event Bus 架構 | 移至 Shared Infrastructure，各 BC 定義自己的 Port | BC 隔離、微服務遷移容易 |
| Queue Structure | In-memory Map by room type | Simple, fast matching |
| Timer Management | Per-entry setTimeout cascade | Precise, cancelable |
| Core Game Integration | MATCH_FOUND event via shared bus | 鬆耦合、無跨 BC import |
| SSE Architecture | Dedicated matchmaking endpoint | Clean lifecycle |
| Duplicate Prevention | Reject at entry time | Spec-compliant |

## Dependencies Identified

1. **Shared Infrastructure (Event Bus)** - 新增 `server/shared/infrastructure/event-bus/`，提供跨 BC 事件通訊
2. **Identity BC** - Player ID verification before queue entry
3. **Core Game BC** - Subscribe to MATCH_FOUND (透過 Shared Event Bus), create game sessions
4. **Opponent BC** - Triggered via existing ROOM_CREATED for bot fallback
5. **Frontend UIStateStore** - Display matchmaking status messages

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      Shared Infrastructure                              │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  server/shared/infrastructure/event-bus/                         │   │
│  │  ├── types.ts           (MatchFoundPayload, RoomCreatedPayload)  │   │
│  │  ├── internalEventBus.ts (MVP: in-memory EventEmitter)           │   │
│  │  └── index.ts           (匯出單例)                               │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Matchmaking BC │     │  Core Game BC   │     │  Opponent BC    │
│                 │     │                 │     │                 │
│  Port:          │     │  Subscriber:    │     │  Subscriber:    │
│  Matchmaking    │     │  gameCreation   │     │  opponent       │
│  EventPublisher │     │  Handler        │     │  Registry       │
│  Port           │     │                 │     │                 │
│        │        │     │        ▲        │     │        ▲        │
│        ▼        │     │        │        │     │        │        │
│  Adapter:       │     │  onMatchFound() │     │  onRoomCreated()│
│  委派給 shared  │     │                 │     │                 │
│  event bus      │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```
