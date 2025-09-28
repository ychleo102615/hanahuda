import type { Card, CardType } from '@/domain/entities/Card'
import { CardEntity } from '@/domain/entities/Card'
import { Player } from '@/domain/entities/Player'
import type { GameState, GameMove } from '@/domain/entities/GameState'
import { GameState as GameStateClass } from '@/domain/entities/GameState'
import { Yaku } from '@/domain/entities/Yaku'
import type { YakuResult } from '@/domain/entities/Yaku'
import type { GameRepository, PlayCardRequest, PlayCardResult } from '@/application/ports/repositories/GameRepository'
import { HANAFUDA_CARDS } from '@/shared/constants/gameConstants'
import { v4 as uuidv4 } from 'uuid'

export class LocalGameRepository implements GameRepository {
  private games: Map<string, GameState> = new Map()

  async createGame(): Promise<string> {
    const gameId = uuidv4()
    const gameState = new GameStateClass()
    this.games.set(gameId, gameState)
    return gameId
  }

  async joinGame(gameId: string, player: Player): Promise<boolean> {
    const gameState = this.games.get(gameId)
    if (!gameState) {
      return false
    }

    if (gameState.players.length >= 2) {
      return false
    }

    gameState.addPlayer(player)
    return true
  }

  async startGame(gameId: string): Promise<GameState> {
    const gameState = this.games.get(gameId)
    if (!gameState) {
      throw new Error('Game not found')
    }

    if (gameState.players.length !== 2) {
      throw new Error('Need exactly 2 players to start')
    }

    const deck = await this.shuffleDeck()
    gameState.setDeck(deck)
    
    return await this.dealCards(gameId)
  }

  async getGameState(gameId: string): Promise<GameState | null> {
    const gameState = this.games.get(gameId)
    return gameState ? gameState.clone() : null
  }

  async playCard(gameId: string, request: PlayCardRequest): Promise<PlayCardResult> {
    const gameState = this.games.get(gameId)
    if (!gameState) {
      return { 
        success: false, 
        capturedCards: [], 
        nextPhase: 'playing', 
        yakuResults: [], 
        error: 'Game not found' 
      }
    }

    const currentPlayer = gameState.currentPlayer
    if (!currentPlayer || currentPlayer.id !== request.playerId) {
      return { 
        success: false, 
        capturedCards: [], 
        nextPhase: 'playing', 
        yakuResults: [], 
        error: 'Not your turn' 
      }
    }

    if (!currentPlayer.canPlayCard(request.cardId)) {
      return { 
        success: false, 
        capturedCards: [], 
        nextPhase: 'playing', 
        yakuResults: [], 
        error: 'Invalid card' 
      }
    }

    const playedCard = currentPlayer.removeFromHand(request.cardId)
    if (!playedCard) {
      return { 
        success: false, 
        capturedCards: [], 
        nextPhase: 'playing', 
        yakuResults: [], 
        error: 'Card not found in hand' 
      }
    }

    const fieldMatches = gameState.getFieldMatches(playedCard)
    let capturedCards: Card[] = []
    let selectedFieldCards: Card[] = []

    if (request.selectedFieldCard) {
      // 當指定場牌時，驗證是否能與玩家牌配對
      const selectedCard = fieldMatches.find(card => card.id === request.selectedFieldCard)
      if (!selectedCard) {
        currentPlayer.addToHand(playedCard)
        return {
          success: false,
          capturedCards: [],
          nextPhase: 'playing',
          yakuResults: [],
          error: 'errors.invalidFieldCardSelection'
        }
      }
      // 配對成功，移除場牌並捕獲
      selectedFieldCards = gameState.removeFromField([request.selectedFieldCard])
      capturedCards = [playedCard, ...selectedFieldCards]
    } else {
      // 當未指定場牌時，自動尋找配對
      if (fieldMatches.length === 0) {
        // 無配對，將玩家牌置於場上
        gameState.addToField([playedCard])
      } else if (fieldMatches.length === 1) {
        // 唯一配對，自動捕獲
        selectedFieldCards = gameState.removeFromField([fieldMatches[0].id])
        capturedCards = [playedCard, ...selectedFieldCards]
      } else {
        // 多重配對，顯示錯誤
        currentPlayer.addToHand(playedCard)
        return {
          success: false,
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

    return {
      success: true,
      capturedCards,
      nextPhase,
      yakuResults
    }
  }

  async declareKoikoi(gameId: string, playerId: string): Promise<boolean> {
    const gameState = this.games.get(gameId)
    if (!gameState) {
      return false
    }

    if (gameState.phase !== 'koikoi') {
      return false
    }

    const currentPlayer = gameState.currentPlayer
    if (!currentPlayer || currentPlayer.id !== playerId) {
      return false
    }

    gameState.setKoikoiPlayer(playerId)
    gameState.setPhase('playing')
    gameState.nextPlayer()
    
    return true
  }

  async endRound(gameId: string): Promise<GameState> {
    const gameState = this.games.get(gameId)
    if (!gameState) {
      throw new Error('Game not found')
    }

    gameState.setPhase('round_end')
    return gameState.clone()
  }

  async shuffleDeck(): Promise<Card[]> {
    const cards: Card[] = []
    
    Object.values(HANAFUDA_CARDS).forEach(monthData => {
      monthData.CARDS.forEach((cardData, index) => {
        const card = new CardEntity(
          cardData.suit,
          cardData.type as CardType,
          cardData.points,
          cardData.name,
          index
        )
        cards.push(card)
      })
    })

    for (let i = cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cards[i], cards[j]] = [cards[j], cards[i]]
    }

    return cards
  }

  async dealCards(gameId: string): Promise<GameState> {
    const gameState = this.games.get(gameId)
    if (!gameState) {
      throw new Error('Game not found')
    }

    const deck = [...gameState.deck]
    const fieldCards: Card[] = []
    
    for (let i = 0; i < 8; i++) {
      const card = deck.pop()
      if (card) fieldCards.push(card)
    }

    gameState.players.forEach(player => {
      const hand: Card[] = []
      for (let i = 0; i < 8; i++) {
        const card = deck.pop()
        if (card) hand.push(card)
      }
      player.setHand(hand)
    })

    gameState.setDeck(deck)
    gameState.setField(fieldCards)
    gameState.setPhase('playing')
    gameState.setCurrentPlayer(0)

    return gameState.clone()
  }

  async calculateScore(capturedCards: readonly Card[]): Promise<{
    yakuResults: YakuResult[]
    totalScore: number
  }> {
    const yakuResults = Yaku.checkYaku(capturedCards)
    const totalScore = Yaku.calculateTotalScore(yakuResults)
    
    return {
      yakuResults,
      totalScore
    }
  }

  async saveGame(gameId: string, gameState: GameState): Promise<boolean> {
    try {
      this.games.set(gameId, gameState.clone())
      return true
    } catch (error) {
      console.error('Failed to save game:', error)
      return false
    }
  }

  async loadGame(gameId: string): Promise<GameState | null> {
    const gameState = this.games.get(gameId)
    return gameState ? gameState.clone() : null
  }

  async deleteGame(gameId: string): Promise<boolean> {
    return this.games.delete(gameId)
  }

  async clearAllGames(): Promise<boolean> {
    try {
      this.games.clear()
      return true
    } catch (error) {
      console.error('Failed to clear all games:', error)
      return false
    }
  }
}