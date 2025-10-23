<!--
Sync Impact Report:
─────────────────────────────────────────────────────────────────────────────
Version Change: [Template] → 1.0.0
Change Type: Initial ratification
Modified Principles: N/A (first version)
Added Sections:
  - 8 Core Principles established
  - Architecture Constraints section added
  - Development Workflow section added
  - Governance rules defined

Templates Status:
  ✅ plan-template.md: Aligned with constitution principles (Clean Architecture, DDD, testing requirements)
  ✅ spec-template.md: User story format supports independent BC validation
  ✅ tasks-template.md: Task organization supports BC-based parallelization

Follow-up TODOs: None
─────────────────────────────────────────────────────────────────────────────
-->

# Hanafuda Koi-Koi Constitution

## Core Principles

### I. Clean Architecture (NON-NEGOTIABLE)

**All code MUST follow Clean Architecture principles with strict layering:**

- **Domain Layer**: Pure business logic, zero framework dependencies, defines repository interfaces
- **Application Layer**: Use Cases that orchestrate domain objects, defines Port interfaces
- **Adapter Layer**: Implements Ports, handles external concerns (REST, SSE, database, DTOs)
- **Framework Layer**: Spring Boot, Vue, database drivers, external libraries

**Dependency Rule**: Dependencies MUST only point inward (Framework → Adapter → Application → Domain). Inner layers MUST NOT depend on outer layers.

**Rationale**: This architecture ensures testability, maintainability, and enables future microservice decomposition without rewriting core business logic.

---

### II. Domain-Driven Development (NON-NEGOTIABLE)

**Every bounded context MUST:**

- Identify and model Aggregates, Entities, Value Objects explicitly
- Use ubiquitous language from the problem domain (e.g., "Card", "Yaku", "Koi-Koi", not "Data", "Record")
- Define clear bounded context boundaries between Frontend and Backend (current) and future microservices
- Keep business rules in Domain layer, NOT in controllers or services

**Current Bounded Contexts**: Frontend (Vue), Backend (Spring Boot Game Service). Future contexts include User Service, Matchmaking Service, Opponent Service.

**Rationale**: DDD ensures the codebase reflects the real-world game domain, making it understandable to both developers and domain experts.

---

### III. Server Authority (NON-NEGOTIABLE)

**All game logic, state, validation MUST reside on the server:**

- Server is the single source of truth for game state
- Client sends commands (REST API), server pushes events (SSE)
- Client MUST NOT perform game rule validation or state calculations
- Frontend renders state from SSE events only

**Rationale**: Prevents cheating, ensures consistency across clients, simplifies client logic, enables future multiplayer support.

---

### IV. Command-Event Architecture

**Communication MUST follow the Command-Event pattern:**

- **Commands** (Client → Server): REST API requests (e.g., `TurnPlayHandCard`, `RoundMakeDecision`)
- **Events** (Server → Client): SSE push notifications (e.g., `CardPlayedFromHand`, `TurnYakuFormed`)
- All events MUST be atomic, minimal, and include `event_id` sequence number
- Events MUST follow the specifications in `doc/game-flow.md` exactly

**Rationale**: Decouples client and server, enables event sourcing, supports future event-driven microservices.

---

### V. Test-First Development (NON-NEGOTIABLE)

**TDD MUST be followed for all Domain and Application layers:**

- Write tests → Get user/spec approval → Tests fail → Then implement
- Red-Green-Refactor cycle strictly enforced
- Domain layer unit test coverage MUST exceed 80%
- Application layer integration test coverage MUST exceed 70%
- Frontend component test coverage SHOULD exceed 60%

**Test Categories**:
- **Unit Tests**: Domain models, business rules (e.g., matching logic, yaku detection)
- **Integration Tests**: Use Cases with mocked repositories
- **Contract Tests**: REST API endpoints, SSE event schemas
- **E2E Tests** (optional MVP): Full game flow validation

**Rationale**: Ensures correctness of complex game rules, prevents regressions, documents expected behavior.

---

### VI. Bounded Context Isolation

**Each bounded context MUST:**

- Maintain its own domain model (no shared domain objects across BC boundaries)
- Communicate via well-defined contracts (REST API, SSE events as defined in `doc/game-flow.md`)
- Use DTOs for all cross-boundary communication (NEVER expose Domain Models directly)
- Include `mapper` components to translate between Domain Models and DTOs

**Current BCs**: Frontend (Vue + TypeScript), Backend (Spring Boot + Java)

**Future BCs**: User Service, Matchmaking Service, Opponent Service, Analytics Service

**Rationale**: Enables independent evolution of BCs, prevents tight coupling, supports microservice migration.

---

### VII. Microservice-Ready Design

**All design decisions MUST consider future microservice decomposition:**

