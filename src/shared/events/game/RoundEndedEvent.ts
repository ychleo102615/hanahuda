import type { IntegrationEvent } from '../base/IntegrationEvent'
import type { YakuResult } from '../base/YakuResult'

/**
 * Round Ended Event
 *
 * Triggered when a round completes, either by:
 * - Player achieving yaku and choosing "shobu" (end round)
 * - All cards played with no yaku (draw)
 * - Time limit reached (if implemented)
 */
export interface RoundEndedEvent extends IntegrationEvent {
  readonly eventType: 'RoundEnded'

  /** Round number that ended (1-12) */
  readonly roundNumber: number

  /**
   * Winner of the round (null for draw)
   * null when both players have no yaku
   */
  readonly winnerId: string | null

  /**
   * Final yaku achieved by winner
   * Empty array for draw or no-yaku win
   */
  readonly winningYaku: readonly YakuResult[]

  /** Round scores for each player */
  readonly roundScores: readonly {
    readonly playerId: string
    readonly score: number
    readonly achievedYaku: readonly YakuResult[]
  }[]

  /** Whether Koi-Koi multiplier was applied */
  readonly koikoiMultiplier: number  // 1 (no Koi-Koi) or 2 (Koi-Koi declared)

  /** Reason for round ending */
  readonly endReason: 'yaku_achieved' | 'all_cards_played' | 'game_abandoned'

  /** Updated total scores after this round */
  readonly totalScores: readonly {
    readonly playerId: string
    readonly totalScore: number
  }[]
}
