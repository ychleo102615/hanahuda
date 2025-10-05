import type { Card } from '../../domain/entities/Card'
import type { GameRepository } from '../ports/repositories/GameRepository'

export interface GetMatchingCardsRequest {
  gameId: string
  handCard: Card
}

export interface GetMatchingCardsResult {
  success: boolean
  matchingFieldCards: Card[]
  canSelectField: boolean
  error?: string
}

export class GetMatchingCardsUseCase {
  constructor(private gameRepository: GameRepository) {}

  async execute(request: GetMatchingCardsRequest): Promise<GetMatchingCardsResult> {
    try {
      const gameState = await this.gameRepository.getGameState(request.gameId)
      if (!gameState) {
        return {
          success: false,
          matchingFieldCards: [],
          canSelectField: false,
          error: 'Game not found'
        }
      }

      // 使用 GameState 的 getFieldMatches 方法獲取可配對的場牌
      const matchingFieldCards = gameState.getFieldMatches(request.handCard)
      const canSelectField = matchingFieldCards.length > 0

      return {
        success: true,
        matchingFieldCards,
        canSelectField
      }
    } catch (error) {
      return {
        success: false,
        matchingFieldCards: [],
        canSelectField: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  canCardMatch(handCard: Card, fieldCard: Card): boolean {
    return handCard.suit === fieldCard.suit
  }

  getMatchingCount(handCard: Card, fieldCards: readonly Card[]): number {
    return fieldCards.filter(fieldCard => this.canCardMatch(handCard, fieldCard)).length
  }
}