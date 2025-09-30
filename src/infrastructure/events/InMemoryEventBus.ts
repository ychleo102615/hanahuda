import type {
  IntegrationEvent,
  GameIntegrationEvent,
} from '@/shared/events/integration-events'
import type { IntegrationEventPublisher } from '@/shared/events/integration-event-publisher'
import type {
  IntegrationEventSubscriber,
  EventHandler,
} from '@/shared/events/integration-event-subscriber'

export class InMemoryEventBus
  implements IntegrationEventPublisher, IntegrationEventSubscriber
{
  private handlers: Map<string, Array<EventHandler<any>>> = new Map()

  subscribe<T extends GameIntegrationEvent>(
    eventType: T['eventType'],
    handler: EventHandler<T>,
  ): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, [])
    }
    this.handlers.get(eventType)!.push(handler)
  }

  unsubscribe(eventType: string, handler: EventHandler<any>): void {
    const handlers = this.handlers.get(eventType)
    if (handlers) {
      const index = handlers.indexOf(handler)
      if (index > -1) {
        handlers.splice(index, 1)
      }
    }
  }

  async publish(event: IntegrationEvent): Promise<void> {
    const handlers = this.handlers.get(event.eventType) || []

    // 並行執行所有處理器
    await Promise.all(handlers.map((handler) => handler(event)))
  }

  async publishAll(events: IntegrationEvent[]): Promise<void> {
    for (const event of events) {
      await this.publish(event)
    }
  }
}