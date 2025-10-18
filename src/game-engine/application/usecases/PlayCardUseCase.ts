import type { Player } from '../../domain/entities/Player'
import type { Card } from '../../domain/entities/Card'
import type { GameMove } from '../../domain/entities/GameState'
import { Yaku } from '../../domain/entities/Yaku'
import type { IEventPublisher } from '../ports/IEventPublisher'
import type { IGameStateRepository } from '../ports/IGameStateRepository'
import type { PlayCardInputDTO } from '../dto/GameInputDTO'
import type { CardPlayedEvent } from '@/shared/events/game/CardPlayedEvent'
import type { MatchResult } from '@/shared/events/base/MatchResult'
import type { TurnTransition } from '@/shared/events/base/TurnTransition'
import type { YakuResult } from '@/shared/events/base/YakuResult'
import { MATCH_SELECTION_TIMEOUT } from '@/shared/constants/gameConstants'
import { v4 as uuidv4 } from 'uuid'
import { EngineCardMatchingService } from '../../domain/services/EngineCardMatchingService'

/**
 * PlayCardRequest - Internal request structure
 */
export interface PlayCardRequest {
  playerId: string
  cardId: string
  selectedFieldCard?: string
}

/**
 * PlayCardResult - Internal result structure
 */
export interface PlayCardResult {
  success: boolean
  playedCard: Card | undefined
  capturedCards: Card[]
  nextPhase: 'playing' | 'koikoi' | 'round_end'
  yakuResults: YakuResult[]
  error?: string
}

/**
 * Play Card Use Case (Game Engine BC)
 *
 * Refactored from the original application layer to game-engine BC.
 * Now publishes CardPlayedEvent with comprehensive MatchResult structures.
 *
 * Responsibilities:
 * - Validate card play
 * - Handle hand card matching (automatic or manual selection)
 * - Handle deck card reveal and matching
 * - Check for Yaku achievements
 * - Determine game flow (continue, Koi-Koi decision, round end)
 * - Publish CardPlayedEvent with complete match information
 */
export class PlayCardUseCase {
  private cardMatchingService: EngineCardMatchingService

  constructor(
    private gameRepository: IGameStateRepository,
    private eventPublisher: IEventPublisher
  ) {
    this.cardMatchingService = new EngineCardMatchingService()
  }

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

      // Handle hand card matching
      const handMatch = await this.processHandCardMatch(gameState, playedCard, request.selectedFieldCard)
      if (!handMatch.success) {
        return handMatch.result!
      }

      // Handle deck card reveal and matching
      const deckMatch = await this.processDeckCardMatch(gameState, currentPlayer)

      // Add captured cards to player
      const allCapturedCards = [...handMatch.capturedCards, ...deckMatch.capturedCards]
      if (allCapturedCards.length > 0) {
        currentPlayer.addToCaptured(allCapturedCards)
      }

      // Record the move
      const move: GameMove = {
        playerId: request.playerId,
        cardId: request.cardId,
        matchedCards: handMatch.matchedCards,
        capturedCards: allCapturedCards,
        timestamp: new Date()
      }
      gameState.addMove(move)

      // Check for Yaku and determine next phase
      const yakuResults = Yaku.checkYaku(currentPlayer.captured)
      const hasYaku = yakuResults.length > 0

      let nextPhase: 'playing' | 'koikoi' | 'round_end' = 'playing'
      let turnTransition: TurnTransition | null = null

      if (hasYaku) {
        if (currentPlayer.handCount > 0) {
          nextPhase = 'koikoi'
          gameState.setPhase('koikoi')
          // Turn transition is null - waiting for Koi-Koi decision
          turnTransition = null
        } else {
          // Player has yaku but no hand cards, end round
          nextPhase = 'round_end'
          gameState.setPhase('round_end')
          turnTransition = null
        }
      } else {
        // No yaku, switch to next player
        gameState.nextPlayer()
        const nextPlayer = gameState.currentPlayer
        turnTransition = {
          previousPlayerId: request.playerId,
          currentPlayerId: nextPlayer?.id || request.playerId,
          reason: 'card_played'
        }
      }

      // Check for game end condition (no cards left)
      if (gameState.deckCount === 0 && gameState.players.every((p: any) => p.handCount === 0)) {
        nextPhase = 'round_end'
        gameState.setPhase('round_end')
        turnTransition = null
      }

      // Save game state
      await this.gameRepository.saveGameState(gameId, gameState)

