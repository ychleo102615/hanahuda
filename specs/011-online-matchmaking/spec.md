# Feature Specification: Online Matchmaking with Tiered Fallback

**Feature Branch**: `011-online-matchmaking`
**Created**: 2026-01-06
**Status**: Draft
**Input**: User description: "建立連線對戰功能。目前遊戲配對機制是永遠配一個電腦來作為對手。實作此功能之後：0–10 秒：嘗試真人配對，10–15 秒：提示「目前配對人數較少」，15 秒後：自動改配 Bot，也就是目前的 Opponent Service，提示「配對電腦對手」或是其他適合的語意。提示會顯示在目前前端已經有的狀態提示元件上。遊戲語言是英文。配對機制是另一外一個 BC，與 core-game, opponent BC 在檔案架構上就做好區別。如果日後要擴展到微服務，要能夠輕鬆升級。"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Successful Human Player Match (Priority: P1)

A player enters the matchmaking queue and successfully gets matched with another human player within the initial 10-second window.

**Why this priority**: This is the core value proposition of the feature - enabling real human vs human gameplay. Without this working, the entire feature has no purpose.

**Independent Test**: Can be fully tested by having two players enter matchmaking simultaneously. Delivers the primary value of competitive human gameplay.

**Acceptance Scenarios**:

1. **Given** Player A (guest or registered) is on the lobby page, **When** Player A initiates matchmaking, **Then** Player A is navigated to the game page and sees a status message indicating matchmaking is in progress (e.g., "Searching for opponent...")

2. **Given** Player A is in the matchmaking queue searching for an opponent, **When** Player B initiates matchmaking within 10 seconds of Player A joining, **Then** both players are matched together and a game session starts

3. **Given** two players are successfully matched, **When** the game session starts, **Then** both players receive the game start notification and can see each other's names (not "Computer")

---

### User Story 2 - Tiered Status Messages During Matchmaking (Priority: P1)

A player sees progressive status updates during the matchmaking process that communicate the current state and set appropriate expectations.

**Why this priority**: Status feedback is essential for user experience. Without clear communication, players won't understand what's happening during the waiting period.

**Independent Test**: Can be tested by a single player entering matchmaking with no other players available. Verifies the complete status message timeline.

**Acceptance Scenarios**:

1. **Given** a player initiates matchmaking, **When** 0-10 seconds have elapsed without finding a match, **Then** the player sees a standard searching status (e.g., "Searching for opponent...")

2. **Given** a player has been searching for 10 seconds without a match, **When** the 10-second threshold is reached, **Then** the status message updates to indicate low player availability (e.g., "Few players online. Still searching...")

3. **Given** a player has been searching for 15 seconds without a match, **When** the 15-second threshold is reached, **Then** the system automatically matches with a Bot and displays a message (e.g., "Matched with computer opponent")

---

### User Story 3 - Automatic Bot Fallback (Priority: P1)

When no human opponent is found within the timeout period, the system seamlessly transitions to a Bot opponent using the existing Opponent Service.

**Why this priority**: This ensures players always get to play a game, preventing frustration from indefinite waiting. Critical for maintaining engagement.

**Independent Test**: Can be tested by a single player entering matchmaking. After 15 seconds, a game with Bot opponent should start automatically.

**Acceptance Scenarios**:

1. **Given** a player has been in matchmaking for 15 seconds with no human match found, **When** the fallback threshold is reached, **Then** the system initiates a game with a Bot opponent automatically

2. **Given** a Bot fallback game starts, **When** the game session begins, **Then** the opponent is clearly identified as a computer (existing Bot behavior) and gameplay proceeds normally

3. **Given** a player is in matchmaking and the Bot fallback triggers, **When** the game starts, **Then** the transition is seamless with no additional user action required

---

### User Story 4 - Cancel Matchmaking (Priority: P2)

A player can cancel matchmaking at any point during the search process and return to the lobby.

**Why this priority**: Important for user control and preventing players from being stuck, but secondary to core matching functionality.

**Independent Test**: Can be tested by entering matchmaking and clicking cancel at various stages. Player should return to lobby cleanly.

**Acceptance Scenarios**:

1. **Given** a player is on the game page in matchmaking state, **When** the player clicks a cancel/back button, **Then** the player is removed from the matchmaking queue and navigated back to the lobby

2. **Given** a player cancels matchmaking during the 10-15 second "low availability" phase, **When** they return to lobby, **Then** no game is created and no Bot is spawned

3. **Given** a player cancels matchmaking, **When** another player was about to be matched with them, **Then** the other player continues searching (not matched with a phantom player)

---

### User Story 5 - Same Room Type Matching (Priority: P2)

Players are only matched with others who selected the same room type (Quick/Standard/Marathon).

**Why this priority**: Ensures fair matchmaking based on game preferences, but depends on core matching working first.

**Independent Test**: Can be tested by having players select different room types and verifying they are not matched together.

**Acceptance Scenarios**:

1. **Given** Player A selects "Quick" room type and Player B selects "Standard" room type, **When** both enter matchmaking, **Then** they are not matched together despite being available simultaneously

2. **Given** Player A and Player B both select "Standard" room type, **When** both enter matchmaking, **Then** they can be matched together

---

### Edge Cases

- What happens if a player disconnects during matchmaking (before game starts)?
  - Player is removed from the queue; reconnection requires re-initiating matchmaking

- What happens if both players disconnect simultaneously right after matching but before game start?
  - The match is cancelled; both players need to re-enter matchmaking

