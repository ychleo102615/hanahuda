/**
 * Matchmaking Event Handler Input Ports
 *
 * @description
 * 定義配對事件處理器的 Input Port 介面。
 * 所有 Port 都繼承自 EventHandlerPort<T>，統一 execute 方法簽名。
 *
 * 包含事件處理器 Input Ports：
 * - HandleMatchmakingStatusPort
 * - HandleMatchFoundPort
 * - HandleMatchmakingErrorPort
 * - HandleMatchFailedPort
 *
 * @module app/game-client/application/ports/input/matchmaking-event-handlers.port
 */

import type { EventHandlerPort } from './event-handler.interface'
import type {
  MatchmakingStatusEvent,
  MatchFoundEvent,
  MatchmakingErrorEvent,
  MatchFailedEvent,
} from '#shared/contracts'

/**
 * HandleMatchmakingStatusPort - Input Port
 *
 * @description
 * 處理 MatchmakingStatus 事件。
 * 更新 UI 狀態（搜尋中、低可用性）。
 */
export interface HandleMatchmakingStatusPort
  extends EventHandlerPort<MatchmakingStatusEvent> {}

/**
 * HandleMatchFoundPort - Input Port
 *
 * @description
 * 處理 MatchFound 事件。
 * 更新配對成功狀態，準備導航到遊戲。
 */
export interface HandleMatchFoundPort
  extends EventHandlerPort<MatchFoundEvent> {}

/**
 * HandleMatchmakingErrorPort - Input Port
 *
 * @description
 * 處理 MatchmakingError 事件。
 * 更新錯誤狀態。
 */
export interface HandleMatchmakingErrorPort
  extends EventHandlerPort<MatchmakingErrorEvent> {}

/**
 * HandleMatchFailedPort - Input Port
 *
 * @description
 * 處理 MatchFailed 事件（配對成功但遊戲創建失敗）。
 * 更新錯誤狀態並清除 session。
 */
export interface HandleMatchFailedPort
  extends EventHandlerPort<MatchFailedEvent> {}
