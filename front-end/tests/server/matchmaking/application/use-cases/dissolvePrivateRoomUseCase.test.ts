/**
 * DissolvePrivateRoomUseCase Unit Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { DissolvePrivateRoomUseCase } from '~~/server/matchmaking/application/use-cases/dissolvePrivateRoomUseCase'
import { PrivateRoom } from '~~/server/matchmaking/domain/privateRoom'
import type { PrivateRoomRepositoryPort } from '~~/server/matchmaking/application/ports/output/privateRoomRepositoryPort'
import type { PrivateRoomTimerPort } from '~~/server/matchmaking/application/ports/output/privateRoomTimerPort'

describe('DissolvePrivateRoomUseCase', () => {
  let useCase: DissolvePrivateRoomUseCase
  let mockRepo: PrivateRoomRepositoryPort
  let mockTimerPort: PrivateRoomTimerPort
  let waitingRoom: PrivateRoom

  beforeEach(() => {
    waitingRoom = PrivateRoom.create({
      hostId: 'host-1',
      hostName: 'HostPlayer',
      roomType: 'STANDARD',
    })

    mockRepo = {
      save: vi.fn().mockResolvedValue(undefined),
      findByRoomId: vi.fn().mockResolvedValue(waitingRoom),
      findById: vi.fn().mockResolvedValue(undefined),
      findByPlayerId: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      findAllWaiting: vi.fn().mockResolvedValue([]),
      findAllFull: vi.fn().mockResolvedValue([]),
    } as unknown as PrivateRoomRepositoryPort

    mockTimerPort = {
      setExpirationTimer: vi.fn(),
      setWarningTimer: vi.fn(),
      setDisconnectionTimer: vi.fn(),
      clearTimers: vi.fn(),
      clearDisconnectionTimer: vi.fn(),
    } as unknown as PrivateRoomTimerPort

    useCase = new DissolvePrivateRoomUseCase(mockRepo, mockTimerPort)
  })

  it('should dissolve room successfully when requested by host', async () => {
    const result = await useCase.execute({
      roomId: waitingRoom.roomId,
      playerId: 'host-1',
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.guestId).toBeNull()
    }
    expect(mockRepo.save).toHaveBeenCalledOnce()
    expect(mockRepo.delete).toHaveBeenCalledWith(waitingRoom.id)
    expect(mockTimerPort.clearTimers).toHaveBeenCalledWith(waitingRoom.roomId)
  })

  it('should dissolve FULL room (with guest) and return guestId', async () => {
    waitingRoom.join('guest-1', 'GuestPlayer')

    const result = await useCase.execute({
      roomId: waitingRoom.roomId,
      playerId: 'host-1',
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.guestId).toBe('guest-1')
    }
    expect(waitingRoom.status).toBe('DISSOLVED')
  })

  it('should return ROOM_NOT_FOUND when room does not exist', async () => {
    vi.mocked(mockRepo.findByRoomId).mockResolvedValue(undefined)

    const result = await useCase.execute({
      roomId: 'NONEXIST',
      playerId: 'host-1',
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.errorCode).toBe('ROOM_NOT_FOUND')
    }
  })

  it('should return NOT_HOST when non-host tries to dissolve', async () => {
    const result = await useCase.execute({
      roomId: waitingRoom.roomId,
      playerId: 'guest-1',
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.errorCode).toBe('NOT_HOST')
    }
    expect(mockRepo.save).not.toHaveBeenCalled()
  })

  it('should return ROOM_IN_GAME when room has active game', async () => {
    waitingRoom.join('guest-1', 'GuestPlayer')
    waitingRoom.startGame('game-123')

    const result = await useCase.execute({
      roomId: waitingRoom.roomId,
      playerId: 'host-1',
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.errorCode).toBe('ROOM_IN_GAME')
    }
    expect(mockRepo.save).not.toHaveBeenCalled()
  })
})
