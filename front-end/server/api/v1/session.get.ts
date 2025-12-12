/**
 * GET /api/v1/session - Framework Layer
 *
 * @description
 * Session API - 取得或建立 session_token。
 * 此 API 用於 Lobby 頁面，確保玩家有 session_token。
 *
 * 設計說明：
 * - 如果已有 session_token Cookie，直接返回成功
 * - 如果沒有，建立新的 session_token 並設定 Cookie
 * - 這是 MVP 版本，之後可能會擴展為完整的使用者認證
 *
 * @module server/api/v1/session
 */

import { randomUUID } from 'crypto'
import { getCookie } from 'h3'
import { setSessionCookie, SESSION_COOKIE_NAME } from '~~/server/utils/sessionValidation'
import { createLogger } from '~~/server/utils/logger'
import { initRequestId } from '~~/server/utils/requestId'

/**
 * 成功回應型別
 */
interface SessionResponse {
  data: {
    /** 是否有有效的 session */
    has_session: boolean
    /** 是否為新建立的 session */
    is_new_session: boolean
  }
  timestamp: string
}

export default defineEventHandler(async (event): Promise<SessionResponse> => {
  const requestId = initRequestId(event)
  const logger = createLogger('API:session', requestId)

  // 1. 檢查是否已有 session_token Cookie
  const existingToken = getCookie(event, SESSION_COOKIE_NAME)

  if (existingToken) {
    logger.info('Existing session found', { tokenPrefix: existingToken.slice(0, 8) })
    return {
      data: {
        has_session: true,
        is_new_session: false,
      },
      timestamp: new Date().toISOString(),
    }
  }

  // 2. 建立新的 session_token
  const sessionToken = randomUUID()
  setSessionCookie(event, sessionToken)

  logger.info('New session created', { tokenPrefix: sessionToken.slice(0, 8) })

  return {
    data: {
      has_session: true,
      is_new_session: true,
    },
    timestamp: new Date().toISOString(),
  }
})
