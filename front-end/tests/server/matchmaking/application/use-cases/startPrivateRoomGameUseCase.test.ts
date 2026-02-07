/**
 * StartPrivateRoomGameUseCase Unit Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { StartPrivateRoomGameUseCase } from '~~/server/matchmaking/application/use-cases/startPrivateRoomGameUseCase'
import { PrivateRoom } from '~~/server/matchmaking/domain/privateRoom'
import type { PrivateRoomRepositoryPort } from '~~/server/matchmaking/application/ports/output/privateRoomRepositoryPort'
import type { PlayerConnectionPort } from '~~/server/matchmaking/application/ports/output/playerConnectionPort'
import type { MatchmakingEventPublisherPort } from '~~/server/matchmaking/application/ports/output/matchmakingEventPublisherPort'
import type { PrivateRoomTimerPort } from '~~/server/matchmaking/application/ports/output/privateRoomTimerPort'

describe('StartPrivateRoomGameUseCase', () => {
  let useCase: StartPrivateRoomGameUseCase
  let mockRepo: PrivateRoomRepositoryPort
  let mockConnection: PlayerConnectionPort
  let mockEventPublisher: MatchmakingEventPublisherPort
  let mockTimerPort: PrivateRoomTimerPort
  let fullRoom: PrivateRoom

  beforeEach(() => {
    fullRoom = PrivateRoom.create({
      hostId: 'host-1',
      hostName: 'HostPlayer',
      roomType: 'STANDARD',
    })
    fullRoom.join('guest-1', 'GuestPlayer')
    // Room is now FULL

    mockRepo = {
      findByPlayerId: vi.fn().mockResolvedValue(fullRoom),
      save: vi.fn().mockResolvedValue(undefined),
    } as unknown as PrivateRoomRepositoryPort

    mockConnection = {
      isConnected: vi.fn().mockReturnValue(true),
    } as unknown as PlayerConnectionPort

    mockEventPublisher = {
      publishMatchFound: vi.fn(),
    } as unknown as MatchmakingEventPublisherPort

    mockTimerPort = {
      clearTimers: vi.fn(),
    } as unknown as PrivateRoomTimerPort

    useCase = new StartPrivateRoomGameUseCase(
      mockRepo,
      mockConnection,
      mockEventPublisher,
      mockTimerPort
    )
  })

  it('should publish MATCH_FOUND when both players are connected', async () => {
    const result = await useCase.execute({ playerId: 'host-1' })

    expect(result.started).toBe(true)
    expect(mockEventPublisher.publishMatchFound).toHaveBeenCalledWith(
      expect.objectContaining({
        player1Id: 'host-1',
        player1Name: 'HostPlayer',
        player2Id: 'guest-1',
        player2Name: 'GuestPlayer',
        roomType: 'STANDARD',
        matchType: 'PRIVATE',
      })
    )
  })

  it('should clear timers when game starts', async () => {
    await useCase.execute({ playerId: 'host-1' })

    expect(mockTimerPort.clearTimers).toHaveBeenCalledWith(fullRoom.roomId)
  })

  it('should not start when host is not connected', async () => {
    vi.mocked(mockConnection.isConnected).mockImplementation(
      (playerId) => playerId !== 'host-1'
    )

    const result = await useCase.execute({ playerId: 'guest-1' })

    expect(result.started).toBe(false)
    expect(mockEventPublisher.publishMatchFound).not.toHaveBeenCalled()
  })

  it('should not start when guest is not connected', async () => {
    vi.mocked(mockConnection.isConnected).mockImplementation(
      (playerId) => playerId !== 'guest-1'
    )

    const result = await useCase.execute({ playerId: 'host-1' })

    expect(result.started).toBe(false)
    expect(mockEventPublisher.publishMatchFound).not.toHaveBeenCalled()
  })

  it('should not start when room is WAITING (not FULL)', async () => {
    const waitingRoom = PrivateRoom.create({
      hostId: 'host-1',
      hostName: 'HostPlayer',
      roomType: 'STANDARD',
    })
    vi.mocked(mockRepo.findByPlayerId).mockResolvedValue(waitingRoom)

    const result = await useCase.execute({ playerId: 'host-1' })

    expect(result.started).toBe(false)
    expect(mockEventPublisher.publishMatchFound).not.toHaveBeenCalled()
  })

  it('should not start when player has no room', async () => {
    vi.mocked(mockRepo.findByPlayerId).mockResolvedValue(undefined)

    const result = await useCase.execute({ playerId: 'unknown' })

    expect(result.started).toBe(false)
    expect(mockEventPublisher.publishMatchFound).not.toHaveBeenCalled()
  })
})
