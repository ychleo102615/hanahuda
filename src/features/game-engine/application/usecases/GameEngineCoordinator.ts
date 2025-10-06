import { nanoid } from 'nanoid'
import type { GameRepository } from '@/features/game-engine/application/ports/repositories/GameRepository'
import type { SetUpGameUseCase } from '@/features/game-engine/application/usecases/SetUpGameUseCase'
import type { SetUpRoundUseCase } from '@/features/game-engine/application/usecases/SetUpRoundUseCase'
import type { PlayCardUseCase } from '@/features/game-engine/application/usecases/PlayCardUseCase'
import type { CalculateScoreUseCase } from '@/features/game-engine/application/usecases/CalculateScoreUseCase'
import type { IntegrationEventPublisher } from '@/shared/events/integration-event-publisher'
import type { IPlayer } from '@/features/game-engine/application/ports/repositories/PlayerInterface'
import {
  IntegrationEventType,
  type GameCreatedEventData,
  type RoundStartedEventData,
  type CardPlayedEventData,
  type YakuAchievedEventData,
  type PlayerTurnChangedEventData,
  type KoikoiDecisionMadeEventData,
  type RoundEndedEventData,
  type GameEndedEventData,
  type CardDTO,
  type PlayerStateDTO,
} from '@/shared/events/integration-events'
import type {
  StartGameInputDTO,
  SetUpGameResult,
  PlayCardInputDTO,
  PlayCardOutputDTO,
  KoikoiDecisionInputDTO,
} from '@/features/game-engine/application/dto/GameDTO'
import type { Card } from '@/features/game-engine/domain/entities/Card'
import type { Player } from '@/features/game-engine/domain/entities/Player'
import type { GameState } from '@/features/game-engine/domain/entities/GameState'
import { GAME_SETTINGS } from '@/shared/constants/gameConstants'

export class GameEngineCoordinator {
  constructor(
    private gameRepository: GameRepository,
    private setUpGameUseCase: SetUpGameUseCase,
    private setUpRoundUseCase: SetUpRoundUseCase,
    private playCardUseCase: PlayCardUseCase,
    private calculateScoreUseCase: CalculateScoreUseCase,
    private eventPublisher: IntegrationEventPublisher,
  ) {}

  async startNewGame(input: StartGameInputDTO): Promise<SetUpGameResult> {
    // 1. 創建遊戲
    const gameResult = await this.setUpGameUseCase.execute(input)
    if (!gameResult.success) {
      throw new Error(gameResult.error || 'Failed to create game')
    }

    // 2. 發布 GameCreatedEvent
    const gameCreatedEvent: GameCreatedEventData = {
      eventId: nanoid(),
      eventType: IntegrationEventType.GameCreated,
      occurredAt: new Date().toISOString(),
      aggregateId: gameResult.gameId,
      version: 1,
      payload: {
        gameId: gameResult.gameId,
        players: [
          {
            id: 'player1',
            name: input.player1Name,
            isHuman: true,
          },
          {
            id: 'player2',
            name: input.player2Name,
            isHuman: false,
          },
        ],
      },
    }
    await this.eventPublisher.publish(gameCreatedEvent)

    // 3. 設置第一回合
    const roundResult = await this.setUpRoundUseCase.execute(gameResult.gameId)
    if (!roundResult.success || !roundResult.gameState) {
      throw new Error(roundResult.error || 'Failed to set up round')
    }

    // 4. 發布 RoundStartedEvent
    const gameState = roundResult.gameState
    const roundStartedEvent: RoundStartedEventData = {
      eventId: nanoid(),
      eventType: IntegrationEventType.RoundStarted,
      occurredAt: new Date().toISOString(),
      aggregateId: gameResult.gameId,
      version: 1,
      payload: {
        gameId: gameResult.gameId,
        round: gameState.round,
        currentPlayerId: gameState.currentPlayer?.id || '',
        currentPlayerName: gameState.currentPlayer?.name || '',
        players: gameState.players.map((p) => this.mapPlayerToDTO(p)),
        fieldCards: gameState.fieldCards.map((c) => this.mapCardToDTO(c)),
        deckCount: gameState.deckCount,
      },
    }
    await this.eventPublisher.publish(roundStartedEvent)

    return {
      success: true,
      gameId: gameResult.gameId,
      gameState: roundResult.gameState,
    }
  }

