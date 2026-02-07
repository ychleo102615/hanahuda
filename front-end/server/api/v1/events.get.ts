/**
 * SSE Events Endpoint
 *
 * @description
 * Server-Sent Events 端點，統一推送遊戲和配對事件。
 *
 * 認證方式：透過 session_id Cookie 驗證身份
 *
 * 初始事件：
 * - 連線建立時自動查詢玩家狀態
 * - 發送 GatewayConnected 事件，包含玩家狀態
 * - 若玩家在遊戲中（IN_PROGRESS），發送 GameSnapshotRestore 恢復狀態
 *
 * SSE 格式：
 * event: ${domain}:${type}\ndata: ${JSON.stringify(gatewayEvent)}\n\n
 *
 * @module server/api/v1/events.get
 */

import { getIdentityPortAdapter } from '~~/server/core-game/adapters/identity/identityPortAdapter'
import { playerConnectionManager } from '~~/server/gateway/playerConnectionManager'
import { playerStatusService, type PlayerStatusInGame, type PlayerStatusInPrivateRoom } from '~~/server/gateway/playerStatusService'
import { createGatewayEvent, createGameEvent, type GatewayEvent } from '~~/server/shared/infrastructure/event-bus'
import { inMemoryGameStore } from '~~/server/core-game/adapters/persistence/inMemoryGameStore'
import { eventMapper } from '~~/server/core-game/adapters/mappers/eventMapper'
import { resolve, BACKEND_TOKENS } from '~~/server/utils/container'
import type { GameTimeoutPort } from '~~/server/core-game/application/ports/output/gameTimeoutPort'
import { getMatchmakingContainer } from '~~/server/matchmaking/adapters/di/container'
import { getInMemoryPrivateRoomStore } from '~~/server/matchmaking/adapters/persistence/inMemoryPrivateRoomStore'
import { getPrivateRoomTimeoutManager } from '~~/server/matchmaking/adapters/timeout/privateRoomTimeoutManager'
import { gameConfig } from '~~/server/utils/config'
import { logger } from '~~/server/utils/logger'

export default defineEventHandler(async (event) => {
  // 1. Cookie 認證
  const sessionId = getCookie(event, 'session_id')

  if (!sessionId) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized: no session',
    })
  }

  const identityPort = getIdentityPortAdapter()
  const playerId = await identityPort.getPlayerIdFromSessionId(sessionId)

  if (!playerId) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized: invalid session',
    })
  }

  // 2. 設定 SSE 回應標頭
  setHeader(event, 'Content-Type', 'text/event-stream')
  setHeader(event, 'Cache-Control', 'no-cache')
  setHeader(event, 'Connection', 'keep-alive')

  // 3. 建立 ReadableStream
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder()

      /**
       * 發送 SSE 事件
       */
      function sendSSE(gatewayEvent: GatewayEvent): void {
        try {
          const eventName = `${gatewayEvent.domain}:${gatewayEvent.type}`
          const data = JSON.stringify(gatewayEvent)
          controller.enqueue(encoder.encode(`event: ${eventName}\ndata: ${data}\n\n`))
        } catch {
          // 連線可能已關閉
        }
      }

      // 4. 註冊連線到 PlayerConnectionManager
      playerConnectionManager.registerConnection(playerId, sendSSE)

      // 4.1 Private Room: 清除斷線計時器（重新連線時）
      try {
        getPrivateRoomTimeoutManager().clearDisconnectionTimer(playerId)
      } catch {
        // Timer manager 尚未初始化（非私房功能運作中），忽略
      }

      // 5. 發送初始狀態事件
      void (async () => {
        try {
          const playerStatus = await playerStatusService.getPlayerStatus(playerId)

          // 發送 GatewayConnected
          const initialEvent = createGatewayEvent('GAME', 'GatewayConnected', {
            player_id: playerId,
            ...playerStatus,
          })
          sendSSE(initialEvent)

          // 6. Private Room: FULL 房間 SSE 觸發（雙方就位 → 遊戲開始）
          if (playerStatus.status === 'IN_PRIVATE_ROOM') {
            const { roomStatus } = playerStatus as PlayerStatusInPrivateRoom
            if (roomStatus === 'FULL') {
              const { startPrivateRoomGameUseCase } = getMatchmakingContainer()
              await startPrivateRoomGameUseCase.execute({ playerId })
            }
          }

          // 7. 若玩家在遊戲中且已開始（IN_PROGRESS），發送 GameSnapshotRestore
          if (playerStatus.status === 'IN_GAME') {
            const inGameStatus = playerStatus as PlayerStatusInGame
            if (inGameStatus.gameStatus === 'IN_PROGRESS') {
              const game = inMemoryGameStore.get(inGameStatus.gameId)
              if (game) {
                const gameTimeoutManager = resolve<GameTimeoutPort>(BACKEND_TOKENS.GameTimeoutManager)
                const remainingSeconds = gameTimeoutManager.getRemainingSeconds(game.id)
                const snapshotEvent = eventMapper.toGameSnapshotRestoreEvent(game, remainingSeconds ?? undefined)
                const gatewaySnapshotEvent = createGameEvent('GameSnapshotRestore', snapshotEvent)
                sendSSE(gatewaySnapshotEvent)
              } else {
                logger.warn('SSE: game not found in memory for IN_GAME status', {
                  playerId,
                  gameId: inGameStatus.gameId,
                })
              }
            }
          }
        } catch (error) {
          logger.error('SSE initial event error', { playerId, error })
        }
      })()

      // 7. 心跳
      const heartbeatMs = gameConfig.sse_heartbeat_interval_seconds * 1000
      const heartbeatTimer = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': heartbeat\n\n'))
        } catch {
          clearInterval(heartbeatTimer)
        }
      }, heartbeatMs)

      // 8. 連線關閉時清理
      event.node.req.on('close', () => {
        clearInterval(heartbeatTimer)
        playerConnectionManager.removeConnection(playerId)

        // Private Room: 房主斷線 → 啟動 30 秒計時器
        void (async () => {
          try {
            const privateRoomStore = getInMemoryPrivateRoomStore()
            const room = await privateRoomStore.findByPlayerId(playerId)
            if (room && room.isHost(playerId) && (room.status === 'WAITING' || room.status === 'FULL')) {
              getPrivateRoomTimeoutManager().setDisconnectionTimer(playerId, 30_000)
              logger.info('Host disconnection timer started', { roomId: room.roomId, playerId })
            }
          } catch {
            // Timer manager 尚未初始化，忽略
          }
        })()
      })
    },
  })

  return sendStream(event, stream)
})
