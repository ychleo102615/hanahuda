import type { Card } from '../entities/Card'
import type { GameMove } from '../entities/GameState'
import { Yaku } from '../entities/Yaku'
import type { GameRepository, PlayCardRequest, PlayCardResult } from '../interfaces/GameRepository'

export class PlayCardUseCase {
  constructor(private gameRepository: GameRepository) {}

  async execute(gameId: string, request: PlayCardRequest): Promise<PlayCardResult> {
    try {
      const gameState = await this.gameRepository.getGameState(gameId)
      if (!gameState) {
        return { success: false, capturedCards: [], nextPhase: 'playing', yakuResults: [], error: 'Game not found' }
      }

      const currentPlayer = gameState.currentPlayer
      if (!currentPlayer || currentPlayer.id !== request.playerId) {
        return { success: false, capturedCards: [], nextPhase: 'playing', yakuResults: [], error: 'Not your turn' }
      }

      if (!currentPlayer.canPlayCard(request.cardId)) {
        return { success: false, capturedCards: [], nextPhase: 'playing', yakuResults: [], error: 'Invalid card' }
      }

      const playedCard = currentPlayer.removeFromHand(request.cardId)
      if (!playedCard) {
        return { success: false, capturedCards: [], nextPhase: 'playing', yakuResults: [], error: 'Card not found' }
      }

      const fieldMatches = gameState.getFieldMatches(playedCard)
      let capturedCards: Card[] = []
      let selectedFieldCards: Card[] = []

      if (fieldMatches.length > 0) {
        if (request.selectedFieldCards && request.selectedFieldCards.length > 0) {
          selectedFieldCards = gameState.removeFromField(request.selectedFieldCards)
        } else if (fieldMatches.length === 1) {
          selectedFieldCards = gameState.removeFromField([fieldMatches[0].id])
        } else {
          gameState.addToField([playedCard])
          return {
            success: false,
            capturedCards: [],
            nextPhase: 'playing',
            yakuResults: [],
            error: 'Multiple matches found, please select one'
          }
        }
        capturedCards = [playedCard, ...selectedFieldCards]
      } else {
        gameState.addToField([playedCard])
      }

      const deckCard = gameState.drawCard()
      if (deckCard) {
        const deckMatches = gameState.getFieldMatches(deckCard)
        if (deckMatches.length === 1) {
          const matched = gameState.removeFromField([deckMatches[0].id])
          capturedCards.push(deckCard, ...matched)
        } else if (deckMatches.length === 0) {
          gameState.addToField([deckCard])
        } else {
          const firstMatch = gameState.removeFromField([deckMatches[0].id])
          capturedCards.push(deckCard, ...firstMatch)
        }
      }

      if (capturedCards.length > 0) {
        currentPlayer.addToCaptured(capturedCards)
      }

      const move: GameMove = {
        playerId: request.playerId,
        cardId: request.cardId,
        matchedCards: selectedFieldCards,
        capturedCards,
        timestamp: new Date()
      }
      gameState.addMove(move)

      const yakuResults = Yaku.checkYaku(currentPlayer.captured)
      const hasYaku = yakuResults.length > 0

      let nextPhase: 'playing' | 'koikoi' | 'round_end' = 'playing'
      
      if (hasYaku) {
        nextPhase = 'koikoi'
        gameState.setPhase('koikoi')
      } else {
        gameState.nextPlayer()
      }

      if (gameState.deckCount === 0 && gameState.players.every(p => p.handCount === 0)) {
        nextPhase = 'round_end'
        gameState.setPhase('round_end')
      }

      await this.gameRepository.saveGame(gameId, gameState)

      return {
        success: true,
        capturedCards,
        nextPhase,
        yakuResults
      }
    } catch (error) {
      return {
        success: false,
        capturedCards: [],
        nextPhase: 'playing',
        yakuResults: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
}