- Use UUIDs for all entity IDs (avoid auto-increment integers)
- Design stateless APIs (state in database/cache, not in-memory)
- Event-driven communication patterns where possible
- Assume eventual consistency between future services
- Database per bounded context (even if logically separated in MVP)

**Current Architecture**: Monolithic Spring Boot application with logical BC separation

**Future Architecture**: Multiple services (Game, User, Matchmaking, Opponent, Analytics) communicating via events (Kafka/RabbitMQ) and REST

**Rationale**: Avoids costly rewrites when scaling, demonstrates distributed system design understanding.

---

### VIII. API Contract Adherence

**All API and SSE implementations MUST strictly follow `doc/game-flow.md`:**

- Endpoint URLs, HTTP methods, request/response formats MUST match exactly
- SSE event names, payloads, and data structures MUST match exactly
- FlowStage state machine transitions MUST be followed precisely
- Snapshot-based reconnection MUST use `GameSnapshotRestore` structure

**Contract Validation**: Any deviation from `doc/game-flow.md` MUST be documented as a spec change with version bump.

**Rationale**: Ensures frontend and backend can be developed in parallel, prevents integration failures, acts as living documentation.

---

## Architecture Constraints

### Technology Stack (Fixed)

- **Backend**: Java 17+, Spring Boot 3.x, PostgreSQL 14+, JPA/Hibernate
- **Frontend**: Vue 3, TypeScript, Tailwind CSS v4, Pinia (state management)
- **Communication**: REST API (commands), Server-Sent Events (events)
- **Testing**: JUnit 5 (backend), Vitest (frontend), Playwright (optional E2E)

**Rationale**: These technologies are mandated by the PRD and demonstrate modern full-stack capabilities.

### Performance Requirements

- API response time: P95 < 500ms
- SSE event push latency: < 100ms
- Support 100+ concurrent games (MVP)
- Opponent operation calculation: < 1 second

### Security Requirements

- Input validation on all API endpoints (Bean Validation JSR-380)
- CORS limited to frontend domain
- HTTPS enforced in production
- No sensitive data in logs or SSE events
- SQL injection prevention via JPA Prepared Statements

### Observability Requirements

- Structured logging (JSON format) with SLF4J + Logback
- Log levels: INFO (normal flow), WARN (recoverable issues), ERROR (failures)
- Correlation IDs for request tracing
- Spring Boot Actuator health checks
- (Future) Prometheus metrics, distributed tracing

---

## Development Workflow

### Branch Strategy

- `main`: Production-ready code
- `develop`: Integration branch for MVP
- Feature branches: `###-feature-name` format
- All features MUST have a spec in `/specs/###-feature-name/spec.md`

### Code Review Requirements

- All PRs MUST pass automated tests (CI)
- All PRs MUST be reviewed for constitution compliance
- PRs modifying Domain/Application layers MUST include tests
- PRs adding REST endpoints MUST update Swagger documentation

### Definition of Done

A feature is complete when:

- [ ] All acceptance criteria in spec.md are met
- [ ] Tests are written and passing (TDD red-green-refactor)
- [ ] Code follows Clean Architecture layering
- [ ] API contracts match `doc/game-flow.md`
- [ ] DTOs are used for all BC boundaries (no Domain Model exposure)
- [ ] Swagger/OpenAPI documentation updated
- [ ] Code review approved
- [ ] CI pipeline green

### Complexity Justification

Any violation of simplicity MUST be documented in `plan.md` Complexity Tracking table with:

- What complexity is being introduced
- Why it's necessary for this specific feature
- What simpler alternative was rejected and why

**Examples requiring justification**:
- Adding a 4th bounded context
- Introducing caching layer
- Adding event bus/message queue (before multi-service phase)

---

## Governance

### Constitution Authority

This constitution supersedes all other development practices. Any conflict between this document and other guidance MUST be resolved in favor of the constitution.

### Amendment Process

1. Propose amendment with rationale in PR description
2. Update `CONSTITUTION_VERSION` following semantic versioning:
   - **MAJOR**: Breaking changes to principles (e.g., removing TDD requirement)
   - **MINOR**: New principle added or major expansion
   - **PATCH**: Clarifications, typos, non-semantic refinements
3. Update `LAST_AMENDED_DATE` to amendment date
4. Update Sync Impact Report at top of file
5. Verify and update all dependent templates (plan, spec, tasks)
6. Require approval from all active contributors

### Compliance Review

- Every PR MUST verify alignment with core principles
- Constitution Check in `plan.md` MUST be completed before Phase 0
- Any justified complexity MUST be reviewed quarterly for removal
- Test coverage metrics MUST be tracked in CI

### Runtime Guidance

For agent-specific development guidance during feature implementation, refer to `/CLAUDE.md` (project instructions). The constitution defines what MUST be done; CLAUDE.md guides how Claude Code should navigate the codebase.

---

**Version**: 1.0.0 | **Ratified**: 2025-10-22 | **Last Amended**: 2025-10-22
