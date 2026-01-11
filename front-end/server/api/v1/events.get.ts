/**
 * GET /api/v1/events - Game Gateway SSE 端點
 *
 * @description
 * 統一的 SSE 連線入口，整合配對和遊戲事件。
 * 前端只需要建立這一個 SSE 連線，即可接收所有事件。
 *
 * 認證方式：
 * - 透過 session_id Cookie 驗證身份
 *
 * 初始事件：
 * - 連線建立時自動查詢玩家狀態
 * - 發送 GatewayConnected 事件，包含玩家狀態
 *
 * 事件格式：
 * - SSE 事件名稱: `${domain}:${type}` (例如: MATCHMAKING:MatchFound)
 * - 資料格式: GatewayEvent JSON
 *
 * @see /Users/leo-huang/.claude/plans/ethereal-bubbling-peach.md
 * @module server/api/v1/events
 */

import { getIdentityPortAdapter } from '~~/server/core-game/adapters/identity/identityPortAdapter'
import { playerConnectionManager } from '~~/server/gateway/playerConnectionManager'
import { playerStatusService, type PlayerStatusInGame } from '~~/server/gateway/playerStatusService'
import {
  createGatewayEvent,
  createGameEvent,
  type GatewayEvent,
} from '~~/server/shared/infrastructure/event-bus'
import { HTTP_UNAUTHORIZED } from '#shared/constants'
import { logger } from '~~/server/utils/logger'
import { gameConfig } from '~~/server/utils/config'
import { inMemoryGameStore } from '~~/server/core-game/adapters/persistence/inMemoryGameStore'
import { eventMapper } from '~~/server/core-game/adapters/mappers/eventMapper'
import { resolve, BACKEND_TOKENS } from '~~/server/utils/container'
import type { GameTimeoutPort } from '~~/server/core-game/application/ports/output/gameTimeoutPort'

/**
 * SSE 事件格式化
 *
 * @description
 * 將 GatewayEvent 格式化為 SSE 格式。
 * 事件名稱為 `${domain}:${type}`，便於前端區分事件來源。
 */
function formatSSE(event: GatewayEvent): string {
  const eventType = `${event.domain}:${event.type}`
  const data = JSON.stringify(event)
  return `event: ${eventType}\ndata: ${data}\n\n`
}

/**
 * 心跳事件格式化
 */
function formatHeartbeat(): string {
  return `: heartbeat ${new Date().toISOString()}\n\n`
}

export default defineEventHandler(async (event) => {
  // 1. 驗證身份
  const identityPort = getIdentityPortAdapter()
  const playerId = await identityPort.getPlayerIdFromRequest(event)

  if (!playerId) {
    setResponseStatus(event, HTTP_UNAUTHORIZED)
    return {
      error: {
        code: 'UNAUTHORIZED',
        message: 'Valid session is required. Please login first.',
      },
      timestamp: new Date().toISOString(),
    }
  }

  // 2. 查詢玩家狀態
  const playerStatus = await playerStatusService.getPlayerStatus(playerId)

  // 3. 設定 SSE headers
  setHeaders(event, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no', // Disable nginx buffering
  })

  // 4. 建立 SSE 串流
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder()
      let isClosed = false

      /**
       * 發送事件到 SSE 連線
       */
      const sendEvent = (gatewayEvent: GatewayEvent) => {
        if (isClosed) return
        try {
          controller.enqueue(encoder.encode(formatSSE(gatewayEvent)))
        } catch {
          // Connection closed
        }
      }

      // 5. 註冊連線到 PlayerConnectionManager
      // 這會自動訂閱 PlayerEventBus，接收該玩家的所有事件
      playerConnectionManager.registerConnection(playerId, sendEvent)

      logger.info('Gateway SSE connected', { playerId, status: playerStatus.status })

      // 6. 發送初始狀態事件
      const initialEvent = createGatewayEvent('GAME', 'GatewayConnected', {
        player_id: playerId,
        ...playerStatus,
      })
      sendEvent(initialEvent)

      // 7. 若玩家在遊戲中，發送 GameSnapshotRestore 恢復遊戲狀態
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

          sendEvent(gatewaySnapshotEvent)
          logger.info('Gateway SSE sent GameSnapshotRestore', { playerId, gameId: game.id })
        } else {
          logger.warn('Gateway SSE: game not found in memory for IN_GAME status', {
            playerId,
            gameId: inGameStatus.gameId,
          })
        }
      }

      // 8. 心跳計時器
      const heartbeatInterval = setInterval(() => {
        if (isClosed) return
        try {
          controller.enqueue(encoder.encode(formatHeartbeat()))
        } catch {
          clearInterval(heartbeatInterval)
        }
      }, gameConfig.sse_heartbeat_interval_seconds * 1000)

      // 9. 監聽連線關閉
      event.node.req.on('close', () => {
        isClosed = true
        clearInterval(heartbeatInterval)
        playerConnectionManager.removeConnection(playerId)
        controller.close()
        logger.info('Gateway SSE disconnected', { playerId })
      })

      // 10. 發送連線成功訊息（SSE 註解）
      const connectMessage = `: connected as player ${playerId}\n\n`
      controller.enqueue(encoder.encode(connectMessage))
    },
  })

  // 11. 返回 SSE 串流
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
})