  async playCard(gameId: string, input: PlayCardInputDTO): Promise<PlayCardOutputDTO> {
    // 1. 執行出牌邏輯
    const result = await this.playCardUseCase.execute(gameId, input)

    if (!result.success) {
      // 如果出牌失敗，直接返回錯誤結果
      return result
    }

    // 2. 獲取更新後的遊戲狀態
    const gameState = await this.gameRepository.getGameState(gameId)
    if (!gameState) {
      throw new Error('Game state not found after playing card')
    }

    const currentPlayer = gameState.currentPlayer
    if (!currentPlayer) {
      throw new Error('Current player not found')
    }

    // 3. 發布 CardPlayedEvent
    const cardPlayedEvent: CardPlayedEventData = {
      eventId: nanoid(),
      eventType: IntegrationEventType.CardPlayed,
      occurredAt: new Date().toISOString(),
      aggregateId: gameId,
      version: 1,
      payload: {
        gameId,
        playerId: input.playerId,
        playerName: gameState.getPlayerById(input.playerId)?.name || '',
        playedCard: result.playedCard ? this.mapCardToDTO(result.playedCard) : ({} as CardDTO),
        selectedFieldCardId: input.selectedFieldCard,
        capturedCards: result.capturedCards.map((c) => this.mapCardToDTO(c)),
        deckCard: undefined, // 可以從 gameState.lastMove 獲取
        deckCardCaptured: result.capturedCards.length > 2, // 簡化判斷
        remainingDeckCount: gameState.deckCount,
      },
    }
    await this.eventPublisher.publish(cardPlayedEvent)

    // 4. 如果有役種，發布 YakuAchievedEvent
    if (result.yakuResults.length > 0) {
      const totalScore = result.yakuResults.reduce((sum, yaku) => sum + yaku.points, 0)

      const yakuAchievedEvent: YakuAchievedEventData = {
        eventId: nanoid(),
        eventType: IntegrationEventType.YakuAchieved,
        occurredAt: new Date().toISOString(),
        aggregateId: gameId,
        version: 1,
        payload: {
          gameId,
          playerId: input.playerId,
          playerName: gameState.getPlayerById(input.playerId)?.name || '',
          yakuResults: result.yakuResults.map((yaku) => ({
            name: yaku.yaku.name,
            score: yaku.points,
            cardIds: yaku.cards.map((c) => c.id),
          })),
          totalScore,
          canDeclareKoikoi: result.nextPhase === 'koikoi',
        },
      }
      await this.eventPublisher.publish(yakuAchievedEvent)
    }

    // 5. 如果切換玩家（沒有役種的情況），發布 PlayerTurnChangedEvent
    if (result.nextPhase === 'playing' && result.yakuResults.length === 0) {
      const newCurrentPlayer = gameState.currentPlayer
      if (newCurrentPlayer) {
        const playerTurnChangedEvent: PlayerTurnChangedEventData = {
          eventId: nanoid(),
          eventType: IntegrationEventType.PlayerTurnChanged,
          occurredAt: new Date().toISOString(),
          aggregateId: gameId,
          version: 1,
          payload: {
            gameId,
            currentPlayerId: newCurrentPlayer.id,
            currentPlayerName: newCurrentPlayer.name,
          },
        }
        await this.eventPublisher.publish(playerTurnChangedEvent)
      }
    }

    return result
  }

  async makeKoikoiDecision(
    gameId: string,
    input: KoikoiDecisionInputDTO,
  ): Promise<GameState> {
    // 1. 獲取遊戲狀態
    const gameState = await this.gameRepository.getGameState(gameId)
    if (!gameState) {
      throw new Error('Game not found')
    }

    const player = gameState.players.find((p) => p.id === input.playerId)
    if (!player) {
      throw new Error('Player not found')
    }

    // 2. 處理 Koikoi 決策邏輯
    if (input.declareKoikoi) {
      // 選擇繼續遊戲（宣告 Koikoi）
      if (player.handCount === 0) {
        throw new Error('Cannot declare Koi-Koi without hand cards')
      }
      gameState.setKoikoiPlayer(input.playerId)
      gameState.setPhase('playing')
      gameState.nextPlayer()
    } else {
      // 選擇不繼續（結束回合）
      gameState.setPhase('round_end')
    }

    await this.gameRepository.saveGame(gameId, gameState)

    // 3. 發布 KoikoiDecisionMadeEvent
    const koikoiDecisionEvent: KoikoiDecisionMadeEventData = {
      eventId: nanoid(),
      eventType: IntegrationEventType.KoikoiDecisionMade,
      occurredAt: new Date().toISOString(),
      aggregateId: gameId,
      version: 1,
      payload: {
        gameId,
        playerId: input.playerId,
        playerName: player.name,
        continueGame: input.declareKoikoi,
      },
    }
    await this.eventPublisher.publish(koikoiDecisionEvent)

    return gameState
  }

  async endRound(gameId: string): Promise<GameState> {
    // 1. 獲取遊戲狀態
    const gameState = await this.gameRepository.getGameState(gameId)
    if (!gameState) {
      throw new Error('Game not found')
    }

    const players = gameState.players
    if (players.length !== 2) {
      throw new Error('Invalid number of players')
    }

    // 2. 計算回合獲勝者
    const result = await this.calculateScoreUseCase.calculateRoundWinner(
      players[0].captured,
      players[1].captured,
      gameState.koikoiPlayer || undefined,
    )

    // 3. 處理獲勝者和分數
    let winner: Player | null = null
    let winnerYakuResults = []
    let winnerScore = 0

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
      // 平局情況
      winnerYakuResults = [...result.player1Yaku, ...result.player2Yaku]
      winnerScore = 0
    }

