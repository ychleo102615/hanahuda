import type { IntegrationEvent } from '../base/IntegrationEvent'

/**
 * Event Subscriber Port Interface
 *
 * Defines the contract for subscribing to integration events.
 * game-ui BC implements this to receive events from game-engine BC.
 *
 * This is a Port in the Hexagonal Architecture.
 */
export interface IEventSubscriber {
  /**
   * Subscribe to integration events
   * @param eventType Specific event type to subscribe to, or '*' for all events
   * @param handler Function to handle received events
   * @returns Unsubscribe function
   */
  subscribe(
    eventType: string | '*',
    handler: (event: IntegrationEvent) => Promise<void>
  ): () => void

  /**
   * Subscribe to multiple event types
   * @param eventTypes Array of event types to subscribe to
   * @param handler Function to handle received events
   * @returns Unsubscribe function
   */
  subscribeToMultiple(
    eventTypes: readonly string[],
    handler: (event: IntegrationEvent) => Promise<void>
  ): () => void

  /**
   * Get the last processed sequence number
   * Used for detecting missing events
   * @returns Last processed sequence number
   */
  getLastProcessedSequence(): number

  /**
   * Request full state sync (triggers GameInitializedEvent)
   * Called when missing events are detected
   */
  requestFullSync(): Promise<void>

  /**
   * Check if subscriber is ready to receive events
   * @returns true if ready, false otherwise
   */
  isReady(): boolean
}
