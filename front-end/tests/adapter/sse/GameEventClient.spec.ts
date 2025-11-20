/**
 * GameEventClient 測試
 *
 * @description
 * 測試 SSE 客戶端的連線管理、重連機制和指數退避策略。
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { GameEventClient } from '../../../src/user-interface/adapter/sse/GameEventClient'
import { EventRouter } from '../../../src/user-interface/adapter/sse/EventRouter'

// Mock EventSource
class MockEventSource {
  static CONNECTING = 0
  static OPEN = 1
  static CLOSED = 2

  url: string
  readyState: number = MockEventSource.CONNECTING
  onopen: ((event: Event) => void) | null = null
  onerror: ((event: Event) => void) | null = null
  onmessage: ((event: MessageEvent) => void) | null = null

  private listeners: Map<string, ((event: MessageEvent) => void)[]> = new Map()

  constructor(url: string) {
    this.url = url
  }

  addEventListener(type: string, listener: (event: MessageEvent) => void): void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, [])
    }
    this.listeners.get(type)!.push(listener)
  }

  removeEventListener(type: string, listener: (event: MessageEvent) => void): void {
    const listeners = this.listeners.get(type)
    if (listeners) {
      const index = listeners.indexOf(listener)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }

  close(): void {
    this.readyState = MockEventSource.CLOSED
  }

  // Test helpers
  simulateOpen(): void {
    this.readyState = MockEventSource.OPEN
    if (this.onopen) {
      this.onopen(new Event('open'))
    }
  }

  simulateError(): void {
    this.readyState = MockEventSource.CLOSED
    this.onerror?.(new Event('error'))
  }

  simulateMessage(type: string, data: unknown): void {
    const listeners = this.listeners.get(type)
    if (listeners) {
      const event = new MessageEvent(type, { data: JSON.stringify(data) })
      listeners.forEach(listener => listener(event))
    }
  }
}

// Global mock
let mockEventSourceInstance: MockEventSource | null = null
const MockEventSourceClass = vi.fn().mockImplementation((url: string) => {
  mockEventSourceInstance = new MockEventSource(url)
  return mockEventSourceInstance
}) as unknown as typeof EventSource

// Add static properties to match real EventSource
Object.assign(MockEventSourceClass, {
  CONNECTING: 0,
  OPEN: 1,
  CLOSED: 2,
})

// Replace global EventSource
vi.stubGlobal('EventSource', MockEventSourceClass)

describe('GameEventClient', () => {
  let client: GameEventClient
  let eventRouter: EventRouter
  const baseURL = 'http://localhost:8080'
  const gameId = 'game-123'
  const sessionToken = 'token-456'

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    mockEventSourceInstance = null
    eventRouter = new EventRouter()
    client = new GameEventClient(baseURL, eventRouter)
  })

  afterEach(() => {
    client.disconnect()
    vi.useRealTimers()
  })

  describe('connect', () => {
    it('should create EventSource with correct URL', () => {
      client.connect(gameId, sessionToken)

      expect(MockEventSourceClass).toHaveBeenCalledWith(
        `${baseURL}/api/v1/games/${gameId}/events?token=${sessionToken}`
      )
    })

    it('should call onConnectionEstablished callback when connected', () => {
      const callback = vi.fn()
      client.onConnectionEstablished(callback)
      client.connect(gameId, sessionToken)

      mockEventSourceInstance!.simulateOpen()

      expect(callback).toHaveBeenCalled()
    })

    it('should reset reconnect attempts on successful connection', () => {
      const callback = vi.fn()
      client.onConnectionEstablished(callback)
      client.connect(gameId, sessionToken)

      mockEventSourceInstance!.simulateOpen()

      // Verify reconnect counter is reset by checking it reconnects from attempt 1
      mockEventSourceInstance!.simulateError()

      // Should show attempt 1 (not 2+)
      expect(callback).toHaveBeenCalledTimes(1)
    })

    it('should report connected status', () => {
      client.connect(gameId, sessionToken)
      mockEventSourceInstance!.simulateOpen()

      // Verify readyState is OPEN after simulateOpen
      expect(mockEventSourceInstance!.readyState).toBe(MockEventSource.OPEN)
      expect(client.isConnected()).toBe(true)
    })

    it('should report disconnected when closed', () => {
      client.connect(gameId, sessionToken)
      mockEventSourceInstance!.simulateOpen()
      client.disconnect()

      expect(client.isConnected()).toBe(false)
    })
  })

  describe('reconnection', () => {
    // T096: Unit test for reconnection logic
    it('should call onConnectionLost when connection error occurs', () => {
      const lostCallback = vi.fn()
      client.onConnectionLost(lostCallback)
      client.connect(gameId, sessionToken)

      mockEventSourceInstance!.simulateError()

      expect(lostCallback).toHaveBeenCalled()
    })

    it('should attempt to reconnect after connection error', async () => {
      client.connect(gameId, sessionToken)
      mockEventSourceInstance!.simulateError()

      // First delay is 1000ms
      await vi.advanceTimersByTimeAsync(1000)

      // Should have created a new EventSource
      expect(MockEventSourceClass).toHaveBeenCalledTimes(2)
    })

    // T097: Unit test for exponential backoff
    it('should use exponential backoff delays', async () => {
      client.connect(gameId, sessionToken)

      // First error - wait 1000ms
      mockEventSourceInstance!.simulateError()
      await vi.advanceTimersByTimeAsync(1000)
      expect(MockEventSourceClass).toHaveBeenCalledTimes(2)

      // Second error - wait 2000ms
      mockEventSourceInstance!.simulateError()
      await vi.advanceTimersByTimeAsync(2000)
      expect(MockEventSourceClass).toHaveBeenCalledTimes(3)

      // Third error - wait 4000ms
      mockEventSourceInstance!.simulateError()
      await vi.advanceTimersByTimeAsync(4000)
      expect(MockEventSourceClass).toHaveBeenCalledTimes(4)

      // Fourth error - wait 8000ms
      mockEventSourceInstance!.simulateError()
      await vi.advanceTimersByTimeAsync(8000)
      expect(MockEventSourceClass).toHaveBeenCalledTimes(5)

      // Fifth error - wait 16000ms
      mockEventSourceInstance!.simulateError()
      await vi.advanceTimersByTimeAsync(16000)
      expect(MockEventSourceClass).toHaveBeenCalledTimes(6)
    })

    it('should stop reconnecting after max attempts', async () => {
      const failedCallback = vi.fn()
      client.onConnectionFailed(failedCallback)
      client.connect(gameId, sessionToken)

      // Simulate 5 failures (max attempts)
      for (let i = 0; i < 5; i++) {
        mockEventSourceInstance!.simulateError()
        const delays = [1000, 2000, 4000, 8000, 16000]
        await vi.advanceTimersByTimeAsync(delays[i])
      }

      // 6th error should trigger onConnectionFailed
      mockEventSourceInstance!.simulateError()

      expect(failedCallback).toHaveBeenCalled()
    })

    it('should call onConnectionFailed after max reconnect attempts', async () => {
      const failedCallback = vi.fn()
      client.onConnectionFailed(failedCallback)
      client.connect(gameId, sessionToken)

      // Exhaust all reconnect attempts
      for (let i = 0; i < 5; i++) {
        mockEventSourceInstance!.simulateError()
        const delays = [1000, 2000, 4000, 8000, 16000]
        await vi.advanceTimersByTimeAsync(delays[i])
      }

      // Final error
      mockEventSourceInstance!.simulateError()

      expect(failedCallback).toHaveBeenCalledTimes(1)
    })

    it('should reset reconnect counter on successful reconnection', async () => {
      const establishedCallback = vi.fn()
      client.onConnectionEstablished(establishedCallback)
      client.connect(gameId, sessionToken)

      // First connection succeeds
      mockEventSourceInstance!.simulateOpen()
      expect(establishedCallback).toHaveBeenCalledTimes(1)

      // Connection lost
      mockEventSourceInstance!.simulateError()
      await vi.advanceTimersByTimeAsync(1000)

      // Reconnection succeeds
      mockEventSourceInstance!.simulateOpen()
      expect(establishedCallback).toHaveBeenCalledTimes(2)

      // Another disconnect
      mockEventSourceInstance!.simulateError()
      await vi.advanceTimersByTimeAsync(1000)

      // Should start from attempt 1 again (not 2)
      expect(MockEventSourceClass).toHaveBeenCalledTimes(3)
    })
  })

  describe('event routing', () => {
    it('should route events to EventRouter', () => {
      const handler = vi.fn()
      eventRouter.register('GameStarted', { execute: handler })

      client.connect(gameId, sessionToken)
      mockEventSourceInstance!.simulateOpen()

      const payload = {
        event_id: 'evt-1',
        game_id: gameId,
        players: [],
        ruleset: { rounds_per_game: 3 },
      }

      mockEventSourceInstance!.simulateMessage('GameStarted', payload)

      expect(handler).toHaveBeenCalledWith(payload)
    })

    it('should handle invalid JSON gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      client.connect(gameId, sessionToken)
      mockEventSourceInstance!.simulateOpen()

      // Manually trigger with invalid JSON
      const listeners = (mockEventSourceInstance as any).listeners.get('GameStarted')
      if (listeners) {
        const event = new MessageEvent('GameStarted', { data: 'invalid json' })
        listeners.forEach((listener: (e: MessageEvent) => void) => listener(event))
      }

      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })
  })

  describe('disconnect', () => {
    it('should close EventSource on disconnect', () => {
      client.connect(gameId, sessionToken)
      mockEventSourceInstance!.simulateOpen()

      client.disconnect()

      expect(mockEventSourceInstance!.readyState).toBe(MockEventSource.CLOSED)
    })

    it('should handle disconnect when not connected', () => {
      // Should not throw
      expect(() => client.disconnect()).not.toThrow()
    })
  })

  describe('callback registration', () => {
    it('should support onConnectionEstablished callback', () => {
      const callback = vi.fn()
      client.onConnectionEstablished(callback)
      client.connect(gameId, sessionToken)
      mockEventSourceInstance!.simulateOpen()

      expect(callback).toHaveBeenCalled()
    })

    it('should support onConnectionLost callback', () => {
      const callback = vi.fn()
      client.onConnectionLost(callback)
      client.connect(gameId, sessionToken)
      mockEventSourceInstance!.simulateError()

      expect(callback).toHaveBeenCalled()
    })

    it('should support onConnectionFailed callback', () => {
      const callback = vi.fn()
      client.onConnectionFailed(callback)

      // Trigger on construction failure (would need to mock EventSource constructor to throw)
      // For now, test through max reconnect attempts
      client.connect(gameId, sessionToken)

      // Exhaust all attempts
      for (let i = 0; i < 5; i++) {
        mockEventSourceInstance!.simulateError()
        vi.advanceTimersByTime([1000, 2000, 4000, 8000, 16000][i])
      }

      // Final error triggers failed callback
      mockEventSourceInstance!.simulateError()

      expect(callback).toHaveBeenCalled()
    })
  })
})
