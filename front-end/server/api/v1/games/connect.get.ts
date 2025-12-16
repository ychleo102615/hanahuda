/**
 * GET /api/v1/games/connect - Framework Layer
 *
 * @description
 * 統一 SSE 連線端點（SSE-First 架構）。
 * 整合遊戲加入/重連邏輯，第一個事件永遠是 InitialState。
 *
 * URL: GET /api/v1/games/connect?player_id=xxx&player_name=xxx[&game_id=xxx]
 *
 * Query Parameters:
 * - player_id: 必填，玩家 UUID
 * - player_name: 必填，玩家名稱
 * - game_id: 可選，有值表示重連特定遊戲
 *
 * 流程：
 * 1. 驗證 session_token Cookie
 * 2. 呼叫 JoinGameUseCase.execute()
 * 3. 建立 SSE 連線
 * 4. 發送 InitialState 事件（第一個事件）
 * 5. 註冊連線，接收後續遊戲事件
 *
 * @module server/api/v1/games/connect
 */

import { randomUUID } from 'crypto'
import { z } from 'zod'
import type {
  GameEvent,
  InitialStateEvent,
  InitialStateResponseType,
  InitialStateData,
  GameWaitingData,
  GameStartedData,
  GameSnapshotRestore,
  GameFinishedInfo,
} from '#shared/contracts'
import { connectionStore } from '~~/server/adapters/event-publisher/connectionStore'
import { container } from '~~/server/utils/container'
import { gameConfig } from '~~/server/utils/config'
import { setSessionCookie, SESSION_COOKIE_NAME } from '~~/server/utils/sessionValidation'
import { createLogger } from '~~/server/utils/logger'
import { initRequestId } from '~~/server/utils/requestId'
import {
  markPlayerDisconnected,
  markPlayerReconnected,
  getPlayerConnectionStatus,
} from '~~/server/domain/game/playerConnection'

/**
 * Query Parameters Schema
 */
const ConnectQuerySchema = z.object({
  player_id: z.string().uuid('player_id must be a valid UUID'),
  player_name: z.string().min(1, 'player_name is required').max(50, 'player_name must be at most 50 characters'),
  game_id: z.string().uuid('game_id must be a valid UUID').optional(),
  room_type: z.enum(['QUICK', 'STANDARD', 'MARATHON']).optional(),
})

/**
 * SSE 事件格式化
 */
function formatSSE(event: GameEvent | InitialStateEvent): string {
  const eventType = event.event_type
  const data = JSON.stringify(event)
  return `event: ${eventType}\ndata: ${data}\n\n`
}

/**
 * 心跳事件格式化
 */
function formatHeartbeat(): string {
  return `: heartbeat ${new Date().toISOString()}\n\n`
}

/**
 * 建立 InitialState 事件
 */
function buildInitialStateEvent(
  responseType: InitialStateResponseType,
  gameId: string,
  playerId: string,
  data: InitialStateData
): InitialStateEvent {
  return {
    event_type: 'InitialState',
    event_id: randomUUID(),
    timestamp: new Date().toISOString(),
    response_type: responseType,
    game_id: gameId,
    player_id: playerId,
    data,
  }
}

