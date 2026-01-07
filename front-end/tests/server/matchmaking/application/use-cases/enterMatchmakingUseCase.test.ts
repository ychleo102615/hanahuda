/**
 * EnterMatchmakingUseCase Unit Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { EnterMatchmakingUseCase } from '~~/server/matchmaking/application/use-cases/enterMatchmakingUseCase'
import type { MatchmakingPoolPort } from '~~/server/matchmaking/application/ports/output/matchmakingPoolPort'
import type { PlayerGameStatusPort } from '~~/server/matchmaking/application/ports/output/playerGameStatusPort'
import type { MatchmakingEventPublisherPort } from '~~/server/matchmaking/application/ports/output/matchmakingEventPublisherPort'
import { MatchmakingEntry } from '~~/server/matchmaking/domain/matchmakingEntry'

describe('EnterMatchmakingUseCase', () => {
  let useCase: EnterMatchmakingUseCase
  let mockPoolPort: MatchmakingPoolPort
  let mockPlayerGameStatusPort: PlayerGameStatusPort
  let mockEventPublisher: MatchmakingEventPublisherPort

  beforeEach(() => {
    mockPoolPort = {
      add: vi.fn(),
      remove: vi.fn(),
      findByPlayerId: vi.fn().mockResolvedValue(undefined),
      findById: vi.fn(),
      findMatch: vi.fn().mockResolvedValue(undefined),
      getByRoomType: vi.fn(),
      updateStatus: vi.fn(),
      hasPlayer: vi.fn().mockResolvedValue(false),
    } as unknown as MatchmakingPoolPort

    mockPlayerGameStatusPort = {
      hasActiveGame: vi.fn().mockResolvedValue(false),
    } as unknown as PlayerGameStatusPort

    mockEventPublisher = {
      publishMatchFound: vi.fn(),
    } as unknown as MatchmakingEventPublisherPort

    useCase = new EnterMatchmakingUseCase(
      mockPoolPort,
      mockPlayerGameStatusPort,
      mockEventPublisher
    )
  })

  describe('execute - success cases', () => {
    it('should add player to queue when no match available', async () => {
      const input = {
        playerId: 'player-1',
        playerName: 'TestPlayer',
        roomType: 'STANDARD' as const,
      }

      const result = await useCase.execute(input)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.entryId).toBeDefined()
        expect(result.message).toBe('Searching for opponent...')
      }
      expect(mockPoolPort.add).toHaveBeenCalled()
    })

    it('should match with existing player when available', async () => {
      const existingEntry = MatchmakingEntry.create({
        id: 'entry-existing',
        playerId: 'player-existing',
        playerName: 'ExistingPlayer',
        roomType: 'STANDARD',
      })

      vi.mocked(mockPoolPort.findMatch).mockResolvedValue(existingEntry)

      const input = {
        playerId: 'player-1',
        playerName: 'TestPlayer',
        roomType: 'STANDARD' as const,
      }

      const result = await useCase.execute(input)

      expect(result.success).toBe(true)
      expect(mockEventPublisher.publishMatchFound).toHaveBeenCalled()
    })
  })

  describe('execute - error cases', () => {
    it('should return error when player already in queue', async () => {
      const existingEntry = MatchmakingEntry.create({
        id: 'entry-1',
        playerId: 'player-1',
        playerName: 'TestPlayer',
        roomType: 'STANDARD',
      })

      vi.mocked(mockPoolPort.findByPlayerId).mockResolvedValue(existingEntry)

      const input = {
        playerId: 'player-1',
        playerName: 'TestPlayer',
        roomType: 'STANDARD' as const,
      }

      const result = await useCase.execute(input)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.errorCode).toBe('ALREADY_IN_QUEUE')
        expect(result.message).toBe('You are already in the matchmaking queue')
      }
    })

    it('should return error when player has active game', async () => {
      vi.mocked(mockPlayerGameStatusPort.hasActiveGame).mockResolvedValue(true)

      const input = {
        playerId: 'player-1',
        playerName: 'TestPlayer',
        roomType: 'STANDARD' as const,
      }

      const result = await useCase.execute(input)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.errorCode).toBe('ALREADY_IN_GAME')
        expect(result.message).toBe('You have an active game in progress')
      }
    })
  })

  describe('matching logic', () => {
    it('should transition both entries to MATCHED when match found', async () => {
      const existingEntry = MatchmakingEntry.create({
        id: 'entry-existing',
        playerId: 'player-existing',
        playerName: 'ExistingPlayer',
        roomType: 'STANDARD',
      })

      vi.mocked(mockPoolPort.findMatch).mockResolvedValue(existingEntry)

      const input = {
        playerId: 'player-1',
        playerName: 'TestPlayer',
        roomType: 'STANDARD' as const,
      }

      await useCase.execute(input)

      // Both entries should be updated to MATCHED
      expect(mockPoolPort.updateStatus).toHaveBeenCalledWith(existingEntry.id, 'MATCHED')
    })

    it('should publish MatchFound event with correct payload', async () => {
      const existingEntry = MatchmakingEntry.create({
        id: 'entry-existing',
        playerId: 'player-existing',
        playerName: 'ExistingPlayer',
        roomType: 'STANDARD',
      })

      vi.mocked(mockPoolPort.findMatch).mockResolvedValue(existingEntry)

      const input = {
        playerId: 'player-new',
        playerName: 'NewPlayer',
        roomType: 'STANDARD' as const,
      }

      await useCase.execute(input)

      expect(mockEventPublisher.publishMatchFound).toHaveBeenCalledWith(
        expect.objectContaining({
          player1Id: 'player-existing',
          player1Name: 'ExistingPlayer',
          player2Id: 'player-new',
          player2Name: 'NewPlayer',
          roomType: 'STANDARD',
          matchType: 'HUMAN',
        })
      )
    })
  })
})
