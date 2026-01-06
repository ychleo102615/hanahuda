# Data Model: Online Matchmaking

**Date**: 2026-01-06
**Feature**: 011-online-matchmaking

## Domain Model Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Matchmaking BC                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────┐      ┌─────────────────────┐      │
│  │  MatchmakingPool    │ 1──* │  MatchmakingEntry   │      │
│  │  (Aggregate Root)   │      │  (Entity)           │      │
│  └─────────────────────┘      └─────────────────────┘      │
│           │                            │                    │
│           │ produces                   │ results in         │
│           ▼                            ▼                    │
│  ┌─────────────────────┐      ┌─────────────────────┐      │
│  │  MatchResult        │      │  MatchmakingStatus  │      │
│  │  (Value Object)     │      │  (Value Object)     │      │
│  └─────────────────────┘      └─────────────────────┘      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Entities

### MatchmakingEntry (Entity)

Represents a player waiting in the matchmaking queue.

| Field | Type | Description | Validation |
|-------|------|-------------|------------|
| `id` | `string` (UUID) | Unique entry identifier | Required, UUID format |
| `playerId` | `string` (UUID) | Player's unique identifier | Required, UUID format |
| `playerName` | `string` | Display name | Required, 1-20 chars |
| `roomType` | `RoomTypeId` | Selected room type | Required, enum value |
| `status` | `MatchmakingEntryStatus` | Current queue status | Required, enum value |
| `enteredAt` | `Date` | Timestamp when entered queue | Required, auto-set |

**Status Enum**:
```typescript
type MatchmakingEntryStatus =
  | 'SEARCHING'       // 0-10s: Actively searching
  | 'LOW_AVAILABILITY' // 10-15s: Few players online
  | 'MATCHED'         // Match found (human or bot)
  | 'CANCELLED'       // Player cancelled
  | 'EXPIRED'         // Timeout without match (should not happen with bot fallback)
```

**State Transitions**:
```
                    ┌──────────────┐
                    │              │
        ┌──────────►│  SEARCHING   │◄─────────┐
        │           │              │          │
        │           └──────┬───────┘          │
        │                  │                  │
        │           10s timeout               │
        │                  │                  │
        │                  ▼                  │
        │           ┌──────────────┐          │
        │           │              │          │
        │           │LOW_AVAILABILITY│         │
        │           │              │          │
        │           └──────┬───────┘          │
        │                  │                  │
        │           15s timeout               │
        │           or match found            │
        │                  │                  │
        │                  ▼                  │
┌───────┴───────┐   ┌──────────────┐   ┌──────┴───────┐
│               │   │              │   │              │
│   CANCELLED   │   │   MATCHED    │   │   EXPIRED    │
│               │   │              │   │  (fallback)  │
└───────────────┘   └──────────────┘   └──────────────┘
```

**Business Rules**:
- A player can only have one active entry at a time
- A player cannot enter matchmaking while having an active game in progress
- Entry is removed from queue when status changes to MATCHED, CANCELLED, or EXPIRED
- Bot fallback ensures EXPIRED state should never occur in normal operation

---

### MatchmakingPool (Aggregate Root)

The collection of all players currently waiting for matches, organized by room type.

| Field | Type | Description |
|-------|------|-------------|
| `entries` | `Map<RoomTypeId, MatchmakingEntry[]>` | Entries grouped by room type |

**Operations**:

| Method | Description | Returns |
|--------|-------------|---------|
| `add(entry)` | Add player to queue | `void` |
| `remove(entryId)` | Remove player from queue | `MatchmakingEntry \| undefined` |
| `findByPlayerId(playerId)` | Check if player already in queue | `MatchmakingEntry \| undefined` |
| `findMatch(roomType)` | Find first available opponent | `MatchmakingEntry \| undefined` |
| `getByRoomType(roomType)` | Get all entries for room type | `MatchmakingEntry[]` |
| `updateStatus(entryId, status)` | Update entry status | `void` |

**Invariants**:
- No duplicate playerIds across all room types
- Entries are ordered by `enteredAt` (FIFO within room type)

---

## Value Objects

### MatchResult

The outcome of a successful match between two players.

| Field | Type | Description |
|-------|------|-------------|
| `player1Id` | `string` (UUID) | First player's ID |
| `player2Id` | `string` (UUID) | Second player's ID |
| `player1Name` | `string` | First player's name |
| `player2Name` | `string` | Second player's name |
| `roomType` | `RoomTypeId` | Room type for the match |
| `matchType` | `MatchType` | Human vs Bot indicator |
| `matchedAt` | `Date` | Timestamp of match |

**Match Type Enum**:
```typescript
type MatchType = 'HUMAN' | 'BOT'
```

---

### MatchmakingStatus

Status information sent to client via SSE.

| Field | Type | Description |
|-------|------|-------------|
| `status` | `MatchmakingStatusCode` | Current status code |
| `message` | `string` | Human-readable message (English) |
| `elapsedSeconds` | `number` | Time spent in queue |

**Status Code Enum**:
```typescript
type MatchmakingStatusCode =
  | 'SEARCHING'        // "Searching for opponent..."
  | 'LOW_AVAILABILITY' // "Few players online. Still searching..."
  | 'MATCHED_HUMAN'    // "Opponent found!"
  | 'MATCHED_BOT'      // "Matched with computer opponent"
  | 'CANCELLED'        // "Matchmaking cancelled"
  | 'ERROR'            // Error occurred
```

