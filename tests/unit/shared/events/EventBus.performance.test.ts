import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { InMemoryEventBus } from '@/shared/events/base/EventBus'
import type { IntegrationEvent } from '@/shared/events/base/IntegrationEvent'

describe('EventBus 效能測試', () => {
  let eventBus: InMemoryEventBus

  beforeEach(async () => {
    eventBus = new InMemoryEventBus('performance-test-bus')
    await eventBus.start()
  })

  afterEach(async () => {
    await eventBus.stop()
  })

  it('單一事件發布應該在 10ms 內完成', async () => {
    const testEvent: IntegrationEvent = {
      eventId: 'test-1',
      eventType: 'TestEvent',
      timestamp: Date.now(),
      sequenceNumber: eventBus.getNextSequenceNumber(),
    }

    // 訂閱一個簡單的處理器
    eventBus.subscribe('TestEvent', async (event) => {
      // 簡單處理
      expect(event.eventId).toBe('test-1')
    })

    const startTime = Date.now()
    await eventBus.publishEvent(testEvent)
    const endTime = Date.now()

    const latency = endTime - startTime

    // 驗證延遲小於 10ms
    expect(latency).toBeLessThan(10)
  })

  it('100 個連續事件的平均延遲應該小於 10ms', async () => {
    const eventCount = 100
    const events: IntegrationEvent[] = []

    // 準備 100 個事件
    for (let i = 0; i < eventCount; i++) {
      events.push({
        eventId: `test-${i}`,
        eventType: 'TestEvent',
        timestamp: Date.now(),
        sequenceNumber: eventBus.getNextSequenceNumber(),
      })
    }

    // 訂閱處理器
    eventBus.subscribe('TestEvent', async (event) => {
      // 簡單處理
      await Promise.resolve()
    })

    const startTime = Date.now()

    // 發布所有事件
    for (const event of events) {
      await eventBus.publishEvent(event)
    }

    const endTime = Date.now()
    const totalTime = endTime - startTime
    const averageLatency = totalTime / eventCount

    // 驗證平均延遲小於 10ms
    expect(averageLatency).toBeLessThan(10)

    // 檢查 EventBus 的 latency 統計
    const latencyStats = eventBus.getLatencyStats()
    expect(latencyStats.averageLatency).toBeLessThan(10)
    expect(latencyStats.eventsOverThreshold).toBe(0)
  })

  it('多個訂閱者的事件發布應該在 10ms 內完成', async () => {
    const testEvent: IntegrationEvent = {
      eventId: 'test-multi',
      eventType: 'TestEvent',
      timestamp: Date.now(),
      sequenceNumber: eventBus.getNextSequenceNumber(),
    }

    // 訂閱 5 個處理器
    for (let i = 0; i < 5; i++) {
      eventBus.subscribe('TestEvent', async (event) => {
        // 簡單處理
        await Promise.resolve()
      })
    }

    const startTime = Date.now()
    await eventBus.publishEvent(testEvent)
    const endTime = Date.now()

    const latency = endTime - startTime

    // 即使有多個訂閱者，延遲也應該小於 10ms
    expect(latency).toBeLessThan(10)
  })

  it('EventBus 應該正確追蹤延遲統計', async () => {
    const testEvent: IntegrationEvent = {
      eventId: 'test-stats',
      eventType: 'TestEvent',
      timestamp: Date.now(),
      sequenceNumber: eventBus.getNextSequenceNumber(),
    }

    eventBus.subscribe('TestEvent', async (event) => {
      await Promise.resolve()
    })

    await eventBus.publishEvent(testEvent)

    const latencyStats = eventBus.getLatencyStats()

    // 驗證統計資料
    expect(latencyStats.totalEvents).toBeGreaterThan(0)
    expect(latencyStats.averageLatency).toBeGreaterThanOrEqual(0)
    expect(latencyStats.minLatency).toBeGreaterThanOrEqual(0)
    expect(latencyStats.maxLatency).toBeGreaterThanOrEqual(0)
    expect(latencyStats.threshold).toBe(10)
  })

  it('超過閾值的事件應該被記錄', async () => {
    const testEvent: IntegrationEvent = {
      eventId: 'test-threshold',
      eventType: 'TestEvent',
      timestamp: Date.now(),
      sequenceNumber: eventBus.getNextSequenceNumber(),
    }

    // 訂閱一個慢速處理器（模擬超過閾值）
    eventBus.subscribe('TestEvent', async (event) => {
      // 故意延遲 15ms
      await new Promise(resolve => setTimeout(resolve, 15))
    })

    await eventBus.publishEvent(testEvent)

    const latencyStats = eventBus.getLatencyStats()

    // 驗證超過閾值的事件被記錄
    expect(latencyStats.eventsOverThreshold).toBeGreaterThan(0)
    expect(latencyStats.maxLatency).toBeGreaterThan(10)
  })

  it('getHealth 應該返回正確的健康狀態', async () => {
    const testEvent: IntegrationEvent = {
      eventId: 'test-health',
      eventType: 'TestEvent',
      timestamp: Date.now(),
      sequenceNumber: eventBus.getNextSequenceNumber(),
    }

    eventBus.subscribe('TestEvent', async (event) => {
      await Promise.resolve()
    })

    await eventBus.publishEvent(testEvent)

    const health = eventBus.getHealth()

    // 驗證健康狀態
    expect(health.isRunning).toBe(true)
    expect(health.eventsPublished).toBeGreaterThan(0)
    expect(health.eventsProcessed).toBeGreaterThan(0)
    expect(health.latency.average).toBeLessThan(10)
  })

  it('大量事件不應該導致記憶體洩漏', async () => {
    const eventCount = 1000

    eventBus.subscribe('TestEvent', async (event) => {
      await Promise.resolve()
    })

    // 發布 1000 個事件
    for (let i = 0; i < eventCount; i++) {
      const testEvent: IntegrationEvent = {
        eventId: `test-${i}`,
        eventType: 'TestEvent',
        timestamp: Date.now(),
        sequenceNumber: eventBus.getNextSequenceNumber(),
      }
      await eventBus.publishEvent(testEvent)
    }

    // 驗證事件歷史記錄被正確限制（預設最多 1000）
    const history = eventBus.getEventHistory(2000)
    expect(history.length).toBeLessThanOrEqual(1000)

    // 驗證平均延遲仍然在合理範圍內
    const latencyStats = eventBus.getLatencyStats()
    expect(latencyStats.averageLatency).toBeLessThan(10)
  })
})
