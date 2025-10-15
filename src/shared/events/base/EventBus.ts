import type { IntegrationEvent } from './IntegrationEvent'
import type { IEventBus } from '../ports/IEventBus'
import { EventLogger } from './EventLogger'
import { v4 as uuidv4 } from 'uuid'

/**
 * In-Memory Event Bus Implementation
 *
 * Provides event communication between Bounded Contexts within a single process.
 * Suitable for:
 * - Single-page applications
 * - Desktop applications
 * - Development and testing
 *
 * For distributed scenarios, implement WebSocketEventBus or MessageQueueEventBus.
 */
export class InMemoryEventBus implements IEventBus {
  private readonly id: string
  private readonly logger: EventLogger
  private readonly subscriptions: Map<string, EventHandler[]> = new Map()
  private readonly eventHistory: IntegrationEvent[] = []
  private readonly maxHistorySize: number

  private sequenceNumber: number = 0
  private lastProcessedSequence: number = 0
  private isRunning: boolean = false
  private eventsPublished: number = 0
  private eventsProcessed: number = 0
  private errors: string[] = []

  constructor(id: string = 'default-bus', maxHistorySize: number = 1000) {
    this.id = id
    this.logger = EventLogger.getInstance()
    this.maxHistorySize = maxHistorySize
  }

  // IEventBus implementation
  async start(): Promise<void> {
    if (this.isRunning) {
      return
    }

    this.isRunning = true
    console.log(`🚌 Event Bus '${this.id}' started`)
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return
    }

    this.subscriptions.clear()
    this.isRunning = false
    console.log(`🛑 Event Bus '${this.id}' stopped`)
  }

  getHealth() {
    return {
      isRunning: this.isRunning,
      eventsPublished: this.eventsPublished,
      eventsProcessed: this.eventsProcessed,
      lastEventTime: this.eventHistory.length > 0
        ? this.eventHistory[this.eventHistory.length - 1].timestamp
        : null,
      errors: [...this.errors]
    } as const
  }

  clearHistory(): void {
    this.eventHistory.length = 0
    this.errors.length = 0
    this.eventsPublished = 0
    this.eventsProcessed = 0
    this.sequenceNumber = 0
    this.lastProcessedSequence = 0
  }

  getEventHistory(limit: number = 100): readonly IntegrationEvent[] {
    return this.eventHistory.slice(-limit)
  }

  // IEventPublisher implementation
  async publishEvent(event: IntegrationEvent): Promise<void> {
    if (!this.isRunning) {
      throw new Error(`Event bus '${this.id}' is not running`)
    }

    try {
      // Add to history
      this.addToHistory(event)

      // Log publication
      this.logger.logPublished(event, this.id)
      this.eventsPublished++

      // Notify subscribers
      await this.notifySubscribers(event)

    } catch (error) {
      const errorMsg = `Failed to publish event ${event.eventType}: ${error instanceof Error ? error.message : 'Unknown error'}`
      this.errors.push(errorMsg)
      throw new Error(errorMsg)
    }
  }

  async publishEvents(events: readonly IntegrationEvent[]): Promise<void> {
    // Publish events sequentially to maintain order
    for (const event of events) {
      await this.publishEvent(event)
    }
  }

  getNextSequenceNumber(): number {
    return ++this.sequenceNumber
  }

  isReady(): boolean {
    return this.isRunning
  }

  // IEventSubscriber implementation
  subscribe(
    eventType: string | '*',
    handler: (event: IntegrationEvent) => Promise<void>
  ): () => void {
    const eventHandler: EventHandler = {
      id: uuidv4(),
      handler,
      subscriberId: `subscriber-${Date.now()}`
    }

    if (!this.subscriptions.has(eventType)) {
      this.subscriptions.set(eventType, [])
    }

    this.subscriptions.get(eventType)!.push(eventHandler)

    // Return unsubscribe function
    return () => {
      const handlers = this.subscriptions.get(eventType)
      if (handlers) {
        const index = handlers.findIndex(h => h.id === eventHandler.id)
        if (index >= 0) {
          handlers.splice(index, 1)
        }

        // Clean up empty subscription lists
        if (handlers.length === 0) {
          this.subscriptions.delete(eventType)
        }
      }
    }
  }

  subscribeToMultiple(
    eventTypes: readonly string[],
    handler: (event: IntegrationEvent) => Promise<void>
  ): () => void {
    const unsubscribers = eventTypes.map(eventType =>
      this.subscribe(eventType, handler)
    )

    // Return combined unsubscribe function
    return () => {
      unsubscribers.forEach(unsub => unsub())
    }
  }

  getLastProcessedSequence(): number {
    return this.lastProcessedSequence
  }

  async requestFullSync(): Promise<void> {
    // In single-process mode, we would trigger a GameInitializedEvent
    // This would be implemented by the game-engine BC
    console.warn('requestFullSync called - game-engine should handle this')
  }

  // Private methods
  private async notifySubscribers(event: IntegrationEvent): Promise<void> {
    const specificHandlers = this.subscriptions.get(event.eventType) || []
    const globalHandlers = this.subscriptions.get('*') || []
    const allHandlers = [...specificHandlers, ...globalHandlers]

    if (allHandlers.length === 0) {
      return
    }

    // Process handlers in parallel for better performance
    const promises = allHandlers.map(async (eventHandler) => {
      const startTime = Date.now()

      try {
        this.logger.logReceived(event, eventHandler.subscriberId)

        await eventHandler.handler(event)

        const processingTime = Date.now() - startTime
        this.logger.logProcessed(event, eventHandler.subscriberId, processingTime)
        this.eventsProcessed++

        // Update last processed sequence
        if (event.sequenceNumber > this.lastProcessedSequence) {
          this.lastProcessedSequence = event.sequenceNumber
        }

      } catch (error) {
        const processingError = error instanceof Error ? error : new Error('Unknown error')
        this.logger.logError(event, eventHandler.subscriberId, processingError)

        const errorMsg = `Handler ${eventHandler.subscriberId} failed for ${event.eventType}: ${processingError.message}`
        this.errors.push(errorMsg)

        // Don't throw - let other handlers continue
        console.error(errorMsg)
      }
    })

    await Promise.all(promises)
  }

  private addToHistory(event: IntegrationEvent): void {
    this.eventHistory.push(event)

    // Maintain max history size
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.splice(0, this.eventHistory.length - this.maxHistorySize)
    }
  }
}

// Helper types
interface EventHandler {
  readonly id: string
  readonly subscriberId: string
  readonly handler: (event: IntegrationEvent) => Promise<void>
}
