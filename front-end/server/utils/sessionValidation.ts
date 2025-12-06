/**
 * Session Validation Utility - Framework Layer
 *
 * @description
 * 提供會話驗證功能。
 * 驗證 X-Session-Token header 並返回遊戲與玩家上下文。
 *
 * @module server/utils/sessionValidation
 */

import type { H3Event } from 'h3'
import type { Game } from '~~/server/domain/game/game'
import type { Player } from '~~/server/domain/game/player'
import { inMemoryGameStore } from '~~/server/adapters/persistence/inMemoryGameStore'

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
 * 驗證會話並返回遊戲與玩家上下文
 *
 * @param event - H3 事件
 * @param gameId - 遊戲 ID
 * @returns 會話上下文
 * @throws SessionValidationError 如果驗證失敗
 */
export function validateSession(event: H3Event, gameId: string): SessionContext {
  // 1. 取得 X-Session-Token header
  const token = getHeader(event, 'x-session-token')

  if (!token) {
    throw new SessionValidationError(
      'MISSING_TOKEN',
      401,
      'X-Session-Token header is required'
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
