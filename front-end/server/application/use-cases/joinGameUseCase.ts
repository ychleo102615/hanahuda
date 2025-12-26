/**
 * JoinGameUseCase - Application Layer
 *
 * @description
 * 處理玩家加入遊戲的用例。
 * 實作 Server 中立的配對邏輯：
 * 1. 查找等待中的遊戲
 * 2. 若無等待中遊戲 → 建立新遊戲（WAITING 狀態）
 * 3. 若有等待中遊戲 → 加入成為 Player 2（IN_PROGRESS 狀態）
 *
 * 注意：不直接建立 AI 對手，AI 配對由 OpponentService 透過事件監聽處理（T056）
 *
 * @module server/application/use-cases/joinGameUseCase
 */

import { randomUUID } from 'crypto'
import {
  createGame,
  addSecondPlayerAndStart,
  startRound,
  getDefaultRuleset,
  determineWinner,
  createPlayer,
  type Game,
} from '~~/server/domain/game'
import type { RoomTypeId } from '#shared/constants/roomTypes'
import type { GameRepositoryPort } from '~~/server/application/ports/output/gameRepositoryPort'
import type { EventPublisherPort } from '~~/server/application/ports/output/eventPublisherPort'
import type { InternalEventPublisherPort } from '~~/server/application/ports/output/internalEventPublisherPort'
import type { GameStorePort } from '~~/server/application/ports/output/gameStorePort'
import type { FullEventMapperPort } from '~~/server/application/ports/output/eventMapperPort'
import type { GameTimeoutPort } from '~~/server/application/ports/output/gameTimeoutPort'
import type { GameLockPort } from '~~/server/application/ports/output/gameLockPort'
import type { TurnFlowService } from '~~/server/application/services/turnFlowService'
import type {
  JoinGameInputPort,
  JoinGameInput,
  JoinGameOutput,
  JoinGameWaitingOutput,
  JoinGameStartedOutput,
  JoinGameSnapshotOutput,
} from '~~/server/application/ports/input/joinGameInputPort'
import { checkSpecialRules, type SpecialRuleResult } from '~~/server/domain/services/specialRulesService'
import { gameConfig } from '~~/server/utils/config'
import { GAME_ERROR_MESSAGES } from '#shared/contracts/errors'
import { loggers } from '~~/server/utils/logger'

/** Module logger instance */
const logger = loggers.useCase('JoinGame')

/**
 * 初始事件延遲（毫秒）
 *
 * 給予客戶端時間建立 SSE 連線
 */
const INITIAL_EVENT_DELAY_MS = 100

/**
 * JoinGameUseCase
 *
 * 處理玩家加入遊戲的完整流程，實作 Server 中立的配對邏輯。
 *
 * 事件發布設計：
 * - 建立新遊戲時 → 發布 ROOM_CREATED 內部事件（通知 OpponentService）
 * - 加入現有遊戲時 → 發布 GameStarted SSE 事件
 */
export class JoinGameUseCase implements JoinGameInputPort {
  private turnFlowService?: TurnFlowService

  constructor(
    private readonly gameRepository: GameRepositoryPort,
    private readonly eventPublisher: EventPublisherPort,
    private readonly gameStore: GameStorePort,
    private readonly eventMapper: FullEventMapperPort,
    private readonly internalEventPublisher: InternalEventPublisherPort,
    private readonly gameLock: GameLockPort,
    private readonly gameTimeoutManager: GameTimeoutPort
  ) {}

  /**
   * 設定 TurnFlowService（用於解決循環依賴）
   */
  setTurnFlowService(service: TurnFlowService): void {
    this.turnFlowService = service
  }

