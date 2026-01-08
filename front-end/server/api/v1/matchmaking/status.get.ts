/**
 * GET /api/v1/matchmaking/status - Framework Layer
 *
 * @deprecated
 * 此端點已被統一的 Gateway SSE 端點取代：GET /api/v1/events
 * 新架構提供單一 SSE 連線接收所有遊戲相關事件。
 * 此端點保留用於向後兼容，未來版本將移除。
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
 * @see GET /api/v1/events - 新的統一 Gateway SSE 端點
 * @module server/api/v1/matchmaking/status
 */

import { z } from 'zod'
import { getIdentityPortAdapter } from '~~/server/core-game/adapters/identity/identityPortAdapter'
import { getInMemoryMatchmakingPool } from '~~/server/matchmaking/adapters/persistence/inMemoryMatchmakingPool'
import { getMatchmakingRegistry } from '~~/server/matchmaking/adapters/registry/matchmakingRegistrySingleton'
import type { BotFallbackInfo } from '~~/server/matchmaking/adapters/registry/matchmakingRegistry'
import { MatchmakingMapper } from '~~/server/matchmaking/adapters/mappers/matchmakingMapper'
import { getMatchmakingContainer } from '~~/server/matchmaking/adapters/di/container'
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

  // 5. 檢查條目狀態是否可配對
  // 只有 SEARCHING 或 LOW_AVAILABILITY 狀態才能建立 SSE 連線
  // 這防止已配對/取消/過期的 entry 被重複連線導致計時器錯誤
  if (!entry.isMatchable()) {
    setResponseStatus(event, HTTP_BAD_REQUEST)
    return {
      success: false,
      error_code: 'ENTRY_NOT_MATCHABLE',
      message: `Matchmaking entry is in ${entry.status} status and cannot be used for matchmaking`,
    }
  }

  // 6. 設定 SSE headers
  setHeaders(event, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  })

  // 7. 建立 SSE 串流
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder()
      let isClosed = false
      let heartbeatInterval: NodeJS.Timeout | null = null
      let unsubscribeMatchFound: (() => void) | null = null
      const registry = getMatchmakingRegistry()

      /**
       * 統一的清理函數
       * 確保所有清理操作只執行一次，避免重複關閉 controller
       */
      const cleanup = () => {
        if (isClosed) return
        isClosed = true

        // 清除心跳計時器
        if (heartbeatInterval) {
          clearInterval(heartbeatInterval)
          heartbeatInterval = null
        }

        // 取消訂閱 MATCH_FOUND 事件
        if (unsubscribeMatchFound) {
          unsubscribeMatchFound()
          unsubscribeMatchFound = null
        }

        // 從 Registry 取消註冊（清除配對計時器）
        registry.unregisterEntry(entryId)

        // 關閉 SSE 連線
        try {
          controller.close()
        } catch {
          // Controller 可能已經關閉，忽略錯誤
        }
      }

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
      unsubscribeMatchFound = internalEventBus.onMatchFound((payload: MatchFoundPayload) => {
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
            try {
              const eventDto = MatchmakingMapper.toMatchFoundEventDto(
                'pending', // game_id 會由前端從 snapshot endpoint 取得
                opponentName,
                isBot
              )
              controller.enqueue(encoder.encode(formatSSE('MatchFound', eventDto)))
            } catch {
              // Connection closed
            }

            // 配對成功後關閉連線
            setTimeout(() => {
              cleanup()
            }, 100)
          }, 200) // 給 GameCreationHandler 一點時間建立遊戲
        } catch {
          // Connection closed
        }
      })

      // Bot Fallback 回調（由 Application Layer 定義）
      // 符合 Clean Architecture：Adapter 只負責計時，業務事件由 Use Case 發布
      const { processMatchmakingUseCase } = getMatchmakingContainer()
      const botFallbackCallback = async (info: BotFallbackInfo) => {
        if (isClosed) return
        try {
          await processMatchmakingUseCase.executeBotFallback({
            entryId: info.entryId,
            playerId: info.playerId,
            playerName: info.playerName,
            roomType: info.roomType,
          })
        } catch (error) {
          console.error('Bot fallback failed:', error)
        }
      }

      // 向 Registry 註冊條目（設定計時器）
      registry.registerEntry(entry, statusCallback, botFallbackCallback)

      // 心跳計時器
      heartbeatInterval = setInterval(() => {
        if (isClosed) {
          if (heartbeatInterval) {
            clearInterval(heartbeatInterval)
            heartbeatInterval = null
          }
          return
        }
        try {
          controller.enqueue(encoder.encode(formatHeartbeat()))
        } catch {
          if (heartbeatInterval) {
            clearInterval(heartbeatInterval)
            heartbeatInterval = null
          }
        }
      }, 15_000) // 15 秒心跳

      // 監聽連線關閉
      event.node.req.on('close', () => {
        cleanup()
      })

      // 發送初始連線成功訊息
      const connectMessage = `: connected to matchmaking ${entryId}\n\n`
      controller.enqueue(encoder.encode(connectMessage))
    },
  })

  // 8. 返回 SSE 串流
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
})