      // Publish CardPlayedEvent
      await this.publishCardPlayedEvent(
        gameId,
        request.playerId,
        playedCard.id,
        handMatch.matchResult,
        deckMatch,
        turnTransition
      )

      return {
        success: true,
        playedCard,
        capturedCards: allCapturedCards,
        nextPhase,
        yakuResults: yakuResults.map(yaku => ({
          yaku: yaku.yaku.name as any,
          points: yaku.points,
          cardIds: yaku.cards.map(card => card.id)
        }))
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

  /**
   * Process hand card matching logic
   */
  private async processHandCardMatch(
    gameState: any,
    playedCard: Card,
    selectedFieldCard?: string
  ): Promise<{
    success: boolean
    matchResult: MatchResult
    matchedCards: Card[]
    capturedCards: Card[]
    result?: PlayCardResult
  }> {
    const fieldMatches = gameState.getFieldMatches(playedCard)
    let capturedCardIds: string[] = []
    let capturedCards: Card[] = []
    let matchedCards: Card[] = []
    let matchType: 'no_match' | 'single_match' | 'multiple_matches'
    let matchedFieldCardId: string | undefined
    let selectableFieldCardIds: string[] | undefined

    if (selectedFieldCard) {
      // Manual field card selection
      const selectedCard = fieldMatches.find((card: Card) => card.id === selectedFieldCard)
      if (!selectedCard) {
        return {
          success: false,
          matchResult: {} as MatchResult,
          matchedCards: [],
          capturedCards: [],
          result: {
            success: false,
            playedCard: undefined,
            capturedCards: [],
            nextPhase: 'playing',
            yakuResults: [],
            error: 'Invalid field card selection'
          }
        }
      }
      // Successful match
      const removedCards = gameState.removeFromField([selectedFieldCard])
      matchedCards = removedCards
      capturedCards = [playedCard, ...removedCards]
      capturedCardIds = [playedCard.id, selectedFieldCard]
      matchType = 'single_match'
      matchedFieldCardId = selectedFieldCard
    } else {
      // Automatic matching logic
      if (fieldMatches.length === 0) {
        // No match - card goes to field
        gameState.addToField([playedCard])
        matchType = 'no_match'
        capturedCards = []
        capturedCardIds = []
      } else if (fieldMatches.length === 1) {
        // Single match - automatic capture
        const removedCards = gameState.removeFromField([fieldMatches[0].id])
        matchedCards = removedCards
        capturedCards = [playedCard, ...removedCards]
        capturedCardIds = [playedCard.id, fieldMatches[0].id]
        matchType = 'single_match'
        matchedFieldCardId = fieldMatches[0].id
      } else if (fieldMatches.length === 2) {
        // Two matches - requires player selection
        // For now, place card on field and require selection in next step
        gameState.addToField([playedCard])
        matchType = 'multiple_matches'
        selectableFieldCardIds = fieldMatches.map((card: Card) => card.id)
        capturedCards = []
        capturedCardIds = []

        return {
          success: false,
          matchResult: {} as MatchResult,
          matchedCards: [],
          capturedCards: [],
          result: {
            success: false,
            playedCard: undefined,
            capturedCards: [],
            nextPhase: 'playing',
            yakuResults: [],
            error: 'errors.multipleMatchesFound'
          }
        }
      } else if (fieldMatches.length === 3) {
        // Three matches - automatic capture all (三枚合わせ rule)
        // Player plays the 4th card of the same suit, captures all 3 field cards
        const fieldCardIds = fieldMatches.map((card: Card) => card.id)
        const removedCards = gameState.removeFromField(fieldCardIds)
        matchedCards = removedCards
        capturedCards = [playedCard, ...removedCards]
        capturedCardIds = [playedCard.id, ...fieldCardIds]
        matchType = 'single_match' // Treated as single match (automatic)
        matchedFieldCardId = undefined // Multiple cards captured
      } else {
        // More than 3 matches (should not happen in standard game)
        // Treat as multiple matches requiring selection
        gameState.addToField([playedCard])
        matchType = 'multiple_matches'
        selectableFieldCardIds = fieldMatches.map((card: Card) => card.id)
        capturedCards = []
        capturedCardIds = []

        return {
          success: false,
          matchResult: {} as MatchResult,
          matchedCards: [],
          capturedCards: [],
          result: {
            success: false,
            playedCard: undefined,
            capturedCards: [],
            nextPhase: 'playing',
            yakuResults: [],
            error: 'errors.multipleMatchesFound'
          }
        }
      }
    }

    const matchResult: MatchResult = {
      sourceCardId: playedCard.id,
      sourceType: 'hand',
      matchType,
      matchedFieldCardId,
      capturedCardIds: capturedCardIds,
      selectableFieldCardIds,
      achievedYaku: [] // Will be calculated after both hand and deck matches
    }

    return {
      success: true,
      matchResult,
      matchedCards,
      capturedCards
    }
  }

  /**
   * Process deck card reveal and matching
   */
  private async processDeckCardMatch(gameState: any, currentPlayer: any): Promise<MatchResult & { capturedCards: Card[] }> {
    const deckCard = gameState.drawCard()
    if (!deckCard) {
      // No deck card available
      return {
        sourceCardId: '',
        sourceType: 'deck',
        matchType: 'no_match',
        capturedCardIds: [],
        capturedCards: [],
        achievedYaku: []
      }
    }

    const deckMatches = gameState.getFieldMatches(deckCard)
    let capturedCardIds: string[] = []
    let capturedCards: Card[] = []
    let matchType: 'no_match' | 'single_match' | 'multiple_matches'
    let matchedFieldCardId: string | undefined

    if (deckMatches.length === 0) {
      // No match - deck card goes to field
      gameState.addToField([deckCard])
      matchType = 'no_match'
      capturedCards = []
      capturedCardIds = []
    } else if (deckMatches.length === 1) {
      // Single match - automatic capture
      const matched = gameState.removeFromField([deckMatches[0].id])
      capturedCards = [deckCard, ...matched]
      capturedCardIds = [deckCard.id, deckMatches[0].id]
      matchType = 'single_match'
      matchedFieldCardId = deckMatches[0].id
    } else {
      // Multiple matches - auto-select based on priority (bright > animal > ribbon > plain)
      const matchingFieldCardIds = deckMatches.map((card: Card) => card.id)
      const selectedCardId = this.cardMatchingService.selectAutoMatch(deckCard.id, matchingFieldCardIds)
      const matched = gameState.removeFromField([selectedCardId])
      capturedCards = [deckCard, ...matched]
      capturedCardIds = [deckCard.id, selectedCardId]
      matchType = 'single_match' // Treated as single after auto-selection
      matchedFieldCardId = selectedCardId
    }

    // Check for Yaku after deck card capture
    let achievedYaku: YakuResult[] = []
    if (capturedCards.length > 0) {
      const allCaptured = [...currentPlayer.captured, ...capturedCards]
      const yakuResults = Yaku.checkYaku(allCaptured)
      achievedYaku = yakuResults.map(yaku => ({
        yaku: yaku.yaku as any,
        points: yaku.points,
        cardIds: yaku.cards.map(card => card.id)
      }))
    }

    return {
      sourceCardId: deckCard.id,
      sourceType: 'deck',
      matchType,
      matchedFieldCardId,
      capturedCardIds: capturedCardIds,
      capturedCards: capturedCards,
      achievedYaku
    }
  }

  /**
   * Publish CardPlayedEvent to game-ui BC
   */
  private async publishCardPlayedEvent(
    gameId: string,
    playerId: string,
    playedCardId: string,
    handMatch: MatchResult,
    deckMatch: MatchResult,
    turnTransition: TurnTransition | null
  ): Promise<void> {
    const event: CardPlayedEvent = {
      eventId: uuidv4(),
      eventType: 'CardPlayed',
      timestamp: Date.now(),
      sequenceNumber: this.eventPublisher.getNextSequenceNumber(),
      playerId,
      playedCardId,
      handMatch,
      deckMatch,
      turnTransition
    }

    await this.eventPublisher.publishEvent(event)
  }

  /**
   * Helper method to get card objects by IDs
   */
  private getCardsByIds(gameState: any, cardIds: string[]): Card[] {
    const allCards = [...gameState.deck, ...gameState.field]
    gameState.players.forEach((player: any) => {
      allCards.push(...player.hand, ...player.captured)
    })

    return cardIds.map(id => allCards.find((card: Card) => card.id === id)).filter(Boolean) as Card[]
  }

  /**
   * Helper method to find a card by ID across all game areas
   */
  private findCardById(gameState: any, cardId: string): Card | null {
    const allCards = [...gameState.deck, ...gameState.field]
    gameState.players.forEach((player: any) => {
      allCards.push(...player.hand, ...player.captured)
    })

    return allCards.find((card: Card) => card.id === cardId) || null
  }
}
