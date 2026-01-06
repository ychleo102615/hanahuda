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

```
┌─────────────────┐     MATCH_FOUND      ┌─────────────────┐
│                 │ ──────────────────►  │                 │
│  Matchmaking BC │                      │  Core Game BC   │
│                 │                      │                 │
└────────┬────────┘                      └────────┬────────┘
         │                                        │
         │ uses playerId                          │ ROOM_CREATED
         │                                        │ (for bot)
         ▼                                        ▼
┌─────────────────┐                      ┌─────────────────┐
│                 │                      │                 │
│  Identity BC    │                      │  Opponent BC    │
│                 │                      │                 │
└─────────────────┘                      └─────────────────┘
```

**Communication Contracts**:

1. **Matchmaking → Core Game** (via MATCH_FOUND event):
   - Payload: `MatchFoundPayload { player1Id, player2Id, roomType, matchType }`
   - Core Game creates game session with both players

2. **Core Game → Opponent** (existing, via ROOM_CREATED):
   - Used when matchType='BOT' - Matchmaking creates single-player game, triggers existing bot flow

3. **Matchmaking ← Identity** (direct query):
   - Verify playerId exists and is valid before queue entry
