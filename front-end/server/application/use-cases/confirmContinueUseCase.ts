/**
 * ConfirmContinueUseCase - Application Layer
 *
 * @description
 * 處理玩家確認繼續遊戲的用例。
 *
 * 當玩家閒置超過 60 秒後，回合結束時需要確認繼續遊戲。
 * 若玩家在 7 秒內未確認，則視為放棄，踢出遊戲。
 * 此 Use Case 處理玩家確認繼續的請求。
 *
 * @module server/application/use-cases/confirmContinueUseCase
 */

import type { GameStorePort } from '~~/server/application/ports/output/gameStorePort'
import type { GameLockPort } from '~~/server/application/ports/output/gameLockPort'
import type { TurnFlowService } from '~~/server/application/services/turnFlowService'
import {
  ConfirmContinueError,
  type ConfirmContinueInputPort,
  type ConfirmContinueInput,
  type ConfirmContinueOutput,
} from '~~/server/application/ports/input/confirmContinueInputPort'
import { isConfirmationRequired } from '~~/server/domain/game/playerConnection'
import { loggers } from '~~/server/utils/logger'

/** Module logger instance */
const logger = loggers.useCase('ConfirmContinue')

/**
 * ConfirmContinueUseCase
 *
 * 處理玩家確認繼續遊戲的完整流程。
 */
export class ConfirmContinueUseCase implements ConfirmContinueInputPort {
  constructor(
    private readonly gameStore: GameStorePort,
    private readonly turnFlowService: TurnFlowService,
    private readonly gameLock: GameLockPort
  ) {}

  /**
   * 執行確認繼續遊戲
   *
   * @param input - 確認參數
   * @returns 確認結果
   * @throws ConfirmContinueError
   */
  async execute(input: ConfirmContinueInput): Promise<ConfirmContinueOutput> {
    const { gameId, playerId, decision } = input

    // 使用悲觀鎖確保同一遊戲的操作互斥執行
    return this.gameLock.withLock(gameId, async () => {
      // 1. 取得遊戲
      const game = this.gameStore.get(gameId)
      if (!game) {
        throw new ConfirmContinueError('GAME_NOT_FOUND', `Game ${gameId} not found`)
      }

      // 2. 檢查遊戲狀態
      if (game.status === 'FINISHED') {
        throw new ConfirmContinueError('GAME_ALREADY_FINISHED', `Game ${gameId} is already finished`)
      }

      // 3. 檢查玩家是否在遊戲中
      const player = game.players.find(p => p.id === playerId)
      if (!player) {
        throw new ConfirmContinueError('PLAYER_NOT_IN_GAME', `Player ${playerId} is not in game ${gameId}`)
      }

      // 4. 檢查是否需要確認
      if (!isConfirmationRequired(game, playerId)) {
        throw new ConfirmContinueError(
          'CONFIRMATION_NOT_REQUIRED',
          `Player ${playerId} does not need to confirm continue`
        )
      }

      // 5. 處理玩家決策
      if (decision === 'LEAVE') {
        // 玩家選擇離開，結束遊戲
        logger.info('Player chose to leave game', { playerId, gameId })
        await this.turnFlowService.endGameDueToIdlePlayer(gameId, playerId)
      } else {
        // 玩家選擇繼續
        logger.info('Player confirmed continue', { playerId, gameId })
        await this.turnFlowService.handlePlayerConfirmContinue(gameId, playerId)
      }

      return {
        success: true,
        confirmedAt: new Date().toISOString(),
      }
    }) // end of withLock
  }
}
