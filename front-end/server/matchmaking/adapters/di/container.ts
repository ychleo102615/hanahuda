/**
 * Matchmaking BC Dependency Injection Container
 *
 * @description
 * 管理 Matchmaking BC 的依賴注入。
 * 提供 Use Cases 與 Adapters 的工廠函數。
 *
 * @module server/matchmaking/adapters/di/container
 */

import { EnterMatchmakingUseCase } from '../../application/use-cases/enterMatchmakingUseCase'
import { ProcessMatchmakingUseCase } from '../../application/use-cases/processMatchmakingUseCase'
import { CreatePrivateRoomUseCase } from '../../application/use-cases/createPrivateRoomUseCase'
import { JoinPrivateRoomUseCase } from '../../application/use-cases/joinPrivateRoomUseCase'
import { StartPrivateRoomGameUseCase } from '../../application/use-cases/startPrivateRoomGameUseCase'
import { DissolvePrivateRoomUseCase } from '../../application/use-cases/dissolvePrivateRoomUseCase'
import { getInMemoryMatchmakingPool } from '../persistence/inMemoryMatchmakingPool'
import { getInMemoryPrivateRoomStore } from '../persistence/inMemoryPrivateRoomStore'
import { getMatchmakingEventBusAdapter } from '../event-publisher/matchmakingEventBusAdapter'
import { getPlayerGameStatusAdapter } from '~~/server/core-game/adapters/query/playerGameStatusAdapter'
import { getPlayerConnectionAdapter } from '../connection/playerConnectionAdapter'
import { initPrivateRoomTimeoutManager } from '../timeout/privateRoomTimeoutManager'
import { playerEventBus, createMatchmakingEvent } from '~~/server/shared/infrastructure/event-bus/playerEventBus'
import { PrivateRoomGameFinishedSubscriber } from '../event-subscriber/privateRoomGameFinishedSubscriber'
import { logger } from '~~/server/utils/logger'
import type { EnterMatchmakingInputPort } from '../../application/ports/input/enterMatchmakingInputPort'
import type { CreatePrivateRoomInputPort } from '../../application/ports/input/createPrivateRoomInputPort'
import type { JoinPrivateRoomInputPort } from '../../application/ports/input/joinPrivateRoomInputPort'
import type { StartPrivateRoomGameInputPort } from '../../application/ports/input/startPrivateRoomGameInputPort'
import type { DissolvePrivateRoomInputPort } from '../../application/ports/input/dissolvePrivateRoomInputPort'

// =============================================================================
// Container Interface
// =============================================================================

/**
 * Matchmaking BC Container
 */
export interface MatchmakingContainer {
  // Use Cases
  enterMatchmakingUseCase: EnterMatchmakingInputPort
  processMatchmakingUseCase: ProcessMatchmakingUseCase
  createPrivateRoomUseCase: CreatePrivateRoomInputPort
  joinPrivateRoomUseCase: JoinPrivateRoomInputPort
  startPrivateRoomGameUseCase: StartPrivateRoomGameInputPort
  dissolvePrivateRoomUseCase: DissolvePrivateRoomInputPort
}

// =============================================================================
// Container Factory
// =============================================================================

let container: MatchmakingContainer | null = null

/**
 * 建立或取得 Matchmaking Container
 *
 * 使用單例模式確保整個應用程式使用相同的依賴
 */
