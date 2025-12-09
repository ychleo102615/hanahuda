/**
 * Session Validation Utility - Framework Layer
 *
 * @description
 * 提供會話驗證功能。
 * 優先從 HttpOnly Cookie 讀取 session_token，向後兼容 X-Session-Token header。
 *
 * 安全性設計：
 * - session_token 存放在 HttpOnly Cookie，防止 XSS 攻擊
 * - 生產環境強制使用 Secure Cookie（僅 HTTPS）
 * - SameSite=Lax 防止 CSRF 攻擊
 *
 * @module server/utils/sessionValidation
 */

import type { H3Event } from 'h3'
import { getCookie, setCookie, deleteCookie } from 'h3'
import type { Game } from '~~/server/domain/game/game'
import type { Player } from '~~/server/domain/game/player'
import { inMemoryGameStore } from '~~/server/adapters/persistence/inMemoryGameStore'

/**
 * Session Cookie 名稱
 */
export const SESSION_COOKIE_NAME = 'session_token'

/**
 * 會話驗證結果
 */
export interface SessionContext {
  /** 遊戲聚合根 */
  readonly game: Game
  /** 玩家實體 */
  readonly player: Player
  /** 玩家 ID */
  readonly playerId: string
}

/**
 * 會話驗證錯誤
 */
export class SessionValidationError extends Error {
  constructor(
    public readonly code: 'MISSING_TOKEN' | 'INVALID_SESSION' | 'GAME_MISMATCH' | 'PLAYER_NOT_FOUND' | 'GAME_NOT_FOUND',
    public readonly statusCode: number,
    message: string
  ) {
    super(message)
    this.name = 'SessionValidationError'
  }
}

/**
 * 從請求中取得 session token
 *
 * 優先順序：
 * 1. HttpOnly Cookie (推薦，安全性較高)
 * 2. X-Session-Token header (向後兼容)
 *
 * @param event - H3 事件
 * @returns session token 或 null
 */
export function getSessionToken(event: H3Event): string | null {
  // 優先從 Cookie 讀取
  const cookieToken = getCookie(event, SESSION_COOKIE_NAME)
  if (cookieToken) {
    return cookieToken
  }

  // 向後兼容：從 header 讀取
  const headerToken = getHeader(event, 'x-session-token')
  return headerToken || null
}

/**
 * 驗證會話並返回遊戲與玩家上下文
 *
 * @param event - H3 事件
 * @param gameId - 遊戲 ID
 * @returns 會話上下文
 * @throws SessionValidationError 如果驗證失敗
 */
export function validateSession(event: H3Event, gameId: string): SessionContext {
  // 1. 取得 session token（優先 Cookie，其次 header）
  const token = getSessionToken(event)

  if (!token) {
    throw new SessionValidationError(
      'MISSING_TOKEN',
      401,
      'Session token is required (via Cookie or X-Session-Token header)'
    )
  }

  // 2. 驗證會話
  const game = inMemoryGameStore.getBySessionToken(token)

  if (!game) {
    throw new SessionValidationError(
      'INVALID_SESSION',
      401,
      'Invalid or expired session token'
    )
  }

  // 3. 驗證遊戲 ID 匹配
  if (game.id !== gameId) {
    throw new SessionValidationError(
      'GAME_MISMATCH',
      403,
      'Session token does not match game ID'
    )
  }

  // 4. 取得人類玩家
  const humanPlayer = game.players.find((player) => !player.isAi)
  if (!humanPlayer) {
    throw new SessionValidationError(
      'PLAYER_NOT_FOUND',
      500,
      'No human player found in game'
    )
  }

  return {
    game,
    player: humanPlayer,
    playerId: humanPlayer.id,
  }
}

/**
 * 建立會話驗證錯誤回應
 *
 * @param error - 會話驗證錯誤
 * @returns 錯誤回應物件
 */
export function createSessionErrorResponse(error: SessionValidationError): {
  error: { code: string; message: string }
  timestamp: string
} {
  return {
    error: {
      code: error.code,
      message: error.message,
    },
    timestamp: new Date().toISOString(),
  }
}

/**
 * Cookie 設定選項
 */
export interface SessionCookieOptions {
  /** Cookie 有效期（秒），預設 2 小時 */
  maxAge?: number
}

/**
 * 設定 Session Cookie
 *
 * @description
 * 設定 HttpOnly Cookie 存放 session_token。
 * 安全性設定：
 * - HttpOnly: 防止 XSS 攻擊讀取 token
 * - Secure: 生產環境僅 HTTPS 傳送
 * - SameSite=Lax: 防止 CSRF，但允許從外部連結導航
 * - Path=/api: 只在 API 請求時傳送
 *
 * @param event - H3 事件
 * @param sessionToken - Session Token
 * @param options - Cookie 設定選項
 */
export function setSessionCookie(
  event: H3Event,
  sessionToken: string,
  options: SessionCookieOptions = {}
): void {
  const { maxAge = 60 * 60 * 2 } = options // 預設 2 小時

  setCookie(event, SESSION_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api',
    maxAge,
  })
}

/**
 * 清除 Session Cookie
 *
 * @description
 * 清除 session_token Cookie（用於登出或離開遊戲）。
 *
 * @param event - H3 事件
 */
export function clearSessionCookie(event: H3Event): void {
  deleteCookie(event, SESSION_COOKIE_NAME, {
    path: '/api',
  })
}
