/**
 * Player Game Status Port
 *
 * @description
 * Matchmaking BC 定義的跨 BC 查詢 Port。
 * 用於查詢玩家是否有進行中的遊戲。
 * 由 Core Game BC 提供 Adapter 實作。
 *
 * 設計原則 (Dependency Inversion):
 * - Matchmaking BC 定義介面 (需求方)
 * - Core Game BC 提供實作 (提供方)
 * - 業務知識「什麼是進行中的遊戲」歸屬 Core Game BC
 *
 * @module server/matchmaking/application/ports/output/playerGameStatusPort
 */

/**
 * Player Game Status Port
 *
 * @description
 * 玩家遊戲狀態查詢介面。
 * 由 Core Game BC 的 PlayerGameStatusAdapter 實作。
 */
export abstract class PlayerGameStatusPort {
  /**
   * 檢查玩家是否有進行中的遊戲
   *
   * @param playerId - 玩家 ID
   * @returns true 若玩家有進行中的遊戲，否則 false
   */
  abstract hasActiveGame(playerId: string): Promise<boolean>
}
