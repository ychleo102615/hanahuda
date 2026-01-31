/**
 * POST /api/v1/auth/logout
 *
 * @description
 * 登出，清除認證狀態。
 * 同時移除玩家的 SSE 連線，確保 Session 失效後無法繼續操作。
 *
 * 參考: specs/010-player-account/spec.md FR-013
 */

import { defineEventHandler, getCookie, deleteCookie } from 'h3'
import { getIdentityContainer } from '~~/server/identity/adapters/di/container'
import { getIdentityPortAdapter } from '~~/server/core-game/adapters/identity/identityPortAdapter'
import { playerConnectionManager } from '~~/server/gateway/playerConnectionManager'
import { COOKIE_NAMES } from '#shared/contracts/identity-types'
import { logger } from '~~/server/utils/logger'

export default defineEventHandler(async (event) => {
  // 取得 Session ID
  const sessionId = getCookie(event, COOKIE_NAMES.SESSION)

  // 如果有 Session，執行登出
  if (sessionId) {
    // 取得 playerId 以移除 SSE 連線
    const identityPort = getIdentityPortAdapter()
    const playerId = await identityPort.getPlayerIdFromSessionId(sessionId)

    // 移除玩家的 SSE 連線（在 Session 失效前）
    if (playerId) {
      playerConnectionManager.removeConnection(playerId)
    }

    const { logoutUseCase } = getIdentityContainer()

    const result = await logoutUseCase.execute({
      sessionId,
    })

    if (!result.success) {
      // 即使登出失敗，也清除 Cookie（graceful handling）
      logger.warn('Logout use case failed', { message: result.message })
    }
  }

  // 清除 Session Cookie
  deleteCookie(event, COOKIE_NAMES.SESSION, {
    path: '/',
  })

  return {
    success: true,
    message: 'Logged out successfully',
  }
})
