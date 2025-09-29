import type { Card } from '../../domain/entities/Card'
import { Player } from '../../domain/entities/Player'
import type { GameState, RoundResult } from '../../domain/entities/GameState'
import type { GameRepository } from '../ports/repositories/GameRepository'
import type { GamePresenter } from '../ports/presenters/GamePresenter'
import type { YakuResult } from '../../domain/entities/Yaku'
import type { StartGameInputDTO, GameStateOutputDTO, PlayCardInputDTO, PlayCardOutputDTO } from '../dto/GameDTO'
import { GAME_SETTINGS } from '@/shared/constants/gameConstants'
import { CalculateScoreUseCase } from './CalculateScoreUseCase'
import { PlayCardUseCase } from './PlayCardUseCase'
import { SetUpGameUseCase } from './SetUpGameUseCase'
import { SetUpRoundUseCase } from './SetUpRoundUseCase'

export class GameFlowCoordinator {
  constructor(
    private gameRepository: GameRepository,
    private calculateScoreUseCase: CalculateScoreUseCase,
    private setUpGameUseCase: SetUpGameUseCase,
    private setUpRoundUseCase: SetUpRoundUseCase,
    private presenter?: GamePresenter,
    private playCardUseCase?: PlayCardUseCase,
  ) {}

  async startNewGame(input: StartGameInputDTO): Promise<string> {
    try {
      // 1. UI 準備和清理
      if (this.presenter) {
        this.presenter.clearYakuDisplay()
        this.presenter.presentKoikoiDialog(false)
        this.presenter.presentCardSelection(null, null)
        this.presenter.presentGameMessage('game.messages.startingGame')
      }

      // 2. 委派遊戲初始化給 SetUpGameUseCase
      const gameResult = await this.setUpGameUseCase.execute(input)

      if (!gameResult.success) {
        throw new Error(gameResult.error || 'Failed to create game')
      }

      // 3. 委派回合設置給 SetUpRoundUseCase
      const roundResult = await this.setUpRoundUseCase.execute(gameResult.gameId)

      if (!roundResult.success) {
        throw new Error(roundResult.error || 'Failed to set up round')
      }

      // 4. 基於業務結果進行 UI 協調
      if (this.presenter && roundResult.gameState) {
        this.presenter.presentStartGameResult({
          gameId: gameResult.gameId,
          success: true,
        })

        this.presenter.presentGameState(roundResult.gameState)
        this.presenter.presentGameMessage(
          'game.messages.gameStarted',
          { playerName: roundResult.gameState.currentPlayer?.name || '' }
        )
      }

      return gameResult.gameId
    } catch (error) {
      if (this.presenter) {
        this.presenter.presentStartGameResult({
          gameId: '',
          success: false,
          error: String(error),
        })
        this.presenter.presentError('errors.startGameFailed', { error: String(error) })
      }

      throw error
    }
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
            this.presenter.presentGameMessage('game.messages.koikoiDeclared')
          } else {
            this.presenter.presentGameMessage('game.messages.roundEnded')
            await this.handleRoundEndPresentation(gameId)
          }
        }
      }
    } catch (error) {
      if (this.presenter) {
        this.presenter.presentError('errors.koikoiDecisionFailed', { error: String(error) })
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

      // 先保存狀態變更，然後委派給 SetUpRoundUseCase 處理發牌
      await this.gameRepository.saveGame(gameId, gameState)
      const roundResult = await this.setUpRoundUseCase.execute(gameId)

      if (!roundResult.success) {
        throw new Error(roundResult.error || 'Failed to set up new round')
      }

      const updatedGameState = await this.gameRepository.getGameState(gameId)
      if (!updatedGameState) {
        throw new Error('Game state not found after round setup')
      }

      // 通知 UI 新回合開始
      if (this.presenter) {
        const gameStateDTO = this.mapGameStateToDTO(gameId, updatedGameState)
        this.presenter.presentGameState(gameStateDTO)
        this.presenter.presentGameMessage(
          'game.messages.nextRoundStarted',
          { round: updatedGameState.round, playerName: updatedGameState.currentPlayer?.name || '' }
        )
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


  async handleCardSelection(card: Card, isHandCard: boolean): Promise<void> {
    if (this.presenter) {
      // Pass the card name key for translation in presenter
      const cardNameKey = `cards.names.${card.name}`
      if (isHandCard) {
        this.presenter.presentGameMessage('game.messages.selectedCard', { cardName: cardNameKey })
      } else {
        this.presenter.presentGameMessage('game.messages.selectedFieldCard', { cardName: cardNameKey })
      }
    }
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
        this.presenter.presentError('errors.playCardFailed', { error: String(error) })
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
        this.presenter.presentGameMessage('game.messages.koikoiAchieved')
      } else if (playResult.nextPhase === 'round_end') {
        this.presenter.presentGameMessage('game.messages.roundAutoEnd')
      }
    } else if (this.presenter) {
      this.presenter.presentGameMessage(
        'game.messages.cardPlayed',
        {
          cardName: playResult.playedCard?.name ? `cards.names.${playResult.playedCard.name}` : '',
          capturedCount: playResult.capturedCards.length
        }
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
          this.presenter.presentGameMessage('game.messages.roundDrawNoPoints')
          if (roundResult.yakuResults.length > 0) {
            this.presenter.presentYakuDisplay(roundResult.yakuResults)
          }
        }
      }
    } catch (error) {
      this.presenter.presentError('errors.roundEndFailed', { error: String(error) })
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
