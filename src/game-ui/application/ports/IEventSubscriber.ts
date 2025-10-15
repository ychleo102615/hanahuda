import type { IntegrationEvent } from '@/shared/events/base/IntegrationEvent'

/**
 * Event Subscriber Interface (Game UI BC - Input Port)
 *
 * Defines the contract for subscribing to integration events.
 * The game-ui BC uses this to receive events from game-engine BC.
 *
 * Design:
 * - Input Port for game-ui BC
 * - Implemented by infrastructure adapters (EventBusAdapter)
 * - Type-safe event handling with generic constraints
 */
export interface IEventSubscriber {
  /**
   * Subscribe to a specific event type
   * @param eventType The type of event to subscribe to
   * @param handler The handler function to call when event is received
   * @returns Unsubscribe function
   */
  subscribe<T extends IntegrationEvent>(
    eventType: string,
    handler: (event: T) => void | Promise<void>
  ): () => void

  /**
   * Subscribe to all events (for logging or debugging)
   * @param handler The handler function to call for any event
   * @returns Unsubscribe function
   */
  subscribeAll(handler: (event: IntegrationEvent) => void | Promise<void>): () => void

  /**
   * Unsubscribe from a specific event type
   * @param eventType The type of event to unsubscribe from
   * @param handler The handler function to remove
   */
  unsubscribe(eventType: string, handler: (event: IntegrationEvent) => void | Promise<void>): void

  /**
   * Unsubscribe all handlers (cleanup)
   */
  unsubscribeAll(): void

  /**
   * Check if the subscriber is currently subscribed to any events
   */
  isSubscribed(): boolean
}
