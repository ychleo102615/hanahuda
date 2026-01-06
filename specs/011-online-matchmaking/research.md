# Research: Online Matchmaking with Tiered Fallback

**Date**: 2026-01-06
**Feature**: 011-online-matchmaking

## Research Topics

### 1. InternalEventBus Extension Pattern

**Question**: How to add new event types (PLAYER_ENTERED_QUEUE, MATCH_FOUND) to the existing InternalEventBus?

**Decision**: Follow the existing ROOM_CREATED pattern - add methods to InternalEventPublisherPort interface and implement in InternalEventBus adapter.

**Rationale**:
- Consistent with existing codebase patterns
- Type-safe event definitions via TypeScript interfaces
- Loose coupling enables future message queue migration

**Implementation Pattern**:
```typescript
// 1. Define payload types
export interface PlayerEnteredQueuePayload {
  readonly playerId: string
  readonly roomType: RoomTypeId
  readonly enteredAt: Date
}

export interface MatchFoundPayload {
  readonly player1Id: string
  readonly player2Id: string
  readonly roomType: RoomTypeId
  readonly matchType: 'HUMAN' | 'BOT'
}

// 2. Extend port interface
export interface InternalEventPublisherPort {
  // Existing
  publishRoomCreated(payload: RoomCreatedPayload): void
  // New for Matchmaking
  publishPlayerEnteredQueue(payload: PlayerEnteredQueuePayload): void
  publishMatchFound(payload: MatchFoundPayload): void
  onMatchFound(handler: (payload: MatchFoundPayload) => void): Unsubscribe
}

// 3. Implement in InternalEventBus adapter
```

**Alternatives Considered**:
- Separate MatchmakingEventBus: Rejected - unnecessary complexity, InternalEventBus already handles cross-BC events
- Direct method calls between BCs: Rejected - tight coupling, violates microservice-ready design

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

**Decision**: Publish MATCH_FOUND event via InternalEventBus; Core Game BC subscribes and creates game.

**Rationale**:
- Follows existing OpponentRegistry pattern (ROOM_CREATED → AI joins)
- Loose coupling between BCs
- Clear responsibility separation

**Integration Flow**:
```
1. MatchmakingRegistry finds match
   ↓
2. Publish MATCH_FOUND event (player1Id, player2Id, roomType, matchType)
   ↓
3. Core Game BC (GameCreationHandler) subscribes to MATCH_FOUND
   ↓
4. GameCreationHandler creates game with both players
   ↓
5. JoinGameUseCase returns 'game_started' to both SSE connections
```

**Key Integration Point**:
- For human matches: GameCreationHandler creates game directly with both players
- For bot fallback: Matchmaking publishes MATCH_FOUND with matchType='BOT', Core Game triggers OpponentRegistry via existing ROOM_CREATED flow

**Alternatives Considered**:
- Matchmaking directly calls JoinGameUseCase: Rejected - cross-BC direct calls violate isolation
- Shared database write: Rejected - eventual consistency issues

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
| Event Bus Extension | Extend InternalEventPublisherPort | Type-safe, consistent |
| Queue Structure | In-memory Map by room type | Simple, fast matching |
| Timer Management | Per-entry setTimeout cascade | Precise, cancelable |
| Core Game Integration | MATCH_FOUND event | Loose coupling |
| SSE Architecture | Dedicated matchmaking endpoint | Clean lifecycle |
| Duplicate Prevention | Reject at entry time | Spec-compliant |

## Dependencies Identified

1. **InternalEventBus** - Must be extended with new event types
2. **Identity BC** - Player ID verification before queue entry
3. **Core Game BC** - Subscribe to MATCH_FOUND, create game sessions
4. **Opponent BC** - Triggered via existing ROOM_CREATED for bot fallback
5. **Frontend UIStateStore** - Display matchmaking status messages
