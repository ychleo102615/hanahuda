/**
 * GET /api/v1/games/{gameId}/events - Framework Layer
 *
 * @description
 * SSE 連線端點。
 * 透過 Identity BC 驗證會話並建立 SSE 連線，接收遊戲事件。
 *
 * 參考: specs/008-nuxt-backend-server/contracts/sse-events.md
 */

import type { GameEvent } from '#shared/contracts'
import type { Player } from '~~/server/core-game/domain/game/player'
import { inMemoryGameStore } from '~~/server/core-game/adapters/persistence/inMemoryGameStore'
import { connectionStore } from '~~/server/core-game/adapters/event-publisher/connectionStore'
import { getIdentityPortAdapter } from '~~/server/core-game/adapters/identity/identityPortAdapter'
import { resolve, BACKEND_TOKENS } from '~~/server/utils/container'
import type { GameTimeoutPort } from '~~/server/core-game/application/ports/output/gameTimeoutPort'
import type { LeaveGameInputPort } from '~~/server/core-game/application/ports/input/leaveGameInputPort'
import { gameConfig } from '~~/server/utils/config'
import {
  HTTP_BAD_REQUEST,
  HTTP_UNAUTHORIZED,
  HTTP_FORBIDDEN,
  HTTP_INTERNAL_SERVER_ERROR,
} from '#shared/constants'

/**
 * SSE 事件格式化
 *
 * @param event - 遊戲事件
 * @returns SSE 格式的字串
 */
function formatSSE(event: GameEvent): string {
  const eventType = event.event_type
  const data = JSON.stringify(event)
  return `event: ${eventType}\ndata: ${data}\n\n`
}

/**
 * 心跳事件格式化
 *
 * @returns SSE 格式的心跳字串
 */
function formatHeartbeat(): string {
  return `: heartbeat ${new Date().toISOString()}\n\n`
}

export default defineEventHandler(async (event) => {
  const gameId = getRouterParam(event, 'gameId')

  // 1. 驗證參數
  if (!gameId) {
    setResponseStatus(event, HTTP_BAD_REQUEST)
    return { error: { code: 'MISSING_GAME_ID', message: 'Game ID is required' } }
  }

  // 2. 透過 PlayerIdentityPort 取得 playerId
  const identityPort = getIdentityPortAdapter()
  const playerId = await identityPort.getPlayerIdFromRequest(event)

  if (!playerId) {
    setResponseStatus(event, HTTP_UNAUTHORIZED)
    return { error: { code: 'MISSING_TOKEN', message: 'Valid session is required' } }
  }

  // 3. 透過 playerId 查詢遊戲
  const game = inMemoryGameStore.getByPlayerId(playerId)

  if (!game) {
    setResponseStatus(event, HTTP_UNAUTHORIZED)
    return { error: { code: 'INVALID_SESSION', message: 'No active game found for this session' } }
  }

  if (game.id !== gameId) {
    setResponseStatus(event, HTTP_FORBIDDEN)
    return { error: { code: 'GAME_MISMATCH', message: 'Session does not match game ID' } }
  }

  // 4. 驗證玩家是遊戲參與者
  const player = game.players.find((p: Player) => p.id === playerId)
  if (!player) {
    setResponseStatus(event, HTTP_INTERNAL_SERVER_ERROR)
    return { error: { code: 'PLAYER_NOT_FOUND', message: 'Player not found in game' } }
  }

  // 5. 設定 SSE headers
  setHeaders(event, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no', // Disable nginx buffering
  })

  // 6. 建立 SSE 串流
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder()

      // 事件處理器
      const handler = (gameEvent: GameEvent) => {
        try {
          const sseData = formatSSE(gameEvent)
          controller.enqueue(encoder.encode(sseData))
        } catch {
          // Error handled silently
        }
      }

      // 註冊連線
      connectionStore.addConnection(gameId, playerId, handler)

      // 清除斷線超時（重連時）
      const gameTimeoutManager = resolve<GameTimeoutPort>(BACKEND_TOKENS.GameTimeoutManager)
      gameTimeoutManager.clearDisconnectTimeout(gameId, playerId)

      // 心跳計時器
      const heartbeatInterval = setInterval(() => {
        try {
          const heartbeat = formatHeartbeat()
          controller.enqueue(encoder.encode(heartbeat))
        } catch {
          clearInterval(heartbeatInterval)
        }
      }, gameConfig.sse_heartbeat_interval_seconds * 1000)

      // 監聽連線關閉
      event.node.req.on('close', () => {
        clearInterval(heartbeatInterval)
        connectionStore.removeConnection(gameId, playerId)
        controller.close()

        // 啟動斷線超時（若超時未重連，對手獲勝）
        const currentGame = inMemoryGameStore.get(gameId)
        if (currentGame && currentGame.status === 'IN_PROGRESS') {
          const leaveGameUseCase = resolve<LeaveGameInputPort>(BACKEND_TOKENS.LeaveGameInputPort)
          gameTimeoutManager.startDisconnectTimeout(
            gameId,
            playerId,
            async () => {
              try {
                await leaveGameUseCase.execute({
                  gameId,
                  playerId,
                })
              } catch {
                // Error handled silently
              }
            }
          )
        }
      })

      // 發送初始連線成功訊息
      const connectMessage = `: connected to game ${gameId}\n\n`
      controller.enqueue(encoder.encode(connectMessage))
    },
  })

  // 7. 返回 SSE 串流
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
})
