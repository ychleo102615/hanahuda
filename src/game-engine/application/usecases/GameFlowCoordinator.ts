import type { Card } from '../../domain/entities/Card'
import { Player } from '../../domain/entities/Player'
import type { GameState, RoundResult } from '../../domain/entities/GameState'
import type { GameState as AppGameState, RoundResult as AppRoundResult } from '@/game-engine/domain/entities/GameState'
import type { Player as AppPlayer } from '@/game-engine/domain/entities/Player'
import type { IEventPublisher } from '../ports/IEventPublisher'
import type { GameRepository } from '@/application/ports/repositories/GameRepository'
import type { GamePresenter } from '@/application/ports/presenters/GamePresenter'
import type { YakuResult } from '../../domain/entities/Yaku'
import type {
  StartGameInputDTO,
  GameStateOutputDTO,
  PlayCardInputDTO,
  PlayCardOutputDTO,
} from '@/application/dto/GameDTO'
import type { KoikoiDeclaredEvent } from '@/shared/events/game/KoikoiDeclaredEvent'
import type { GameEndedEvent } from '@/shared/events/game/GameEndedEvent'
import type { TurnTransition } from '@/shared/events/base/TurnTransition'
import { GAME_SETTINGS } from '@/shared/constants/gameConstants'
import { CalculateScoreUseCase } from './CalculateScoreUseCase'
import { PlayCardUseCase } from './PlayCardUseCase'
import { SetUpGameUseCase } from './SetUpGameUseCase'
import { SetUpRoundUseCase } from './SetUpRoundUseCase'
import type { AbandonGameUseCase } from './AbandonGameUseCase'
import { v4 as uuidv4 } from 'uuid'

/**
 * Game Flow Coordinator (Game Engine BC)
 *
 * Refactored from the original application layer to game-engine BC.
 * Now publishes events for major game flow transitions:
 * - KoikoiDeclaredEvent when players make Koi-Koi decisions
 * - GameEndedEvent when games complete
 *
 * Responsibilities:
 * - Coordinate between different use cases
 * - Handle game flow logic (Koi-Koi decisions, round transitions)
 * - Publish integration events for game state changes
 * - Present UI updates through presenter
 */
export class GameFlowCoordinator {
  private gameStartTime: number = 0

  constructor(
    private gameRepository: GameRepository,
    private eventPublisher: IEventPublisher,
    private calculateScoreUseCase: CalculateScoreUseCase,
    private setUpGameUseCase: SetUpGameUseCase,
    private setUpRoundUseCase: SetUpRoundUseCase,
    private presenter?: GamePresenter,
    private playCardUseCase?: PlayCardUseCase,
    private abandonGameUseCase?: AbandonGameUseCase,
  ) {}

