import type { IntegrationEvent } from '../base/IntegrationEvent'

/**
 * Game Abandoned Event
 *
 * Triggered when a player abandons the current game.
 * The game ends immediately and the opponent is declared winner.
 */
export interface GameAbandonedEvent extends IntegrationEvent {
  readonly eventType: 'GameAbandoned'

  /** Game unique identifier */
  readonly gameId: string

  /** Player who abandoned the game */
  readonly abandoningPlayerId: string

  /** Player who wins by default */
  readonly winnerId: string

  /** Round number when abandonment occurred */
  readonly roundNumber: number

  /** Game phase when abandonment occurred */
  readonly gamePhase: 'setup' | 'dealing' | 'playing' | 'koikoi' | 'round_end'

  /** Scores at the time of abandonment */
  readonly scoresAtAbandonment: readonly {
    readonly playerId: string
    readonly totalScore: number
    readonly roundScore: number
  }[]

  /** Abandonment timestamp */
  readonly abandonmentTime: number

  /** Optional reason for abandonment */
  readonly reason?: 'user_quit' | 'timeout' | 'connection_lost'
}
