/**
 * Turn Transition Structure
 *
 * Represents player turn changes.
 * Embedded in various events instead of having a separate PlayerTurnChangedEvent.
 * This reduces event count and improves atomicity.
 *
 * Protocol Buffers compatible - uses primitive types.
 */
export interface TurnTransition {
  /**
   * Previous player ID
   * null for game initialization (first turn)
   */
  readonly previousPlayerId: string | null

  /** Current player ID */
  readonly currentPlayerId: string

  /**
   * Reason for turn transition
   * Helps UI understand the context
   */
  readonly reason: 'game_initialized' | 'card_played' | 'koikoi_declared' | 'match_selected'
}

/**
 * Type guard to check if an object is a TurnTransition
 */
export function isTurnTransition(obj: unknown): obj is TurnTransition {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    (typeof (obj as any).previousPlayerId === 'string' || (obj as any).previousPlayerId === null) &&
    typeof (obj as any).currentPlayerId === 'string' &&
    ['game_initialized', 'card_played', 'koikoi_declared', 'match_selected'].includes((obj as any).reason)
  )
}
