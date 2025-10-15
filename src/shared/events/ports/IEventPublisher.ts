import type { IntegrationEvent } from '../base/IntegrationEvent'

/**
 * Event Publisher Port Interface
 *
 * Defines the contract for publishing integration events.
 * game-engine BC implements this to send events to game-ui BC.
 *
 * This is a Port in the Hexagonal Architecture - the domain defines
 * what it needs, and infrastructure provides the implementation.
 */
export interface IEventPublisher {
  /**
   * Publish an integration event
   * @param event The event to publish
   * @returns Promise that resolves when event is published
   */
  publishEvent(event: IntegrationEvent): Promise<void>

  /**
   * Publish multiple events atomically (if supported)
   * @param events Array of events to publish
   * @returns Promise that resolves when all events are published
   */
  publishEvents(events: readonly IntegrationEvent[]): Promise<void>

  /**
   * Get the next sequence number for event ordering
   * @returns Next sequence number
   */
  getNextSequenceNumber(): number

  /**
   * Check if publisher is ready to publish events
   * @returns true if ready, false otherwise
   */
  isReady(): boolean
}