    // 4. 設置回合結果
    const roundResult = {
      winner,
      yakuResults: winnerYakuResults,
      score: winnerScore,
      koikoiDeclared: gameState.koikoiPlayer !== null,
    }

    gameState.setRoundResult(roundResult)
    gameState.setPhase('round_end')

    await this.gameRepository.saveGame(gameId, gameState)

    // 5. 發布 RoundEndedEvent
    const roundEndedEvent: RoundEndedEventData = {
      eventId: nanoid(),
      eventType: IntegrationEventType.RoundEnded,
      occurredAt: new Date().toISOString(),
      aggregateId: gameId,
      version: 1,
      payload: {
        gameId,
        round: gameState.round,
        winnerId: winner?.id || null,
        winnerName: winner?.name || null,
        score: winnerScore,
        yakuResults: winnerYakuResults.map((yaku) => ({
          name: yaku.yaku.name,
          score: yaku.points,
          cardIds: yaku.cards.map((c) => c.id),
        })),
        koikoiDeclared: gameState.koikoiPlayer !== null,
        players: players.map((p) => ({
          id: p.id,
          name: p.name,
          totalScore: p.score,
        })),
      },
    }
    await this.eventPublisher.publish(roundEndedEvent)

    return gameState
  }

  async startNextRound(gameId: string): Promise<GameState> {
    // 1. 獲取遊戲狀態
    const gameState = await this.gameRepository.getGameState(gameId)
    if (!gameState) {
      throw new Error('Game not found')
    }

    // 2. 檢查是否達到最大回合數
    if (gameState.round >= GAME_SETTINGS.MAX_ROUNDS) {
      gameState.setPhase('game_end')
      await this.gameRepository.saveGame(gameId, gameState)

      // 3a. 發布 GameEndedEvent
      const players = gameState.players
      const maxScore = Math.max(...players.map((p) => p.score))
      const winners = players.filter((p) => p.score === maxScore)
      const winner = winners.length === 1 ? winners[0] : null

      const gameEndedEvent: GameEndedEventData = {
        eventId: nanoid(),
        eventType: IntegrationEventType.GameEnded,
        occurredAt: new Date().toISOString(),
        aggregateId: gameId,
        version: 1,
        payload: {
          gameId,
          winnerId: winner?.id || null,
          winnerName: winner?.name || null,
          finalScores: players.map((p) => ({
            playerId: p.id,
            playerName: p.name,
            score: p.score,
          })),
          totalRounds: gameState.round,
        },
      }
      await this.eventPublisher.publish(gameEndedEvent)
    } else {
      // 3b. 準備下一回合
      gameState.setField([])
      gameState.nextRound()
      await this.gameRepository.saveGame(gameId, gameState)

      // 設置新回合
      const roundResult = await this.setUpRoundUseCase.execute(gameId)
      if (!roundResult.success || !roundResult.gameState) {
        throw new Error(roundResult.error || 'Failed to set up new round')
      }

      // 4. 發布 RoundStartedEvent
      const updatedGameState = roundResult.gameState
      const roundStartedEvent: RoundStartedEventData = {
        eventId: nanoid(),
        eventType: IntegrationEventType.RoundStarted,
        occurredAt: new Date().toISOString(),
        aggregateId: gameId,
        version: 1,
        payload: {
          gameId,
          round: updatedGameState.round,
          currentPlayerId: updatedGameState.currentPlayer?.id || '',
          currentPlayerName: updatedGameState.currentPlayer?.name || '',
          players: updatedGameState.players.map((p) => this.mapPlayerToDTO(p)),
          fieldCards: updatedGameState.fieldCards.map((c) => this.mapCardToDTO(c)),
          deckCount: updatedGameState.deckCount,
        },
      }
      await this.eventPublisher.publish(roundStartedEvent)
    }

    // 5. 返回最終狀態
    const finalGameState = await this.gameRepository.getGameState(gameId)
    if (!finalGameState) {
      throw new Error('Game state not found after update')
    }
    return finalGameState
  }

  private mapCardToDTO(card: Card): CardDTO {
    return {
      id: card.id,
      suit: card.suit,
      type: card.type,
      points: card.points
    }
  }

  private mapPlayerToDTO(player: IPlayer): PlayerStateDTO {
    return {
      id: player.id,
      name: player.name,
      isHuman: player.isHuman,
      handCards: [...player.hand].map((c) => this.mapCardToDTO(c)),
      capturedCards: [...player.captured].map((c) => this.mapCardToDTO(c)),
      score: player.score,
    }
  }
}