import type { Card, CardType } from '../../domain/entities/Card'
import { CardEntity } from '../../domain/entities/Card'
import { Player } from '../../domain/entities/Player'
import type { GameState, RoundResult } from '../../domain/entities/GameState'
import { GameState as GameStateClass } from '../../domain/entities/GameState'
import type { GameRepository } from '../ports/repositories/GameRepository'
import type { GamePresenter } from '../ports/presenters/GamePresenter'
import type { YakuResult } from '../../domain/entities/Yaku'
import type { StartGameInputDTO, GameStateOutputDTO, PlayCardInputDTO, PlayCardOutputDTO } from '../dto/GameDTO'
import { HANAFUDA_CARDS, GAME_SETTINGS } from '@/shared/constants/gameConstants'
import { CalculateScoreUseCase } from './CalculateScoreUseCase'
import { PlayCardUseCase } from './PlayCardUseCase'

export class GameFlowUseCase {
  constructor(
    private gameRepository: GameRepository,
    private calculateScoreUseCase: CalculateScoreUseCase,
    private presenter?: GamePresenter,
    private playCardUseCase?: PlayCardUseCase,
  ) {}

  async createGame(): Promise<string> {
    return await this.gameRepository.createGame()
  }

  async startNewGame(input: StartGameInputDTO): Promise<string> {
    try {
      // 清空 UI 狀態
      if (this.presenter) {
        this.presenter.clearYakuDisplay()
        this.presenter.presentKoikoiDialog(false)
        this.presenter.presentCardSelection(null, null)
        this.presenter.presentGameMessage('Starting new game...')
      }

      const newGameId = await this.createGame()

      const player1 = new Player('player1', input.player1Name, true)
      const player2 = new Player('player2', input.player2Name, false)

      await this.setupGame(newGameId, player1, player2)
      const dealtGameState = await this.dealCards(newGameId)

      // 通知 UI 更新
      if (this.presenter) {
        const gameStateDTO = this.mapGameStateToDTO(newGameId, dealtGameState)

        this.presenter.presentStartGameResult({
          gameId: newGameId,
          success: true,
        })

        this.presenter.presentGameState(gameStateDTO)
        this.presenter.presentGameMessage(
          `Game started! ${dealtGameState.currentPlayer?.name}'s turn`,
        )
      }

      return newGameId
    } catch (error) {
      const errorMessage = `Error starting game: ${error}`

      if (this.presenter) {
        this.presenter.presentStartGameResult({
          gameId: '',
          success: false,
          error: errorMessage,
        })
        this.presenter.presentError(errorMessage)
      }

      throw error
    }
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
    console.log('Dealing cards...')
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

  async handleKoikoiDeclaration(
    gameId: string,
    playerId: string,
    declareKoikoi: boolean,
  ): Promise<GameState> {
    const gameState = await this.gameRepository.getGameState(gameId)
    if (!gameState) {
      throw new Error('Game not found')
    }

    const player = gameState.players.find((p: Player) => p.id === playerId)
    if (!player) {
      throw new Error('Player not found')
    }

    if (declareKoikoi) {
      if (player.handCount === 0) {
        throw new Error('Cannot declare Koi-Koi without hand cards')
      }
      gameState.setKoikoiPlayer(playerId)
      gameState.setPhase('playing')
      gameState.nextPlayer()
    } else {
      // 不聲明 Koi-Koi，設置階段為準備結束回合
      gameState.setPhase('round_end')
    }

    await this.gameRepository.saveGame(gameId, gameState)
    return gameState
  }

  async handleKoikoiDecision(gameId: string, playerId: string, declareKoikoi: boolean): Promise<void> {
    try {
      if (declareKoikoi) {
        await this.handleKoikoiDeclaration(gameId, playerId, true)
      } else {
        await this.endRound(gameId)
      }

      // 通知 UI 更新
      if (this.presenter) {
        const gameState = await this.gameRepository.getGameState(gameId)
        if (gameState) {
          // 清理 UI 狀態
          this.presenter.clearYakuDisplay()
          this.presenter.presentKoikoiDialog(false)

          const gameStateDTO = this.mapGameStateToDTO(gameId, gameState)
          this.presenter.presentGameState(gameStateDTO)

          if (declareKoikoi) {
            this.presenter.presentGameMessage('Koi-Koi declared! Game continues.')
          } else {
            this.presenter.presentGameMessage('Round ended.')
            await this.handleRoundEndPresentation(gameId)
          }
        }
      }
    } catch (error) {
      if (this.presenter) {
        this.presenter.presentError(`Error handling Koi-Koi decision: ${error}`)
      }
      throw error
    }
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
      gameState.koikoiPlayer || undefined,
    )

    let winner: Player | null = null
    let winnerYakuResults: YakuResult[] = []
    let winnerScore: number = 0

    if (result.winner === 'player1') {
      winner = players[0]
      players[0].addScore(result.player1Score)
      winnerYakuResults = result.player1Yaku
      winnerScore = result.player1Score
    } else if (result.winner === 'player2') {
      winner = players[1]
      players[1].addScore(result.player2Score)
      winnerYakuResults = result.player2Yaku
      winnerScore = result.player2Score
    } else {
      // 平局情況：沒有玩家加分，但記錄雙方的役
      winnerYakuResults = [...result.player1Yaku, ...result.player2Yaku]
      winnerScore = 0
    }

    const roundResult: RoundResult = {
      winner,
      yakuResults: winnerYakuResults,
      score: winnerScore,
      koikoiDeclared: gameState.koikoiPlayer !== null,
    }

    gameState.setRoundResult(roundResult)

    // 總是設置為 round_end，讓玩家決定是否繼續
    gameState.setPhase('round_end')

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

      // 通知 UI 遊戲結束
      if (this.presenter) {
        const winner = await this.getGameWinner(gameId)
        const finalScore = winner ? winner.score : 0
        this.presenter.presentGameEnd(winner?.name || null, finalScore)
      }
    } else {
      // 清空場上的牌
      gameState.setField([])

      // 進入下一回合（這會自動重置玩家狀態和遊戲狀態）
      gameState.nextRound()

      // 創建新牌組並發牌
      const deck = await this.createShuffledDeck()
      gameState.setDeck(deck)

      // 先保存狀態變更，然後發牌
      await this.gameRepository.saveGame(gameId, gameState)
      const updatedGameState = await this.dealCards(gameId)

      // 通知 UI 新回合開始
      if (this.presenter) {
        const gameStateDTO = this.mapGameStateToDTO(gameId, updatedGameState)
        this.presenter.presentGameState(gameStateDTO)
        this.presenter.presentGameMessage(`Round ${updatedGameState.round} started! ${updatedGameState.currentPlayer?.name}'s turn`)
        this.presenter.clearYakuDisplay()
        this.presenter.presentKoikoiDialog(false)
      }
    }