  async startNewGame(input: StartGameInputDTO): Promise<string> {
    try {
      this.gameStartTime = Date.now()

      // 1. UI preparation and cleanup
      if (this.presenter) {
        this.presenter.clearYakuDisplay()
        this.presenter.presentKoikoiDialog(false)
        this.presenter.presentCardSelection(null, null)
        this.presenter.presentGameMessage('game.messages.startingGame')
      }

      // 2. Delegate game initialization to SetUpGameUseCase
      const gameResult = await this.setUpGameUseCase.execute(input)

      if (!gameResult.success) {
        throw new Error(gameResult.error || 'Failed to create game')
      }

      // 3. Delegate round setup to SetUpRoundUseCase
      const roundResult = await this.setUpRoundUseCase.execute(gameResult.gameId)

      if (!roundResult.success) {
        throw new Error(roundResult.error || 'Failed to set up round')
      }

      // 4. UI coordination based on business results
      if (this.presenter && roundResult.gameState) {
        this.presenter.presentStartGameResult({
          gameId: gameResult.gameId,
          success: true,
        })

        this.presenter.presentGameState(roundResult.gameState)
        this.presenter.presentGameMessage('game.messages.gameStarted', {
          playerName: roundResult.gameState.currentPlayer?.name || '',
        })
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
  ): Promise<any> {
    const gameState = await this.gameRepository.getGameState(gameId)
    if (!gameState) {
      throw new Error('Game not found')
    }

    const player = (gameState as any).players.find((p: any) => p.id === playerId)
    if (!player) {
      throw new Error('Player not found')
    }

    // Get current yaku and score for event
    const currentYakuResults = await this.calculateScoreUseCase.execute((player as any).captured)
    const currentYaku = currentYakuResults.yakuResults.map(yaku => yaku.yaku.name)
    const currentScore = currentYakuResults.totalScore

    let turnTransition: TurnTransition | null

    if (declareKoikoi) {
      if ((player as any).handCount === 0) {
        throw new Error('Cannot declare Koi-Koi without hand cards')
      }
      gameState.setKoikoiPlayer(playerId)
      gameState.setPhase('playing')
      gameState.nextPlayer()

      const nextPlayer = gameState.currentPlayer
      turnTransition = {
        previousPlayerId: playerId,
        currentPlayerId: nextPlayer?.id || playerId,
        reason: 'koikoi_declared'
      }
    } else {
      // Not declaring Koi-Koi, prepare to end round (no turn transition)
      gameState.setPhase('round_end')
      turnTransition = null
    }

    // Publish KoikoiDeclaredEvent
    await this.publishKoikoiDeclaredEvent(
      playerId,
      declareKoikoi,
      currentYaku,
      currentScore,
      turnTransition
    )

    await this.gameRepository.saveGame(gameId, gameState)
    return gameState
  }

  async handleKoikoiDecision(
    gameId: string,
    playerId: string,
    declareKoikoi: boolean,
  ): Promise<void> {
    try {
      if (declareKoikoi) {
        await this.handleKoikoiDeclaration(gameId, playerId, true)
      } else {
        await this.endRound(gameId)
      }

      // Notify UI update
      if (this.presenter) {
        const gameState = await this.gameRepository.getGameState(gameId)
        if (gameState) {
          // Clean UI state
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

  async endRound(gameId: string): Promise<any> {
    const gameState = await this.gameRepository.getGameState(gameId)
    if (!gameState) {
      throw new Error('Game not found')
    }

    const players = (gameState as any).players
    if (players.length !== 2) {
      throw new Error('Invalid number of players')
    }

    // Use the refactored CalculateScoreUseCase with event publishing
    const result = await this.calculateScoreUseCase.calculateRoundWinner(
      gameId,
      (gameState as any).round,
      players[0].captured,
      players[1].captured,
      players[0].id,
      players[1].id,
      players[0].score,
      players[1].score,
      (gameState as any).koikoiPlayer || undefined,
      1, // koikoiCount - simplified for now
      'yaku_achieved'
    )

    let winner: any = null
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
      // Draw: no player scores, but record both yakus
      winnerYakuResults = [...result.player1Yaku, ...result.player2Yaku]
      winnerScore = 0
    }

    const roundResult: any = {
      winner,
      yakuResults: winnerYakuResults,
      score: winnerScore,
      koikoiDeclared: (gameState as any).koikoiPlayer !== null,
    }

    ;(gameState as any).setRoundResult(roundResult)
    ;(gameState as any).setPhase('round_end')

    await this.gameRepository.saveGame(gameId, gameState)
    return gameState
  }

  async startNextRound(gameId: string): Promise<any> {
    const gameState = await this.gameRepository.getGameState(gameId)
    if (!gameState) {
      throw new Error('Game not found')
    }

    if (gameState.round >= GAME_SETTINGS.MAX_ROUNDS) {
      gameState.setPhase('game_end')

      // Publish GameEndedEvent
      await this.publishGameEndedEvent(gameId, gameState)

      // Notify UI game end
      if (this.presenter) {
        const winner = await this.getGameWinner(gameId)
        const finalScore = winner ? (winner as any).score : 0
        this.presenter.presentGameEnd(winner?.name || null, finalScore)
      }
    } else {
      // Clear field cards
      gameState.setField([])

      // Move to next round (automatically resets player state and game state)
      gameState.nextRound()

      // Save state changes first, then delegate to SetUpRoundUseCase for dealing
      await this.gameRepository.saveGame(gameId, gameState)
      const roundResult = await this.setUpRoundUseCase.execute(gameId)

      if (!roundResult.success) {
        throw new Error(roundResult.error || 'Failed to set up new round')
      }

      const updatedGameState = await this.gameRepository.getGameState(gameId)
      if (!updatedGameState) {
        throw new Error('Game state not found after round setup')
      }

      // Notify UI new round started
      if (this.presenter) {
        const gameStateDTO = this.mapGameStateToDTO(gameId, updatedGameState)
        this.presenter.presentGameState(gameStateDTO)
        this.presenter.presentGameMessage('game.messages.nextRoundStarted', {
          round: updatedGameState.round,
          playerName: updatedGameState.currentPlayer?.name || '',
        })
        this.presenter.clearYakuDisplay()
        this.presenter.presentKoikoiDialog(false)
      }
    }

    // Get final game state
    const finalGameState = await this.gameRepository.getGameState(gameId)
    if (!finalGameState) {
      throw new Error('Game state not found after update')
    }

    return finalGameState
  }

  async handlePlayCard(gameId: string, input: PlayCardInputDTO): Promise<void> {
    if (!this.playCardUseCase) {
      throw new Error('PlayCardUseCase not available')
    }

    try {
      // Execute card play
      const result = await this.playCardUseCase.execute(gameId, input)

      // Notify UI of play result
      if (this.presenter) {
        this.presenter.presentPlayCardResult(result)
      }

      if (result.success) {
        // Get updated game state
        const updatedGameState = await this.gameRepository.getGameState(gameId)
        if (!updatedGameState) {
          throw new Error('Game state not found after playing card')
        }

        // Update UI game state
        if (this.presenter) {
          const gameStateDTO = this.mapGameStateToDTO(gameId, updatedGameState)
          this.presenter.presentGameState(gameStateDTO)
        }

        // Handle post-play card flow
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

  /**
   * Handle abandon game
   */
  async handleAbandonGame(gameId: string, playerId: string): Promise<void> {
    if (!this.abandonGameUseCase) {
      throw new Error('AbandonGameUseCase not available')
    }

    try {
      const result = await this.abandonGameUseCase.execute({
        gameId,
        abandoningPlayerId: playerId,
        reason: 'user_quit',
      })

      if (!result.success) {
        throw new Error(result.error || 'Failed to abandon game')
      }

      // Get game state to find winner and update roundResult
      const gameState = await this.gameRepository.getGameState(gameId)
      if (gameState && this.presenter) {
        // Find winner (opponent of abandoning player)
        const players = (gameState as any).players
        const winner = players.find((p: any) => p.id === result.winnerId)
        const abandoningPlayer = players.find((p: any) => p.id === playerId)

        // Set roundResult so GameView can display winner info
        const roundResult: any = {
          winner: winner || null,
          score: winner ? (winner as any).score : 0,
          yakuResults: [],
          koikoiDeclared: false,
        }
        ;(gameState as any).setRoundResult(roundResult)
        ;(gameState as any).setPhase('game_end')

        // Save updated game state
        await this.gameRepository.saveGame(gameId, gameState)

        // Update UI with correct game state
        const gameStateDTO = this.mapGameStateToDTO(gameId, gameState)
        this.presenter.presentGameState(gameStateDTO)

        // Show abandonment message with winner
        this.presenter.presentGameMessage('game.messages.gameAbandonedByPlayer', {
          abandoningPlayer: abandoningPlayer?.name || 'Unknown',
          winner: winner?.name || 'Unknown',
        })

        // Present game end with winner
        this.presenter.presentGameEnd(winner?.name || null, winner ? (winner as any).score : 0)

        // Clean up game state from repository after UI updates
        await this.gameRepository.deleteGame(gameId)
      }
    } catch (error) {
      if (this.presenter) {
        this.presenter.presentError('errors.abandonGameFailed', { error: String(error) })
      }
      throw error
    }
  }

  /**
   * Publish KoikoiDeclaredEvent to game-ui BC
   */
  private async publishKoikoiDeclaredEvent(
    playerId: string,
    continueGame: boolean,
    currentYaku: string[],
    currentScore: number,
    turnTransition: TurnTransition | null
  ): Promise<void> {
    const event: KoikoiDeclaredEvent = {
      eventId: uuidv4(),
      eventType: 'KoikoiDeclared',
      timestamp: Date.now(),
      sequenceNumber: this.eventPublisher.getNextSequenceNumber(),
      playerId,
      continueGame,
      currentYaku,
      currentScore,
      turnTransition
    }

    await this.eventPublisher.publishEvent(event)
  }

  /**
   * Publish GameEndedEvent to game-ui BC
   */
  private async publishGameEndedEvent(gameId: string, gameState: any): Promise<void> {
    const gameEndTime = Date.now()
    const gameDuration = gameEndTime - this.gameStartTime

    // Determine winner
    const players = gameState.players
    const maxScore = Math.max(...players.map((p: any) => p.score))
    const winners = players.filter((p: any) => p.score === maxScore)
    const winnerId = winners.length === 1 ? winners[0].id : null

    // Calculate rounds won (simplified)
    const finalScores = players.map((player: any) => ({
      playerId: player.id,
      playerName: player.name,
      totalScore: player.score,
      roundsWon: Math.floor(player.score / 10) // Simplified calculation
    }))

    const event: GameEndedEvent = {
      eventId: uuidv4(),
      eventType: 'GameEnded',
      timestamp: Date.now(),
      sequenceNumber: this.eventPublisher.getNextSequenceNumber(),
      gameId,
      winnerId,
      finalScores,
      totalRounds: gameState.round,
      gameDuration,
      endReason: gameState.round >= GAME_SETTINGS.MAX_ROUNDS ? 'max_rounds_reached' : 'target_score_reached',
      gameStartTime: this.gameStartTime,
      gameEndTime
    }

    await this.eventPublisher.publishEvent(event)
  }

  private async handlePostPlayCardFlow(
    gameId: string,
    playResult: PlayCardOutputDTO,
  ): Promise<void> {
    // Handle yaku results
    if (playResult.yakuResults.length > 0 && this.presenter) {
      this.presenter.presentYakuDisplay(playResult.yakuResults)

      if (playResult.nextPhase === 'koikoi') {
        this.presenter.presentKoikoiDialog(true)
        this.presenter.presentGameMessage('game.messages.koikoiAchieved')
      } else if (playResult.nextPhase === 'round_end') {
        this.presenter.presentGameMessage('game.messages.roundAutoEnd')
      }
    } else if (this.presenter) {
      this.presenter.presentGameMessage('game.messages.cardPlayed', {
        cardName: playResult.playedCard?.name ? `cards.names.${playResult.playedCard.name}` : '',
        capturedCount: playResult.capturedCards.length,
      })
    }

    // Handle round end
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

  async getGameWinner(gameId: string): Promise<any> {
    const gameState = await this.gameRepository.getGameState(gameId)
    if (!gameState || !(gameState as any).isGameOver) {
      return null
    }

    const players = (gameState as any).players
    const maxScore = Math.max(...players.map((p: any) => p.score))
    const winners = players.filter((p: any) => p.score === maxScore)

    return winners.length === 1 ? winners[0] : null
  }

  private mapGameStateToDTO(gameId: string, gameState: any): GameStateOutputDTO {
    const lastMove = gameState.lastMove
      ? {
          playerId: gameState.lastMove.playerId,
          cardPlayed: gameState.lastMove.capturedCards[0] || null,
          cardsMatched: gameState.lastMove.matchedCards,
        }
      : undefined

    const roundResult = gameState.roundResult
      ? {
          winner: gameState.roundResult.winner,
          score: gameState.roundResult.score,
          yakuResults: gameState.roundResult.yakuResults,
          koikoiDeclared: gameState.roundResult.koikoiDeclared,
        }
      : undefined

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
