import type { Player } from '../../domain/entities/Player';
import type { Card } from '../../domain/entities/Card'
import type { GameMove } from '../../domain/entities/GameState'
import { Yaku } from '../../domain/entities/Yaku'
import type { GameRepository } from '../ports/repositories/GameRepository'
import type { PlayCardRequest, PlayCardResult } from '../dto/GameDTO'

export class PlayCardUseCase {
  constructor(
    private gameRepository: GameRepository,
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

      // 透過 GameState 出牌（保護聚合邊界）
      const playedCard = gameState.playCardFromHand(request.playerId, request.cardId)
      if (!playedCard) {
        return { success: false, playedCard: undefined, capturedCards: [], nextPhase: 'playing', yakuResults: [], error: 'Card not found' }
      }

      const fieldMatches = gameState.getFieldMatches(playedCard)
      let capturedCards: Card[] = []
      let matchedFieldCards: Card[] = []

      if (request.selectedFieldCard) {
        // 當指定場牌時，驗證是否能與玩家牌配對
        const selectedCard = fieldMatches.find(card => card.id === request.selectedFieldCard)
        if (!selectedCard) {
          return {
            success: false,
            playedCard: undefined,
            capturedCards: [],
            nextPhase: 'playing',
            yakuResults: [],
            error: 'errors.invalidFieldCardSelection'
          }
        }
        // 配對成功，移除場牌並捕獲
        const removedCards = gameState.removeFromField([request.selectedFieldCard])
        matchedFieldCards = removedCards
        capturedCards = [playedCard, ...removedCards]
      } else {
        // 當未指定場牌時，自動尋找配對
        if (fieldMatches.length === 0) {
          // 無配對，將玩家牌置於場上
          gameState.addToField([playedCard])
        } else if (fieldMatches.length === 1) {
          // 唯一配對，自動捕獲
          const removedCards = gameState.removeFromField([fieldMatches[0].id])
          matchedFieldCards = removedCards
          capturedCards = [playedCard, ...removedCards]
        } else {
          // 多重配對，顯示錯誤
          gameState.addToField([playedCard])
          return {
            success: false,
            playedCard: undefined,
            capturedCards: [],
            nextPhase: 'playing',
            yakuResults: [],
            error: 'errors.multipleMatchesFound'
          }
        }
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

      // 透過 GameState 添加捕獲的牌（保護聚合邊界）
      if (capturedCards.length > 0) {
        gameState.addCapturedCards(request.playerId, capturedCards)
      }

      const move: GameMove = {
        playerId: request.playerId,
        cardId: request.cardId,
        matchedCards: matchedFieldCards,
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