    // 獲取最終的遊戲狀態
    const finalGameState = await this.gameRepository.getGameState(gameId)
    if (!finalGameState) {
      throw new Error('Game state not found after update')
    }

    return finalGameState
  }

  private async createShuffledDeck(): Promise<Card[]> {
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

  async handlePlayCard(gameId: string, input: PlayCardInputDTO): Promise<void> {
    if (!this.playCardUseCase) {
      throw new Error('PlayCardUseCase not available')
    }

    try {
      // 執行出牌
      const result = await this.playCardUseCase.execute(gameId, input)

      // 通知 UI 出牌結果
      if (this.presenter) {
        this.presenter.presentPlayCardResult(result)
      }

      if (result.success) {
        // 獲取更新後的遊戲狀態
        const updatedGameState = await this.gameRepository.getGameState(gameId)
        if (!updatedGameState) {
          throw new Error('Game state not found after playing card')
        }

        // 更新 UI 遊戲狀態
        if (this.presenter) {
          const gameStateDTO = this.mapGameStateToDTO(gameId, updatedGameState)
          this.presenter.presentGameState(gameStateDTO)
        }

        // 處理出牌後的遊戲流程
        await this.handlePostPlayCardFlow(gameId, result)
      } else if (result.error && this.presenter) {
        this.presenter.presentError(result.error)
      }
    } catch (error) {
      if (this.presenter) {
        this.presenter.presentError(`Error playing card: ${error}`)
      }
      throw error
    }
  }

  private async handlePostPlayCardFlow(gameId: string, playResult: PlayCardOutputDTO): Promise<void> {
    // 處理役種結果
    if (playResult.yakuResults.length > 0 && this.presenter) {
      this.presenter.presentYakuDisplay(playResult.yakuResults)

      if (playResult.nextPhase === 'koikoi') {
        this.presenter.presentKoikoiDialog(true)
        this.presenter.presentGameMessage('You achieved Yaku! Declare Koi-Koi?')
      } else if (playResult.nextPhase === 'round_end') {
        this.presenter.presentGameMessage(
          'You achieved Yaku! Round ends automatically (no hand cards).'
        )
      }
    } else if (this.presenter) {
      this.presenter.presentGameMessage(
        `Played ${playResult.playedCard?.name}. Captured ${playResult.capturedCards.length} cards.`
      )
    }

    // 處理回合結束
    if (playResult.nextPhase === 'round_end') {
      await this.endRound(gameId)
      await this.handleRoundEndPresentation(gameId)
    }
  }

  private async handleRoundEndPresentation(gameId: string): Promise<void> {
    if (!this.presenter) return

    try {
      const gameState = await this.gameRepository.getGameState(gameId)
      if (!gameState) return

      const roundResult = gameState.roundResult
      if (roundResult) {
        if (roundResult.winner) {
          this.presenter.presentRoundEnd(roundResult.winner.name, roundResult.score)
        } else {
          this.presenter.presentGameMessage('Round ended in a draw! No points awarded.')
          if (roundResult.yakuResults.length > 0) {
            this.presenter.presentYakuDisplay(roundResult.yakuResults)
          }
        }
      }
    } catch (error) {
      this.presenter.presentError(`Error handling round end: ${error}`)
    }
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

  private mapGameStateToDTO(gameId: string, gameState: GameState): GameStateOutputDTO {
    const lastMove = gameState.lastMove ? {
      playerId: gameState.lastMove.playerId,
      cardPlayed: gameState.lastMove.capturedCards[0] || null, // 簡化處理
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
