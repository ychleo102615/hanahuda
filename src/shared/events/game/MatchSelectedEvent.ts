import type { IntegrationEvent } from '../base/IntegrationEvent'
import type { YakuResult } from '../base/YakuResult'
import type { TurnTransition } from '../base/TurnTransition'

/**
 * Match Selected Event (v2.0)
 *
 * Triggered when a player completes multiple match selection
 * (or when selection times out and auto-selects).
 *
 * This consolidates the old MatchSelectionTimeoutEvent by using
 * the autoSelected field to distinguish manual vs automatic selection.
 */
export interface MatchSelectedEvent extends IntegrationEvent {
  readonly eventType: 'MatchSelected'

  /** Player who made (or should have made) the selection */
  readonly playerId: string

  /** Source card ID (usually deck card) */
  readonly sourceCardId: string

  /** Selected field card ID */
  readonly selectedFieldCardId: string

  /** Whether selection was automatic due to timeout */
  readonly autoSelected: boolean

  /** Captured card IDs (source + selected field card) */
  readonly capturedCardIds: readonly string[]

  /** Yaku achieved from this selection */
  readonly achievedYaku: readonly YakuResult[]

  /** Turn transition after selection */
  readonly turnTransition: TurnTransition
}
