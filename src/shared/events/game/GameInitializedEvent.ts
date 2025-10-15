import type { IntegrationEvent } from '../base/IntegrationEvent'
import type { TurnTransition } from '../base/TurnTransition'

/**
 * Game Initialized Event
 *
 * The only event that carries complete game state (snapshot).
 * All other events are incremental updates.
 *
 * Triggered when:
 * - Game first starts
 * - Page refresh/reconnection
 * - game-ui requests full sync (after detecting missing events)
 */
export interface GameInitializedEvent extends IntegrationEvent {
  readonly eventType: 'GameInitialized'

  readonly gameState: {
    /** Game unique identifier */
    readonly gameId: string

    /** Current round number (1-12) */
    readonly currentRound: number

    /** Current game phase */
    readonly phase: 'setup' | 'dealing' | 'playing' | 'koikoi' | 'round_end' | 'game_end'

    /** Current player ID */
    readonly currentPlayerId: string

    /** Player information */
    readonly players: readonly {
      readonly id: string
      readonly name: string
      readonly handCardIds: readonly string[]      // Hand cards
      readonly capturedCardIds: readonly string[]  // Captured cards
      readonly totalScore: number                   // Total score across rounds
      readonly roundScore: number                   // Current round score
    }[]

    /** Field card IDs */
    readonly fieldCardIds: readonly string[]

    /** Remaining deck card count (not revealing specific cards) */
    readonly deckCardCount: number

    /** Player who declared Koi-Koi (null if none) */
    readonly koikoiPlayerId: string | null
  }

  /**
   * All 48 card definitions (for UI rendering)
   * Static data but included for game-ui BC independence
   */
  readonly cardDefinitions: readonly {
    readonly id: string
    readonly suit: number        // Month (1-12)
    readonly type: 'bright' | 'animal' | 'ribbon' | 'plain'
    readonly points: number      // Points (20, 10, 5, 1)
  }[]

  /** Initial turn information */
  readonly turnTransition: TurnTransition
}