  /**
   * 執行加入遊戲用例
   *
   * @param input - 加入遊戲參數
   * @returns 遊戲資訊
   */
  async execute(input: JoinGameInput): Promise<JoinGameOutput> {
    const { playerId, playerName, sessionToken, gameId, roomType } = input

    // 1. 重連模式：如果提供了 gameId，明確表示要重連特定遊戲
    if (gameId) {
      return this.handleReconnectionMode(gameId, playerId, playerName, sessionToken)
    }

    // 2. 新遊戲模式：沒有提供 gameId，開始新遊戲
    // 注意：即使有 sessionToken，也不查詢舊遊戲，直接開始新遊戲流程
    logger.info('New game mode', { playerName })

    // 3. 查找等待中的遊戲
    const waitingGame = this.gameStore.findWaitingGame()

    if (waitingGame) {
      // 3a. 嘗試加入現有遊戲（使用悲觀鎖保護）
      try {
        return await this.joinExistingGame(waitingGame, playerId, playerName)
      } catch (error) {
        // 如果遊戲在等待鎖期間已被其他玩家加入，改為建立新遊戲
        if (error instanceof Error && error.message === 'GAME_NO_LONGER_WAITING') {
          logger.info('Game was joined by another player, creating new game', {
            attemptedGameId: waitingGame.id,
            playerName,
          })
          return this.createNewGame(playerId, playerName, roomType)
        }
        throw error
      }
    } else {
      // 3b. 建立新遊戲（WAITING 狀態）
      return this.createNewGame(playerId, playerName, roomType)
    }
  }

  /**
   * 處理重連模式
   *
   * @description
   * 當前端明確提供 gameId 時，表示要重連特定遊戲。
   * 此時需要檢查遊戲狀態，返回對應的結果。
   *
   * @param gameId - 要重連的遊戲 ID
   * @param playerId - 玩家 ID
   * @param playerName - 玩家名稱
   * @param sessionToken - 會話 Token
   * @returns 加入遊戲結果
   */
  private async handleReconnectionMode(
    gameId: string,
    playerId: string,
    playerName: string,
    sessionToken?: string
  ): Promise<JoinGameOutput> {
    logger.info('Reconnection mode', { gameId, playerId })

    // 1. 先查記憶體
    const memoryGame = this.gameStore.get(gameId)
    if (memoryGame) {
      // 驗證玩家身份
      const isPlayer = memoryGame.players.some((p) => p.id === playerId)
      if (!isPlayer) {
        logger.warn('Rejecting reconnection - player not in game', { playerId, gameId })
        // 玩家不屬於此遊戲，返回過期
        return { status: 'game_expired', gameId }
      }

      // 玩家身份驗證通過，執行重連
      const token = sessionToken || this.findPlayerSessionToken(gameId, playerId)
      if (!token) {
        logger.warn('No session token for player', { playerId, gameId })
        return { status: 'game_expired', gameId }
      }

      return this.handleReconnection(memoryGame, playerId, playerName, token)
    }

    // 2. 記憶體沒有，查資料庫
    const dbGame = await this.gameRepository.findById(gameId)
    if (!dbGame) {
      logger.info('Game not found', { gameId })
      return { status: 'game_expired', gameId }
    }

    // 3. 根據遊戲狀態返回結果
    if (dbGame.status === 'FINISHED') {
      logger.info('Game already finished', { gameId })
      const winnerId = determineWinner(dbGame)
      return {
        status: 'game_finished',
        gameId: dbGame.id,
        winnerId,
        finalScores: dbGame.cumulativeScores.map((s) => ({
          playerId: s.player_id,
          score: s.score,
        })),
        roundsPlayed: dbGame.roundsPlayed,
        totalRounds: dbGame.totalRounds,
      }
    }

    // 4. 遊戲在 DB 但不在記憶體 → 已過期
    logger.info('Game expired (in DB but not in memory)', { gameId })
    return { status: 'game_expired', gameId }
  }

  /**
   * 查找玩家的 session token（從 gameStore 的 session map）
   */
  private findPlayerSessionToken(gameId: string, playerId: string): string | undefined {
    // gameStore 可能有方法可以查詢，但目前沒有
    // 這裡暫時返回 undefined，讓呼叫方處理
    return undefined
  }

