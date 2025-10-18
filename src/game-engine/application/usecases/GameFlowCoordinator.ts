import type { IEventPublisher } from '../ports/IEventPublisher'
import type { IGameStateRepository } from '../ports/IGameStateRepository'
import { Player } from '../../domain/entities/Player'
import type { GameState, RoundResult } from '../../domain/entities/GameState'
import type { YakuResult } from '../../domain/entities/Yaku'
import type { StartGameInputDTO, PlayCardInputDTO } from '../dto/GameInputDTO'
import type { KoikoiDeclaredEvent } from '@/shared/events/game/KoikoiDeclaredEvent'
import type { GameEndedEvent } from '@/shared/events/game/GameEndedEvent'
import type { TurnTransition } from '@/shared/events/base/TurnTransition'
import { GAME_SETTINGS } from '@/shared/constants/gameConstants'
import { CalculateScoreUseCase } from './CalculateScoreUseCase'
import { PlayCardUseCase, type PlayCardResult } from './PlayCardUseCase'
import { SetUpGameUseCase } from './SetUpGameUseCase'
import { SetUpRoundUseCase } from './SetUpRoundUseCase'
import type { AbandonGameUseCase } from './AbandonGameUseCase'
import { v4 as uuidv4 } from 'uuid'

/**
 * Game Flow Coordinator (Game Engine BC)
 *
 * 重構後的遊戲流程協調器,完全屬於 game-engine BC。
 * 發布整合事件來通知其他 BC (如 game-ui):
 * - KoikoiDeclaredEvent 當玩家做出來來決策時
 * - GameEndedEvent 當遊戲結束時
 *
 * 職責:
 * - 協調不同的 Use Cases
 * - 處理遊戲流程邏輯 (來來決策、回合轉換)
 * - 發布整合事件以通知狀態變更
 * - ⚠️ 不再依賴 Presenter - 所有 UI 更新透過整合事件完成
 */
export class GameFlowCoordinator {
  private gameStartTime: number = 0

  constructor(
    private gameRepository: IGameStateRepository,
    private eventPublisher: IEventPublisher,
    private calculateScoreUseCase: CalculateScoreUseCase,
    private setUpGameUseCase: SetUpGameUseCase,
    private setUpRoundUseCase: SetUpRoundUseCase,
    private playCardUseCase?: PlayCardUseCase,
    private abandonGameUseCase?: AbandonGameUseCase,
  ) {}

