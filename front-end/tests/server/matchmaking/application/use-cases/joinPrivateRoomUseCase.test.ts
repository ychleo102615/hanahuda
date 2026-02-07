/**
 * JoinPrivateRoomUseCase Unit Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { JoinPrivateRoomUseCase } from '~~/server/matchmaking/application/use-cases/joinPrivateRoomUseCase'
import { PrivateRoom } from '~~/server/matchmaking/domain/privateRoom'
import type { PrivateRoomRepositoryPort } from '~~/server/matchmaking/application/ports/output/privateRoomRepositoryPort'
import type { PlayerGameStatusPort } from '~~/server/matchmaking/application/ports/output/playerGameStatusPort'
import type { MatchmakingPoolPort } from '~~/server/matchmaking/application/ports/output/matchmakingPoolPort'

describe('JoinPrivateRoomUseCase', () => {
  let useCase: JoinPrivateRoomUseCase
  let mockRepo: PrivateRoomRepositoryPort
  let mockPlayerGameStatus: PlayerGameStatusPort
  let mockPool: MatchmakingPoolPort
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

    mockPlayerGameStatus = {
      hasActiveGame: vi.fn().mockResolvedValue(false),
    } as unknown as PlayerGameStatusPort

    mockPool = {
      findByPlayerId: vi.fn().mockResolvedValue(undefined),
    } as unknown as MatchmakingPoolPort

    useCase = new JoinPrivateRoomUseCase(mockRepo, mockPlayerGameStatus, mockPool)
  })

  const validInput = {
    roomId: waitingRoom?.roomId ?? 'ABC123',
    playerId: 'guest-1',
    playerName: 'GuestPlayer',
  }

  it('should join a waiting room successfully', async () => {
    const result = await useCase.execute(validInput)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.hostName).toBe('HostPlayer')
      expect(result.roomType).toBe('STANDARD')
    }
    expect(mockRepo.save).toHaveBeenCalledOnce()
  })

  it('should transition room to FULL after join', async () => {
    await useCase.execute(validInput)

    expect(waitingRoom.status).toBe('FULL')
    expect(waitingRoom.guestId).toBe('guest-1')
    expect(waitingRoom.guestName).toBe('GuestPlayer')
  })

  it('should return ROOM_NOT_FOUND when room does not exist', async () => {
    vi.mocked(mockRepo.findByRoomId).mockResolvedValue(undefined)

    const result = await useCase.execute(validInput)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.errorCode).toBe('ROOM_NOT_FOUND')
    }
  })

  it('should return ROOM_EXPIRED when room is expired', async () => {
    const expiredRoom = PrivateRoom.create({
      hostId: 'host-1',
      hostName: 'HostPlayer',
      roomType: 'STANDARD',
    })
    expiredRoom.expire()
    vi.mocked(mockRepo.findByRoomId).mockResolvedValue(expiredRoom)

    const result = await useCase.execute(validInput)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.errorCode).toBe('ROOM_EXPIRED')
    }
  })

  it('should return ROOM_FULL when room is already full', async () => {
    waitingRoom.join('other-guest', 'OtherGuest')
    // Room is now FULL

    const result = await useCase.execute(validInput)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.errorCode).toBe('ROOM_FULL')
    }
  })

  it('should return CANNOT_JOIN_OWN_ROOM when host tries to join', async () => {
    const result = await useCase.execute({
      roomId: waitingRoom.roomId,
      playerId: 'host-1',
      playerName: 'HostPlayer',
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.errorCode).toBe('CANNOT_JOIN_OWN_ROOM')
    }
  })

  it('should return PLAYER_IN_GAME when guest has active game', async () => {
    vi.mocked(mockPlayerGameStatus.hasActiveGame).mockResolvedValue(true)

    const result = await useCase.execute(validInput)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.errorCode).toBe('PLAYER_IN_GAME')
    }
  })

  it('should return PLAYER_IN_MATCHMAKING when guest is in queue', async () => {
    vi.mocked(mockPool.findByPlayerId).mockResolvedValue({} as never)

    const result = await useCase.execute(validInput)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.errorCode).toBe('PLAYER_IN_MATCHMAKING')
    }
  })

  it('should return PLAYER_IN_ROOM when guest already has a room', async () => {
    vi.mocked(mockRepo.findByPlayerId).mockResolvedValue({} as never)

    const result = await useCase.execute(validInput)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.errorCode).toBe('PLAYER_IN_ROOM')
    }
  })
})
