/**
 * LeaveGameUseCase - Application Layer
 *
 * @description
 * 處理玩家提前離開遊戲的用例。
 * 當玩家離開時，對手獲勝，遊戲立即結束。
 *
 * @module server/application/use-cases/leaveGameUseCase
 */

import type { Game } from '~~/server/domain/game/game'
import type { GameFinishedEvent, PlayerScore } from '#shared/contracts'
import { transitionAfterPlayerLeave } from '~~/server/domain/services/roundTransitionService'
import type { GameRepositoryPort } from '~~/server/application/ports/output/gameRepositoryPort'
import type { EventPublisherPort } from '~~/server/application/ports/output/eventPublisherPort'
import type { GameStorePort } from '~~/server/application/ports/output/gameStorePort'
import type { LeaveGameEventMapperPort } from '~~/server/application/ports/output/eventMapperPort'
import type { RecordGameStatsInputPort } from '~~/server/application/ports/input/recordGameStatsInputPort'
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
 * 處理玩家提前離開遊戲的完整流程。
 */
export class LeaveGameUseCase implements LeaveGameInputPort {
  constructor(
    private readonly gameRepository: GameRepositoryPort,
    private readonly eventPublisher: EventPublisherPort,
    private readonly gameStore: GameStorePort,
    private readonly eventMapper: LeaveGameEventMapperPort,
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

    // 1. 取得遊戲狀態
    const existingGame = await this.gameRepository.findById(gameId)
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

    // 4. 使用 Domain Service 處理玩家離開
    const transitionResult = transitionAfterPlayerLeave(existingGame, playerId)
    const game = transitionResult.game

    // 5. 發送 GameFinished 事件（對手獲勝）並記錄統計
    if (transitionResult.winner) {
      // 記錄遊戲統計（玩家離開/投降，對手獲勝）
      if (this.recordGameStatsUseCase) {
        try {
          await this.recordGameStatsUseCase.execute({
            gameId,
            winnerId: transitionResult.winner.winnerId,
            finalScores: transitionResult.winner.finalScores,
            winnerYakuList: [],  // 投降情況下無役種
            winnerKoiMultiplier: 1,  // 投降情況下無 Koi-Koi 倍率
            players: existingGame.players,
          })
        } catch (error) {
          console.error(`[LeaveGameUseCase] Failed to record game stats:`, error)
          // 統計記錄失敗不應影響遊戲結束流程
        }
      }

      const gameFinishedEvent = this.eventMapper.toGameFinishedEvent(
        transitionResult.winner.winnerId,
        transitionResult.winner.finalScores
      )
      this.eventPublisher.publishToGame(gameId, gameFinishedEvent)
    }

    // 6. 儲存更新
    this.gameStore.set(game)
    await this.gameRepository.save(game)

    // 7. 清除遊戲會話（延遲執行，讓事件先發送完畢）
    setTimeout(() => {
      this.gameStore.delete(gameId)
    }, 1000)

    console.log(`[LeaveGameUseCase] Player ${playerId} left game ${gameId}`)

    return {
      success: true,
      leftAt: new Date().toISOString(),
    }
  }
}
