/**
 * PlayerIdentityPort - Output Port
 *
 * @description
 * 玩家身份識別介面。
 * Core Game BC 透過此 Port 取得玩家身份，而不直接依賴 Identity BC。
 *
 * Adapter 實作：IdentityPortAdapter（呼叫 Identity BC 的 SessionStore）
 *
 * @module server/core-game/application/ports/output/playerIdentityPort
 */

import type { H3Event } from 'h3'

/**
 * 玩家身份識別 Port
 *
 * @description
 * Core Game BC 定義此介面來取得玩家身份。
 * 這是跨 Bounded Context 通訊的抽象邊界。
 *
 * 使用 abstract class 而非 interface：
 * - 防止 duck typing 造成的隱式相容
 * - 強制 Adapter 明確繼承此類別
 */
export abstract class PlayerIdentityPort {
  /**
   * 從 HTTP 請求中取得玩家 ID
   *
   * @param event - H3 事件物件（包含 request、cookies 等）
   * @returns playerId 或 null（未登入/無效 session）
   *
   * @description
   * 實作細節由 Adapter 決定：
   * - 讀取 session cookie
   * - 查詢 Session Store
   * - 取得關聯的 playerId
   */
  abstract getPlayerIdFromRequest(event: H3Event): Promise<string | null>
}