  async startNewGame(input: StartGameInputDTO): Promise<string> {
    try {
      this.gameStartTime = Date.now()

      // 1. Delegate game initialization to SetUpGameUseCase
      // (SetUpGameUseCase will publish GameInitializedEvent for UI updates)
      const gameResult = await this.setUpGameUseCase.execute(input)

      if (!gameResult.success) {
        throw new Error(gameResult.error || 'Failed to create game')
      }

      // 2. Delegate round setup to SetUpRoundUseCase
      // (SetUpRoundUseCase will publish GameInitializedEvent with dealt cards)
      const roundResult = await this.setUpRoundUseCase.execute(gameResult.gameId)

      if (!roundResult.success) {
        throw new Error(roundResult.error || 'Failed to set up round')
      }

      // Note: UI updates are handled by game-ui BC listening to GameInitializedEvent
      return gameResult.gameId
    } catch (error) {
      // Note: Error presentation is handled by game-ui BC
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

    // Get current yaku and score for event
    const currentYakuResults = await this.calculateScoreUseCase.execute(player.captured)
    const currentYaku = currentYakuResults.yakuResults.map(yaku => yaku.yaku.name)
    const currentScore = currentYakuResults.totalScore

    let turnTransition: TurnTransition | null

    if (declareKoikoi) {
      if (player.handCount === 0) {
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

    await this.gameRepository.saveGameState(gameId, gameState)
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

      // Note: UI updates are handled by game-ui BC listening to KoikoiDeclaredEvent and RoundEndedEvent
    } catch (error) {
      // Note: Error presentation is handled by game-ui BC
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

    // Use the refactored CalculateScoreUseCase with event publishing
    const result = await this.calculateScoreUseCase.calculateRoundWinner(
      gameId,
      gameState.round,
      players[0].captured,
      players[1].captured,
      players[0].id,
      players[1].id,
      players[0].score,
      players[1].score,
      gameState.koikoiPlayer || undefined,
      1, // koikoiCount - simplified for now
      'yaku_achieved'
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
      // Draw: no player scores, but record both yakus
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
    gameState.setPhase('round_end')

    await this.gameRepository.saveGameState(gameId, gameState)
    return gameState
  }

  async startNextRound(gameId: string): Promise<GameState> {
    const gameState = await this.gameRepository.getGameState(gameId)
    if (!gameState) {
      throw new Error('Game not found')
    }

    if (gameState.round >= GAME_SETTINGS.MAX_ROUNDS) {
      gameState.setPhase('game_end')

      // Publish GameEndedEvent
      await this.publishGameEndedEvent(gameId, gameState)

      // Note: UI updates are handled by game-ui BC listening to GameEndedEvent
    } else {
      // Clear field cards
      gameState.setField([])

      // Move to next round (automatically resets player state and game state)
      gameState.nextRound()

      // Save state changes first, then delegate to SetUpRoundUseCase for dealing
      await this.gameRepository.saveGameState(gameId, gameState)
      const roundResult = await this.setUpRoundUseCase.execute(gameId)

      if (!roundResult.success) {
        throw new Error(roundResult.error || 'Failed to set up new round')
      }

      const updatedGameState = await this.gameRepository.getGameState(gameId)
      if (!updatedGameState) {
        throw new Error('Game state not found after round setup')
      }

      // Note: UI updates for new round are handled by game-ui BC listening to RoundStartedEvent
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

      // Note: UI updates are handled by game-ui BC listening to CardPlayedEvent

      if (result.success) {
        // Get updated game state
        const updatedGameState = await this.gameRepository.getGameState(gameId)
        if (!updatedGameState) {
          throw new Error('Game state not found after playing card')
        }

        // Note: Game state updates are handled by game-ui BC listening to CardPlayedEvent

        // Handle post-play card flow
        await this.handlePostPlayCardFlow(gameId, result)
      }
      // Note: Error presentation is handled by game-ui BC
    } catch (error) {
      // Note: Error presentation is handled by game-ui BC
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
      if (gameState) {
        // Find winner (opponent of abandoning player)
        const players = gameState.players
        const winner = players.find((p: Player) => p.id === result.winnerId)

        // Set roundResult for game state integrity
        const roundResult: RoundResult = {
          winner: winner || null,
          score: winner ? winner.score : 0,
          yakuResults: [],
          koikoiDeclared: false,
        }
        gameState.setRoundResult(roundResult)
        gameState.setPhase('game_end')

        // Save updated game state
        await this.gameRepository.saveGameState(gameId, gameState)

        // Note: UI updates are handled by game-ui BC listening to GameAbandonedEvent

        // Clean up game state from repository after state updates
        await this.gameRepository.deleteGame(gameId)
      }
    } catch (error) {
      // Note: Error presentation is handled by game-ui BC
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
  private async publishGameEndedEvent(gameId: string, gameState: GameState): Promise<void> {
    const gameEndTime = Date.now()
    const gameDuration = gameEndTime - this.gameStartTime

    // Determine winner
    const players = gameState.players
    const maxScore = Math.max(...players.map((p: Player) => p.score))
    const winners = players.filter((p: Player) => p.score === maxScore)
    const winnerId = winners.length === 1 ? winners[0].id : null

    // Calculate rounds won (simplified)
    const finalScores = players.map((player: Player) => ({
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
    playResult: PlayCardResult,
  ): Promise<void> {
    // Note: Yaku display and messages are handled by game-ui BC listening to CardPlayedEvent

    // Handle round end
    if (playResult.nextPhase === 'round_end') {
      await this.endRound(gameId)
      // Note: Round end presentation is handled by game-ui BC listening to RoundEndedEvent
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

}
