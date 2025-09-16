import type { Card } from '../entities/Card'
import { Yaku } from '../entities/Yaku'
import type { YakuResult } from '../entities/Yaku'
import type { GameRepository } from '../interfaces/GameRepository'

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

export class CalculateScoreUseCase {
  constructor(private gameRepository: GameRepository) {}

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
    return originalScore * Math.pow(2, koikoiCount)
  }

  hasWinningCombination(yakuResults: YakuResult[]): boolean {
    return Yaku.hasWinningCombination(yakuResults)
  }

  compareScores(player1Score: number, player2Score: number): 'player1' | 'player2' | 'draw' {
    if (player1Score > player2Score) return 'player1'
    if (player2Score > player1Score) return 'player2'
    return 'draw'
  }

  async calculateRoundWinner(
    player1Cards: readonly Card[],
    player2Cards: readonly Card[],
    koikoiPlayer?: string,
    koikoiCount: number = 0
  ): Promise<{
    winner: 'player1' | 'player2' | 'draw'
    player1Score: number
    player2Score: number
    player1Yaku: YakuResult[]
    player2Yaku: YakuResult[]
  }> {
    const player1Result = await this.execute(player1Cards)
    const player2Result = await this.execute(player2Cards)

    let player1Score = player1Result.totalScore
    let player2Score = player2Result.totalScore

    if (koikoiPlayer === 'player1' && koikoiCount > 0) {
      player1Score = this.calculateKoikoiBonus(player1Score, koikoiCount)
    } else if (koikoiPlayer === 'player2' && koikoiCount > 0) {
      player2Score = this.calculateKoikoiBonus(player2Score, koikoiCount)
    }

    const winner = this.compareScores(player1Score, player2Score)

    return {
      winner,
      player1Score,
      player2Score,
      player1Yaku: player1Result.yakuResults,
      player2Yaku: player2Result.yakuResults
    }
  }
}