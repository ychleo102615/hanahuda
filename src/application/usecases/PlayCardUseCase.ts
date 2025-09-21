import type { Player } from '../../domain/entities/Player';
import type { Card } from '../../domain/entities/Card'
import type { GameMove } from '../../domain/entities/GameState'
import { Yaku } from '../../domain/entities/Yaku'
import type { GameRepository, PlayCardRequest, PlayCardResult } from '../ports/repositories/GameRepository'
import type { GamePresenter } from '../ports/presenters/GamePresenter'

export class PlayCardUseCase {
  constructor(
    private gameRepository: GameRepository,
    private presenter?: GamePresenter,
  ) {}

  async execute(gameId: string, request: PlayCardRequest): Promise<PlayCardResult> {
    try {
      const gameState = await this.gameRepository.getGameState(gameId)
      if (!gameState) {
        return { success: false, playedCard: undefined, capturedCards: [], nextPhase: 'playing', yakuResults: [], error: 'Game not found' }
      }

      const currentPlayer = gameState.currentPlayer
      if (!currentPlayer || currentPlayer.id !== request.playerId) {
        return { success: false, playedCard: undefined, capturedCards: [], nextPhase: 'playing', yakuResults: [], error: 'Not your turn' }
      }

      if (!currentPlayer.canPlayCard(request.cardId)) {
        return { success: false, playedCard: undefined, capturedCards: [], nextPhase: 'playing', yakuResults: [], error: 'Invalid card' }
      }

      const playedCard = currentPlayer.removeFromHand(request.cardId)
      if (!playedCard) {
        return { success: false, playedCard: undefined, capturedCards: [], nextPhase: 'playing', yakuResults: [], error: 'Card not found' }
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
            playedCard: undefined,
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
        if (currentPlayer.handCount > 0) {
          nextPhase = 'koikoi'
          gameState.setPhase('koikoi')
        } else {
          // 玩家湊成役但沒有手牌，直接結算回合
          nextPhase = 'round_end'
          gameState.setPhase('round_end')
        }
      } else {
        gameState.nextPlayer()
      }

      if (gameState.deckCount === 0 && gameState.players.every((p: Player) => p.handCount === 0)) {
        nextPhase = 'round_end'
        gameState.setPhase('round_end')
      }

      await this.gameRepository.saveGame(gameId, gameState)

      return {
        success: true,
        playedCard,
        capturedCards,
        nextPhase,
        yakuResults
      }
    } catch (error) {
      return {
        success: false,
        playedCard: undefined,
        capturedCards: [],
        nextPhase: 'playing',
        yakuResults: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
}