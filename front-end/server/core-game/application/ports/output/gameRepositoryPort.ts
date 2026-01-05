/**
 * GameRepositoryPort - Output Port
 *
 * @description
 * Application Layer 定義的儲存介面，由 Adapter Layer 實作。
 * 符合 Clean Architecture 的依賴反轉原則。
 *
 * @module server/application/ports/output/gameRepositoryPort
 */

import type { Game, GameStatus } from '~~/server/core-game/domain/game/game'

/**
 * 遊戲儲存庫介面
 *
 * Application Layer 透過此介面與持久化層互動，
 * 不需要知道具體的實作細節（PostgreSQL、記憶體等）。
 */
export interface GameRepositoryPort {
  /**
   * 儲存遊戲
   *
   * @param game - 要儲存的遊戲
   */
  save(game: Game): Promise<void>

  /**
   * 透過 ID 查找遊戲
   *
   * @param gameId - 遊戲 ID
   * @returns 遊戲（若存在）
   */
  findById(gameId: string): Promise<Game | null>

  /**
   * 透過玩家 ID 查找遊戲
   *
   * @param playerId - 玩家 ID
   * @returns 遊戲（若存在）
   */
  findByPlayerId(playerId: string): Promise<Game | null>

  /**
   * 更新遊戲狀態
   *
   * @param gameId - 遊戲 ID
   * @param status - 新狀態
   */
  updateStatus(gameId: string, status: GameStatus): Promise<void>

  /**
   * 刪除遊戲
   *
   * @param gameId - 遊戲 ID
   */
  delete(gameId: string): Promise<void>

  /**
   * 查找等待中的遊戲（用於配對）
   *
   * 返回最早建立的等待中遊戲，供配對使用。
   *
   * @returns 等待中的遊戲（若存在）
   */
  findWaitingGame(): Promise<Game | null>
}