---

## Events (Domain Events)

### PlayerEnteredQueue

Published when a player successfully enters the matchmaking queue.

```typescript
interface PlayerEnteredQueueEvent {
  readonly eventType: 'PLAYER_ENTERED_QUEUE'
  readonly entryId: string
  readonly playerId: string
  readonly roomType: RoomTypeId
  readonly enteredAt: Date
}
```

### MatchFound

Published when two players are matched (human-human or human-bot).

```typescript
interface MatchFoundEvent {
  readonly eventType: 'MATCH_FOUND'
  readonly matchResult: MatchResult
}
```

### PlayerLeftQueue

Published when a player leaves the queue (cancel or timeout).

```typescript
interface PlayerLeftQueueEvent {
  readonly eventType: 'PLAYER_LEFT_QUEUE'
  readonly entryId: string
  readonly playerId: string
  readonly reason: 'CANCELLED' | 'MATCHED' | 'EXPIRED'
}
```

---

## SSE Event Types (Client-Facing)

### MatchmakingStatusEvent

Sent to client to update matchmaking UI.

```typescript
interface MatchmakingStatusEvent {
  readonly event_type: 'MatchmakingStatus'
  readonly entry_id: string
  readonly status: MatchmakingStatusCode
  readonly message: string
  readonly elapsed_seconds: number
}
```

### MatchFoundEvent (SSE)

Sent to client when match is found.

```typescript
interface MatchFoundSSEEvent {
  readonly event_type: 'MatchFound'
  readonly game_id: string
  readonly opponent_name: string
  readonly is_bot: boolean
}
```

### MatchmakingErrorEvent

Sent to client on error.

```typescript
interface MatchmakingErrorEvent {
  readonly event_type: 'MatchmakingError'
  readonly error_code: string
  readonly message: string
}
```

---

## Shared Types (from existing codebase)

### RoomTypeId

Already defined in `front-end/shared/constants/roomTypes.ts`:

```typescript
type RoomTypeId = 'QUICK' | 'STANDARD' | 'MARATHON'
```

---

## Relationship with Other BCs

### Architecture Overview

```
                    ┌───────────────────────────────────────────┐
                    │        Shared Infrastructure              │
                    │  ┌─────────────────────────────────────┐  │
                    │  │  server/shared/infrastructure/      │  │
                    │  │  event-bus/                         │  │
                    │  │  ├── types.ts (共用 Payload 定義)   │  │
                    │  │  └── internalEventBus.ts            │  │
                    │  └─────────────────────────────────────┘  │
                    └─────────────────┬─────────────────────────┘
                                      │
          ┌───────────────────────────┼───────────────────────────┐
          │                           │                           │
          ▼                           ▼                           ▼
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│  Matchmaking BC │         │  Core Game BC   │         │  Opponent BC    │
│                 │         │                 │         │                 │
│  Publishes:     │         │  Subscribes:    │         │  Subscribes:    │
│  MATCH_FOUND    │         │  MATCH_FOUND    │         │  ROOM_CREATED   │
│                 │         │                 │         │                 │
│  (透過自己的    │         │  Publishes:     │         │                 │
│   Port+Adapter) │         │  ROOM_CREATED   │         │                 │
└────────┬────────┘         └────────┬────────┘         └─────────────────┘
         │                           │
         │ uses playerId             │
         ▼                           │
┌─────────────────┐                  │
│  Identity BC    │◄─────────────────┘
│  (驗證玩家)     │
└─────────────────┘
```

### Key Design Principle: No Cross-BC Import

- **錯誤做法**: Matchmaking BC import Core Game BC 的 `InternalEventPublisherPort`
- **正確做法**: 所有 BC 只 import Shared Infrastructure 的共用類型定義

```typescript
// ✅ 正確：Matchmaking BC 只依賴 Shared Infrastructure
import type { MatchFoundPayload } from '~/server/shared/infrastructure/event-bus/types'

// ❌ 錯誤：Matchmaking BC 依賴 Core Game BC
import { InternalEventPublisherPort } from '~/server/core-game/application/ports/...'
```

### Communication Contracts

1. **Matchmaking → Core Game** (via Shared Event Bus):
   - Matchmaking 透過自己的 `MatchmakingEventPublisherPort` 發布事件
   - Adapter 委派給 `internalEventBus.publishMatchFound()`
   - Core Game 的 `gameCreationHandler` 訂閱 `onMatchFound()`
   - Payload: `MatchFoundPayload { player1Id, player2Id, roomType, matchType }`

2. **Core Game → Opponent** (via Shared Event Bus, existing):
   - Core Game 發布 `ROOM_CREATED` 事件
   - Opponent BC 的 `opponentRegistry` 訂閱並建立 AI

3. **Matchmaking ← Identity** (direct query):
   - Verify playerId exists and is valid before queue entry
   - 這是同步查詢，非事件通訊

### Microservice Migration Path

```
MVP (In-Memory):
┌─────────────────────────────────────────────────┐
│  Shared Infrastructure                          │
│  └── internalEventBus.ts (EventEmitter)         │
└─────────────────────────────────────────────────┘

微服務 (Message Queue):
┌─────────────────────────────────────────────────┐
│  Shared Infrastructure                          │
│  └── kafkaEventBus.ts (Kafka Producer/Consumer) │
└─────────────────────────────────────────────────┘

只需替換 Shared Infrastructure 實作，各 BC 程式碼完全不變！
```
