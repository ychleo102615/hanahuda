import type { Card, CardType } from '../../domain/entities/Card'
import { CardEntity } from '../../domain/entities/Card'
import { Player } from '../../domain/entities/Player'
import type { GameState, RoundResult } from '../../domain/entities/GameState'
import { GameState as GameStateClass } from '../../domain/entities/GameState'
import type { GameRepository } from '../ports/repositories/GameRepository'
import { HANAFUDA_CARDS, GAME_SETTINGS } from '@/shared/constants/gameConstants'
import { CalculateScoreUseCase } from './CalculateScoreUseCase'

export class GameFlowUseCase {
  constructor(
    private gameRepository: GameRepository,
    private calculateScoreUseCase: CalculateScoreUseCase
  ) {}

  async createGame(): Promise<string> {
    return await this.gameRepository.createGame()
  }

  async setupGame(gameId: string, player1: Player, player2: Player): Promise<GameState> {
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

  async handleKoikoiDeclaration(gameId: string, playerId: string, declareKoikoi: boolean): Promise<GameState> {
    const gameState = await this.gameRepository.getGameState(gameId)
    if (!gameState) {
      throw new Error('Game not found')
    }

    if (declareKoikoi) {
      gameState.setKoikoiPlayer(playerId)
      gameState.setPhase('playing')
      gameState.nextPlayer()
    } else {
      await this.endRound(gameId)
    }

    await this.gameRepository.saveGame(gameId, gameState)
    return gameState
  }

  async endRound(gameId: string): Promise<GameState> {
    const gameState = await this.gameRepository.getGameState(gameId)
    if (!gameState) {
      throw new Error('Game not found')
    }

    const players = gameState.players
    if (players.length !== 2) {
      throw new Error('Invalid number of players')
    }

    const result = await this.calculateScoreUseCase.calculateRoundWinner(
      players[0].captured,
      players[1].captured,
      gameState.koikoiPlayer || undefined
    )

    let winner: Player | null = null
    if (result.winner === 'player1') {
      winner = players[0]
      players[0].addScore(result.player1Score)
    } else if (result.winner === 'player2') {
      winner = players[1]
      players[1].addScore(result.player2Score)
    }

    const roundResult: RoundResult = {
      winner,
      yakuResults: winner === players[0] ? result.player1Yaku : result.player2Yaku,
      score: winner === players[0] ? result.player1Score : result.player2Score,
      koikoiDeclared: gameState.koikoiPlayer !== null
    }

    gameState.setRoundResult(roundResult)

    if (this.checkGameEnd(gameState)) {
      gameState.setPhase('game_end')
    } else {
      gameState.setPhase('round_end')
    }

    await this.gameRepository.saveGame(gameId, gameState)
    return gameState
  }

  async startNextRound(gameId: string): Promise<GameState> {
    const gameState = await this.gameRepository.getGameState(gameId)
    if (!gameState) {
      throw new Error('Game not found')
    }

    if (gameState.round >= GAME_SETTINGS.MAX_ROUNDS) {
      gameState.setPhase('game_end')
    } else {
      gameState.nextRound()
      const deck = await this.createShuffledDeck()
      gameState.setDeck(deck)
      await this.dealCards(gameId)
    }

    await this.gameRepository.saveGame(gameId, gameState)
    return gameState
  }

  private async createShuffledDeck(): Promise<Card[]> {
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

  private checkGameEnd(gameState: GameState): boolean {
    const maxScore = Math.max(...gameState.players.map((p: Player) => p.score))
    return maxScore >= GAME_SETTINGS.WINNING_SCORE || gameState.round >= GAME_SETTINGS.MAX_ROUNDS
  }

  async getGameWinner(gameId: string): Promise<Player | null> {
    const gameState = await this.gameRepository.getGameState(gameId)
    if (!gameState || !gameState.isGameOver) {
      return null
    }

    const players = gameState.players
    const maxScore = Math.max(...players.map((p: Player) => p.score))
    const winners = players.filter((p: Player) => p.score === maxScore)
    
    return winners.length === 1 ? winners[0] : null
  }
}