  /**
   * 處理重連
   *
   * SSE-First 架構：
   * - 若遊戲 IN_PROGRESS → 返回 snapshot（包含完整遊戲狀態）
   * - 若遊戲 WAITING → 返回 game_waiting（等待對手）
   * - 若遊戲 FINISHED → 不應該到達這裡（已在 handleReconnectionMode 處理）
   *
   * @param game - 遊戲
   * @param playerId - 玩家 ID
   * @param playerName - 玩家名稱
   * @param sessionToken - 會話 Token
   * @returns 加入遊戲結果
   */
  private handleReconnection(
    game: Game,
    playerId: string,
    playerName: string,
    sessionToken: string
  ): JoinGameSnapshotOutput | JoinGameWaitingOutput {
    logger.info('Processing reconnection', { gameId: game.id, playerId })

    // 1. 若遊戲 WAITING → 返回 game_waiting（等待對手）
    if (game.status === 'WAITING') {
      // 從 GameTimeoutManager 取得剩餘秒數（SSOT）
      const remainingSeconds = this.gameTimeoutManager.getMatchmakingRemainingSeconds(game.id)
        ?? gameConfig.matchmaking_timeout_seconds // fallback: 計時器不存在時使用完整秒數

      logger.info('Game is WAITING, returning game_waiting', { gameId: game.id, remainingSeconds })

      return {
        status: 'game_waiting',
        gameId: game.id,
        sessionToken,
        playerId,
        playerName,
        timeoutSeconds: remainingSeconds,
      }
    }

    // 2. 若遊戲 IN_PROGRESS → 返回 snapshot
    // 取得剩餘超時秒數
    const remainingSeconds = this.gameTimeoutManager.getRemainingSeconds(game.id)

    // 建立遊戲快照
    const snapshot = this.eventMapper.toGameSnapshotRestoreEvent(
      game,
      remainingSeconds ?? undefined
    )

    logger.info('Returning snapshot', { gameId: game.id, remainingSeconds })

    return {
      status: 'snapshot',
      gameId: game.id,
      sessionToken,
      playerId,
      snapshot,
    }
  }

  /**
   * 建立新遊戲（WAITING 狀態）
   *
   * 不發牌、不開始遊戲，等待第二位玩家加入。
   * SSE-First 架構：返回 game_waiting 狀態。
   *
   * @param playerId - 玩家 ID
   * @param playerName - 玩家名稱
   * @param roomType - 房間類型（可選，預設從 config 取得）
   */
  private async createNewGame(
    playerId: string,
    playerName: string,
    roomType?: RoomTypeId
  ): Promise<JoinGameWaitingOutput> {
    const gameId = randomUUID()
    const sessionToken = randomUUID()

    const humanPlayer = createPlayer({
      id: playerId,
      name: playerName,
      isAi: false,
    })

    // 取得規則集：優先使用傳入的 roomType，否則使用 config 預設值
    const effectiveRoomType = roomType ?? gameConfig.default_room_type
    const ruleset = getDefaultRuleset(effectiveRoomType)

    const game = createGame({
      id: gameId,
      sessionToken, // Game 的 sessionToken 為第一位玩家的 token
      player: humanPlayer,
      ruleset,
    })

    // 儲存到記憶體和資料庫
    this.gameStore.set(game)
    await this.gameRepository.save(game)

    logger.info('Created new WAITING game', { gameId, playerName })

    // 發布 ROOM_CREATED 內部事件（通知 OpponentService 有新房間需要 AI 加入）
    this.internalEventPublisher.publishRoomCreated({
      gameId: game.id,
      waitingPlayerId: playerId,
    })

    // 啟動配對超時計時器
    this.gameTimeoutManager.startMatchmakingTimeout(game.id, () => {
      this.handleMatchmakingTimeout(game.id)
    })

    // SSE-First: 返回 game_waiting 狀態（前端顯示等待畫面）
    return {
      status: 'game_waiting',
      gameId: game.id,
      sessionToken,
      playerId,
      playerName,
      timeoutSeconds: gameConfig.matchmaking_timeout_seconds,
    }
  }

