/**
 * CancelMatchmakingUseCase Tests
 *
 * @description
 * 測試取消配對 Use Case。
 *
 * @module tests/server/matchmaking/application/use-cases/cancelMatchmakingUseCase
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CancelMatchmakingUseCase } from '~~/server/matchmaking/application/use-cases/cancelMatchmakingUseCase'
import type { MatchmakingPoolPort } from '~~/server/matchmaking/application/ports/output/matchmakingPoolPort'
import { MatchmakingEntry } from '~~/server/matchmaking/domain/matchmakingEntry'

describe('CancelMatchmakingUseCase', () => {
  let useCase: CancelMatchmakingUseCase
  let mockPoolPort: MatchmakingPoolPort

  beforeEach(() => {
    mockPoolPort = {
      add: vi.fn(),
      remove: vi.fn(),
      findByPlayerId: vi.fn(),
      findById: vi.fn(),
      findMatch: vi.fn(),
      getByRoomType: vi.fn(),
      updateStatus: vi.fn(),
      hasPlayer: vi.fn(),
    } as unknown as MatchmakingPoolPort

    useCase = new CancelMatchmakingUseCase(mockPoolPort)
  })

  describe('Successful cancellation', () => {
    it('should cancel matchmaking when entry exists and belongs to player', async () => {
      // Arrange
      const entry = MatchmakingEntry.create({
        id: 'entry-1',
        playerId: 'player-1',
        playerName: 'Player One',
        roomType: 'QUICK',
      })
      vi.mocked(mockPoolPort.findById).mockResolvedValue(entry)
      vi.mocked(mockPoolPort.remove).mockResolvedValue(entry)

      // Act
      const result = await useCase.execute({
        entryId: 'entry-1',
        playerId: 'player-1',
      })

      // Assert
      expect(result.success).toBe(true)
      expect(result.message).toContain('cancelled')
      expect(mockPoolPort.remove).toHaveBeenCalledWith('entry-1')
    })

    it('should return success message in English', async () => {
      // Arrange
      const entry = MatchmakingEntry.create({
        id: 'entry-1',
        playerId: 'player-1',
        playerName: 'Player One',
        roomType: 'QUICK',
      })
      vi.mocked(mockPoolPort.findById).mockResolvedValue(entry)
      vi.mocked(mockPoolPort.remove).mockResolvedValue(entry)

      // Act
      const result = await useCase.execute({
        entryId: 'entry-1',
        playerId: 'player-1',
      })

      // Assert
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.message).toBe('Matchmaking cancelled')
      }
    })
  })

  describe('Error cases', () => {
    it('should return ENTRY_NOT_FOUND when entry does not exist', async () => {
      // Arrange
      vi.mocked(mockPoolPort.findById).mockResolvedValue(undefined)

      // Act
      const result = await useCase.execute({
        entryId: 'non-existent',
        playerId: 'player-1',
      })

      // Assert
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.errorCode).toBe('ENTRY_NOT_FOUND')
      }
      expect(mockPoolPort.remove).not.toHaveBeenCalled()
    })

    it('should return UNAUTHORIZED when entry belongs to different player', async () => {
      // Arrange
      const entry = MatchmakingEntry.create({
        id: 'entry-1',
        playerId: 'player-1', // belongs to player-1
        playerName: 'Player One',
        roomType: 'QUICK',
      })
      vi.mocked(mockPoolPort.findById).mockResolvedValue(entry)

      // Act
      const result = await useCase.execute({
        entryId: 'entry-1',
        playerId: 'player-2', // different player trying to cancel
      })

      // Assert
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.errorCode).toBe('UNAUTHORIZED')
        expect(result.message).toContain('does not belong')
      }
      expect(mockPoolPort.remove).not.toHaveBeenCalled()
    })

    it('should return NOT_IN_QUEUE when entry is already matched', async () => {
      // Arrange
      const entry = MatchmakingEntry.reconstitute({
        id: 'entry-1',
        playerId: 'player-1',
        playerName: 'Player One',
        roomType: 'QUICK',
        enteredAt: new Date(),
        status: 'MATCHED',
      })
      vi.mocked(mockPoolPort.findById).mockResolvedValue(entry)

      // Act
      const result = await useCase.execute({
        entryId: 'entry-1',
        playerId: 'player-1',
      })

      // Assert
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.errorCode).toBe('NOT_IN_QUEUE')
        expect(result.message).toContain('not in queue')
      }
      expect(mockPoolPort.remove).not.toHaveBeenCalled()
    })
  })
})