export function getMatchmakingContainer(): MatchmakingContainer {
  if (container) {
    return container
  }

  // 取得 Adapters
  const poolPort = getInMemoryMatchmakingPool()
  const eventPublisher = getMatchmakingEventBusAdapter()
  const playerGameStatusPort = getPlayerGameStatusAdapter()
  const privateRoomRepo = getInMemoryPrivateRoomStore()

  // 初始化 PrivateRoom Timer（Callbacks 在 DI 組裝時注入）
  const timerPort = initPrivateRoomTimeoutManager({
    onExpire: (roomId: string) => {
      void (async () => {
        const room = await privateRoomRepo.findByRoomId(roomId)
        if (room) {
          const playerIds = [room.hostId, ...(room.guestId ? [room.guestId] : [])]
          room.expire()
          await privateRoomRepo.save(room)

          // 發送 RoomDissolved SSE 給所有房間玩家
          const dissolvedEvent = createMatchmakingEvent('RoomDissolved', {
            event_type: 'RoomDissolved',
            room_id: roomId,
            reason: 'EXPIRED',
          })
          playerEventBus.broadcastToPlayers(playerIds, dissolvedEvent)

          await privateRoomRepo.delete(room.id)
          logger.info('Private room expired', { roomId })
        }
      })()
    },
    onWarning: (roomId: string) => {
      void (async () => {
        const room = await privateRoomRepo.findByRoomId(roomId)
        if (room) {
          const playerIds = [room.hostId, ...(room.guestId ? [room.guestId] : [])]

          // 發送 RoomExpiring SSE 給所有房間玩家
          const warningEvent = createMatchmakingEvent('RoomExpiring', {
            event_type: 'RoomExpiring',
            room_id: roomId,
            expires_in_seconds: 120,
          })
          playerEventBus.broadcastToPlayers(playerIds, warningEvent)

          logger.info('Private room expiring soon', { roomId })
        }
      })()
    },
    onDisconnect: (playerId: string) => {
      void (async () => {
        const room = await privateRoomRepo.findByPlayerId(playerId)
        if (room && room.isHost(playerId) && (room.status === 'WAITING' || room.status === 'FULL')) {
          const guestId = room.guestId
          room.dissolve()
          await privateRoomRepo.save(room)

          // 發送 RoomDissolved SSE 給訪客
          if (guestId) {
            playerEventBus.publishToPlayer(
              guestId,
              createMatchmakingEvent('RoomDissolved', {
                event_type: 'RoomDissolved',
                room_id: room.roomId,
                reason: 'HOST_DISSOLVED',
              })
            )
          }

          await privateRoomRepo.delete(room.id)
          logger.info('Private room dissolved due to host disconnection', { roomId: room.roomId, playerId })
        }
      })()
    },
  })

  // 建立 Use Cases
  const enterMatchmakingUseCase = new EnterMatchmakingUseCase(
    poolPort,
    playerGameStatusPort,
    eventPublisher,
    privateRoomRepo
  )

  const processMatchmakingUseCase = new ProcessMatchmakingUseCase(
    poolPort,
    eventPublisher
  )

  const createPrivateRoomUseCase = new CreatePrivateRoomUseCase(
    privateRoomRepo,
    playerGameStatusPort,
    poolPort,
    timerPort
  )

  const joinPrivateRoomUseCase = new JoinPrivateRoomUseCase(
    privateRoomRepo,
    playerGameStatusPort,
    poolPort
  )

  const connectionPort = getPlayerConnectionAdapter()
  const startPrivateRoomGameUseCase = new StartPrivateRoomGameUseCase(
    privateRoomRepo,
    connectionPort,
    eventPublisher,
    timerPort
  )

  const dissolvePrivateRoomUseCase = new DissolvePrivateRoomUseCase(
    privateRoomRepo,
    timerPort
  )

  // 訂閱 GAME_FINISHED 事件以清理私人房間
  const gameFinishedSubscriber = new PrivateRoomGameFinishedSubscriber(privateRoomRepo)
  gameFinishedSubscriber.subscribe()

  container = {
    enterMatchmakingUseCase,
    processMatchmakingUseCase,
    createPrivateRoomUseCase,
    joinPrivateRoomUseCase,
    startPrivateRoomGameUseCase,
    dissolvePrivateRoomUseCase,
  }

  return container
}

/**
 * 重置 Container（僅用於測試）
 */
export function resetMatchmakingContainer(): void {
  container = null
}
