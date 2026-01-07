/**
 * MatchmakingRegistry Tests
 *
 * @description
 * 測試 MatchmakingRegistry 的計時器邏輯。
 * - 10 秒後轉換為 LOW_AVAILABILITY 狀態
 * - 15 秒後觸發 Bot Fallback
 *
 * @module tests/server/matchmaking/adapters/registry/matchmakingRegistry
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { MatchmakingRegistry } from '~~/server/matchmaking/adapters/registry/matchmakingRegistry'
import type { MatchmakingPoolPort } from '~~/server/matchmaking/application/ports/output/matchmakingPoolPort'
import type { MatchmakingEventPublisherPort } from '~~/server/matchmaking/application/ports/output/matchmakingEventPublisherPort'
import { MatchmakingEntry } from '~~/server/matchmaking/domain/matchmakingEntry'

describe('MatchmakingRegistry', () => {
  let registry: MatchmakingRegistry
  let mockPoolPort: MatchmakingPoolPort
  let mockEventPublisher: MatchmakingEventPublisherPort
  let statusCallback: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.useFakeTimers()

    // Mock PoolPort
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

    // Mock EventPublisher
    mockEventPublisher = {
      publishMatchFound: vi.fn(),
    } as unknown as MatchmakingEventPublisherPort

    // Status callback for SSE simulation
    statusCallback = vi.fn()

    registry = new MatchmakingRegistry(mockPoolPort, mockEventPublisher)
  })

  afterEach(() => {
    registry.stop()
    vi.useRealTimers()
  })

  describe('Timer-based status transitions', () => {
    it('should transition to LOW_AVAILABILITY after 10 seconds', async () => {
      // Arrange
      const entry = MatchmakingEntry.create({
        id: 'entry-1',
        playerId: 'player-1',
        playerName: 'Player One',
        roomType: 'QUICK',
      })

      // Act
      registry.registerEntry(entry, statusCallback)

      // Fast-forward 10 seconds
      vi.advanceTimersByTime(10_000)

      // Assert
      expect(mockPoolPort.updateStatus).toHaveBeenCalledWith('entry-1', 'LOW_AVAILABILITY')
      expect(statusCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'LOW_AVAILABILITY',
        })
      )
    })

    it('should NOT transition to LOW_AVAILABILITY before 10 seconds', async () => {
      // Arrange
      const entry = MatchmakingEntry.create({
        id: 'entry-1',
        playerId: 'player-1',
        playerName: 'Player One',
        roomType: 'QUICK',
      })

      // Act
      registry.registerEntry(entry, statusCallback)

      // Fast-forward 9.9 seconds
      vi.advanceTimersByTime(9_900)

      // Assert
      expect(mockPoolPort.updateStatus).not.toHaveBeenCalled()
    })

    it('should trigger bot fallback after 15 seconds', async () => {
      // Arrange
      const entry = MatchmakingEntry.create({
        id: 'entry-1',
        playerId: 'player-1',
        playerName: 'Player One',
        roomType: 'QUICK',
      })

      // Act
      registry.registerEntry(entry, statusCallback)

      // Fast-forward 15 seconds
      vi.advanceTimersByTime(15_000)

      // Assert
      expect(mockEventPublisher.publishMatchFound).toHaveBeenCalledWith(
        expect.objectContaining({
          player1Id: 'player-1',
          matchType: 'BOT',
          roomType: 'QUICK',
        })
      )
    })

    it('should clear timers when entry is removed', async () => {
      // Arrange
      const entry = MatchmakingEntry.create({
        id: 'entry-1',
        playerId: 'player-1',
        playerName: 'Player One',
        roomType: 'QUICK',
      })

      // Act
      registry.registerEntry(entry, statusCallback)
      registry.unregisterEntry('entry-1')

      // Fast-forward past all timers
      vi.advanceTimersByTime(20_000)

      // Assert - no callbacks should have been triggered
      expect(mockPoolPort.updateStatus).not.toHaveBeenCalled()
      expect(mockEventPublisher.publishMatchFound).not.toHaveBeenCalled()
    })

    it('should clear timers when player is matched', async () => {
      // Arrange
      const entry = MatchmakingEntry.create({
        id: 'entry-1',
        playerId: 'player-1',
        playerName: 'Player One',
        roomType: 'QUICK',
      })

      // Act
      registry.registerEntry(entry, statusCallback)

      // Simulate match found before timeout
      vi.advanceTimersByTime(5_000)
      registry.handleMatchFound('entry-1')

      // Fast-forward past all timers
      vi.advanceTimersByTime(15_000)

      // Assert - no bot fallback should have been triggered
      expect(mockEventPublisher.publishMatchFound).not.toHaveBeenCalled()
    })
  })

  describe('Status update callback', () => {
    it('should send SEARCHING status immediately on register', async () => {
      // Arrange
      const entry = MatchmakingEntry.create({
        id: 'entry-1',
        playerId: 'player-1',
        playerName: 'Player One',
        roomType: 'QUICK',
      })

      // Act
      registry.registerEntry(entry, statusCallback)

      // Assert
      expect(statusCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'SEARCHING',
        })
      )
    })

    it('should include elapsed_seconds in status updates', async () => {
      // Arrange
      const entry = MatchmakingEntry.create({
        id: 'entry-1',
        playerId: 'player-1',
        playerName: 'Player One',
        roomType: 'QUICK',
      })

      // Act
      registry.registerEntry(entry, statusCallback)
      vi.advanceTimersByTime(10_000)

      // Assert - the LOW_AVAILABILITY update should include elapsed time
      const lowAvailabilityCall = statusCallback.mock.calls.find(
        (call) => call[0].status === 'LOW_AVAILABILITY'
      )
      expect(lowAvailabilityCall).toBeDefined()
      expect(lowAvailabilityCall![0].elapsed_seconds).toBeGreaterThanOrEqual(10)
    })
  })

  describe('Bot fallback (US3)', () => {
    it('should NOT trigger bot fallback before 15 seconds', async () => {
      // Arrange
      const entry = MatchmakingEntry.create({
        id: 'entry-1',
        playerId: 'player-1',
        playerName: 'Player One',
        roomType: 'QUICK',
      })

      // Act
      registry.registerEntry(entry, statusCallback)

      // Fast-forward 14.9 seconds
      vi.advanceTimersByTime(14_900)

      // Assert - bot fallback should NOT have been triggered
      expect(mockEventPublisher.publishMatchFound).not.toHaveBeenCalled()
    })

    it('should include player name in bot fallback event', async () => {
      // Arrange
      const entry = MatchmakingEntry.create({
        id: 'entry-1',
        playerId: 'player-1',
        playerName: 'TestPlayer',
        roomType: 'STANDARD',
      })

      // Act
      registry.registerEntry(entry, statusCallback)
      vi.advanceTimersByTime(15_000)

      // Assert
      expect(mockEventPublisher.publishMatchFound).toHaveBeenCalledWith(
        expect.objectContaining({
          player1Id: 'player-1',
          player1Name: 'TestPlayer',
          player2Name: 'Computer',
          matchType: 'BOT',
          roomType: 'STANDARD',
        })
      )
    })

    it('should unregister entry after bot fallback', async () => {
      // Arrange
      const entry = MatchmakingEntry.create({
        id: 'entry-1',
        playerId: 'player-1',
        playerName: 'Player One',
        roomType: 'QUICK',
      })

      // Act
      registry.registerEntry(entry, statusCallback)
      vi.advanceTimersByTime(15_000) // Bot fallback triggered
      vi.advanceTimersByTime(5_000) // More time passes

      // Assert - publishMatchFound should only be called once
      expect(mockEventPublisher.publishMatchFound).toHaveBeenCalledTimes(1)
    })
  })

  describe('Multiple entries', () => {
    it('should manage timers independently for each entry', async () => {
      // Arrange
      const entry1 = MatchmakingEntry.create({
        id: 'entry-1',
        playerId: 'player-1',
        playerName: 'Player One',
        roomType: 'QUICK',
      })
      const entry2 = MatchmakingEntry.create({
        id: 'entry-2',
        playerId: 'player-2',
        playerName: 'Player Two',
        roomType: 'QUICK',
      })

      const statusCallback1 = vi.fn()
      const statusCallback2 = vi.fn()

      // Act
      registry.registerEntry(entry1, statusCallback1)
      vi.advanceTimersByTime(5_000) // 5s passes
      registry.registerEntry(entry2, statusCallback2)
      vi.advanceTimersByTime(5_000) // 5s more passes (total 10s for entry1, 5s for entry2)

      // Assert - entry1 should be LOW_AVAILABILITY, entry2 should still be SEARCHING
      expect(statusCallback1).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'LOW_AVAILABILITY' })
      )
      expect(statusCallback2).not.toHaveBeenCalledWith(
        expect.objectContaining({ status: 'LOW_AVAILABILITY' })
      )
    })
  })
})
