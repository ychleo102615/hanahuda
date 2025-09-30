import type { IntegrationEvent } from './integration-events'

export interface IntegrationEventPublisher {
  /**
   * 發布單個整合事件
   */
  publish(event: IntegrationEvent): Promise<void>

  /**
   * 批量發布整合事件
   */
  publishAll(events: IntegrationEvent[]): Promise<void>
}