- What happens if the matchmaking service is unavailable?
  - System falls back to immediate Bot matching with an appropriate error message

- What happens if a player's session expires during matchmaking?
  - Player is removed from queue and redirected to re-authenticate

- What happens if a match is found at exactly the 15-second mark?
  - Human match takes priority over Bot fallback if found at the boundary

- What happens if a player tries to matchmake while already in the queue (e.g., multiple browser tabs)?
  - System rejects the request at lobby stage with an error message; player must use existing session

- What happens if a player tries to matchmake while already in an active game?
  - System rejects the request at lobby stage with an error message; player must finish or abandon current game first

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST maintain a matchmaking queue that tracks players waiting for opponents
- **FR-002**: System MUST attempt to match players with human opponents for the first 10 seconds of their queue time
- **FR-003**: System MUST display a status message indicating searching state during the 0-10 second phase (e.g., "Searching for opponent...")
- **FR-004**: System MUST display an updated status message after 10 seconds indicating low player availability (e.g., "Few players online. Still searching...")
- **FR-005**: System MUST automatically match a player with a Bot opponent after 15 seconds of unsuccessful human matching
- **FR-006**: System MUST display a message when Bot fallback occurs (e.g., "Matched with computer opponent")
- **FR-007**: System MUST only match players who selected the same room type
- **FR-008**: System MUST allow players to cancel matchmaking at any point before a match is confirmed
- **FR-009**: System MUST remove players from the matchmaking queue when they cancel, disconnect, or get matched
- **FR-010**: System MUST prioritize human matches over Bot fallback if a human is found at or near the timeout boundary
- **FR-011**: Matchmaking BC MUST be architecturally separated from Core Game BC and Opponent BC in the file structure
- **FR-014**: Matchmaking BC MUST communicate with Core Game BC via internal events (publish "MatchFound" event) to enable future microservice migration
- **FR-012**: System MUST use the existing frontend notification/status components to display matchmaking messages
- **FR-013**: All user-facing matchmaking messages MUST be in English
- **FR-015**: System MUST reject matchmaking requests from players already in the queue, showing an error at lobby stage
- **FR-016**: System MUST reject matchmaking requests from players who have an active game in progress, showing an error at lobby stage

### Key Entities *(include if feature involves data)*

- **MatchmakingEntry**: Represents a player waiting in the matchmaking queue
  - Attributes: player identifier, room type preference, queue entry timestamp, current status

- **MatchmakingPool**: The collection of all players currently waiting for matches
  - Grouped by room type for efficient matching

- **MatchResult**: The outcome of a successful match
  - Contains matched player identifiers, match type (human vs bot), timestamp

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Players who find a human match are matched within 10 seconds of both being in the queue
- **SC-002**: Players without a human match receive Bot fallback within 15-16 seconds of entering the queue
- **SC-003**: Status messages update at the correct time intervals (10s and 15s thresholds) with tolerance of 1 second
- **SC-004**: 100% of matchmaking attempts result in either a human match or Bot fallback (no indefinite waiting)
- **SC-005**: Players can cancel matchmaking and return to lobby within 2 seconds of clicking cancel
- **SC-006**: Matchmaking correctly segregates players by room type (0% cross-room-type matches)

## Assumptions

- The existing SSE-First architecture will be leveraged for matchmaking status updates
- The existing Opponent Service (Bot) integration remains unchanged and is reused for fallback
- The existing notification system (Toast/status display on TopInfoBar) is suitable for displaying matchmaking status
- Both guest players and registered players can participate in matchmaking (single unified pool)
- The matchmaking pool is stored in memory for MVP (consistent with current game session storage approach)
- Room type selection happens on the lobby page before matchmaking begins (existing flow)
- Inter-BC communication uses event-driven pattern via InternalEventBus (consistent with existing OpponentRegistry pattern), enabling future migration to message queues

## Out of Scope

- Skill-based matchmaking or ELO rating system
- Geographic/latency-based matching
- Party/group matchmaking (multiple players queuing together)
- Matchmaking preferences beyond room type
- Persistent matchmaking statistics or analytics
- Cross-platform matchmaking considerations

## Dependencies

- Identity BC: Player authentication and identification
- Core Game BC: Game session creation when match is found; player active game status query (via `PlayerGameStatusPort`)
- Opponent BC: Bot opponent spawning for fallback scenarios
- Existing frontend notification system: Status message display

## Clarifications

### Session 2026-01-06

- Q: Where should matchmaking status be displayed when player initiates from lobby? → A: Navigate to game page which shows matchmaking status (reuse existing waiting state UI)
- Q: How should Matchmaking BC communicate with Core Game BC when match found? → A: Event-driven - Matchmaking publishes "MatchFound" event, Core Game subscribes and creates game
- Q: Can guest (unauthenticated) players participate in matchmaking? → A: Yes, both guests and registered players can matchmake together
- Q: What if player attempts matchmaking while already in queue (e.g., multiple tabs)? → A: Reject at lobby stage with error message, player does not enter matchmaking phase
- Q: What if player attempts matchmaking while already in an active game? → A: Reject at lobby stage with error message; one player can only participate in one game or one matchmaking at a time
- Q: How does Matchmaking BC know if a player has an active game (cross-BC query)? → A: Matchmaking BC defines `PlayerGameStatusPort`; Core Game BC provides adapter implementation. This maintains BC isolation while allowing necessary queries.