  /**
   * 加入現有遊戲（成為 Player 2）
   *
   * 將遊戲狀態改為 IN_PROGRESS，發牌，並推送初始事件。
   * SSE-First 架構：返回 game_started 狀態。
   *
   * 注意：scheduleInitialEvents 仍會執行，發送 GameStarted 和 RoundDealt 給所有玩家。
   * InitialState 只是告訴當前連線的玩家初始狀態，GameStarted/RoundDealt 是廣播事件。
   */
  private async joinExistingGame(
    waitingGame: Game,
    playerId: string,
    playerName: string
  ): Promise<JoinGameStartedOutput> {
    // 使用悲觀鎖確保同一遊戲的操作互斥執行
    return this.gameLock.withLock(waitingGame.id, async () => {
      // 重新驗證遊戲狀態（可能在等待鎖期間已被其他玩家加入）
      const currentGame = this.gameStore.get(waitingGame.id)
      if (!currentGame || currentGame.status !== 'WAITING') {
        // 遊戲已不再等待中，呼叫方應改為建立新遊戲
        throw new Error('GAME_NO_LONGER_WAITING')
      }

      // 清除配對超時計時器（對手已加入）
      this.gameTimeoutManager.clearMatchmakingTimeout(waitingGame.id)

      const sessionToken = randomUUID()

      const secondPlayer = createPlayer({
        id: playerId,
        name: playerName,
        isAi: false,
      })

      // 加入遊戲並開始
      let game = addSecondPlayerAndStart(currentGame, secondPlayer)

      // 發牌並開始第一局（可使用測試牌組）
      game = startRound(game, gameConfig.use_test_deck)

      // 檢查特殊規則（手四、喰付、場上手四）
      const specialRuleResult = this.checkAndHandleSpecialRules(game)

      // 儲存 startingPlayerId（不論是否觸發特殊規則，都需要回傳）
      const startingPlayerId = game.currentRound?.activePlayerId ?? game.players[0]?.id ?? ''

      if (specialRuleResult.triggered && game.currentRound) {
        // 特殊規則觸發：儲存遊戲狀態（確保 currentRound 存在以支援重連）
        this.gameStore.set(game)
        this.gameStore.addPlayerSession(sessionToken, game.id, playerId)
        await this.gameRepository.save(game)

        logger.info('Special rule triggered, delegating to TurnFlowService', {
          gameId: game.id,
          ruleType: specialRuleResult.type,
          winnerId: specialRuleResult.winnerId,
        })

        // 排程初始事件（延遲讓客戶端建立 SSE 連線）
        this.scheduleSpecialRuleEvents(game, specialRuleResult)
      } else {
        // 無特殊規則：正常流程
        this.gameStore.set(game)
        this.gameStore.addPlayerSession(sessionToken, game.id, playerId)
        await this.gameRepository.save(game)

        logger.info('Player joined game, game is now IN_PROGRESS', { gameId: game.id, playerName })

        // 排程初始事件（延遲讓客戶端建立 SSE 連線）
        // GameStarted 和 RoundDealt 會廣播給所有玩家
        this.scheduleInitialEvents(game)
      }

      // SSE-First: 返回 game_started 狀態
      return {
        status: 'game_started',
        gameId: game.id,
        sessionToken,
        playerId,
        players: game.players.map(p => ({
          playerId: p.id,
          playerName: p.name,
          isAi: p.isAi,
        })),
        ruleset: {
          totalRounds: game.ruleset.total_rounds,
        },
        startingPlayerId,
      }
    }) // end of withLock
  }

