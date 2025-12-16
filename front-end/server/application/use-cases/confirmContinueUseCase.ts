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
import type { TurnFlowService } from '~~/server/application/services/turnFlowService'
import {
  ConfirmContinueError,
  type ConfirmContinueInputPort,
  type ConfirmContinueInput,
  type ConfirmContinueOutput,
} from '~~/server/application/ports/input/confirmContinueInputPort'
import { isConfirmationRequired } from '~~/server/domain/game/playerConnection'

/**
 * ConfirmContinueUseCase
 *
 * 處理玩家確認繼續遊戲的完整流程。
 */
export class ConfirmContinueUseCase implements ConfirmContinueInputPort {
  constructor(
    private readonly gameStore: GameStorePort,
    private readonly turnFlowService: TurnFlowService
  ) {}

  /**
   * 執行確認繼續遊戲
   *
   * @param input - 確認參數
   * @returns 確認結果
   * @throws ConfirmContinueError
   */
  async execute(input: ConfirmContinueInput): Promise<ConfirmContinueOutput> {
    const { gameId, playerId } = input

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

    // 5. 處理確認繼續遊戲
    await this.turnFlowService.handlePlayerConfirmContinue(gameId, playerId)

    console.log(`[ConfirmContinueUseCase] Player ${playerId} confirmed continue in game ${gameId}`)

    return {
      success: true,
      confirmedAt: new Date().toISOString(),
    }
  }
}
