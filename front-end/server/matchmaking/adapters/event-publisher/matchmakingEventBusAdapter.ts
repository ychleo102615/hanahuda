/**
 * Matchmaking Event Bus Adapter
 *
 * @description
 * MatchmakingEventPublisherPort 的實作。
 * 委派給 Shared Infrastructure 的 InternalEventBus。
 *
 * @module server/matchmaking/adapters/event-publisher/matchmakingEventBusAdapter
 */

import { internalEventBus } from '~~/server/shared/infrastructure/event-bus'
import type { MatchFoundPayload } from '~~/server/shared/infrastructure/event-bus/types'
import { MatchmakingEventPublisherPort } from '../../application/ports/output/matchmakingEventPublisherPort'

/**
 * Matchmaking Event Bus Adapter
 *
 * @description
 * 將 Matchmaking BC 的事件發佈需求委派給 Shared Infrastructure。
 */
export class MatchmakingEventBusAdapter extends MatchmakingEventPublisherPort {
  publishMatchFound(payload: MatchFoundPayload): void {
    internalEventBus.publishMatchFound(payload)
  }
}

/**
 * 單例實例
 */
let instance: MatchmakingEventBusAdapter | null = null

/**
 * 取得 MatchmakingEventBusAdapter 單例
 */
export function getMatchmakingEventBusAdapter(): MatchmakingEventBusAdapter {
  if (!instance) {
    instance = new MatchmakingEventBusAdapter()
  }
  return instance
}
