# Hanafuda Koi-Koi Web Game

A Japanese Hanafuda card game showcasing **Clean Architecture**, **Domain-Driven Design**, and **full-stack engineering capabilities**.

## Project Highlights

| Area | Technical Implementation |
|------|-------------------------|
| **Architecture** | Strict Clean Architecture layering, DDD Bounded Contexts, Dependency Inversion |
| **Frontend** | Nuxt 4 + Vue 3 + TypeScript, Custom DI Container, SVG Sprite optimization |
| **Performance** | SSR-first SVG sprite injection; localStorage restore eliminates repeat-visit re-download — zero render-blocking across Chrome & Safari |
| **CI/CD** | GitHub Actions: parallel type-check / lint / unit-tests (Vitest) / build on every push; deploy pipeline includes DB migration, Fly.io deploy, and automated Lighthouse CI audit |
| **Backend** | Nuxt 4 Nitro + Drizzle ORM + PostgreSQL, SSE + REST API real-time communication, Pessimistic locking |
| **Game Logic** | Complete Yaku detection engine (12 hand types), Koi-Koi rule implementation, Special rule handling |
| **Matchmaking** | Online human vs human, AI opponent matching, Room type management, PlayerEventBus |
| **Identity** | Player accounts, Guest mode, Soft delete mechanism, Telegram Mini App OAuth |
| **Leaderboard** | Player rankings, Win rate statistics, Yaku achievement tracking |
| **State Management** | Reconnection mechanism, Operation timer, Page visibility state recovery |
| **Animation System** | Interruptible animations, AbortController integration, Dynamic coordinate calculation |

---

## Tech Stack

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend                              │
│  Nuxt 4 • Vue 3 • TypeScript • Tailwind CSS v4 • Pinia     │
├─────────────────────────────────────────────────────────────┤
│                        Backend                               │
│  Nuxt 4 Nitro • Drizzle ORM • PostgreSQL • SSE             │
├─────────────────────────────────────────────────────────────┤
│                     Architecture                             │
│  Clean Architecture • DDD • Event-Driven • CQRS-like        │
└─────────────────────────────────────────────────────────────┘
```

---

## Architecture Overview

### Clean Architecture Layering

This project strictly follows Clean Architecture with four-layer structure on both frontend and backend:

```
┌───────────────────────────────────────────────────────────┐
│  Framework Layer (Nuxt Pages, API Routes, Vue Components) │
├───────────────────────────────────────────────────────────┤
│  Adapter Layer (Pinia Stores, API Clients, SSE, DB Repo)  │
├───────────────────────────────────────────────────────────┤
│  Application Layer (Use Cases, Event Handlers, Ports)     │
├───────────────────────────────────────────────────────────┤
│  Domain Layer (Entities, Value Objects, Domain Services)  │
└───────────────────────────────────────────────────────────┘
```

**Dependency Direction**: Outer → Inner (Domain has no framework dependencies)

### Bounded Contexts

| Context | Responsibility | Layer |
|---------|---------------|-------|
| **Game Client BC** | Game UI rendering, animations, user interactions | Frontend |
| **Core Game BC** | Game rule engine, turn control, scoring | Backend |
| **Identity BC** | Player accounts, authentication, guest mode | Backend |
| **Matchmaking BC** | Online matchmaking, room management | Backend |
| **Leaderboard BC** | Player rankings, statistics tracking | Backend |
| **Opponent BC** | AI opponent decision logic | Backend |

### BC Dependency Map

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                      game-client BC                                  │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────────┐  │    │
│  │  │   Domain    │←─│ Application │←─│         Adapter             │  │    │
│  │  │ card-logic  │  │  Use Cases  │  │ Pinia, SSE, Animation       │  │    │
│  │  │  matching   │  │   Ports     │  │    DI Container             │  │    │
│  │  └─────────────┘  └─────────────┘  └─────────────────────────────┘  │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                    │                                                         │
│                    ▼ uses                                                    │
│  ┌────────────────────────────┐  ┌────────────────────────────┐             │
│  │    app/identity BC         │  │      app/shared            │             │
│  │  (current player state)    │  │ (notifications, context)   │             │
│  └────────────────────────────┘  └────────────────────────────┘             │
└─────────────────────────────────────────────────────────────────────────────┘
                    │
                    │ SSE / REST API
                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         #shared/contracts                                    │
│              (Commands, Events, Types, Error Codes)                          │
└─────────────────────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              BACKEND                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                          Gateway                                     │    │
│  │            (SSE streaming, REST API, connection management)          │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                    │                                                         │
│       ┌───────────┼───────────┬───────────────────┐                         │
│       ▼           ▼           ▼                   ▼                         │
│  ┌─────────┐ ┌─────────┐ ┌──────────┐ ┌─────────────────┐                   │
│  │core-game│ │matchmak-│ │ identity │ │   leaderboard   │                   │
│  │   BC    │ │  ing BC │ │    BC    │ │       BC        │                   │
│  └────┬────┘ └─────────┘ └──────────┘ └────────▲────────┘                   │
│       │                                        │                             │
│       │ AI needed                              │ GameFinished                │
│       ▼                                        │ event                       │
│  ┌─────────┐                                   │                             │
│  │opponent │───────────────────────────────────┘                             │
│  │   BC    │                                                                 │
│  └─────────┘                                                                 │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                     server/shared (Event Bus)                        │    │
│  │                    (Internal BC communication)                       │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
```

