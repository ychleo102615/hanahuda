/**
 * GET /api/v1/games/{gameId}/events - Framework Layer
 *
 * @description
 * SSE 連線端點。
 * 驗證會話並建立 SSE 連線，接收遊戲事件。
 *
 * 參考: specs/008-nuxt-backend-server/contracts/sse-events.md
 */

import type { GameEvent } from '#shared/contracts'
import { inMemoryGameStore } from '~~/server/adapters/persistence/inMemoryGameStore'
import { connectionStore } from '~~/server/adapters/event-publisher/connectionStore'
import { gameConfig } from '~~/server/utils/config'

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
  const query = getQuery(event)
  const token = query.token as string | undefined

  // 1. 驗證參數
  if (!gameId) {
    setResponseStatus(event, 400)
    return { error: { code: 'MISSING_GAME_ID', message: 'Game ID is required' } }
  }

  if (!token) {
    setResponseStatus(event, 400)
    return { error: { code: 'MISSING_TOKEN', message: 'Session token is required' } }
  }

  // 2. 驗證會話
  const game = inMemoryGameStore.getBySessionToken(token)

  if (!game) {
    setResponseStatus(event, 401)
    return { error: { code: 'INVALID_SESSION', message: 'Invalid or expired session token' } }
  }

  if (game.id !== gameId) {
    setResponseStatus(event, 403)
    return { error: { code: 'GAME_MISMATCH', message: 'Session token does not match game ID' } }
  }

  // 3. 取得玩家 ID（從會話驗證）
  const humanPlayer = game.players.find((player) => !player.isAi)
  if (!humanPlayer) {
    setResponseStatus(event, 500)
    return { error: { code: 'NO_HUMAN_PLAYER', message: 'No human player found in game' } }
  }
  const playerId = humanPlayer.id

  // 4. 設定 SSE headers
  setHeaders(event, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no', // Disable nginx buffering
  })

  // 5. 建立 SSE 串流
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder()

      // 事件處理器
      const handler = (gameEvent: GameEvent) => {
        try {
          const sseData = formatSSE(gameEvent)
          controller.enqueue(encoder.encode(sseData))
        } catch (error) {
          console.error(`[SSE] Error sending event to player ${playerId}:`, error)
        }
      }

      // 註冊連線
      connectionStore.addConnection(gameId, playerId, handler)
      console.log(`[SSE] Player ${playerId} connected to game ${gameId}`)

      // 心跳計時器
      const heartbeatInterval = setInterval(() => {
        try {
          const heartbeat = formatHeartbeat()
          controller.enqueue(encoder.encode(heartbeat))
        } catch (error) {
          console.error(`[SSE] Error sending heartbeat to player ${playerId}:`, error)
          clearInterval(heartbeatInterval)
        }
      }, gameConfig.sse_heartbeat_interval_seconds * 1000)

      // 監聽連線關閉
      event.node.req.on('close', () => {
        clearInterval(heartbeatInterval)
        connectionStore.removeConnection(gameId, playerId)
        controller.close()
        console.log(`[SSE] Player ${playerId} disconnected from game ${gameId}`)
      })

      // 發送初始連線成功訊息
      const connectMessage = `: connected to game ${gameId}\n\n`
      controller.enqueue(encoder.encode(connectMessage))
    },
  })

  // 6. 返回 SSE 串流
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
})
