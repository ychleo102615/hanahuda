/**
 * POST /api/v1/auth/logout
 *
 * @description
 * 登出，清除認證狀態。
 * 同時關閉玩家的 WebSocket 連線，確保 Session 失效後無法繼續操作。
 *
 * 參考: specs/010-player-account/spec.md FR-013
 */

import { defineEventHandler, getCookie, deleteCookie } from 'h3'
import { getIdentityContainer } from '~~/server/identity/adapters/di/container'
import { getIdentityPortAdapter } from '~~/server/core-game/adapters/identity/identityPortAdapter'
import { wsConnectionManager } from '~~/server/gateway/wsConnectionManager'
import { COOKIE_NAMES } from '#shared/contracts/identity-types'

export default defineEventHandler(async (event) => {
  // 取得 Session ID
  const sessionId = getCookie(event, COOKIE_NAMES.SESSION)

  // 如果有 Session，執行登出
  if (sessionId) {
    // 取得 playerId 以關閉 WebSocket 連線
    const identityPort = getIdentityPortAdapter()
    const playerId = await identityPort.getPlayerIdFromSessionId(sessionId)

    // 關閉玩家的 WebSocket 連線（在 Session 失效前）
    if (playerId) {
      wsConnectionManager.forceDisconnect(playerId, 4002, 'Logged out')
    }

    const { logoutUseCase } = getIdentityContainer()

    const result = await logoutUseCase.execute({
      sessionId,
    })

    if (!result.success) {
      // 即使登出失敗，也清除 Cookie（graceful handling）
      console.warn('Logout use case failed:', result.message)
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