### BC Layer Structure

Each BC follows Clean Architecture with consistent layering:

| BC | Domain | Application | Adapter | Total Files |
|----|--------|-------------|---------|-------------|
| **game-client** | 7 | 47 | 54 | 108 |
| **core-game** | 11 | 14 | 14 | 39 |
| **identity** | 6 | 9 | 15 | 30 |
| **matchmaking** | 5 | 2 | 5 | 12 |
| **leaderboard** | 8 | 4 | 4 | 16 |
| **opponent** | 1 | 1 | 6 | 8 |

### Cross-BC Communication

| Communication | Channel | Direction |
|--------------|---------|-----------|
| Player Commands | REST API | Frontend → Backend |
| Game Events | SSE | Backend → Frontend |
| Matchmaking Events | SSE | Backend → Frontend |
| AI Actions | Event Bus | core-game ↔ opponent |
| Stats Update | Event Bus | core-game → leaderboard |
| Authentication | HTTP REST | Frontend ↔ identity BC |

### Directory Structure

```
front-end/
├── app/                              # Frontend Application
│   ├── game-client/                  # Game Client BC
│   │   ├── domain/                   #   Pure game logic (card, matching, yaku)
│   │   ├── application/              #   Use Cases & Ports (26 use cases)
│   │   │   ├── ports/input/          #     Input Ports (event handlers)
│   │   │   └── ports/output/         #     Output Ports (state, animation, API)
│   │   └── adapter/                  #   Pinia, SSE, REST API, Animation, DI
│   │
│   ├── identity/                     # Frontend Identity BC
│   │   ├── domain/                   #   Current player types
│   │   ├── application/              #   Auth status use case
│   │   └── adapter/                  #   Auth API client, Pinia store
│   │
│   └── shared/                       # Frontend shared ports
│
├── server/                           # Backend Application
│   ├── core-game/                    # Core Game BC
│   │   ├── domain/                   #   Game & Round aggregates, services
│   │   ├── application/              #   Game operation use cases
│   │   └── adapters/                 #   Drizzle repos, Event publishers
│   │
│   ├── identity/                     # Identity BC
│   │   ├── domain/                   #   Account, Player, OAuth aggregates
│   │   ├── application/              #   Auth use cases
│   │   └── adapters/                 #   Drizzle repos, OAuth adapters
│   │
│   ├── matchmaking/                  # Matchmaking BC
│   │   ├── domain/                   #   Pool, Entry, Status entities
│   │   ├── application/              #   Enter/Process matchmaking
│   │   └── adapters/                 #   In-memory pool, Event bus
│   │
│   ├── leaderboard/                  # Leaderboard BC
│   │   ├── domain/                   #   Stats, Rankings, Daily scores
│   │   ├── application/              #   Leaderboard queries
│   │   └── adapters/                 #   Drizzle repos, Event subscribers
│   │
│   ├── opponent/                     # Opponent (AI) BC
│   │   ├── domain/                   #   AI types
│   │   ├── application/              #   AI ports
│   │   └── adapter/                  #   AI instance, Scheduler, State
│   │
│   ├── gateway/                      # API Gateway
│   │   └── (SSE streaming, REST API, rate limiting, connection management)
│   │
│   └── shared/                       # Backend shared infrastructure
│       └── infrastructure/event-bus/ #   Internal & Player event buses
│
└── shared/                           # Cross-layer Contracts
    ├── contracts/                    #   Events, types, gateway contracts
    ├── constants/                    #   Card constants, room types
    └── errors/                       #   HTTP errors, error handlers
```

