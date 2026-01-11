# Quickstart: Online Matchmaking

**Date**: 2026-01-06
**Feature**: 011-online-matchmaking

## Prerequisites

- Node.js 20+
- pnpm 8+
- Running PostgreSQL instance (for Identity BC session management)

## Development Setup

### 1. Start the Development Server

```bash
cd front-end
pnpm install
pnpm dev
```

The server runs at `http://localhost:3000`.

### 2. Test Matchmaking Flow (Two Browser Windows)

**Window 1 (Player A)**:
```
1. Open http://localhost:3000/lobby
2. Select a room type (e.g., STANDARD)
3. Click "Start Game" to enter matchmaking
4. Watch status: "Searching for opponent..."
```

**Window 2 (Player B)**:
```
1. Open http://localhost:3000/lobby (in incognito for separate session)
2. Select the SAME room type (STANDARD)
3. Click "Start Game"
4. Both players should be matched within 10 seconds
```

### 3. Test Bot Fallback (Single Player)

```
1. Open http://localhost:3000/lobby
2. Select a room type
3. Click "Start Game"
4. Wait 10 seconds → See "Few players online. Still searching..."
5. Wait 15 seconds total → See "Matched with computer opponent"
6. Game starts automatically with Bot
```

## API Testing with cURL

### Enter Matchmaking Queue

```bash
# First, get a session (login or guest)
# Then use the session cookie:

curl -X POST http://localhost:3000/api/v1/matchmaking/enter \
  -H "Content-Type: application/json" \
  -H "Cookie: session=YOUR_SESSION_COOKIE" \
  -d '{"room_type": "STANDARD"}'

# Response:
# {
#   "success": true,
#   "entry_id": "uuid-here",
#   "message": "Searching for opponent..."
# }
```

### Subscribe to Status (SSE)

```bash
curl -N http://localhost:3000/api/v1/matchmaking/status?entry_id=UUID_HERE \
  -H "Cookie: session=YOUR_SESSION_COOKIE"

# SSE Events:
# event: MatchmakingStatus
# data: {"event_type":"MatchmakingStatus","status":"SEARCHING","message":"Searching for opponent...","elapsed_seconds":5}
#
# event: MatchmakingStatus
# data: {"event_type":"MatchmakingStatus","status":"LOW_AVAILABILITY","message":"Few players online. Still searching...","elapsed_seconds":12}
#
# event: MatchFound
# data: {"event_type":"MatchFound","game_id":"uuid","opponent_name":"Computer","is_bot":true}
```

### Cancel Matchmaking

```bash
curl -X POST http://localhost:3000/api/v1/matchmaking/cancel \
  -H "Content-Type: application/json" \
  -H "Cookie: session=YOUR_SESSION_COOKIE" \
  -d '{"entry_id": "UUID_HERE"}'

# Response:
# {
#   "success": true,
#   "message": "Matchmaking cancelled"
# }
```

## Running Tests

### Unit Tests (Domain + Application Layers)

```bash
cd front-end
pnpm test:unit -- --filter matchmaking
```

### Run Specific Test File

```bash
pnpm test:unit server/matchmaking/domain/matchmakingPool.test.ts
pnpm test:unit server/matchmaking/application/use-cases/enterMatchmakingUseCase.test.ts
```

### Watch Mode

```bash
pnpm test:unit -- --watch --filter matchmaking
```

## Key Files to Modify

### Shared Infrastructure (NEW)

| File | Purpose |
|------|---------|
| `server/shared/infrastructure/event-bus/types.ts` | 共用事件 Payload 定義 (MatchFoundPayload, RoomCreatedPayload) |
| `server/shared/infrastructure/event-bus/internalEventBus.ts` | Event Bus 實作 (MVP: in-memory) |
| `server/shared/infrastructure/event-bus/index.ts` | 匯出單例 |

### Backend (Matchmaking BC)

| File | Purpose |
|------|---------|
| `server/matchmaking/domain/matchmakingEntry.ts` | Entry entity |
| `server/matchmaking/domain/matchmakingPool.ts` | Pool aggregate |
| `server/matchmaking/application/ports/output/matchmakingEventPublisherPort.ts` | Matchmaking 自己的 Port |
| `server/matchmaking/application/use-cases/enterMatchmakingUseCase.ts` | Enter queue logic |
| `server/matchmaking/adapters/event-publisher/matchmakingEventBusAdapter.ts` | 委派給 shared event bus |
| `server/matchmaking/adapters/registry/matchmakingRegistry.ts` | Timer management, matching |
| `server/api/v1/matchmaking/enter.post.ts` | API endpoint |

