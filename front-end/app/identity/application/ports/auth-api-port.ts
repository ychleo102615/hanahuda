/**
 * Auth API Port
 *
 * @description
 * 認證 API 的 Output Port 介面。
 * 由 Adapter Layer 實作。
 *
 * 參考: specs/010-player-account/plan.md - Frontend Application Layer
 */

import type { PlayerInfo, AuthResponse } from '#shared/contracts/identity-types'

/**
 * Auth API Port
 *
 * 定義與後端認證 API 交互的介面
 */
export abstract class AuthApiPort {
  /**
   * 建立訪客玩家
   *
   * POST /api/v1/auth/guest
   */
  abstract createGuest(): Promise<AuthResponse>

  /**
   * 取得當前玩家資訊
   *
   * GET /api/v1/auth/me
   * @throws 401 若未登入或 Session 過期
   */
  abstract getCurrentPlayer(): Promise<{ player: PlayerInfo }>

  /**
   * 登出
   *
   * POST /api/v1/auth/logout
   */
  abstract logout(): Promise<void>
}
