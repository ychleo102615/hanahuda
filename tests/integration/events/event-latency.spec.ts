import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { InMemoryEventBus } from '@shared/events/base/EventBus'
import type { IntegrationEvent } from '@shared/events/base/IntegrationEvent'

/**
 * Event Latency Monitoring Tests
 *
 * Validates that event communication latency is under 10ms for single-process mode.
 * This ensures the in-memory event bus is performant enough for real-time gameplay.
 */
describe('Event Latency Monitoring', () => {
  let eventBus: InMemoryEventBus

  beforeEach(async () => {
    eventBus = new InMemoryEventBus('test-bus')
    await eventBus.start()
  })

  afterEach(async () => {
    await eventBus.stop()
  })

  describe('Basic Latency Tracking', () => {
    it('should track latency for single event', async () => {
      const testEvent: IntegrationEvent = {
        eventId: 'test-001',
        eventType: 'CardPlayed',
        timestamp: Date.now(),
        sequenceNumber: 1,
      }

      let received = false
      eventBus.subscribe('CardPlayed', async () => {
        received = true
      })

      await eventBus.publishEvent(testEvent)

      expect(received).toBe(true)

      const stats = eventBus.getLatencyStats()
      expect(stats.totalEvents).toBe(1)
      expect(stats.averageLatency).toBeGreaterThanOrEqual(0)
      expect(stats.minLatency).toBeGreaterThanOrEqual(0)
      expect(stats.maxLatency).toBeGreaterThanOrEqual(0)
    })

    it('should accumulate latency statistics over multiple events', async () => {
      let count = 0
      eventBus.subscribe('*', async () => {
        count++
      })

      const eventCount = 10
      for (let i = 0; i < eventCount; i++) {
        await eventBus.publishEvent({
          eventId: `test-${i}`,
          eventType: 'CardPlayed',
          timestamp: Date.now(),
          sequenceNumber: i + 1,
        })
      }

      expect(count).toBe(eventCount)

      const stats = eventBus.getLatencyStats()
      expect(stats.totalEvents).toBe(eventCount)
      expect(stats.averageLatency).toBeGreaterThan(0)
      expect(stats.minLatency).toBeLessThanOrEqual(stats.averageLatency)
      expect(stats.maxLatency).toBeGreaterThanOrEqual(stats.averageLatency)
    })

    it('should store recent latencies (last 100)', async () => {
      eventBus.subscribe('*', async () => {
        // Simple handler
      })

      const eventCount = 150
      for (let i = 0; i < eventCount; i++) {
        await eventBus.publishEvent({
          eventId: `test-${i}`,
          eventType: 'CardPlayed',
          timestamp: Date.now(),
          sequenceNumber: i + 1,
        })
      }

      const stats = eventBus.getLatencyStats()
      expect(stats.recentLatencies.length).toBe(100)
      expect(stats.totalEvents).toBe(eventCount)
    })
  })

  describe('Latency Threshold Monitoring', () => {
    it('should count events over threshold', async () => {
      eventBus.subscribe('*', async () => {
        // Simulate slow handler (11ms delay)
        await new Promise(resolve => setTimeout(resolve, 11))
      })

      await eventBus.publishEvent({
        eventId: 'slow-event',
        eventType: 'CardPlayed',
        timestamp: Date.now(),
        sequenceNumber: 1,
      })

      const stats = eventBus.getLatencyStats()
      expect(stats.eventsOverThreshold).toBeGreaterThan(0)
      expect(stats.maxLatency).toBeGreaterThan(10)
    })

    it('should not count fast events over threshold', async () => {
      eventBus.subscribe('*', async () => {
        // Fast handler (no delay)
      })

      await eventBus.publishEvent({
        eventId: 'fast-event',
        eventType: 'CardPlayed',
        timestamp: Date.now(),
        sequenceNumber: 1,
      })

      const stats = eventBus.getLatencyStats()
      expect(stats.eventsOverThreshold).toBe(0)
      expect(stats.maxLatency).toBeLessThan(10)
    })
  })

  describe('Performance Validation: < 10ms Target', () => {
    it('should process simple events under 10ms', async () => {
      let processedCount = 0

      eventBus.subscribe('*', async () => {
        processedCount++
      })

      const iterations = 100
      for (let i = 0; i < iterations; i++) {
        await eventBus.publishEvent({
          eventId: `perf-test-${i}`,
          eventType: 'CardPlayed',
          timestamp: Date.now(),
          sequenceNumber: i + 1,
        })
      }

      expect(processedCount).toBe(iterations)

      const stats = eventBus.getLatencyStats()
      expect(stats.averageLatency).toBeLessThan(10)
      expect(stats.minLatency).toBeLessThan(10)

      console.log('\n📊 Performance Report:')
      console.log('═'.repeat(50))
      console.log(`Total events:       ${stats.totalEvents}`)
      console.log(`Average latency:    ${stats.averageLatency.toFixed(3)}ms`)
      console.log(`Min latency:        ${stats.minLatency.toFixed(3)}ms`)
      console.log(`Max latency:        ${stats.maxLatency.toFixed(3)}ms`)
      console.log(`Over threshold:     ${stats.eventsOverThreshold} (${((stats.eventsOverThreshold / stats.totalEvents) * 100).toFixed(1)}%)`)
      console.log(`Threshold:          ${stats.threshold}ms`)
      console.log('═'.repeat(50))
    })

    it('should process events with typical payload under 10ms', async () => {
      let processedCount = 0

      // Simulate realistic handler that updates view model
      eventBus.subscribe('CardPlayed', async (event) => {
        // Simulate typical processing
        const data = JSON.parse(JSON.stringify(event))
        processedCount++
      })

      const iterations = 50
      for (let i = 0; i < iterations; i++) {
        // Use realistic CardPlayedEvent structure
        await eventBus.publishEvent({
          eventId: `real-test-${i}`,
          eventType: 'CardPlayed',
          timestamp: Date.now(),
          sequenceNumber: i + 1,
          // Typical CardPlayed payload
          playerId: 'player-1',
          playedCardId: '1-bright-0',
          handMatch: {
            sourceCardId: '1-bright-0',
            sourceType: 'hand',
            matchType: 'single_match',
            capturedCardIds: ['1-bright-0', '1-animal-0'],
            achievedYaku: [],
          },
          deckMatch: {
            sourceCardId: '2-ribbon-0',
            sourceType: 'deck',
            matchType: 'no_match',
            capturedCardIds: [],
            achievedYaku: [],
          },
        } as any)
      }

      expect(processedCount).toBe(iterations)

      const stats = eventBus.getLatencyStats()
      expect(stats.averageLatency).toBeLessThan(10)

      console.log('\n📊 Realistic Payload Performance:')
      console.log('═'.repeat(50))
      console.log(`Total events:       ${stats.totalEvents}`)
      console.log(`Average latency:    ${stats.averageLatency.toFixed(3)}ms`)
      console.log(`Min latency:        ${stats.minLatency.toFixed(3)}ms`)
      console.log(`Max latency:        ${stats.maxLatency.toFixed(3)}ms`)
      console.log('═'.repeat(50))
    })

    it('should handle multiple subscribers efficiently', async () => {
      const subscribers = 3
      const counters = Array(subscribers).fill(0)

      // Register multiple subscribers
      for (let i = 0; i < subscribers; i++) {
        eventBus.subscribe('*', async () => {
          counters[i]++
        })
      }

      const iterations = 30
      for (let i = 0; i < iterations; i++) {
        await eventBus.publishEvent({
          eventId: `multi-sub-${i}`,
          eventType: 'CardPlayed',
          timestamp: Date.now(),
          sequenceNumber: i + 1,
        })
      }

      // Verify all subscribers received all events
      counters.forEach(count => expect(count).toBe(iterations))

      const stats = eventBus.getLatencyStats()
      // Even with multiple subscribers, should stay under 10ms
      expect(stats.averageLatency).toBeLessThan(10)

      console.log('\n📊 Multiple Subscribers Performance:')
      console.log('═'.repeat(50))
      console.log(`Subscribers:        ${subscribers}`)
      console.log(`Total events:       ${stats.totalEvents}`)
      console.log(`Average latency:    ${stats.averageLatency.toFixed(3)}ms`)
      console.log('═'.repeat(50))
    })
  })

  describe('Health Check Integration', () => {
    it('should include latency stats in health check', async () => {
      eventBus.subscribe('*', async () => {
        // Simple handler
      })

      await eventBus.publishEvent({
        eventId: 'health-test',
        eventType: 'CardPlayed',
        timestamp: Date.now(),
        sequenceNumber: 1,
      })

      const health = eventBus.getHealth()
      expect(health.latency).toBeDefined()
      expect(health.latency.average).toBeGreaterThanOrEqual(0)
      expect(health.latency.min).toBeGreaterThanOrEqual(0)
      expect(health.latency.max).toBeGreaterThanOrEqual(0)
      expect(health.latency.threshold).toBe(10)
      expect(health.latency.eventsOverThreshold).toBe(0) // Should be fast
    })
  })

  describe('Statistics Reset', () => {
    it('should reset latency stats with clearHistory', async () => {
      eventBus.subscribe('*', async () => {
        // Simple handler
      })

      await eventBus.publishEvent({
        eventId: 'before-reset',
        eventType: 'CardPlayed',
        timestamp: Date.now(),
        sequenceNumber: 1,
      })

      const statsBefore = eventBus.getLatencyStats()
      expect(statsBefore.totalEvents).toBe(1)

      eventBus.clearHistory()

      const statsAfter = eventBus.getLatencyStats()
      expect(statsAfter.totalEvents).toBe(0)
      expect(statsAfter.totalLatency).toBe(0)
      expect(statsAfter.averageLatency).toBe(0)
      expect(statsAfter.minLatency).toBe(Infinity)
      expect(statsAfter.maxLatency).toBe(0)
      expect(statsAfter.eventsOverThreshold).toBe(0)
      expect(statsAfter.recentLatencies.length).toBe(0)
    })
  })
})
