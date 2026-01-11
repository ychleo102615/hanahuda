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
  getDefaultRuleset,
  createPlayer,
  type Game,
} from '~~/server/core-game/domain/game'
import type { RoomTypeId } from '#shared/constants/roomTypes'
import type { GameRepositoryPort } from '~~/server/core-game/application/ports/output/gameRepositoryPort'
import type { EventPublisherPort } from '~~/server/core-game/application/ports/output/eventPublisherPort'
import type { InternalEventPublisherPort } from '~~/server/core-game/application/ports/output/internalEventPublisherPort'
import type { GameStorePort } from '~~/server/core-game/application/ports/output/gameStorePort'
import type { FullEventMapperPort } from '~~/server/core-game/application/ports/output/eventMapperPort'
import type { GameTimeoutPort } from '~~/server/core-game/application/ports/output/gameTimeoutPort'
import type { GameLockPort } from '~~/server/core-game/application/ports/output/gameLockPort'
import type {
  JoinGameInputPort,
  JoinGameInput,
  JoinGameOutput,
  JoinGameWaitingOutput,
  JoinGameStartedOutput,
  JoinGameSnapshotOutput,
} from '~~/server/core-game/application/ports/input/joinGameInputPort'
import { gameConfig } from '~~/server/utils/config'
import { logger } from '~~/server/utils/logger'
import { GAME_ERROR_MESSAGES } from '#shared/contracts/errors'
import type { GameLogRepositoryPort } from '~~/server/core-game/application/ports/output/gameLogRepositoryPort'
import { COMMAND_TYPES } from '~~/server/database/schema/gameLogs'
import type { GameStartService } from '~~/server/core-game/application/services/gameStartService'

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
  constructor(
    private readonly gameRepository: GameRepositoryPort,
    private readonly eventPublisher: EventPublisherPort,
    private readonly gameStore: GameStorePort,
    private readonly eventMapper: FullEventMapperPort,
    private readonly internalEventPublisher: InternalEventPublisherPort,
    private readonly gameLock: GameLockPort,
    private readonly gameTimeoutManager: GameTimeoutPort,
    private readonly gameLogRepository: GameLogRepositoryPort | undefined,
    private readonly gameStartService: GameStartService
  ) {}

  /**
   * 執行加入遊戲用例
   *
   * @param input - 加入遊戲參數
   * @returns 遊戲資訊
   */
  async execute(input: JoinGameInput): Promise<JoinGameOutput> {
    const { playerId, playerName, gameId, roomType } = input

    // 1. 重連模式：如果提供了 gameId，明確表示要重連特定遊戲
    if (gameId) {
      return this.handleReconnectionMode(gameId, playerId, playerName)
    }

    // 2. 新遊戲模式：沒有提供 gameId，開始新遊戲
    // 注意：即使有 sessionToken，也不查詢舊遊戲，直接開始新遊戲流程

    // 3. 查找等待中的遊戲
    const waitingGame = this.gameStore.findWaitingGame()

    if (waitingGame) {
      // 3a. 嘗試加入現有遊戲（使用悲觀鎖保護）
      try {
        return await this.joinExistingGame(waitingGame, playerId, playerName)
      } catch (error) {
        // 如果遊戲在等待鎖期間已被其他玩家加入，改為建立新遊戲
        if (error instanceof Error && error.message === 'GAME_NO_LONGER_WAITING') {
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
   * 處理重連或加入模式
   *
   * @description
   * 當明確提供 gameId 時，區分兩種情況：
   * - 情況 A: 玩家已在遊戲中 → 重連
   * - 情況 B: 玩家不在遊戲中，但遊戲存在且 WAITING → 加入
   * - 情況 C: 遊戲不存在或不是 WAITING → 錯誤
   *
   * @param gameId - 要加入或重連的遊戲 ID
   * @param playerId - 玩家 ID（來自 Identity BC）
   * @param playerName - 玩家名稱
   * @returns 加入遊戲結果
   */
  private async handleReconnectionMode(
    gameId: string,
    playerId: string,
    playerName: string
  ): Promise<JoinGameOutput> {
    // 1. 透過 playerId 查詢遊戲（重連模式）
    const playerGame = this.gameStore.getByPlayerId(playerId)

    // 情況 A: 玩家已在遊戲中，且 ID 相符 → 重連
    if (playerGame && playerGame.id === gameId) {
      return this.handleReconnection(playerGame, playerId, playerName)
    }

    // 情況 B: 玩家不在遊戲中 → 嘗試加入指定遊戲
    const targetGame = this.gameStore.get(gameId)
    if (targetGame && targetGame.status === 'WAITING') {
      return this.joinExistingGame(targetGame, playerId, playerName)
    }

    // 情況 C: 遊戲不存在或不是 WAITING 狀態
    logger.error('Game expired', { gameId, playerId, reason: 'game_not_available' })
    this.gameLogRepository?.logAsync({
      gameId,
      playerId,
      eventType: COMMAND_TYPES.ReconnectGameFailed,
      payload: { reason: 'game_not_available' },
    })
    return { status: 'game_expired', gameId }
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
   * @returns 加入遊戲結果
   */
  private handleReconnection(
    game: Game,
    playerId: string,
    playerName: string
  ): JoinGameSnapshotOutput | JoinGameWaitingOutput {
    // 1. 若遊戲 WAITING → 返回 game_waiting（等待對手）
    if (game.status === 'WAITING') {
      // 從 GameTimeoutManager 取得剩餘秒數（SSOT）
      const remainingSeconds = this.gameTimeoutManager.getMatchmakingRemainingSeconds(game.id)
        ?? gameConfig.matchmaking_timeout_seconds // fallback: 計時器不存在時使用完整秒數

      // 記錄重連成功（等待狀態）
      this.gameLogRepository?.logAsync({
        gameId: game.id,
        playerId,
        eventType: COMMAND_TYPES.ReconnectGame,
        payload: { gameStatus: 'WAITING' },
      })

      return {
        status: 'game_waiting',
        gameId: game.id,
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

    // 記錄重連成功（進行中）
    this.gameLogRepository?.logAsync({
      gameId: game.id,
      playerId,
      eventType: COMMAND_TYPES.ReconnectGame,
      payload: { gameStatus: 'IN_PROGRESS' },
    })

    return {
      status: 'snapshot',
      gameId: game.id,
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
      roomTypeId: effectiveRoomType,
      player: humanPlayer,
      ruleset,
    })

    // 儲存到記憶體和資料庫
    this.gameStore.set(game)
    await this.gameRepository.save(game)

    // 建立 playerId -> gameId 映射
    this.gameStore.addPlayerGame(playerId, gameId)

    // 發布 ROOM_CREATED 內部事件（通知 OpponentService 有新房間需要 AI 加入）
    this.internalEventPublisher.publishRoomCreated({
      gameId: game.id,
      waitingPlayerId: playerId,
    })

    // 啟動配對超時計時器
    this.gameTimeoutManager.startMatchmakingTimeout(game.id, () => {
      this.handleMatchmakingTimeout(game.id)
    })

    // 記錄建立遊戲命令
    this.gameLogRepository?.logAsync({
      gameId: game.id,
      playerId,
      eventType: COMMAND_TYPES.CreateGame,
      payload: { playerName, roomType: effectiveRoomType },
    })

    // SSE-First: 返回 game_waiting 狀態（前端顯示等待畫面）
    return {
      status: 'game_waiting',
      gameId: game.id,
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
   * 委託 GameStartService 處理共用的遊戲開始邏輯。
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

      const secondPlayer = createPlayer({
        id: playerId,
        name: playerName,
        isAi: false,
      })

      // 委託 GameStartService 處理遊戲開始邏輯
      const result = await this.gameStartService.startGameWithSecondPlayer({
        waitingGame: currentGame,
        secondPlayer,
        isAi: false,
        playerName,
      })

      // SSE-First: 返回 game_started 狀態
      return {
        status: 'game_started',
        gameId: result.game.id,
        playerId,
        players: result.game.players.map((p: { id: string; name: string; isAi: boolean }) => ({
          playerId: p.id,
          playerName: p.name,
          isAi: p.isAi,
        })),
        ruleset: {
          totalRounds: result.game.ruleset.total_rounds,
        },
        startingPlayerId: result.startingPlayerId,
      }
    }) // end of withLock
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
    // 檢查遊戲是否還在等待狀態
    const game = this.gameStore.get(gameId)
    if (!game || game.status !== 'WAITING') {
      return
    }

    logger.info('Matchmaking timeout', { gameId })

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
  }
}
