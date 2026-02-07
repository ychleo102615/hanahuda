/**
 * CreatePrivateRoomUseCase Unit Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CreatePrivateRoomUseCase } from '~~/server/matchmaking/application/use-cases/createPrivateRoomUseCase'
import type { PrivateRoomRepositoryPort } from '~~/server/matchmaking/application/ports/output/privateRoomRepositoryPort'
import type { PlayerGameStatusPort } from '~~/server/matchmaking/application/ports/output/playerGameStatusPort'
import type { MatchmakingPoolPort } from '~~/server/matchmaking/application/ports/output/matchmakingPoolPort'
import type { PrivateRoomTimerPort } from '~~/server/matchmaking/application/ports/output/privateRoomTimerPort'

describe('CreatePrivateRoomUseCase', () => {
  let useCase: CreatePrivateRoomUseCase
  let mockPrivateRoomRepo: PrivateRoomRepositoryPort
  let mockPlayerGameStatusPort: PlayerGameStatusPort
  let mockPoolPort: MatchmakingPoolPort
  let mockTimerPort: PrivateRoomTimerPort

  beforeEach(() => {
    mockPrivateRoomRepo = {
      save: vi.fn().mockResolvedValue(undefined),
      findByRoomId: vi.fn().mockResolvedValue(undefined),
      findById: vi.fn().mockResolvedValue(undefined),
      findByPlayerId: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      findAllWaiting: vi.fn().mockResolvedValue([]),
      findAllFull: vi.fn().mockResolvedValue([]),
    } as unknown as PrivateRoomRepositoryPort

    mockPlayerGameStatusPort = {
      hasActiveGame: vi.fn().mockResolvedValue(false),
    } as unknown as PlayerGameStatusPort

    mockPoolPort = {
      findByPlayerId: vi.fn().mockResolvedValue(undefined),
    } as unknown as MatchmakingPoolPort

    mockTimerPort = {
      setExpirationTimer: vi.fn(),
      setWarningTimer: vi.fn(),
      setDisconnectionTimer: vi.fn(),
      clearTimers: vi.fn(),
      clearDisconnectionTimer: vi.fn(),
    } as unknown as PrivateRoomTimerPort

    useCase = new CreatePrivateRoomUseCase(
      mockPrivateRoomRepo,
      mockPlayerGameStatusPort,
      mockPoolPort,
      mockTimerPort
    )
  })

  const validInput = {
    playerId: 'player-1',
    playerName: 'TestPlayer',
    roomType: 'STANDARD' as const,
  }

  it('should create a private room successfully', async () => {
    const result = await useCase.execute(validInput)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.roomId).toHaveLength(6)
      expect(result.expiresAt).toBeInstanceOf(Date)
    }
    expect(mockPrivateRoomRepo.save).toHaveBeenCalledOnce()
    expect(mockTimerPort.setExpirationTimer).toHaveBeenCalledOnce()
    expect(mockTimerPort.setWarningTimer).toHaveBeenCalledOnce()
  })

  it('should start expiration timer with 10 minutes', async () => {
    await useCase.execute(validInput)

    expect(mockTimerPort.setExpirationTimer).toHaveBeenCalledWith(
      expect.any(String),
      600_000
    )
  })

  it('should start warning timer with 8 minutes', async () => {
    await useCase.execute(validInput)

    expect(mockTimerPort.setWarningTimer).toHaveBeenCalledWith(
      expect.any(String),
      480_000
    )
  })

  it('should return PLAYER_IN_GAME error when player has active game', async () => {
    vi.mocked(mockPlayerGameStatusPort.hasActiveGame).mockResolvedValue(true)

    const result = await useCase.execute(validInput)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.errorCode).toBe('PLAYER_IN_GAME')
    }
    expect(mockPrivateRoomRepo.save).not.toHaveBeenCalled()
  })

  it('should return PLAYER_IN_MATCHMAKING error when player is in queue', async () => {
    vi.mocked(mockPoolPort.findByPlayerId).mockResolvedValue({} as never)

    const result = await useCase.execute(validInput)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.errorCode).toBe('PLAYER_IN_MATCHMAKING')
    }
    expect(mockPrivateRoomRepo.save).not.toHaveBeenCalled()
  })

  it('should return PLAYER_IN_ROOM error when player already has a private room', async () => {
    vi.mocked(mockPrivateRoomRepo.findByPlayerId).mockResolvedValue({} as never)

    const result = await useCase.execute(validInput)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.errorCode).toBe('PLAYER_IN_ROOM')
    }
    expect(mockPrivateRoomRepo.save).not.toHaveBeenCalled()
  })

  it('should check mutual exclusion in correct order: game → matchmaking → room', async () => {
    const callOrder: string[] = []

    vi.mocked(mockPlayerGameStatusPort.hasActiveGame).mockImplementation(async () => {
      callOrder.push('hasActiveGame')
      return false
    })
    vi.mocked(mockPoolPort.findByPlayerId).mockImplementation(async () => {
      callOrder.push('poolFindByPlayerId')
      return undefined
    })
    vi.mocked(mockPrivateRoomRepo.findByPlayerId).mockImplementation(async () => {
      callOrder.push('repoFindByPlayerId')
      return undefined
    })

    await useCase.execute(validInput)

    expect(callOrder).toEqual([
      'hasActiveGame',
      'poolFindByPlayerId',
      'repoFindByPlayerId',
    ])
  })
})
