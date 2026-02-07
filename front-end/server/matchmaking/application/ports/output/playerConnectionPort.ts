/**
 * Player Connection Port
 *
 * @description
 * 查詢玩家 SSE 連線狀態的 Output Port。
 * 由 PlayerConnectionAdapter (Adapter 層) 實作，
 * 委派給 Gateway 層的 playerConnectionManager。
 *
 * @module server/matchmaking/application/ports/output/playerConnectionPort
 */

/**
 * Player Connection Port
 */
export abstract class PlayerConnectionPort {
  /** 查詢玩家是否有活躍 SSE 連線 */
  abstract isConnected(playerId: string): boolean
}
