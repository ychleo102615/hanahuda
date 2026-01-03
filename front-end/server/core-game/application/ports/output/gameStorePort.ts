/**
 * GameStorePort - Output Port
 *
 * @description
 * 遊戲記憶體儲存介面。
 * Application Layer 透過此 Port 存取遊戲狀態快照。
 *
 * Adapter 實作：inMemoryGameStore
 *
 * @module server/application/ports/output/gameStorePort
 */

import type { Game } from '~~/server/core-game/domain/game/game'

/**
 * 遊戲記憶體儲存介面
 *
 * @description
 * Use Case 不直接依賴具體實作，只依賴此介面。
 * 這是 Application Layer 與 Adapter Layer 之間的契約。
 */
export interface GameStorePort {
  /**
   * 透過遊戲 ID 取得遊戲狀態
   *
   * @param gameId - 遊戲 ID
   * @returns 遊戲狀態（若存在）
   */
  get(gameId: string): Game | undefined

  /**
   * 儲存遊戲狀態
   *
   * @param game - 遊戲狀態
   */
  set(game: Game): void

  /**
   * 刪除遊戲狀態
   *
   * @param gameId - 遊戲 ID
   */
  delete(gameId: string): void

  /**
   * 透過會話 Token 取得遊戲狀態
   *
   * @param token - 會話 Token
   * @returns 遊戲狀態（若存在）
   */
  getBySessionToken(token: string): Game | undefined

  /**
   * 查找等待中的遊戲（用於配對）
   *
   * @returns 等待中的遊戲（若存在）
   */
  findWaitingGame(): Game | undefined

  /**
   * 為玩家新增 session 映射
   *
   * @param sessionToken - 玩家的 session token
   * @param gameId - 遊戲 ID
   * @param playerId - 玩家 ID
   */
  addPlayerSession(sessionToken: string, gameId: string, playerId: string): void
}
