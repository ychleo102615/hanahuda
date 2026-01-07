/**
 * GET /api/v1/matchmaking/status - Framework Layer
 *
 * @description
 * SSE 端點，用於接收配對狀態更新。
 *
 * Query Parameters:
 * - entry_id: 配對條目 ID（從 POST /matchmaking/enter 取得）
 *
 * Events:
 * - MatchmakingStatus: 狀態更新 (SEARCHING, LOW_AVAILABILITY)
 * - MatchFound: 配對成功，包含 game_id
 * - MatchmakingCancelled: 配對已取消
 *
 * Timeline:
 * - 0-10s: SEARCHING status
 * - 10-15s: LOW_AVAILABILITY status
 * - 15s+: MatchFound with bot opponent
 *
 * @see specs/011-online-matchmaking/contracts/matchmaking-api.yaml
 * @module server/api/v1/matchmaking/status
 */

import { z } from 'zod'
import { getIdentityPortAdapter } from '~~/server/core-game/adapters/identity/identityPortAdapter'
import { getInMemoryMatchmakingPool } from '~~/server/matchmaking/adapters/persistence/inMemoryMatchmakingPool'
import { getMatchmakingRegistry } from '~~/server/matchmaking/adapters/registry/matchmakingRegistrySingleton'
import { MatchmakingMapper } from '~~/server/matchmaking/adapters/mappers/matchmakingMapper'
import {
  HTTP_BAD_REQUEST,
  HTTP_UNAUTHORIZED,
  HTTP_NOT_FOUND,
} from '#shared/constants'
import {
  internalEventBus,
  type MatchFoundPayload,
} from '~~/server/shared/infrastructure/event-bus'

/**
 * Query Parameters Schema
 */
const StatusQuerySchema = z.object({
  entry_id: z.string().uuid('entry_id must be a valid UUID'),
})

/**
 * SSE 事件格式化
 */
function formatSSE(eventType: string, data: unknown): string {
  return `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`
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
      success: false,
      error_code: 'UNAUTHORIZED',
      message: 'Valid session is required. Please login first.',
    }
  }

  // 2. 解析並驗證 Query Parameters
  const query = getQuery(event)
  const parseResult = StatusQuerySchema.safeParse(query)

  if (!parseResult.success) {
    setResponseStatus(event, HTTP_BAD_REQUEST)
    return {
      success: false,
      error_code: 'INVALID_ENTRY_ID',
      message: 'entry_id is required and must be a valid UUID',
    }
  }

  const { entry_id: entryId } = parseResult.data

  // 3. 查找配對條目
  const pool = getInMemoryMatchmakingPool()
  const entry = await pool.findById(entryId)

  if (!entry) {
    setResponseStatus(event, HTTP_NOT_FOUND)
    return {
      success: false,
      error_code: 'ENTRY_NOT_FOUND',
      message: 'Matchmaking entry not found or expired',
    }
  }

  // 4. 驗證條目是否屬於當前玩家
  if (entry.playerId !== playerId) {
    setResponseStatus(event, HTTP_UNAUTHORIZED)
    return {
      success: false,
      error_code: 'UNAUTHORIZED',
      message: 'This matchmaking entry does not belong to you',
    }
  }

  // 5. 設定 SSE headers
  setHeaders(event, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  })

  // 6. 建立 SSE 串流
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder()
      let isClosed = false

      // 狀態更新回調（由 MatchmakingRegistry 觸發）
      const statusCallback = (update: {
        entry_id: string
        status: string
        message: string
        elapsed_seconds: number
      }) => {
        if (isClosed) return
        try {
          const eventDto = {
            event_type: 'MatchmakingStatus',
            ...update,
          }
          controller.enqueue(encoder.encode(formatSSE('MatchmakingStatus', eventDto)))
        } catch {
          // Connection closed
        }
      }

      // 監聽 MATCH_FOUND 事件
      const unsubscribeMatchFound = internalEventBus.onMatchFound((payload: MatchFoundPayload) => {
        if (isClosed) return
        // 檢查是否是當前玩家的配對
        if (payload.player1Id !== playerId && payload.player2Id !== playerId) {
          return
        }

        try {
          // 等待遊戲建立（由 GameCreationHandler 處理）
          // 這裡假設遊戲會在事件發布後很快建立
          // 實際的 game_id 需要從後續流程取得
          // 暫時使用延遲發送，等待 GameCreationHandler 完成
          setTimeout(() => {
            if (isClosed) return
            // 取得對手資訊
            const opponentName = payload.player1Id === playerId
              ? payload.player2Name
              : payload.player1Name
            const isBot = payload.matchType === 'BOT'

            // 注意：此時還沒有 game_id，需要從其他地方取得
            // 這是一個臨時解決方案，實際應該從 GameCreationHandler 取得
            const eventDto = MatchmakingMapper.toMatchFoundEventDto(
              'pending', // game_id 會由前端從 snapshot endpoint 取得
              opponentName,
              isBot
            )
            controller.enqueue(encoder.encode(formatSSE('MatchFound', eventDto)))

            // 配對成功後關閉連線
            setTimeout(() => {
              if (!isClosed) {
                isClosed = true
                controller.close()
              }
            }, 100)
          }, 200) // 給 GameCreationHandler 一點時間建立遊戲
        } catch {
          // Connection closed
        }
      })

      // 向 Registry 註冊條目（設定計時器）
      const registry = getMatchmakingRegistry()
      registry.registerEntry(entry, statusCallback)

      // 心跳計時器
      const heartbeatInterval = setInterval(() => {
        if (isClosed) {
          clearInterval(heartbeatInterval)
          return
        }
        try {
          controller.enqueue(encoder.encode(formatHeartbeat()))
        } catch {
          clearInterval(heartbeatInterval)
        }
      }, 15_000) // 15 秒心跳

      // 監聽連線關閉
      event.node.req.on('close', () => {
        isClosed = true
        clearInterval(heartbeatInterval)
        unsubscribeMatchFound()
        registry.unregisterEntry(entryId)
        controller.close()
      })

      // 發送初始連線成功訊息
      const connectMessage = `: connected to matchmaking ${entryId}\n\n`
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
