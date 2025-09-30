import type { IntegrationEvent, GameIntegrationEvent } from './integration-events'

export type EventHandler<T extends IntegrationEvent> = (event: T) => void | Promise<void>

export interface IntegrationEventSubscriber {
  /**
   * 訂閱特定類型的整合事件
   */
  subscribe<T extends GameIntegrationEvent>(
    eventType: T['eventType'],
    handler: EventHandler<T>,
  ): void

  /**
   * 取消訂閱
   */
  unsubscribe(eventType: string, handler: EventHandler<any>): void
}