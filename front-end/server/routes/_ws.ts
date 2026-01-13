/**
 * WebSocket Gateway Endpoint
 *
 * @description
 * 統一的 WebSocket 連線入口，整合配對和遊戲事件。
 * 取代原本的 SSE 端點 /api/v1/events。
 *
 * 認證方式：
 * - 透過 session_id Cookie 驗證身份（在 WebSocket 升級階段讀取）
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
import { playerStatusService, type PlayerStatusInGame } from '~~/server/gateway/playerStatusService'
import { createGatewayEvent, createGameEvent } from '~~/server/shared/infrastructure/event-bus'
import { inMemoryGameStore } from '~~/server/core-game/adapters/persistence/inMemoryGameStore'
import { eventMapper } from '~~/server/core-game/adapters/mappers/eventMapper'
import { resolve, BACKEND_TOKENS } from '~~/server/utils/container'
import type { GameTimeoutPort } from '~~/server/core-game/application/ports/output/gameTimeoutPort'
import { logger } from '~~/server/utils/logger'
import type { WsCommand } from '#shared/contracts'

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

export default defineWebSocketHandler({
  /**
   * WebSocket 連線建立時
   */
  async open(peer) {
    try {
      // 1. 從升級請求中取得 Cookie
      const cookieHeader = peer.request?.headers.get('cookie')
      const sessionId = parseSessionIdFromCookie(cookieHeader)

      if (!sessionId) {
        logger.warn('WebSocket connection rejected: no session_id cookie')
        peer.close(4001, 'Unauthorized: no session')
        return
      }

      // 2. 驗證 session_id，取得 playerId
      const identityPort = getIdentityPortAdapter()
      const playerId = await identityPort.getPlayerIdFromSessionId(sessionId)

      if (!playerId) {
        logger.warn('WebSocket connection rejected: invalid session_id')
        peer.close(4001, 'Unauthorized: invalid session')
        return
      }

      // 3. 註冊連線到 WsConnectionManager
      wsConnectionManager.registerConnection(playerId, peer)

      logger.info('WebSocket connected', { playerId })

      // 4. 查詢玩家狀態
      const playerStatus = await playerStatusService.getPlayerStatus(playerId)

      // 5. 發送初始狀態事件 (GatewayConnected)
      const initialEvent = createGatewayEvent('GAME', 'GatewayConnected', {
        player_id: playerId,
        ...playerStatus,
      })
      peer.send(JSON.stringify(initialEvent))

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

          peer.send(JSON.stringify(gatewaySnapshotEvent))
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
      // 解析命令
      const text = typeof message === 'string' ? message : message.text()
      const command: WsCommand = JSON.parse(text)

      // 處理命令
      await wsCommandHandler.handle(playerId, command, peer)
    } catch (error) {
      logger.error('WebSocket message error', { playerId, error })
    }
  },

  /**
   * WebSocket 連線關閉時
   */
  close(peer) {
    const playerId = getPlayerIdFromPeer(peer)

    if (playerId) {
      wsConnectionManager.removeConnection(playerId)
      logger.info('WebSocket disconnected', { playerId })
    }
  },

  /**
   * WebSocket 錯誤時
   */
  error(peer, error) {
    const playerId = getPlayerIdFromPeer(peer)
    logger.error('WebSocket error', { playerId, error })
  },
})