  /**
   * 排程初始事件
   *
   * @param game - 遊戲狀態
   */
  private scheduleInitialEvents(game: Game): void {
    setTimeout(() => {
      try {
        // 發送 GameStarted 事件
        const gameStartedEvent = this.eventMapper.toGameStartedEvent(game)
        this.eventPublisher.publishToGame(game.id, gameStartedEvent)

        // 發送 RoundDealt 事件
        const roundDealtEvent = this.eventMapper.toRoundDealtEvent(game)
        this.eventPublisher.publishToGame(game.id, roundDealtEvent)

        // 啟動第一位玩家的操作超時計時器
        const firstPlayerId = game.currentRound?.activePlayerId
        if (firstPlayerId) {
          this.turnFlowService?.startTimeoutForPlayer(game.id, firstPlayerId, 'AWAITING_HAND_PLAY')
        }

        logger.info('Initial events published', { gameId: game.id })
      } catch (error) {
        logger.error('Failed to publish initial events', error, { gameId: game.id })
      }
    }, INITIAL_EVENT_DELAY_MS)
  }

  /**
   * 處理配對超時
   *
   * @description
   * 當等待對手加入的時間超過設定值時，發送 GameError 事件並清理遊戲。
   *
   * @param gameId - 遊戲 ID
   */
  private handleMatchmakingTimeout(gameId: string): void {
    logger.warn('Matchmaking timeout', { gameId })

    // 檢查遊戲是否還在等待狀態
    const game = this.gameStore.get(gameId)
    if (!game || game.status !== 'WAITING') {
      logger.info('Game is no longer waiting, skip timeout handling', { gameId })
      return
    }

    // 發送 GameError 事件給等待中的玩家
    const errorEvent = this.eventMapper.toGameErrorEvent(
      'MATCHMAKING_TIMEOUT',
      GAME_ERROR_MESSAGES.MATCHMAKING_TIMEOUT,
      false, // 不可恢復
      'RETURN_HOME'
    )
    this.eventPublisher.publishToGame(gameId, errorEvent)

    // 清理：從 GameStore 移除遊戲
    this.gameStore.delete(gameId)

    // 清理：清除所有計時器（雖然應該只有配對超時計時器）
    this.gameTimeoutManager.clearAllForGame(gameId)

    logger.info('Game removed due to matchmaking timeout', { gameId })
  }

  // ============================================================
  // 特殊規則處理
  // ============================================================

  /**
   * 檢查特殊規則
   *
   * @param game - 遊戲狀態
   * @returns 特殊規則檢測結果
   */
  private checkAndHandleSpecialRules(game: Game): SpecialRuleResult {
    if (!game.currentRound) {
      return {
        triggered: false,
        type: null,
        triggeredPlayerId: null,
        awardedPoints: 0,
        winnerId: null,
        month: null,
        months: null,
      }
    }

    return checkSpecialRules(game.currentRound, game.ruleset.special_rules)
  }

  /**
   * 排程特殊規則事件
   *
   * @description
   * 委託 TurnFlowService 處理特殊規則：
   * 1. 發送 GameStartedEvent
   * 2. 呼叫 handleSpecialRuleTriggered（處理 RoundDealt、狀態更新、RoundEnded、回合轉換）
   *
   * @param game - 遊戲狀態（currentRound 存在）
   * @param result - 特殊規則結果
   */
  private scheduleSpecialRuleEvents(
    game: Game,
    result: SpecialRuleResult
  ): void {
    setTimeout(() => {
      try {
        // 發送 GameStarted 事件
        const gameStartedEvent = this.eventMapper.toGameStartedEvent(game)
        this.eventPublisher.publishToGame(game.id, gameStartedEvent)

        // 委託 TurnFlowService 處理特殊規則流程
        this.turnFlowService?.handleSpecialRuleTriggered(game.id, game, result)
          .catch((error) => {
            logger.error('Failed to handle special rule', error, { gameId: game.id })
          })

        logger.info('Special rule handling delegated', {
          gameId: game.id,
          ruleType: result.type,
          winnerId: result.winnerId,
        })
      } catch (error) {
        logger.error('Failed to schedule special rule events', error, { gameId: game.id })
      }
    }, INITIAL_EVENT_DELAY_MS)
  }
}
