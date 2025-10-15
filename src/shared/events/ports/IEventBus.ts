import type { IntegrationEvent } from '../base/IntegrationEvent'
import type { IEventPublisher } from './IEventPublisher'
import type { IEventSubscriber } from './IEventSubscriber'

/**
 * Event Bus Port Interface
 *
 * Combines publisher and subscriber interfaces.
 * The central communication hub between Bounded Contexts.
 *
 * In single-process mode: InMemoryEventBus
 * In distributed mode: WebSocketEventBus, MessageQueueEventBus, etc.
 */
export interface IEventBus extends IEventPublisher, IEventSubscriber {
  /**
   * Start the event bus
   * @returns Promise that resolves when bus is ready
   */
  start(): Promise<void>

  /**
   * Stop the event bus and cleanup resources
   * @returns Promise that resolves when bus is stopped
   */
  stop(): Promise<void>

  /**
   * Get event bus health status
   * @returns Health information
   */
  getHealth(): {
    readonly isRunning: boolean
    readonly eventsPublished: number
    readonly eventsProcessed: number
    readonly lastEventTime: number | null
    readonly errors: readonly string[]
  }

  /**
   * Clear all event history (for testing)
   * Should only be used in test environments
   */
  clearHistory(): void

  /**
   * Get event history (for debugging)
   * @param limit Maximum number of events to return
   * @returns Recent events
   */
  getEventHistory(limit?: number): readonly IntegrationEvent[]
}
