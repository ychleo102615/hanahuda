import type { IEventSubscriber } from '../../application/ports/IEventSubscriber'
import type { IEventBus } from '@/shared/events/ports/IEventBus'
import type { IntegrationEvent } from '@/shared/events/base/IntegrationEvent'

/**
 * Event Bus Adapter (Game UI BC)
 *
 * Adapts the shared IEventBus to the game-ui BC's IEventSubscriber port.
 * This adapter allows the game-ui BC to receive events from game-engine BC
 * without directly depending on the event bus implementation.
 *
 * Design:
 * - Infrastructure adapter (implements application port)
 * - Wraps IEventBus subscription methods
 * - Manages subscription lifecycle
 * - Type-safe event handling
 */
export class EventBusAdapter implements IEventSubscriber {
  private readonly unsubscribers: Array<() => void> = []
  private isInitialized: boolean = false

  constructor(private readonly eventBus: IEventBus) {}

  /**
   * Subscribe to a specific event type
   */
  subscribe<T extends IntegrationEvent>(
    eventType: string,
    handler: (event: T) => void | Promise<void>
  ): () => void {
    // Wrap handler to ensure proper typing
    const wrappedHandler = async (event: IntegrationEvent) => {
      try {
        await handler(event as T)
      } catch (error) {
        console.error(`Error handling event ${eventType}:`, error)
        throw error
      }
    }

    // Subscribe to event bus
    const unsubscribe = this.eventBus.subscribe(eventType, wrappedHandler)

    // Track unsubscribe function
    this.unsubscribers.push(unsubscribe)
    this.isInitialized = true

    return () => {
      unsubscribe()
      const index = this.unsubscribers.indexOf(unsubscribe)
      if (index >= 0) {
        this.unsubscribers.splice(index, 1)
      }
    }
  }

  /**
   * Subscribe to all events (wildcard subscription)
   */
  subscribeAll(handler: (event: IntegrationEvent) => void | Promise<void>): () => void {
    const wrappedHandler = async (event: IntegrationEvent) => {
      try {
        await handler(event)
      } catch (error) {
        console.error(`Error handling event ${event.eventType}:`, error)
        throw error
      }
    }

    // Subscribe to wildcard '*' event type
    const unsubscribe = this.eventBus.subscribe('*', wrappedHandler)

    this.unsubscribers.push(unsubscribe)
    this.isInitialized = true

    return () => {
      unsubscribe()
      const index = this.unsubscribers.indexOf(unsubscribe)
      if (index >= 0) {
        this.unsubscribers.splice(index, 1)
      }
    }
  }

  /**
   * Unsubscribe from a specific event type
   * Note: This is a simplified implementation. In production, you'd need to track
   * handlers more carefully to unsubscribe specific ones.
   */
  unsubscribe(
    eventType: string,
    handler: (event: IntegrationEvent) => void | Promise<void>
  ): void {
    // In the current IEventBus implementation, we don't have a way to unsubscribe
    // a specific handler. The subscribe() method returns an unsubscribe function
    // that should be called instead.
    console.warn('unsubscribe() with specific handler is not supported. Use the returned unsubscribe function from subscribe() instead.')
  }

  /**
   * Unsubscribe all handlers
   */
  unsubscribeAll(): void {
    // Call all stored unsubscribe functions
    this.unsubscribers.forEach((unsub) => {
      try {
        unsub()
      } catch (error) {
        console.error('Error during unsubscribe:', error)
      }
    })

    // Clear the array
    this.unsubscribers.length = 0
    this.isInitialized = false
  }

  /**
   * Check if the subscriber is currently subscribed to any events
   */
  isSubscribed(): boolean {
    return this.isInitialized && this.unsubscribers.length > 0
  }

  /**
   * Get subscription count
   */
  getSubscriptionCount(): number {
    return this.unsubscribers.length
  }

  /**
   * Check if event bus is ready
   */
  isEventBusReady(): boolean {
    return this.eventBus.isReady()
  }

  /**
   * Request full state sync from game-engine
   * This triggers a GameInitializedEvent
   */
  async requestFullSync(): Promise<void> {
    await this.eventBus.requestFullSync()
  }

  /**
   * Get last processed event sequence number
   * Useful for detecting missing events
   */
  getLastProcessedSequence(): number {
    return this.eventBus.getLastProcessedSequence()
  }
}

/**
 * Factory function to create EventBusAdapter
 */
export function createEventBusAdapter(eventBus: IEventBus): EventBusAdapter {
  return new EventBusAdapter(eventBus)
}