### Backend (Core Game BC - Integration)

| File | Purpose |
|------|---------|
| `server/core-game/adapters/event-subscriber/gameCreationHandler.ts` | 訂閱 MATCH_FOUND 事件，建立遊戲 |

### Frontend

| File | Purpose |
|------|---------|
| `app/pages/game/index.vue` | Handle matchmaking state |
| `app/user-interface/adapter/stores/uiState.ts` | Matchmaking status display |

## Debugging Tips

### Check Matchmaking Pool State

Add temporary logging in `matchmakingRegistry.ts`:

```typescript
console.log('Current pool:', Array.from(this.pool.entries()))
```

### Check SSE Connection

In browser DevTools → Network → Filter by "EventStream":
- Look for `/api/v1/matchmaking/status` connection
- Check "EventStream" tab for received events

### Check Internal Events

Add logging in `internalEventBus.ts`:

```typescript
publishMatchFound(payload: MatchFoundPayload): void {
  console.log('[InternalEventBus] MATCH_FOUND:', payload)
  this.emitter.emit('MATCH_FOUND', payload)
}
```

## Common Issues

### "Already in queue" Error

**Cause**: Previous session didn't clean up properly.

**Solution**: Clear browser cookies or wait for entry to expire (should auto-cleanup on disconnect).

### SSE Connection Drops

**Cause**: Server restart during development.

**Solution**: Frontend should auto-reconnect. If not, refresh the page.

### Bot Not Spawning After 15s

**Cause**: `matchmakingRegistry.ts` timer not triggering bot fallback.

**Debug**: Check console for timer logs, verify Opponent BC is running (`server/plugins/opponent.ts`).

## Architecture Reference

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Client (Browser)                            │
├─────────────────────────────────────────────────────────────────────┤
│  Lobby Page                    Game Page                            │
│  ┌─────────┐                   ┌─────────────────────────────────┐  │
│  │ Select  │ ──► POST /enter   │ SSE /status                     │  │
│  │ Room    │                   │ ← MatchmakingStatus (SEARCHING) │  │
│  │ Type    │                   │ ← MatchmakingStatus (LOW_AVAIL) │  │
│  └─────────┘                   │ ← MatchFound (game_id)          │  │
│                                │                                  │  │
│                                │ ──► SSE /games/connect?game_id   │  │
│                                └─────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         Server (Nuxt/Nitro)                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │              Shared Infrastructure (Event Bus)                │  │
│  │  server/shared/infrastructure/event-bus/                      │  │
│  │  ├── types.ts (MatchFoundPayload, RoomCreatedPayload)         │  │
│  │  └── internalEventBus.ts (MVP: in-memory EventEmitter)        │  │
│  └───────────────────────────────────────────────────────────────┘  │
│           ▲                    ▲                    ▲               │
│           │ publish            │ subscribe          │ subscribe     │
│           │ MATCH_FOUND        │ MATCH_FOUND        │ ROOM_CREATED  │
│           │                    │                    │               │
│  ┌────────┴────────┐  ┌───────┴─────────┐  ┌───────┴─────────┐     │
│  │  Matchmaking BC │  │  Core Game BC   │  │  Opponent BC    │     │
│  │                 │  │                 │  │                 │     │
│  │ ┌─────────────┐ │  │ ┌─────────────┐ │  │ ┌─────────────┐ │     │
│  │ │ Matchmaking │ │  │ │ gameCreation│ │  │ │ opponent    │ │     │
│  │ │ Pool        │ │  │ │ Handler     │ │  │ │ Registry    │ │     │
│  │ └─────────────┘ │  │ └─────────────┘ │  │ └─────────────┘ │     │
│  │        │        │  │        │        │  │                 │     │
│  │        ▼        │  │        ▼        │  │                 │     │
│  │ ┌─────────────┐ │  │ ┌─────────────┐ │  │                 │     │
│  │ │ Matchmaking │ │  │ │ Game Event  │ │  │                 │     │
│  │ │ EventBus    │ │  │ │ Bus Adapter │ │  │                 │     │
│  │ │ Adapter     │ │  │ │ (publish    │ │  │                 │     │
│  │ │ (委派)      │ │  │ │ ROOM_CREATED│ │  │                 │     │
│  │ └─────────────┘ │  │ └─────────────┘ │  │                 │     │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘     │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

Event Flow:
1. Matchmaking BC finds match → publishes MATCH_FOUND via shared bus
2. Core Game BC subscribes → creates game session
3. Core Game BC publishes ROOM_CREATED (for bot) via shared bus
4. Opponent BC subscribes → initializes AI opponent
```
