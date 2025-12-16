/**
 * LeaveGameUseCase - Application Layer
 *
 * @description
 * 處理玩家離開遊戲的用例。
 *
 * 新邏輯（Phase 5 重構）：
 * - 玩家離開時不立即結束遊戲
 * - 標記玩家為 LEFT 狀態
 * - 遊戲繼續由系統代行該玩家（加速模式，3 秒超時）
 * - 回合結束時檢查，若有 LEFT/DISCONNECTED 玩家則發送 GameEnded
 *
 * @module server/application/use-cases/leaveGameUseCase
 */

import type { GameRepositoryPort } from '~~/server/application/ports/output/gameRepositoryPort'
import type { EventPublisherPort } from '~~/server/application/ports/output/eventPublisherPort'
import type { GameTimeoutPort } from '~~/server/application/ports/output/gameTimeoutPort'
import type { GameStorePort } from '~~/server/application/ports/output/gameStorePort'
import type { LeaveGameEventMapperPort } from '~~/server/application/ports/output/eventMapperPort'
import type { RecordGameStatsInputPort } from '~~/server/application/ports/input/recordGameStatsInputPort'
import { markPlayerLeft, getPlayerConnectionStatus } from '~~/server/domain/game/playerConnection'
import {
  LeaveGameError,
  type LeaveGameInputPort,
  type LeaveGameInput,
  type LeaveGameOutput,
} from '~~/server/application/ports/input/leaveGameInputPort'

// Re-export for backwards compatibility
export { LeaveGameError } from '~~/server/application/ports/input/leaveGameInputPort'
export type { LeaveGameEventMapperPort } from '~~/server/application/ports/output/eventMapperPort'

/**
 * LeaveGameUseCase
 *
 * 處理玩家離開遊戲的完整流程。
 *
 * 新邏輯（Phase 5 重構）：
 * - 不立即結束遊戲
 * - 標記玩家為 LEFT 狀態
 * - 遊戲繼續由系統代行
 */
export class LeaveGameUseCase implements LeaveGameInputPort {
  constructor(
    private readonly gameRepository: GameRepositoryPort,
    private readonly eventPublisher: EventPublisherPort,
    private readonly gameStore: GameStorePort,
    private readonly eventMapper: LeaveGameEventMapperPort,
    private readonly gameTimeoutManager?: GameTimeoutPort,
    private readonly recordGameStatsUseCase?: RecordGameStatsInputPort
  ) {}

  /**
   * 執行離開遊戲用例
   *
   * @param input - 離開遊戲參數
   * @returns 結果
   * @throws LeaveGameError 如果操作無效
   */
  async execute(input: LeaveGameInput): Promise<LeaveGameOutput> {
    const { gameId, playerId } = input

    // 1. 取得遊戲狀態（從記憶體讀取，因為 currentRound 不儲存於 DB）
    const existingGame = this.gameStore.get(gameId)
    if (!existingGame) {
      throw new LeaveGameError('GAME_NOT_FOUND', `Game not found: ${gameId}`)
    }

    // 2. 驗證遊戲狀態
    if (existingGame.status === 'FINISHED') {
      throw new LeaveGameError('GAME_ALREADY_FINISHED', `Game already finished: ${gameId}`)
    }

    // 3. 驗證玩家是否在遊戲中
    const playerInGame = existingGame.players.find((p) => p.id === playerId)
    if (!playerInGame) {
      throw new LeaveGameError('PLAYER_NOT_IN_GAME', `Player not in game: ${playerId}`)
    }

    // 4. 檢查玩家是否已經離開
    const currentStatus = getPlayerConnectionStatus(existingGame, playerId)
    if (currentStatus === 'LEFT') {
      // 玩家已經離開，不需要重複處理
      console.log(`[LeaveGameUseCase] Player ${playerId} already left game ${gameId}`)
      return {
        success: true,
        leftAt: new Date().toISOString(),
      }
    }

    // 5. 標記玩家為 LEFT 狀態（不結束遊戲）
    const updatedGame = markPlayerLeft(existingGame, playerId)

    // 6. 清除該玩家的閒置計時器和確認超時計時器
    // 因為 LEFT 玩家不需要再追蹤閒置狀態
    this.gameTimeoutManager?.clearIdleTimeout(gameId, playerId)
    this.gameTimeoutManager?.clearContinueConfirmationTimeout(gameId, playerId)

    // 7. 儲存更新
    this.gameStore.set(updatedGame)
    await this.gameRepository.save(updatedGame)

    console.log(`[LeaveGameUseCase] Player ${playerId} marked as LEFT in game ${gameId}, game continues with auto-action`)

    return {
      success: true,
      leftAt: new Date().toISOString(),
    }
  }
}
