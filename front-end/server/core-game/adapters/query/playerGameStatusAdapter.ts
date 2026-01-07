/**
 * Player Game Status Adapter
 *
 * @description
 * 實作 Matchmaking BC 定義的 PlayerGameStatusPort。
 * 查詢玩家是否有進行中的遊戲。
 *
 * 設計原則 (Dependency Inversion):
 * - Matchmaking BC 定義介面 (需求方)
 * - Core Game BC 提供實作 (提供方)
 * - 業務知識「什麼是進行中的遊戲」歸屬 Core Game BC
 *
 * @module server/core-game/adapters/query/playerGameStatusAdapter
 */

import { PlayerGameStatusPort } from '~~/server/matchmaking/application/ports/output/playerGameStatusPort'
import type { GameRepositoryPort } from '../../application/ports/output/gameRepositoryPort'
import { gameRepository } from '../persistence/drizzleGameRepository'

/**
 * Player Game Status Adapter
 *
 * @description
 * 透過 GameRepositoryPort 查詢玩家的遊戲狀態。
 */
export class PlayerGameStatusAdapter extends PlayerGameStatusPort {
  constructor(private readonly gameRepository: GameRepositoryPort) {
    super()
  }

  /**
   * 檢查玩家是否有進行中的遊戲
   *
   * @description
   * 「進行中」定義為狀態是 WAITING 或 IN_PROGRESS 的遊戲。
   * FINISHED 狀態的遊戲不算「進行中」。
   */
  async hasActiveGame(playerId: string): Promise<boolean> {
    const game = await this.gameRepository.findByPlayerId(playerId)

    if (!game) {
      return false
    }

    // 只有 WAITING 和 IN_PROGRESS 算「進行中」
    return game.status === 'WAITING' || game.status === 'IN_PROGRESS'
  }
}

/**
 * 單例實例
 */
let instance: PlayerGameStatusAdapter | null = null

/**
 * 取得 PlayerGameStatusAdapter 單例
 *
 * @description
 * 使用 gameRepository 作為依賴。
 */
export function getPlayerGameStatusAdapter(): PlayerGameStatusAdapter {
  if (!instance) {
    instance = new PlayerGameStatusAdapter(gameRepository)
  }
  return instance
}
