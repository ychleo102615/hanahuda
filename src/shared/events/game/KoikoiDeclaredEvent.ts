import type { IntegrationEvent } from '../base/IntegrationEvent'
import type { TurnTransition } from '../base/TurnTransition'

/**
 * Koi-Koi Declared Event (v2.0)
 *
 * Triggered when a player chooses to declare Koi-Koi (continue playing)
 * or chooses to end the round ("shobu").
 *
 * v2.0 improvement: includes TurnTransition to reduce separate events.
 */
export interface KoikoiDeclaredEvent extends IntegrationEvent {
  readonly eventType: 'KoikoiDeclared'

  /** Player who made the declaration */
  readonly playerId: string

  /**
   * Whether player chose to continue (true) or end round (false)
   * true = "Koi-Koi!" (continue playing for more points)
   * false = "Shobu!" (end round and take current points)
   */
  readonly continueGame: boolean

  /** Current yaku that triggered this decision point */
  readonly currentYaku: readonly string[]  // Yaku type names

  /** Current round score for this player */
  readonly currentScore: number

  /**
   * Turn transition after declaration
   * null when player chooses "shobu" (round ends)
   * present when player chooses "Koi-Koi" (continues playing)
   */
  readonly turnTransition: TurnTransition | null
}
