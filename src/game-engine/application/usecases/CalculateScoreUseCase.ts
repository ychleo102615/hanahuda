import type { Card } from '../../domain/entities/Card'
import { Yaku } from '../../domain/entities/Yaku'
import type { YakuResult } from '../../domain/entities/Yaku'
import type { IEventPublisher } from '../ports/IEventPublisher'
import type { GameRepository } from '@/application/ports/repositories/GameRepository'
import type { RoundEndedEvent } from '@/shared/events/game/RoundEndedEvent'
import type { YakuResult as EventYakuResult } from '@/shared/events/base/YakuResult'
import { KOIKOI_MULTIPLIER } from '@/shared/constants/gameConstants'
import { v4 as uuidv4 } from 'uuid'

export interface ScoreCalculationResult {
  yakuResults: YakuResult[]
  totalScore: number
  breakdown: {
    [yakuName: string]: {
      points: number
      cards: Card[]
    }
  }
}

export interface RoundEndResult {
  winner: 'player1' | 'player2' | 'draw'
  player1Score: number
  player2Score: number
  player1Yaku: YakuResult[]
  player2Yaku: YakuResult[]
  koikoiMultiplier: number
  endReason: 'yaku_achieved' | 'all_cards_played' | 'game_abandoned'
}

/**
 * Calculate Score Use Case (Game Engine BC)
 *
 * Refactored from the original application layer to game-engine BC.
 * Now publishes RoundEndedEvent when rounds are completed.
 *
 * Responsibilities:
 * - Calculate yaku results for captured cards
 * - Apply Koi-Koi multipliers
 * - Determine round winner
 * - Calculate updated total scores
 * - Publish RoundEndedEvent with complete results
 */
export class CalculateScoreUseCase {
  constructor(
    private gameRepository: GameRepository,
    private eventPublisher: IEventPublisher
  ) {}

  async execute(capturedCards: readonly Card[]): Promise<ScoreCalculationResult> {
    const yakuResults = Yaku.checkYaku(capturedCards)
    const totalScore = Yaku.calculateTotalScore(yakuResults)

    const breakdown: { [yakuName: string]: { points: number; cards: Card[] } } = {}

    yakuResults.forEach(result => {
      breakdown[result.yaku.name] = {
        points: result.points,
        cards: result.cards
      }
    })

    return {
      yakuResults,
      totalScore,
      breakdown
    }
  }

  calculateKoikoiBonus(originalScore: number, koikoiCount: number): number {
    return originalScore * Math.pow(KOIKOI_MULTIPLIER, koikoiCount)
  }

  hasWinningCombination(yakuResults: YakuResult[]): boolean {
    return Yaku.hasWinningCombination(yakuResults)
  }

  compareScores(player1Score: number, player2Score: number): 'player1' | 'player2' | 'draw' {
    if (player1Score > player2Score) return 'player1'
    if (player2Score > player1Score) return 'player2'
    return 'draw'
  }

  /**
   * Calculate round winner and publish RoundEndedEvent
   */
  async calculateRoundWinner(
    gameId: string,
    roundNumber: number,
    player1Cards: readonly Card[],
    player2Cards: readonly Card[],
    player1Id: string,
    player2Id: string,
    player1TotalScore: number,
    player2TotalScore: number,
    koikoiPlayer?: string,
    koikoiCount: number = 0,
    endReason: 'yaku_achieved' | 'all_cards_played' | 'game_abandoned' = 'yaku_achieved'
  ): Promise<RoundEndResult> {
    const player1Result = await this.execute(player1Cards)
    const player2Result = await this.execute(player2Cards)

    let player1Score = player1Result.totalScore
    let player2Score = player2Result.totalScore
    let koikoiMultiplier = 1

    // Apply Koi-Koi multiplier
    if (koikoiPlayer === player1Id && koikoiCount > 0) {
      player1Score = this.calculateKoikoiBonus(player1Score, koikoiCount)
      koikoiMultiplier = KOIKOI_MULTIPLIER
    } else if (koikoiPlayer === player2Id && koikoiCount > 0) {
      player2Score = this.calculateKoikoiBonus(player2Score, koikoiCount)
      koikoiMultiplier = KOIKOI_MULTIPLIER
    }

    const winner = this.compareScores(player1Score, player2Score)
    const winnerId = winner === 'player1' ? player1Id :
                     winner === 'player2' ? player2Id : null

    // Calculate updated total scores
    const newPlayer1Total = player1TotalScore + player1Score
    const newPlayer2Total = player2TotalScore + player2Score

    // Determine winning yaku
    const winningYaku: EventYakuResult[] = winner === 'player1'
      ? this.convertYakuResults(player1Result.yakuResults)
      : winner === 'player2'
      ? this.convertYakuResults(player2Result.yakuResults)
      : []

    // Publish RoundEndedEvent
    await this.publishRoundEndedEvent(
      gameId,
      roundNumber,
      winnerId,
      winningYaku,
      [
        {
          playerId: player1Id,
          score: player1Score,
          achievedYaku: this.convertYakuResults(player1Result.yakuResults)
        },
        {
          playerId: player2Id,
          score: player2Score,
          achievedYaku: this.convertYakuResults(player2Result.yakuResults)
        }
      ],
      koikoiMultiplier,
      endReason,
      [
        { playerId: player1Id, totalScore: newPlayer1Total },
        { playerId: player2Id, totalScore: newPlayer2Total }
      ]
    )

    return {
      winner,
      player1Score,
      player2Score,
      player1Yaku: player1Result.yakuResults,
      player2Yaku: player2Result.yakuResults,
      koikoiMultiplier,
      endReason
    }
  }

  /**
   * Publish RoundEndedEvent to game-ui BC
   */
  private async publishRoundEndedEvent(
    gameId: string,
    roundNumber: number,
    winnerId: string | null,
    winningYaku: readonly EventYakuResult[],
    roundScores: readonly {
      readonly playerId: string
      readonly score: number
      readonly achievedYaku: readonly EventYakuResult[]
    }[],
    koikoiMultiplier: number,
    endReason: 'yaku_achieved' | 'all_cards_played' | 'game_abandoned',
    totalScores: readonly {
      readonly playerId: string
      readonly totalScore: number
    }[]
  ): Promise<void> {
    const event: RoundEndedEvent = {
      eventId: uuidv4(),
      eventType: 'RoundEnded',
      timestamp: Date.now(),
      sequenceNumber: this.eventPublisher.getNextSequenceNumber(),
      roundNumber,
      winnerId,
      winningYaku,
      roundScores,
      koikoiMultiplier,
      endReason,
      totalScores
    }

    await this.eventPublisher.publishEvent(event)
  }

  /**
   * Convert domain YakuResult to event YakuResult format
   */
  private convertYakuResults(yakuResults: YakuResult[]): EventYakuResult[] {
    return yakuResults.map(yaku => ({
      yaku: yaku.yaku.name as any, // Map from domain yaku to event yaku enum
      points: yaku.points,
      cardIds: yaku.cards.map(card => card.id)
    }))
  }
}
