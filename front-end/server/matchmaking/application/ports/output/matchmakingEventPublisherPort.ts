/**
 * Matchmaking Event Publisher Port
 *
 * @description
 * Matchmaking BC 自己的事件發佈 Port。
 * 定義配對相關事件的發佈介面。
 * 由 Adapter Layer 實作，委派給 Shared Infrastructure Event Bus。
 *
 * @module server/matchmaking/application/ports/output/matchmakingEventPublisherPort
 */

import type { MatchFoundPayload } from '~~/server/shared/infrastructure/event-bus/types'

/**
 * Matchmaking Event Publisher Port
 *
 * @description
 * 配對事件發佈介面。由 Adapter Layer 實作。
 * Adapter 負責委派給 Shared Infrastructure 的 InternalEventBus。
 */
export abstract class MatchmakingEventPublisherPort {
  /**
   * 發佈配對成功事件
   *
   * @description
   * 當兩位玩家配對成功時呼叫。
   * Core Game BC 訂閱此事件以建立遊戲。
   *
   * @param payload - 配對成功事件 Payload
   */
  abstract publishMatchFound(payload: MatchFoundPayload): void
}