export default defineEventHandler(async (event) => {
  const requestId = initRequestId(event)
  const logger = createLogger('API:connect', requestId)

  // 1. 解析並驗證 Query Parameters
  const query = getQuery(event)
  const parseResult = ConnectQuerySchema.safeParse(query)

  if (!parseResult.success) {
    logger.warn('Validation failed', { errors: parseResult.error.flatten().fieldErrors })
    setResponseStatus(event, 400)
    return {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid query parameters',
        details: parseResult.error.flatten().fieldErrors,
      },
      timestamp: new Date().toISOString(),
    }
  }

  const { player_id: playerId, player_name: playerName, game_id: gameId, room_type: roomType } = parseResult.data

  // 2. 從 Cookie 讀取 session_token
  const sessionToken = getCookie(event, SESSION_COOKIE_NAME)

  logger.info('Processing connect request', {
    playerId,
    playerName,
    hasGameId: !!gameId,
    roomType: roomType ?? 'default',
    hasSessionToken: !!sessionToken,
  })

  // 3. 呼叫 JoinGameUseCase
  const useCase = container.joinGameUseCase
  const result = await useCase.execute({
    playerId,
    playerName,
    sessionToken,
    gameId,
    roomType,
  })

  logger.info('JoinGameUseCase result', { status: result.status })

  // 4. 根據結果決定處理方式
  // 對於非成功狀態（game_expired），返回錯誤而非 SSE
  if (result.status === 'game_expired') {
    logger.info('Game expired', { gameId: result.gameId })
    setResponseStatus(event, 410) // Gone
    return {
      error: {
        code: 'GAME_EXPIRED',
        message: 'Game has expired',
        game_id: result.gameId,
      },
      timestamp: new Date().toISOString(),
    }
  }

  // 5. 建立 InitialState 事件資料
  let initialStateEvent: InitialStateEvent
  let effectiveGameId: string
  let effectiveSessionToken: string

  switch (result.status) {
    case 'game_waiting': {
      effectiveGameId = result.gameId
      effectiveSessionToken = result.sessionToken
      const waitingData: GameWaitingData = {
        game_id: result.gameId,
        player_id: result.playerId,
        player_name: result.playerName,
        timeout_seconds: result.timeoutSeconds,
      }
      initialStateEvent = buildInitialStateEvent('game_waiting', result.gameId, playerId, waitingData)
      break
    }

    case 'game_started': {
      effectiveGameId = result.gameId
      effectiveSessionToken = result.sessionToken
      const startedData: GameStartedData = {
        game_id: result.gameId,
        players: result.players.map(p => ({
          player_id: p.playerId,
          player_name: p.playerName,
          is_ai: p.isAi,
        })),
        ruleset: {
          total_rounds: result.ruleset.totalRounds,
          yaku_settings: [],
          special_rules: { teshi_enabled: true, field_kuttsuki_enabled: true },
          total_deck_cards: 48,
        },
        starting_player_id: result.startingPlayerId,
      }
      initialStateEvent = buildInitialStateEvent('game_started', result.gameId, playerId, startedData)
      break
    }

    case 'snapshot': {
      effectiveGameId = result.gameId
      effectiveSessionToken = result.sessionToken
      // snapshot 已經是完整的 GameSnapshotRestore 事件
      initialStateEvent = buildInitialStateEvent(
        'snapshot',
        result.gameId,
        playerId,
        result.snapshot as GameSnapshotRestore
      )
      break
    }

    case 'game_finished': {
      effectiveGameId = result.gameId
      effectiveSessionToken = sessionToken || ''
      const finishedData: GameFinishedInfo = {
        game_id: result.gameId,
        winner_id: result.winnerId,
        final_scores: result.finalScores.map(s => ({
          player_id: s.playerId,
          score: s.score,
        })),
        rounds_played: result.roundsPlayed,
        total_rounds: result.totalRounds,
      }
      initialStateEvent = buildInitialStateEvent('game_finished', result.gameId, playerId, finishedData)
      break
    }

    // 舊版相容（不應該到達這裡，但保留以防萬一）
    case 'success': {
      effectiveGameId = result.gameId
      effectiveSessionToken = result.sessionToken
      // 舊版 success 沒有足夠資訊建立 InitialState
      // 這是過渡期的相容處理
      logger.warn('Legacy success status encountered, this should not happen')
      setResponseStatus(event, 500)
      return {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Unexpected legacy status',
        },
        timestamp: new Date().toISOString(),
      }
    }

    default: {
      const _exhaustiveCheck: never = result
      throw new Error(`Unexpected status: ${(_exhaustiveCheck as { status: string }).status}`)
    }
  }

  // 6. 設定 Session Cookie（如果是新 session）
  if (effectiveSessionToken && effectiveSessionToken !== sessionToken) {
    setSessionCookie(event, effectiveSessionToken)
    logger.info('Session cookie set', { gameId: effectiveGameId })
  }

  // 7. 設定 SSE headers
  setHeaders(event, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no', // Disable nginx buffering
  })

  // 8. 建立 SSE 串流
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder()

      // 立即發送 InitialState 事件（第一個事件）
      try {
        const sseData = formatSSE(initialStateEvent)
        controller.enqueue(encoder.encode(sseData))
        logger.info('InitialState event sent', {
          gameId: effectiveGameId,
          responseType: initialStateEvent.response_type,
        })
      } catch (error) {
        logger.error('Failed to send InitialState', error)
      }

      // 對於 game_finished，不需要建立持久連線
      if (initialStateEvent.response_type === 'game_finished') {
        controller.close()
        return
      }

      // 事件處理器（接收後續遊戲事件）
      const handler = (gameEvent: GameEvent) => {
        try {
          const sseData = formatSSE(gameEvent)
          controller.enqueue(encoder.encode(sseData))
        } catch (error) {
          logger.error('Error sending event', { error, playerId })
        }
      }

      // 註冊連線
      connectionStore.addConnection(effectiveGameId, playerId, handler)
      logger.info('Player connected', { gameId: effectiveGameId, playerId })

      // 清除斷線超時（重連時）
      container.gameTimeoutManager.clearDisconnectTimeout(effectiveGameId, playerId)

      // 重連處理：若玩家之前是 DISCONNECTED 狀態，標記為重新連線
      const currentGame = container.gameStore.get(effectiveGameId)
      if (currentGame) {
        const connectionStatus = getPlayerConnectionStatus(currentGame, playerId)
        if (connectionStatus === 'DISCONNECTED') {
          const reconnectedGame = markPlayerReconnected(currentGame, playerId)
          container.gameStore.set(reconnectedGame)
          container.gameRepository.save(reconnectedGame).catch(error => {
            logger.error('Failed to save reconnected game state', error)
          })
          logger.info('Player reconnected and marked as CONNECTED', { gameId: effectiveGameId, playerId })
        }
      }

      // 心跳計時器
      const heartbeatInterval = setInterval(() => {
        try {
          const heartbeat = formatHeartbeat()
          controller.enqueue(encoder.encode(heartbeat))
        } catch (error) {
          logger.error('Error sending heartbeat', { error, playerId })
          clearInterval(heartbeatInterval)
        }
      }, gameConfig.sse_heartbeat_interval_seconds * 1000)

      // 監聽連線關閉
      event.node.req.on('close', () => {
        clearInterval(heartbeatInterval)
        connectionStore.removeConnection(effectiveGameId, playerId)
        controller.close()
        logger.info('Player disconnected', { gameId: effectiveGameId, playerId })

        // 新邏輯（Phase 5）：標記玩家為 DISCONNECTED，不立即結束遊戲
        // 遊戲繼續進行（由系統代行，3秒超時），回合結束時檢查並決定是否結束遊戲
        const disconnectGame = container.gameStore.get(effectiveGameId)
        if (disconnectGame && disconnectGame.status === 'IN_PROGRESS') {
          // 檢查玩家是否已經是 LEFT 狀態（已主動離開）
          const status = getPlayerConnectionStatus(disconnectGame, playerId)
          if (status !== 'LEFT') {
            // 標記為 DISCONNECTED
            const disconnectedGame = markPlayerDisconnected(disconnectGame, playerId)
            container.gameStore.set(disconnectedGame)
            container.gameRepository.save(disconnectedGame).catch(error => {
              logger.error('Failed to save disconnected game state', error)
            })
            logger.info('Player marked as DISCONNECTED, game continues with accelerated auto-action', {
              gameId: effectiveGameId,
              playerId,
            })
          }

          // 啟動斷線超時計時器（用於在沒有活動的情況下的保護機制）
          // 若玩家在超時前重連，計時器會被清除
          container.gameTimeoutManager.startDisconnectTimeout(
            effectiveGameId,
            playerId,
            async () => {
              logger.info('Player disconnect timeout reached', { gameId: effectiveGameId, playerId })
              // 斷線超時後，若遊戲仍在進行且玩家仍斷線，標記為 LEFT
              // 這是一個保護機制，正常情況下回合結束時就會處理
              try {
                const timeoutGame = container.gameStore.get(effectiveGameId)
                if (timeoutGame && timeoutGame.status === 'IN_PROGRESS') {
                  const currentStatus = getPlayerConnectionStatus(timeoutGame, playerId)
                  if (currentStatus === 'DISCONNECTED') {
                    // 呼叫 leaveGameUseCase 標記為 LEFT
                    await container.leaveGameUseCase.execute({
                      gameId: effectiveGameId,
                      playerId,
                    })
                    logger.info('Disconnected player marked as LEFT after timeout', { gameId: effectiveGameId })
                  }
                }
              } catch (error) {
                logger.error('Failed to handle disconnect timeout', error)
              }
            }
          )
        }
      })

      // 發送初始連線成功訊息（SSE 註解）
      const connectMessage = `: connected to game ${effectiveGameId}\n\n`
      controller.enqueue(encoder.encode(connectMessage))
    },
  })

  // 9. 返回 SSE 串流
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
})
