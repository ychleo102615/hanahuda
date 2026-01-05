/**
 * GET /api/v1/session - Framework Layer
 *
 * @description
 * Session API - 檢查是否有有效的 Identity BC session。
 * 此 API 用於 Lobby 頁面，確保玩家已登入。
 *
 * 設計說明：
 * - 透過 PlayerIdentityPort 檢查是否有有效的 session
 * - Session 管理完全由 Identity BC 負責
 *
 * @module server/api/v1/session
 */

import { getIdentityPortAdapter } from '~~/server/core-game/adapters/identity/identityPortAdapter'

/**
 * 成功回應型別
 */
interface SessionResponse {
  data: {
    /** 是否有有效的 session */
    has_session: boolean
    /** 玩家 ID（若有 session） */
    player_id: string | null
  }
  timestamp: string
}

export default defineEventHandler(async (event): Promise<SessionResponse> => {
  // 透過 PlayerIdentityPort 檢查是否有有效的 session
  const identityPort = getIdentityPortAdapter()
  const playerId = await identityPort.getPlayerIdFromRequest(event)

  return {
    data: {
      has_session: playerId !== null,
      player_id: playerId,
    },
    timestamp: new Date().toISOString(),
  }
})
