import type { IntegrationEvent } from '../base/IntegrationEvent'

/**
 * Game Ended Event
 *
 * Triggered when the entire game (potentially multiple rounds) ends.
 * This can happen after 12 rounds or when a player reaches the target score.
 */
export interface GameEndedEvent extends IntegrationEvent {
  readonly eventType: 'GameEnded'

  /** Game unique identifier */
  readonly gameId: string

  /**
   * Winner of the game (null for tie)
   * Determined by total score across all rounds
   */
  readonly winnerId: string | null

  /** Final scores for all players */
  readonly finalScores: readonly {
    readonly playerId: string
    readonly playerName: string
    readonly totalScore: number
    readonly roundsWon: number
  }[]

  /** Total rounds played */
  readonly totalRounds: number

  /** Game duration in milliseconds */
  readonly gameDuration: number

  /** Reason for game ending */
  readonly endReason: 'max_rounds_reached' | 'target_score_reached' | 'game_abandoned'

  /** Game start timestamp */
  readonly gameStartTime: number

  /** Game end timestamp */
  readonly gameEndTime: number
}
