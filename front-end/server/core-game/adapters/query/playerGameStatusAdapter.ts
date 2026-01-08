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
 * 資料來源選擇：
 * - 使用 inMemoryGameStore（記憶體）而非 gameRepository（資料庫）
 * - 原因：活躍遊戲狀態由 inMemoryGameStore 管理，查詢效能更佳
 * - playerGameMap 只記錄活躍遊戲（遊戲結束時會被清除）
 *
 * @module server/core-game/adapters/query/playerGameStatusAdapter
 */

import { PlayerGameStatusPort } from '~~/server/matchmaking/application/ports/output/playerGameStatusPort'
import type { GameStorePort } from '../../application/ports/output/gameStorePort'
import { inMemoryGameStore } from '../persistence/inMemoryGameStore'

/**
 * Player Game Status Adapter
 *
 * @description
 * 透過 GameStorePort（記憶體）查詢玩家的遊戲狀態。
 */
export class PlayerGameStatusAdapter extends PlayerGameStatusPort {
  constructor(private readonly gameStore: GameStorePort) {
    super()
  }

  /**
   * 檢查玩家是否有進行中的遊戲
   *
   * @description
   * 透過 playerGameMap 查詢，只要玩家在 Map 中就表示有活躍遊戲。
   * playerGameMap 的生命週期：
   * - 加入遊戲時建立映射（addPlayerGame）
   * - 遊戲結束時清除映射（delete -> 清除所有玩家）
   *
   * 注意：不需要額外檢查 game.status，因為：
   * - FINISHED 狀態的遊戲會被從 inMemoryGameStore 移除
   * - playerGameMap 只包含 WAITING 或 IN_PROGRESS 的遊戲
   */
  async hasActiveGame(playerId: string): Promise<boolean> {
    const game = this.gameStore.getByPlayerId(playerId)
    return game !== undefined
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
 * 使用 inMemoryGameStore 作為依賴（記憶體查詢，效能佳）。
 */
export function getPlayerGameStatusAdapter(): PlayerGameStatusAdapter {
  if (!instance) {
    instance = new PlayerGameStatusAdapter(inMemoryGameStore)
  }
  return instance
}
