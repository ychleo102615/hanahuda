import type { IntegrationEvent } from '../base/IntegrationEvent'
import type { MatchResult } from '../base/MatchResult'
import type { TurnTransition } from '../base/TurnTransition'

/**
 * Card Played Event (v2.0)
 *
 * Represents a complete card play action including:
 * - Hand card matching
 * - Deck card reveal and matching
 * - Yaku achievements
 * - Turn transition (if applicable)
 *
 * This event consolidates what used to be 3-4 separate events,
 * improving atomicity and reducing event volume.
 */
export interface CardPlayedEvent extends IntegrationEvent {
  readonly eventType: 'CardPlayed'

  /** Player who played the card */
  readonly playerId: string

  /** Hand card that was played */
  readonly playedCardId: string

  /** Result of hand card matching */
  readonly handMatch: MatchResult

  /** Result of deck card reveal and matching */
  readonly deckMatch: MatchResult

  /**
   * Turn transition (null if waiting for player action)
   * null indicates:
   * - Multiple match selection required
   * - Koi-Koi decision required
   */
  readonly turnTransition: TurnTransition | null
}
