# Hanafuda Koi-Koi Web Game

A Japanese Hanafuda card game showcasing **Clean Architecture**, **Domain-Driven Design**, and **full-stack engineering capabilities**.

## Project Highlights

| Area | Technical Implementation |
|------|-------------------------|
| **Architecture** | Strict Clean Architecture layering, DDD Bounded Contexts, Dependency Inversion |
| **Frontend** | Nuxt 4 + Vue 3 + TypeScript, Custom DI Container, Event-driven UI updates |
| **Backend** | Nuxt 4 Nitro + Drizzle ORM + PostgreSQL, SSE real-time communication, Pessimistic locking |
| **Game Logic** | Complete Yaku detection engine (12 hand types), Koi-Koi rule implementation, Special rule handling |
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
| **User Interface BC** | Game UI rendering, animations, user interactions | Frontend |
| **Core Game BC** | Game rule engine, turn control, scoring | Backend |
| **Opponent BC** | AI opponent decision logic | Backend |

---

## Core Feature Implementations

### 1. SSE (Server-Sent Events) Architecture

**Design Decision**: Adopted REST + SSE hybrid architecture instead of WebSocket

- **REST API**: Handles player commands (play card, select, decide)
- **SSE**: Pushes game events (turn updates, yaku formation, score settlement)

```typescript
// Event flow example
Client → REST: POST /games/{id}/turns/play-card
Server → SSE:  TurnCompleted { hand_card_play, draw_card_play, next_state }
Server → SSE:  DecisionRequired { yaku_update, current_multipliers }
Client → REST: POST /games/{id}/rounds/decision
Server → SSE:  RoundScored { winner_id, final_points }
```

**Technical Highlights**:
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

---

## Key Technical Decisions

The following are important architectural and implementation decisions made during development:

### 1. SSE Connection Rebuild Strategy

**Problem**: After page Visibility Change, SSE connection may receive stale events, causing state inconsistency

**Solution**: When visibility change recovery is detected, proactively disconnect and re-establish SSE connection, requesting full state snapshot

```typescript
// usePageVisibility.ts
watch(isVisible, async (visible) => {
  if (visible && wasHidden) {
    sseConnectionManager.disconnect()
    await startGameUseCase.execute({ reconnect: true })
  }
})
```

### 2. Unified SSE Join/Reconnect Design

**Problem**: Different scenarios (new game, reconnection, matching) require different SSE endpoints

**Solution**: Unified `/join` endpoint that automatically determines scenario based on `gameId` and `sessionToken`

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

---

## Project Structure

```
front-end/
├── app/                          # Nuxt 4 Frontend Application
│   ├── pages/                    # Route Pages
│   ├── user-interface/           # User Interface BC
│   │   ├── domain/              # Frontend game logic (pure functions)
│   │   ├── application/         # Use Cases & Event Handlers
│   │   └── adapter/             # Pinia, SSE, Animation, DI
│   └── plugins/                  # DI Container initialization
│
├── server/                       # Nuxt 4 Nitro Backend
│   ├── domain/                  # Core Game BC Domain
│   │   ├── game/               # Game Aggregate Root
│   │   ├── round/              # Round Entity
│   │   └── services/           # Yaku detection, scoring, matching
│   ├── application/            # Use Cases & Ports
│   └── adapters/               # DB, Event Publisher, Lock
│
└── shared/                       # Shared contracts between frontend and backend
    └── contracts/               # SSE event types, API formats
```

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
# Unit tests
pnpm test:unit

# Backend tests
pnpm test:server

# Type checking
pnpm type-check
```

---

## Follow Up: Future Plans

### Near-term Tasks

- [ ] Player user information feature (account system)
- [ ] Online matchmaking feature (match with other players)
- [ ] Custom rule settings
- [ ] Graceful server shutdown handling
- [ ] Remove CardPlay.captured_cards redundant field
- [ ] Refactor UI Ports interface design
- [ ] Homepage beautification and dynamic effects
- [ ] Remove event/command IDs (business rules can already prevent duplicate calls)

### Mid-term Plans

- [ ] Leaderboard system
- [ ] Game history and replay
- [ ] Multiple AI difficulty levels
- [ ] WebSocket to replace SSE (bidirectional communication support)
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