---

## Core Feature Implementations

### 1. SSE + REST API Real-time Communication

**Design Decision**: Migrated from WebSocket back to SSE + REST API for HTTP/2 compatibility

WebSocket requires HTTP/1.1 Upgrade handshake (RFC 8441 defines HTTP/2 WebSocket, but Fly.io's proxy and Nitro do not support it), forcing the entire connection to downgrade from HTTP/2. On Fly.io this meant setting `alpn = ['http/1.1']` and `h2_backend = false`, losing HTTP/2 multiplexing for all traffic. Removing these restrictions allows fly-proxy to serve HTTP/2 to browsers by default (the proxy-to-app hop remains HTTP/1.1 since Nitro doesn't support h2c, but this doesn't affect client-facing multiplexing). SSE is a standard HTTP response that works natively with HTTP/2 — a single TCP connection can multiplex the SSE event stream alongside REST API requests without head-of-line blocking. Since the game only needs server-to-client push (events) and client-to-server request-response (commands), full-duplex WebSocket was unnecessary overhead.

- **REST API**: Handles player commands (play card, select, decide)
- **SSE**: Pushes game events via `/api/v1/events` endpoint

```typescript
// Event flow example
Client → REST: POST /api/v1/games/{id}/turns/play-card
Server → SSE:  TurnCompleted { hand_card_play, draw_card_play, next_state }
Server → SSE:  DecisionRequired { yaku_update, current_multipliers }
Client → REST: POST /api/v1/games/{id}/rounds/decision
Server → SSE:  RoundScored { winner_id, final_points }
```

**Technical Highlights**:
- HTTP/2 multiplexing: SSE stream + REST API on single TCP connection
- Event serialization mechanism (Promise chain ensures no animation conflicts)
- Reconnection support (Snapshot mode for full state recovery)
- Visibility Change handling (reconnect after page hidden)

### 2. Animation System

**Design Decision**: Implemented interruptible animations using AbortController

```typescript
// AnimationPortAdapter core design
class AnimationPortAdapter implements AnimationPort {
  // AbortController support for animation interruption
  private operationSession: OperationSessionManager

  async playDealAnimation(params: DealAnimationParams): Promise<void> {
    // Use abortable delay instead of setTimeout
    await delay(ANIMATION_DURATION.DEAL_CARD, this.operationSession.getSignal())
  }

  // High-level animation sequence encapsulation
  async playCardPlaySequence(params, callbacks): Promise<CardPlayAnimationResult> {
    // Encapsulates complete animation flow: play card → match → transfer to capture zone
  }
}
```

**Technical Highlights**:
- Zone Registry tracks card positions (relative to container coordinates)
- Animation Layer uses cloned cards to avoid flickering
- Supports pulse, fadeIn, fadeOut, pulseToFadeOut effects

### 3. Concurrency Control

**Design Decision**: Pessimistic locking to protect game operations

```typescript
// Pessimistic lock using Promise chain
class InMemoryGameLock implements GameLockPort {
  private locks: Map<string, Promise<void>> = new Map()

  async withLock<T>(gameId: string, operation: () => Promise<T>): Promise<T> {
    const currentLock = this.locks.get(gameId) ?? Promise.resolve()
    const newLock = currentLock.then(() => operation())
    this.locks.set(gameId, newLock.catch(() => {}))
    return newLock
  }
}
```

**Problems Solved**:
- Prevents concurrent operations on the same game (e.g., two players playing cards simultaneously)
- Ensures game state consistency during matching

### 4. Game Rule Engine

**Domain Layer Pure Function Implementation**:

```typescript
// Yaku detection service
function detectYaku(depositoryCards: string[], yakuSettings: YakuSettings): Yaku[] {
  const results: Yaku[] = []

  // Bright card series (mutually exclusive, take highest score)
  if (hasGokou(depositoryCards)) results.push({ type: 'GOKOU', base_points: 15 })
  else if (hasShikou(depositoryCards)) results.push({ type: 'SHIKOU', base_points: 10 })
  // ... other yaku types

  return results
}

// Scoring service
function calculateFinalScore(baseScore: number, koiKoiMultipliers: KoiStatus[]): number {
  let score = baseScore
  if (koiKoiMultipliers.some(k => k.called_count > 0)) score *= 2  // Koi-Koi multiplier
  if (baseScore >= 7) score *= 2  // 7-point doubling rule
  return score
}
```

### 5. Data Persistence

Uses Drizzle ORM with PostgreSQL for game state management:

| Table | Purpose |
|-------|---------|
| `games` | Game sessions (players, status, rounds, cumulative scores) |
| `player_stats` | Player statistics (win rate, yaku counts, koi-koi calls) |
| `game_logs` | Event logging for debugging and issue tracking |

### 6. Online Matchmaking System

**Design Decision**: Event-driven matchmaking with dedicated PlayerEventBus

```typescript
// Matchmaking flow
Player → REST: POST /matchmaking/enter { roomType: 'SINGLE' | 'HUMAN' }
Server → PlayerEventBus: MatchFound { game_id, opponent_name, is_bot }
Player → SSE: Connect to /api/v1/events
```

**Architecture Highlights**:
- **MatchmakingPool**: Manages waiting players per room type
- **PlayerEventBus**: Dedicated SSE channel for pre-game events (separate from GameEventBus)
- **GameCreationHandler**: Subscribes to MATCH_FOUND, creates game via JoinGameUseCase
- **Room Types**: SINGLE (vs AI), HUMAN (vs player)

```typescript
// PlayerEventBus - broadcasts to specific player before game starts
class PlayerEventBus {
  publishToPlayer(playerId: string, event: MatchmakingEvent): void
  subscribePlayer(playerId: string): ReadableStream
}
```

### 7. Leaderboard System

**Design Decision**: Event-driven statistics with separation of concerns

```typescript
// Statistics tracking flow
GAME_FINISHED event → GameFinishedEventHandler
  → UpdatePlayerStatsUseCase (winner stats, loser stats)
  → PlayerStatsRepository (persist to player_stats table)
```

**Architecture Highlights**:
- **PlayerStats Entity**: Tracks games played, wins, yaku achievements
- **LeaderboardQuery**: Aggregates rankings by win rate and total games
- **Personal Stats**: Per-player yaku breakdown and historical performance

### 8. SVG Sprite Loading Strategy

**Problem**: Homepage hero cards use `<use href="#icon-...">`, which requires SVG symbols to exist in the DOM at HTML parse time. `vite-plugin-svg-icons` injects the sprite via JavaScript after hydration — fine for CSR, but causes a blank card area on SSR pages before JS runs.

**Evolution**:
1. **CSR phase**: Sprite bundled into JS via `vite-plugin-svg-icons`, injected at runtime. No first-paint concern since Vue renders everything post-JS anyway.
2. **SSR introduced**: Blank period emerged — `<use href="#...">` is a DOM anchor reference, not an external request. It cannot resolve until the referenced `<symbol>` is physically in the DOM. Solution: server inlines the full sprite on first visit.
3. **Repeat-visit optimization**: Inlining ~700 KB of SVG in every HTML response is wasteful. The sprite is persisted to `localStorage` after the first visit and synchronously restored on subsequent visits via an injected inline script at parse time — same timing as server inline, zero HTTP request.

**Why not HTTP cache for inline mode**: `href="#..."` references DOM content, not an external file. HTTP cache has no mechanism to inject content into the DOM. Even a disk cache hit still requires a request round-trip; `localStorage` reads are synchronous.

**Why the fetch approach failed on Safari**: Safari does not write `fetch()` responses to disk cache (memory-only, cleared on reload). Every hard refresh re-downloaded 700 KB regardless of cache headers.

```
First visit:   Server inlines sprite in HTML body
               → app:mounted saves sprite to localStorage + sets cookie

Repeat visit:  Server detects cookie → injects RESTORE_SCRIPT at parse time
               → RESTORE_SCRIPT reads localStorage synchronously → injects SVG
               → Result: zero HTTP request, same first-paint timing as inline
```

**Edge cases**:
- `localStorage` cleared but cookie present: RESTORE_SCRIPT detects empty value, deletes cookie → next visit server re-inlines
- Private/Incognito mode: `localStorage` throws `SecurityError` → cookie never set → server always inlines

**Dual-mode `SvgIcon`**:

| Component | Mode | Source |
|-----------|------|--------|
| `HeroCardGrid` (homepage hero) | `inline: true` → `href="#icon-..."` | DOM inline SVG |
| `MonthRow`, `CardComponent` (game) | `inline: false` → `href="/sprite.svg#..."` | External file, HTTP cache |

Game pages are SPA (`ssr: false`) — all rendering is post-JS, so HTTP disk cache is sufficient and external file keeps the JS bundle smaller.

### 9. CI/CD Pipeline

**CI** — triggered on every push to `develop` and all PRs to `main`/`develop`, running four parallel jobs:

| Job | What it checks |
|-----|---------------|
| Type Check | `vue-tsc` full type validation |
| Lint | ESLint with auto-fix |
| Unit Tests | Vitest — 877 tests across `jsdom` (client) and `node` (server) environments |
| Build | Production build + bundle size check (`pnpm size`) |

**CD** — triggered on push to `main`, sequential:

```
type-check → lint → unit tests → DB migration → Fly.io deploy → Lighthouse CI
```

- **DB migration** runs against production `DATABASE_URL` before the new binary lands, ensuring schema is ready
- **Lighthouse CI** runs automatically after the deployment stabilises (30s wait), auditing performance, accessibility, and best practices; results are posted back to the PR via GitHub App token

---

## Key Technical Decisions

The following are important architectural and implementation decisions made during development:

### 1. SSE Connection Rebuild Strategy

**Problem**: After page Visibility Change, SSE connection may receive stale events, causing state inconsistency

**Solution**: When visibility change recovery is detected, proactively disconnect and re-establish SSE connection, requesting full state snapshot

```typescript
// usePageVisibility.ts
function handleVisibilityChange(): void {
  if (!document.hidden && isLoggedIn) {
    animationPort.interrupt()
    gatewayClient.forceReconnect()
  }
}
```

### 2. Unified Gateway Connection Design

**Problem**: Different scenarios (new game, reconnection, matching) require different handling

**Solution**: Unified `/api/v1/events` SSE endpoint that automatically determines scenario via `GatewayConnected` event

```typescript
// JoinGameUseCase return type
type JoinGameOutput =
  | { status: 'game_waiting' }      // Waiting for match
  | { status: 'game_started' }      // Game started
  | { status: 'snapshot' }          // Reconnection
  | { status: 'game_finished' }     // Game already ended
  | { status: 'game_expired' }      // Game expired
```

### 3. Animation Layer Coordinate System

**Problem**: Originally used fixed positioning relative to Viewport, causing incorrect animation positions when scrolling

**Solution**: Changed to absolute positioning relative to game container, dynamically calculating container offset

```typescript
// ZoneRegistry calculates relative coordinates
getRelativePosition(element: HTMLElement, container: HTMLElement): Position {
  const elementRect = element.getBoundingClientRect()
  const containerRect = container.getBoundingClientRect()
  return {
    x: elementRect.x - containerRect.x,
    y: elementRect.y - containerRect.y
  }
}
```

### 4. Unified AbortController Cancellation Mechanism

**Problem**: When animations are interrupted, all in-progress delays and animations need to be cancelled

**Solution**: Use OperationSessionManager to manage AbortSignal uniformly

```typescript
class OperationSessionManager {
  private currentController: AbortController | null = null

  startNewSession(): AbortSignal {
    this.abortCurrentSession()
    this.currentController = new AbortController()
    return this.currentController.signal
  }

  abortCurrentSession(): void {
    this.currentController?.abort()
    this.currentController = null
  }
}
```

### 5. Pessimistic Lock Instead of Optimistic Lock

**Problem**: Optimistic lock (version check) cannot prevent race conditions during concurrency

**Solution**: Use Promise chain to implement pessimistic lock, ensuring mutual exclusion for same-game operations

### 6. Event Serialization Processing

**Problem**: When SSE events arrive in rapid succession, previous animation may not have finished

**Solution**: EventRouter uses Promise chain to serialize event processing

```typescript
class EventRouter {
  private eventChain: Promise<void> = Promise.resolve()

  route(eventType: SSEEventType, payload: any): void {
    this.eventChain = this.eventChain.then(() => {
      return port.execute(payload, options)
    })
  }
}
```

### 7. Domain Pure Functions + Object.freeze Immutability

**Problem**: Ensure Domain Layer has no side effects and state is immutable

**Solution**: All Domain functions return new objects, using `Object.freeze()` to ensure immutability

```typescript
export function playHandCard(round: Round, ...): PlayHandCardResult {
  // Always return new object, never modify original round
  return Object.freeze({
    ...round,
    field: Object.freeze([...newField]),
    // ...
  })
}
```

### 8. Animation Duration Included in Timer

**Problem**: Player operation time should deduct animation playback time

**Solution**: Calculate deal animation duration and deduct from operation timeout

### 9. PlayerEventBus vs GameEventBus Separation

**Problem**: Matchmaking events (MatchFound, MatchFailed) need to reach players before game exists

**Solution**: Separate event buses for different lifecycle phases

```typescript
// PlayerEventBus: Pre-game events (keyed by playerId)
// - MatchFound, MatchFailed, MatchCancelled
// - Player subscribes immediately after entering matchmaking

// GameEventBus: In-game events (keyed by gameId)
// - TurnCompleted, DecisionRequired, RoundScored
// - Player subscribes after game creation
```

### 10. Matchmaking Race Condition Prevention

**Problem**: When match is found, game_id must be included in MatchFound event, but game doesn't exist yet

**Solution**: GameCreationHandler creates game first, then publishes MatchFound with valid game_id

```typescript
// GameCreationHandler flow
1. Receive MATCH_FOUND from MatchmakingPool
2. Create game via JoinGameUseCase (Player1)
3. Join game via JoinGameUseCase (Player2 or AI)
4. Publish MatchFound to PlayerEventBus with game_id
```

---

## Project Structure

```
front-end/
├── app/                          # Nuxt 4 Frontend Application
│   ├── assets/icons/            # Hanafuda card SVGs (50 files, sprite optimized)
│   ├── pages/                    # Route Pages
│   ├── game-client/             # Game Client BC (Frontend)
│   │   ├── domain/              # Frontend game logic (pure functions)
│   │   ├── application/         # Use Cases & Event Handlers
│   │   └── adapter/             # Pinia, SSE, REST API, Animation, DI
│   └── plugins/                  # DI Container initialization
│
├── server/                       # Nuxt 4 Nitro Backend
│   ├── core-game/               # Core Game BC
│   │   ├── domain/             # Game Aggregate Root, Round Entity
│   │   ├── application/        # Use Cases & Ports
│   │   └── adapters/           # DB, Event Publisher, Lock, Opponent
│   ├── identity/                # Identity BC
│   │   ├── domain/             # Player Entity, OAuth Link
│   │   ├── application/        # Auth Use Cases
│   │   └── adapters/           # Session, Logging
│   ├── matchmaking/             # Matchmaking BC
│   │   ├── domain/             # MatchmakingPool
│   │   ├── application/        # Enter/Cancel Matchmaking Use Cases
│   │   └── adapters/           # Registry, PlayerEventBus
│   ├── leaderboard/             # Leaderboard BC
│   │   ├── domain/             # PlayerStats Entity
│   │   ├── application/        # Stats Use Cases & Queries
│   │   └── adapters/           # PlayerStatsRepository
│   └── database/                # Drizzle schema & migrations
│
└── shared/                       # Shared contracts between frontend and backend
    └── contracts/               # Event types, gateway contracts, API formats
```

---

## Current Version

**v1.3.0** (2026-03-25)

### Recent Changes
- Private room feature (create, invite, wait, start)
- SSR-first SVG sprite with localStorage restore — zero render-blocking across browsers
- Migrated real-time communication back to SSE + REST API for HTTP/2 compatibility
- CI/CD: Lighthouse CI post-deploy audit, bundle size monitoring
- Typography system upgrade: Shippori Mincho + Noto Sans JP

[View Full Changelog](./CHANGELOG.md)

---

## Quick Start

### Requirements

- Node.js 18+
- PostgreSQL 14+
- pnpm (recommended)

### Installation and Running

```bash
# Clone project
git clone https://github.com/your-username/hanahuda.git
cd hanahuda/front-end

# Install dependencies
pnpm install

# Set environment variables
cp .env.example .env
# Edit .env to configure DATABASE_URL

# Database migration
pnpm db:migrate

# Start development server
pnpm dev
```

### Testing

```bash
# All tests (client + server)
pnpm test:unit

# Run individually
pnpm test:unit:client   # jsdom environment
pnpm test:unit:server   # node environment

# Type checking
pnpm type-check
```

---

## Follow Up: Future Plans

### Near-term Tasks

- [x] Player user information feature (account system) ✅ v1.1.0
- [x] Online matchmaking feature (match with other players) ✅ v1.1.0
- [x] Homepage beautification and dynamic effects ✅ v1.1.0
- [ ] Custom rule settings
- [ ] Graceful server shutdown handling
- [ ] Remove CardPlay.captured_cards redundant field
- [ ] Refactor UI Ports interface design
- [ ] Remove event/command IDs (business rules can already prevent duplicate calls)

### Mid-term Plans

- [x] Leaderboard system ✅ v1.2.0
- [ ] Game history and replay
- [ ] Multiple AI difficulty levels
- [x] SSE + REST API real-time architecture ✅ v1.2.0
- [ ] Internationalization (i18n) support

### Long-term Vision

- [ ] Microservice split (Game Service, User Service, Matchmaking Service)
- [ ] Distributed cache (Redis)
- [ ] Event-driven architecture (Kafka/RabbitMQ)
- [ ] Containerized deployment (Docker + Kubernetes)

---

## License

This project is licensed under MIT. Hanafuda card images are from [Hanafuda-Louie-Recolor](https://github.com/dotty-dev/Hanafuda-Louie-Recolor) (CC BY-SA 4.0).

---

## Author

**Leo Huang**

This project demonstrates my technical capabilities in the following areas:
- Clean Architecture and DDD practices
- Full-stack TypeScript development
- Real-time communication system design
- Complex state management and animation systems
- Concurrency control and error handling
