/**
 * ProcessMatchmakingUseCase Unit Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ProcessMatchmakingUseCase } from '~~/server/matchmaking/application/use-cases/processMatchmakingUseCase'
import type { MatchmakingPoolPort } from '~~/server/matchmaking/application/ports/output/matchmakingPoolPort'
import type { MatchmakingEventPublisherPort } from '~~/server/matchmaking/application/ports/output/matchmakingEventPublisherPort'
import { MatchmakingEntry } from '~~/server/matchmaking/domain/matchmakingEntry'

describe('ProcessMatchmakingUseCase', () => {
  let useCase: ProcessMatchmakingUseCase
  let mockPoolPort: MatchmakingPoolPort
  let mockEventPublisher: MatchmakingEventPublisherPort

  beforeEach(() => {
    mockPoolPort = {
      add: vi.fn(),
      remove: vi.fn(),
      findByPlayerId: vi.fn(),
      findById: vi.fn(),
      findMatch: vi.fn().mockResolvedValue(undefined),
      getByRoomType: vi.fn(),
      updateStatus: vi.fn(),
      hasPlayer: vi.fn(),
    } as unknown as MatchmakingPoolPort

    mockEventPublisher = {
      publishMatchFound: vi.fn(),
    } as unknown as MatchmakingEventPublisherPort

    useCase = new ProcessMatchmakingUseCase(mockPoolPort, mockEventPublisher)
  })

  describe('execute - human match found', () => {
    it('should match two players in same room type', async () => {
      const entry1 = MatchmakingEntry.create({
        id: 'entry-1',
        playerId: 'player-1',
        playerName: 'Player1',
        roomType: 'STANDARD',
      })

      const entry2 = MatchmakingEntry.create({
        id: 'entry-2',
        playerId: 'player-2',
        playerName: 'Player2',
        roomType: 'STANDARD',
      })

      vi.mocked(mockPoolPort.findById).mockResolvedValue(entry1)
      vi.mocked(mockPoolPort.findMatch).mockResolvedValue(entry2)

      const result = await useCase.execute({ entryId: 'entry-1' })

      expect(result.matched).toBe(true)
      if (result.matched) {
        expect(result.matchResult.player1Id).toBe('player-1')
        expect(result.matchResult.player2Id).toBe('player-2')
        expect(result.matchResult.matchType).toBe('HUMAN')
      }
    })

    it('should publish MatchFound event when match found', async () => {
      const entry1 = MatchmakingEntry.create({
        id: 'entry-1',
        playerId: 'player-1',
        playerName: 'Player1',
        roomType: 'QUICK',
      })

      const entry2 = MatchmakingEntry.create({
        id: 'entry-2',
        playerId: 'player-2',
        playerName: 'Player2',
        roomType: 'QUICK',
      })

      vi.mocked(mockPoolPort.findById).mockResolvedValue(entry1)
      vi.mocked(mockPoolPort.findMatch).mockResolvedValue(entry2)

      await useCase.execute({ entryId: 'entry-1' })

      expect(mockEventPublisher.publishMatchFound).toHaveBeenCalledWith(
        expect.objectContaining({
          player1Id: 'player-1',
          player1Name: 'Player1',
          player2Id: 'player-2',
          player2Name: 'Player2',
          roomType: 'QUICK',
          matchType: 'HUMAN',
        })
      )
    })

    it('should update both entries to MATCHED status', async () => {
      const entry1 = MatchmakingEntry.create({
        id: 'entry-1',
        playerId: 'player-1',
        playerName: 'Player1',
        roomType: 'STANDARD',
      })

      const entry2 = MatchmakingEntry.create({
        id: 'entry-2',
        playerId: 'player-2',
        playerName: 'Player2',
        roomType: 'STANDARD',
      })

      vi.mocked(mockPoolPort.findById).mockResolvedValue(entry1)
      vi.mocked(mockPoolPort.findMatch).mockResolvedValue(entry2)

      await useCase.execute({ entryId: 'entry-1' })

      expect(mockPoolPort.updateStatus).toHaveBeenCalledWith('entry-1', 'MATCHED')
      expect(mockPoolPort.updateStatus).toHaveBeenCalledWith('entry-2', 'MATCHED')
    })
  })

  describe('execute - no match available', () => {
    it('should return not matched when no opponent available', async () => {
      const entry = MatchmakingEntry.create({
        id: 'entry-1',
        playerId: 'player-1',
        playerName: 'Player1',
        roomType: 'MARATHON',
      })

      vi.mocked(mockPoolPort.findById).mockResolvedValue(entry)
      vi.mocked(mockPoolPort.findMatch).mockResolvedValue(undefined)

      const result = await useCase.execute({ entryId: 'entry-1' })

      expect(result.matched).toBe(false)
      expect(mockEventPublisher.publishMatchFound).not.toHaveBeenCalled()
    })

    it('should return error when entry not found', async () => {
      vi.mocked(mockPoolPort.findById).mockResolvedValue(undefined)

      const result = await useCase.execute({ entryId: 'non-existent' })

      expect(result.matched).toBe(false)
      if (!result.matched) {
        expect(result.error).toBe('ENTRY_NOT_FOUND')
      }
    })
  })

  describe('matching priority', () => {
    it('should match first player in queue (FIFO)', async () => {
      const entry1 = MatchmakingEntry.create({
        id: 'entry-1',
        playerId: 'player-1',
        playerName: 'Player1',
        roomType: 'STANDARD',
        enteredAt: new Date('2026-01-01T12:00:00Z'),
      })

      const earlierEntry = MatchmakingEntry.create({
        id: 'entry-earlier',
        playerId: 'player-earlier',
        playerName: 'EarlierPlayer',
        roomType: 'STANDARD',
        enteredAt: new Date('2026-01-01T11:59:00Z'),
      })

      vi.mocked(mockPoolPort.findById).mockResolvedValue(entry1)
      vi.mocked(mockPoolPort.findMatch).mockResolvedValue(earlierEntry)

      const result = await useCase.execute({ entryId: 'entry-1' })

      expect(result.matched).toBe(true)
      if (result.matched) {
        expect(result.matchResult.player2Id).toBe('player-earlier')
      }
    })
  })
})
