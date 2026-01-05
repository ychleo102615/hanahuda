/**
 * Session Validation Utility - Framework Layer
 *
 * @description
 * 提供會話驗證功能。
 * 透過 Identity BC 的 session_id Cookie 取得玩家身份，
 * 再透過 playerGameMap 查詢玩家所在的遊戲。
 *
 * 安全性設計：
 * - session_id 由 Identity BC 管理，存放在 HttpOnly Cookie
 * - 生產環境強制使用 Secure Cookie（僅 HTTPS）
 * - SameSite=Lax 防止 CSRF 攻擊
 *
 * @module server/utils/sessionValidation
 */

import type { H3Event } from 'h3'
import type { Game } from '~~/server/core-game/domain/game/game'
import type { Player } from '~~/server/core-game/domain/game/player'
import { inMemoryGameStore } from '~~/server/core-game/adapters/persistence/inMemoryGameStore'
import { getIdentityPortAdapter } from '~~/server/core-game/adapters/identity/identityPortAdapter'
import {
  HTTP_UNAUTHORIZED,
  HTTP_FORBIDDEN,
  HTTP_INTERNAL_SERVER_ERROR,
} from '#shared/constants'
import { logger } from '~~/server/utils/logger'

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
 * @description
 * 透過 Identity BC 取得 playerId，再查詢玩家所在的遊戲。
 *
 * 驗證流程：
 * 1. 透過 PlayerIdentityPort 從請求中取得 playerId
 * 2. 透過 playerGameMap 查詢玩家所在的遊戲
 * 3. 驗證遊戲 ID 匹配
 * 4. 驗證玩家是遊戲參與者
 *
 * @param event - H3 事件
 * @param gameId - 遊戲 ID
 * @returns 會話上下文
 * @throws SessionValidationError 如果驗證失敗
 */
export async function validateSession(event: H3Event, gameId: string): Promise<SessionContext> {
  // 1. 透過 PlayerIdentityPort 取得 playerId
  const identityPort = getIdentityPortAdapter()
  const playerId = await identityPort.getPlayerIdFromRequest(event)

  if (!playerId) {
    throw new SessionValidationError(
      'MISSING_TOKEN',
      HTTP_UNAUTHORIZED,
      'Valid session is required'
    )
  }

  // 2. 透過 playerId 查詢遊戲
  const game = inMemoryGameStore.getByPlayerId(playerId)

  if (!game) {
    logger.error('No active game for player', { errorCode: 'GAME_NOT_FOUND', playerId })
    throw new SessionValidationError(
      'GAME_NOT_FOUND',
      HTTP_UNAUTHORIZED,
      'No active game found for this session'
    )
  }

  // 3. 驗證遊戲 ID 匹配
  if (game.id !== gameId) {
    logger.error('Game mismatch', { errorCode: 'GAME_MISMATCH', gameId, expectedGameId: game.id, playerId })
    throw new SessionValidationError(
      'GAME_MISMATCH',
      HTTP_FORBIDDEN,
      'Session does not match game ID'
    )
  }

  // 4. 取得玩家實體（驗證是遊戲參與者）
  const player = game.players.find((p: Player) => p.id === playerId)
  if (!player) {
    throw new SessionValidationError(
      'PLAYER_NOT_FOUND',
      HTTP_INTERNAL_SERVER_ERROR,
      'Player not found in game'
    )
  }

  return {
    game,
    player,
    playerId,
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
