import type { IEventPublisher } from '../../application/ports/IEventPublisher'
import type { IntegrationEvent } from '@/shared/events/base/IntegrationEvent'
import type { IEventBus } from '@/shared/events/ports/IEventBus'
import { InMemoryEventBus } from '@/shared/events/base/EventBus'

/**
 * Event Bus Adapter for Game Engine BC
 *
 * Adapts the shared EventBus to implement IEventPublisher interface
 * required by the game-engine BC. This follows the Adapter pattern
 * to bridge between the generic IEventBus and the specific needs
 * of the game-engine BC.
 *
 * Responsibilities:
 * - Implement IEventPublisher interface for game-engine use cases
 * - Manage event bus lifecycle
 * - Provide event publishing capabilities
 * - Handle sequence number generation
 * - Monitor event bus health
 *
 * This adapter can be swapped with other implementations like:
 * - WebSocketEventBusAdapter (for client-server communication)
 * - MessageQueueEventBusAdapter (for distributed systems)
 * - TestEventBusAdapter (for unit testing)
 */
export class EventBusAdapter implements IEventPublisher {
  private readonly eventBus: IEventBus
  private readonly busId: string

  /**
   * Create event bus adapter
   * @param eventBus - Event bus implementation to adapt (optional, creates InMemoryEventBus if not provided)
   * @param busId - Unique identifier for this bus instance
   */
  constructor(eventBus?: IEventBus, busId: string = 'game-engine-bus') {
    this.eventBus = eventBus || new InMemoryEventBus(busId)
    this.busId = busId
  }

  /**
   * Initialize the event bus adapter
   * Call this during application startup
   */
  async initialize(): Promise<void> {
    try {
      await this.eventBus.start()
      console.log(`🔌 Game Engine EventBusAdapter initialized with bus: ${this.busId}`)
    } catch (error) {
      console.error(`❌ Failed to initialize EventBusAdapter: ${error}`)
      throw error
    }
  }

  /**
   * Shutdown the event bus adapter
   * Call this during application shutdown
   */
  async shutdown(): Promise<void> {
    try {
      await this.eventBus.stop()
      console.log(`🔌 Game Engine EventBusAdapter shutdown complete`)
    } catch (error) {
      console.error(`❌ Failed to shutdown EventBusAdapter: ${error}`)
      throw error
    }
  }

  // IEventPublisher interface implementation

  /**
   * Publish a single integration event
   * @param event - The event to publish
   */
  async publishEvent(event: IntegrationEvent): Promise<void> {
    try {
      await this.eventBus.publishEvent(event)
      console.log(`📤 Published event: ${event.eventType} (seq: ${event.sequenceNumber})`)
    } catch (error) {
      console.error(`❌ Failed to publish event ${event.eventType}: ${error}`)
      throw error
    }
  }

  /**
   * Publish multiple events atomically
   * @param events - Array of events to publish
   */
  async publishEvents(events: readonly IntegrationEvent[]): Promise<void> {
    try {
      await this.eventBus.publishEvents(events)
      console.log(`📤 Published ${events.length} events in batch`)
    } catch (error) {
      console.error(`❌ Failed to publish event batch: ${error}`)
      throw error
    }
  }

  /**
   * Get the next sequence number for event ordering
   * @returns Next sequence number
   */
  getNextSequenceNumber(): number {
    return this.eventBus.getNextSequenceNumber()
  }

  /**
   * Check if the event publisher is ready to publish events
   * @returns true if ready, false otherwise
   */
  isReady(): boolean {
    return this.eventBus.isReady()
  }

  // Additional utility methods for monitoring and debugging

  /**
   * Get event bus health information
   * @returns Health status including published events count, errors, etc.
   */
  getHealth() {
    return this.eventBus.getHealth()
  }

  /**
   * Get recent event history for debugging
   * @param limit - Maximum number of events to return
   * @returns Array of recent events
   */
  getEventHistory(limit: number = 50): readonly IntegrationEvent[] {
    return this.eventBus.getEventHistory(limit)
  }

  /**
   * Clear event history and reset counters
   * Useful for testing and debugging
   */
  clearHistory(): void {
    this.eventBus.clearHistory()
  }

  /**
   * Get the underlying event bus instance
   * Use with caution - prefer using the adapter interface
   * @returns The underlying IEventBus instance
   */
  getEventBus(): IEventBus {
    return this.eventBus
  }

  /**
   * Get bus identifier
   * @returns Bus ID string
   */
  getBusId(): string {
    return this.busId
  }

  /**
   * Publish event with retry logic
   * @param event - Event to publish
   * @param maxRetries - Maximum number of retry attempts
   * @param retryDelay - Delay between retries in milliseconds
   */
  async publishEventWithRetry(
    event: IntegrationEvent,
    maxRetries: number = 3,
    retryDelay: number = 1000
  ): Promise<void> {
    let lastError: Error | null = null

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.publishEvent(event)
        return // Success
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error')

        if (attempt < maxRetries) {
          console.warn(`⚠️ Event publish attempt ${attempt} failed, retrying in ${retryDelay}ms: ${lastError.message}`)
          await this.delay(retryDelay)
        }
      }
    }

    // All retries failed
    throw new Error(`Failed to publish event after ${maxRetries} attempts: ${lastError?.message}`)
  }

  /**
   * Create a factory function for creating EventBusAdapter instances
   * Useful for dependency injection
   */
  static createFactory(eventBus?: IEventBus): () => EventBusAdapter {
    return () => new EventBusAdapter(eventBus)
  }

  /**
   * Create adapter with in-memory event bus for testing
   */
  static forTesting(busId: string = 'test-bus'): EventBusAdapter {
    return new EventBusAdapter(new InMemoryEventBus(busId, 100), busId)
  }

  // Private utility methods

  /**
   * Delay utility for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
