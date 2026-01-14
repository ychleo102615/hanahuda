/**
 * WebSocket Gateway Endpoint
 *
 * @description
 * 統一的 WebSocket 連線入口，整合配對和遊戲事件。
 * 取代原本的 REST API 端點。
 *
 * 認證方式（支援兩種模式）：
 * 1. Cookie 認證（單體架構）：透過 session_id Cookie 驗證身份
 * 2. Token 認證（多實例架構）：透過 URL 參數 handoff_token 驗證身份
 *
 * 初始事件：
 * - 連線建立時自動查詢玩家狀態
 * - 發送 GatewayConnected 事件，包含玩家狀態
 * - 若玩家在遊戲中，發送 GameSnapshotRestore 恢復狀態
 *
 * 雙向通訊：
 * - Server → Client: GatewayEvent（遊戲事件）
 * - Client → Server: WsCommand（命令）
 *
 * @module server/routes/_ws
 */

import type { Peer, Message } from 'crossws'
import { getIdentityPortAdapter } from '~~/server/core-game/adapters/identity/identityPortAdapter'
import { wsConnectionManager } from '~~/server/gateway/wsConnectionManager'
import { wsCommandHandler } from '~~/server/gateway/wsCommandHandler'
import { wsRateLimiter } from '~~/server/gateway/wsRateLimiter'
import { handoffTokenService } from '~~/server/gateway/handoffTokenService'
import { playerStatusService, type PlayerStatusInGame } from '~~/server/gateway/playerStatusService'
import { createGatewayEvent, createGameEvent } from '~~/server/shared/infrastructure/event-bus'
import { inMemoryGameStore } from '~~/server/core-game/adapters/persistence/inMemoryGameStore'
import { eventMapper } from '~~/server/core-game/adapters/mappers/eventMapper'
import { resolve, BACKEND_TOKENS } from '~~/server/utils/container'
import type { GameTimeoutPort } from '~~/server/core-game/application/ports/output/gameTimeoutPort'
import { logger } from '~~/server/utils/logger'
import { validateWsCommand, formatZodError, createErrorResponse } from '#shared/contracts'

/**
 * 從 Cookie 字串中解析 session_id
 */
function parseSessionIdFromCookie(cookieHeader: string | null | undefined): string | undefined {
  if (!cookieHeader) return undefined

  const cookies = cookieHeader.split(';').map((c) => c.trim())
  for (const cookie of cookies) {
    const [name, value] = cookie.split('=')
    if (name === 'session_id') {
      return value
    }
  }
  return undefined
}

/**
 * 從 peer context 取得 playerId
 */
function getPlayerIdFromPeer(peer: Peer): string | undefined {
  return wsConnectionManager.getPlayerIdByPeer(peer)
}

/**
 * 安全發送訊息，捕捉連線已關閉的錯誤
 *
 * @description
 * 在連線關閉後嘗試發送會拋出錯誤，此函數會捕捉並記錄這些錯誤。
 */
function safeSend(peer: Peer, message: string, playerId?: string): void {
  try {
    peer.send(message)
  } catch (error) {
    const errorCode = (error as NodeJS.ErrnoException)?.code
    // 連線已關閉的錯誤是正常的，不需要記錄
    if (errorCode !== 'ECONNRESET' && errorCode !== 'EPIPE') {
      logger.warn('WebSocket send failed', { playerId, error })
    }
  }
}

