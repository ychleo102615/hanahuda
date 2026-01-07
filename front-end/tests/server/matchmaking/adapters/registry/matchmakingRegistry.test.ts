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
import {
  MatchmakingRegistry,
  type BotFallbackInfo,
} from '~~/server/matchmaking/adapters/registry/matchmakingRegistry'
import type { MatchmakingPoolPort } from '~~/server/matchmaking/application/ports/output/matchmakingPoolPort'
import { MatchmakingEntry } from '~~/server/matchmaking/domain/matchmakingEntry'

describe('MatchmakingRegistry', () => {
  let registry: MatchmakingRegistry
  let mockPoolPort: MatchmakingPoolPort
  let statusCallback: ReturnType<typeof vi.fn>
  let botFallbackCallback: ReturnType<typeof vi.fn<[BotFallbackInfo], void>>

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

    // Status callback for SSE simulation
    statusCallback = vi.fn()

    // Bot fallback callback (由 Application Layer 定義，此處 mock)
    botFallbackCallback = vi.fn()

    registry = new MatchmakingRegistry(mockPoolPort)
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
      registry.registerEntry(entry, statusCallback, botFallbackCallback)

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
      registry.registerEntry(entry, statusCallback, botFallbackCallback)

      // Fast-forward 9.9 seconds
      vi.advanceTimersByTime(9_900)

      // Assert
      expect(mockPoolPort.updateStatus).not.toHaveBeenCalled()
    })

    it('should trigger bot fallback callback after 15 seconds', async () => {
      // Arrange
      const entry = MatchmakingEntry.create({
        id: 'entry-1',
        playerId: 'player-1',
        playerName: 'Player One',
        roomType: 'QUICK',
      })

      // Act
      registry.registerEntry(entry, statusCallback, botFallbackCallback)

      // Fast-forward 15 seconds
      vi.advanceTimersByTime(15_000)

      // Assert - botFallbackCallback should be called (not eventPublisher)
      expect(botFallbackCallback).toHaveBeenCalledWith({
        entryId: 'entry-1',
        playerId: 'player-1',
        playerName: 'Player One',
        roomType: 'QUICK',
      })
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
      registry.registerEntry(entry, statusCallback, botFallbackCallback)
      registry.unregisterEntry('entry-1')

      // Fast-forward past all timers
      vi.advanceTimersByTime(20_000)

      // Assert - no callbacks should have been triggered
      expect(mockPoolPort.updateStatus).not.toHaveBeenCalled()
      expect(botFallbackCallback).not.toHaveBeenCalled()
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
      registry.registerEntry(entry, statusCallback, botFallbackCallback)

      // Simulate match found before timeout
      vi.advanceTimersByTime(5_000)
      registry.handleMatchFound('entry-1')

      // Fast-forward past all timers
      vi.advanceTimersByTime(15_000)

      // Assert - no bot fallback should have been triggered
      expect(botFallbackCallback).not.toHaveBeenCalled()
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
      registry.registerEntry(entry, statusCallback, botFallbackCallback)

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
      registry.registerEntry(entry, statusCallback, botFallbackCallback)
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
      registry.registerEntry(entry, statusCallback, botFallbackCallback)

      // Fast-forward 14.9 seconds
      vi.advanceTimersByTime(14_900)

      // Assert - bot fallback should NOT have been triggered
      expect(botFallbackCallback).not.toHaveBeenCalled()
    })

    it('should include player info in bot fallback callback', async () => {
      // Arrange
      const entry = MatchmakingEntry.create({
        id: 'entry-1',
        playerId: 'player-1',
        playerName: 'TestPlayer',
        roomType: 'STANDARD',
      })

      // Act
      registry.registerEntry(entry, statusCallback, botFallbackCallback)
      vi.advanceTimersByTime(15_000)

      // Assert - callback should receive BotFallbackInfo
      expect(botFallbackCallback).toHaveBeenCalledWith({
        entryId: 'entry-1',
        playerId: 'player-1',
        playerName: 'TestPlayer',
        roomType: 'STANDARD',
      })
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
      registry.registerEntry(entry, statusCallback, botFallbackCallback)
      vi.advanceTimersByTime(15_000) // Bot fallback triggered
      vi.advanceTimersByTime(5_000) // More time passes

      // Assert - botFallbackCallback should only be called once
      expect(botFallbackCallback).toHaveBeenCalledTimes(1)
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
      const botFallbackCallback1 = vi.fn()
      const botFallbackCallback2 = vi.fn()

      // Act
      registry.registerEntry(entry1, statusCallback1, botFallbackCallback1)
      vi.advanceTimersByTime(5_000) // 5s passes
      registry.registerEntry(entry2, statusCallback2, botFallbackCallback2)
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

  describe('Idempotency (registerEntry called multiple times)', () => {
    it('should clear old timers when same entry is registered again', async () => {
      // Arrange - 模擬 SSE 連線重連的情境
      const entry = MatchmakingEntry.create({
        id: 'entry-1',
        playerId: 'player-1',
        playerName: 'Player One',
        roomType: 'QUICK',
      })

      const statusCallback1 = vi.fn()
      const botFallbackCallback1 = vi.fn()
      const statusCallback2 = vi.fn()
      const botFallbackCallback2 = vi.fn()

      // Act - 第一次註冊
      registry.registerEntry(entry, statusCallback1, botFallbackCallback1)

      // 5 秒後重新註冊（模擬 SSE 重連）
      vi.advanceTimersByTime(5_000)
      registry.registerEntry(entry, statusCallback2, botFallbackCallback2)

      // 再過 10 秒（從第二次註冊開始算）
      vi.advanceTimersByTime(10_000)

      // Assert
      // 第一組計時器應該被清除，所以 callback1 不應該收到 LOW_AVAILABILITY
      // 因為 10 秒是從第一次註冊開始，但第一組計時器已被清除
      const lowAvailabilityCalls1 = statusCallback1.mock.calls.filter(
        (call) => call[0].status === 'LOW_AVAILABILITY'
      )
      expect(lowAvailabilityCalls1).toHaveLength(0)

      // 第二組計時器應該正常觸發
      expect(statusCallback2).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'LOW_AVAILABILITY' })
      )
    })

    it('should only trigger bot fallback once when entry is re-registered', async () => {
      // Arrange
      const entry = MatchmakingEntry.create({
        id: 'entry-1',
        playerId: 'player-1',
        playerName: 'Player One',
        roomType: 'QUICK',
      })

      const botFallbackCallback1 = vi.fn()
      const botFallbackCallback2 = vi.fn()

      // Act - 第一次註冊
      registry.registerEntry(entry, vi.fn(), botFallbackCallback1)

      // 5 秒後重新註冊
      vi.advanceTimersByTime(5_000)
      registry.registerEntry(entry, vi.fn(), botFallbackCallback2)

      // 等到足夠時間讓所有計時器都應該觸發（如果沒被清除的話）
      vi.advanceTimersByTime(20_000)

      // Assert - 只有第二組的 bot fallback 應該被呼叫
      expect(botFallbackCallback1).not.toHaveBeenCalled()
      expect(botFallbackCallback2).toHaveBeenCalledTimes(1)
    })
  })
})
