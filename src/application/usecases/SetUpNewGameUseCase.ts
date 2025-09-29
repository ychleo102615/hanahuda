import type { Card, CardType } from '../../domain/entities/Card'
import { CardEntity } from '../../domain/entities/Card'
import { Player } from '../../domain/entities/Player'
import type { GameState } from '../../domain/entities/GameState'
import { GameState as GameStateClass } from '../../domain/entities/GameState'
import type { GameRepository } from '../ports/repositories/GameRepository'
import type { StartGameInputDTO, SetUpGameResult, GameStateOutputDTO } from '../dto/GameDTO'
import { HANAFUDA_CARDS, GAME_SETTINGS } from '@/shared/constants/gameConstants'

export class SetUpNewGameUseCase {
  constructor(
    private gameRepository: GameRepository,
  ) {}

  async execute(input: StartGameInputDTO): Promise<SetUpGameResult> {
    try {
      const newGameId = await this.createGame()

      const player1 = new Player('player1', input.player1Name, true)
      const player2 = new Player('player2', input.player2Name, false)

      await this.setupGame(newGameId, player1, player2)
      const dealtGameState = await this.dealCards(newGameId)

      const gameStateDTO = this.mapGameStateToDTO(newGameId, dealtGameState)

      return {
        success: true,
        gameId: newGameId,
        gameState: gameStateDTO
      }
    } catch (error) {
      return {
        success: false,
        gameId: '',
        error: `Error starting game: ${error}`
      }
    }
  }

  async createGame(): Promise<string> {
    return await this.gameRepository.createGame()
  }

  private async setupGame(gameId: string, player1: Player, player2: Player): Promise<GameState> {
    const gameState = new GameStateClass()

    gameState.addPlayer(player1)
    gameState.addPlayer(player2)

    const deck = await this.createShuffledDeck()
    gameState.setDeck(deck)

    gameState.setPhase('setup')
    await this.gameRepository.saveGame(gameId, gameState)

    return gameState
  }

  async dealCards(gameId: string): Promise<GameState> {
    const gameState = await this.gameRepository.getGameState(gameId)
    if (!gameState) {
      throw new Error('Game not found')
    }

    const deck = [...gameState.deck]
    const fieldCards: Card[] = []

    for (let i = 0; i < GAME_SETTINGS.CARDS_ON_FIELD; i++) {
      const card = deck.pop()
      if (card) fieldCards.push(card)
    }

    gameState.players.forEach((player: Player) => {
      const hand: Card[] = []
      for (let i = 0; i < GAME_SETTINGS.CARDS_PER_PLAYER; i++) {
        const card = deck.pop()
        if (card) hand.push(card)
      }
      player.setHand(hand)
    })

    gameState.setDeck(deck)
    gameState.setField(fieldCards)
    gameState.setPhase('playing')
    gameState.setCurrentPlayer(0)

    await this.gameRepository.saveGame(gameId, gameState)
    return gameState
  }

  async createShuffledDeck(): Promise<Card[]> {
    const cards: Card[] = []

    Object.values(HANAFUDA_CARDS).forEach((monthData) => {
      monthData.CARDS.forEach((cardData, index) => {
        const card = new CardEntity(
          cardData.suit,
          cardData.type as CardType,
          cardData.points,
          cardData.name,
          index,
        )
        cards.push(card)
      })
    })

    for (let i = cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[cards[i], cards[j]] = [cards[j], cards[i]]
    }

    return cards
  }

  private mapGameStateToDTO(gameId: string, gameState: GameState): GameStateOutputDTO {
    const lastMove = gameState.lastMove ? {
      playerId: gameState.lastMove.playerId,
      cardPlayed: gameState.lastMove.capturedCards[0] || null,
      cardsMatched: gameState.lastMove.matchedCards
    } : undefined

    const roundResult = gameState.roundResult ? {
      winner: gameState.roundResult.winner,
      score: gameState.roundResult.score,
      yakuResults: gameState.roundResult.yakuResults,
      koikoiDeclared: gameState.roundResult.koikoiDeclared
    } : undefined

    return {
      gameId: gameId,
      players: [...gameState.players],
      currentPlayer: gameState.currentPlayer,
      fieldCards: [...gameState.field],
      deckCount: gameState.deckCount,
      round: gameState.round,
      phase: gameState.phase,
      isGameOver: gameState.isGameOver,
      lastMove: lastMove,
      roundResult: roundResult,
      koikoiPlayer: gameState.koikoiPlayer || undefined,
    }
  }
}