export default defineWebSocketHandler({
  /**
   * WebSocket 連線建立時
   */
  async open(peer) {
    try {
      let playerId: string | null = null

      // 嘗試從 URL 取得 handoff_token（多實例架構）
      const url = peer.request?.url
      const handoffToken = url ? new URL(url, 'http://localhost').searchParams.get('handoff_token') : null

      if (handoffToken) {
        // Token 認證（多實例模式）
        const payload = handoffTokenService.verifyToken(handoffToken)
        if (!payload) {
          logger.warn('WebSocket connection rejected: invalid handoff token')
          peer.close(4001, 'Unauthorized: invalid handoff token')
          return
        }
        playerId = payload.playerId
        logger.info('WebSocket authenticated via handoff token', { playerId, gameId: payload.gameId })
      } else {
        // Cookie 認證（單體模式）
        const cookieHeader = peer.request?.headers.get('cookie')
        const sessionId = parseSessionIdFromCookie(cookieHeader)

        if (!sessionId) {
          logger.warn('WebSocket connection rejected: no session_id cookie')
          peer.close(4001, 'Unauthorized: no session')
          return
        }

        const identityPort = getIdentityPortAdapter()
        playerId = await identityPort.getPlayerIdFromSessionId(sessionId)

        if (!playerId) {
          logger.warn('WebSocket connection rejected: invalid session_id')
          peer.close(4001, 'Unauthorized: invalid session')
          return
        }
      }

      // 註冊連線到 WsConnectionManager
      wsConnectionManager.registerConnection(playerId, peer)

      logger.info('WebSocket connected', { playerId })

      // 4. 查詢玩家狀態
      const playerStatus = await playerStatusService.getPlayerStatus(playerId)

      // 5. 發送初始狀態事件 (GatewayConnected)
      const initialEvent = createGatewayEvent('GAME', 'GatewayConnected', {
        player_id: playerId,
        ...playerStatus,
      })
      safeSend(peer, JSON.stringify(initialEvent), playerId)

      // 6. 若玩家在遊戲中，發送 GameSnapshotRestore 恢復遊戲狀態
      if (playerStatus.status === 'IN_GAME') {
        const inGameStatus = playerStatus as PlayerStatusInGame
        const game = inMemoryGameStore.get(inGameStatus.gameId)

        if (game) {
          // 取得剩餘超時秒數
          const gameTimeoutManager = resolve<GameTimeoutPort>(BACKEND_TOKENS.GameTimeoutManager)
          const remainingSeconds = gameTimeoutManager.getRemainingSeconds(game.id)

          // 建立 GameSnapshotRestore 事件
          const snapshotEvent = eventMapper.toGameSnapshotRestoreEvent(game, remainingSeconds ?? undefined)
          const gatewaySnapshotEvent = createGameEvent('GameSnapshotRestore', snapshotEvent)

          safeSend(peer, JSON.stringify(gatewaySnapshotEvent), playerId)
          logger.info('WebSocket sent GameSnapshotRestore', { playerId, gameId: game.id })
        } else {
          logger.warn('WebSocket: game not found in memory for IN_GAME status', {
            playerId,
            gameId: inGameStatus.gameId,
          })
        }
      }
    } catch (error) {
      logger.error('WebSocket open error', { error })
      peer.close(4500, 'Internal server error')
    }
  },

  /**
   * 接收到 WebSocket 訊息時
   */
  async message(peer, message: Message) {
    const playerId = getPlayerIdFromPeer(peer)

    if (!playerId) {
      logger.warn('WebSocket message from unknown peer')
      return
    }

    try {
      // Rate Limiting 檢查
      const rateLimitResult = wsRateLimiter.check(playerId)
      if (!rateLimitResult.allowed) {
        logger.warn('WebSocket rate limit exceeded', { playerId, retryAfter: rateLimitResult.retryAfter })
        const errorResponse = createErrorResponse(
          'rate_limit',
          'RATE_LIMIT_EXCEEDED',
          `Too many requests. Retry after ${rateLimitResult.retryAfter}s`
        )
        peer.send(JSON.stringify(errorResponse))
        return
      }

      // 解析訊息文字
      const text = typeof message === 'string' ? message : message.text()

      // 訊息大小限制（4KB）
      const MAX_MESSAGE_SIZE = 4096
      if (text.length > MAX_MESSAGE_SIZE) {
        logger.warn('WebSocket message too large', { playerId, size: text.length })
        const errorResponse = createErrorResponse(
          'size_limit',
          'MESSAGE_TOO_LARGE',
          `Message exceeds ${MAX_MESSAGE_SIZE} bytes limit`
        )
        peer.send(JSON.stringify(errorResponse))
        return
      }

      // 解析 JSON
      let parsed: unknown
      try {
        parsed = JSON.parse(text)
      } catch {
        logger.warn('WebSocket message invalid JSON', { playerId })
        const errorResponse = createErrorResponse('parse_error', 'INVALID_JSON', 'Invalid JSON format')
        peer.send(JSON.stringify(errorResponse))
        return
      }

      // Schema 驗證
      const validationResult = validateWsCommand(parsed)
      if (!validationResult.success) {
        const errorMessage = formatZodError(validationResult.error)
        logger.warn('WebSocket command validation failed', { playerId, error: errorMessage })
        const commandId = (parsed as { command_id?: string }).command_id ?? 'unknown'
        const errorResponse = createErrorResponse(commandId, 'VALIDATION_ERROR', errorMessage)
        peer.send(JSON.stringify(errorResponse))
        return
      }

      // 處理已驗證的命令
      await wsCommandHandler.handle(playerId, validationResult.data, peer)
    } catch (error) {
      logger.error('WebSocket message error', { playerId, error })
    }
  },

  /**
   * WebSocket 連線關閉時
   */
  close(peer, details) {
    try {
      const playerId = getPlayerIdFromPeer(peer)

      if (playerId) {
        wsConnectionManager.removeConnection(playerId)
        logger.info('WebSocket disconnected', {
          playerId,
          code: details?.code,
          reason: details?.reason,
        })
      }
    } catch (error) {
      // 防止 close 處理器拋出未捕捉的異常
      logger.error('WebSocket close handler error', { error })
    }
  },

  /**
   * WebSocket 錯誤時
   *
   * @description
   * 處理網路層錯誤（ECONNRESET、EPIPE 等）。
   * 這些錯誤通常是客戶端斷線造成的，屬於正常現象。
   */
  error(peer, error) {
    try {
      const playerId = getPlayerIdFromPeer(peer)
      const errorCode = (error as NodeJS.ErrnoException)?.code

      // ECONNRESET: 連線被對方重置（客戶端關閉瀏覽器）
      // EPIPE: 寫入已關閉的連線
      // 這些是正常的網路斷線，降級為 warn
      if (errorCode === 'ECONNRESET' || errorCode === 'EPIPE') {
        logger.warn('WebSocket connection reset', { playerId, code: errorCode })
      } else {
        logger.error('WebSocket error', { playerId, error })
      }
    } catch (handlerError) {
      // 防止 error 處理器自身拋出未捕捉的異常
      logger.error('WebSocket error handler error', { handlerError, originalError: error })
    }
  },
})
