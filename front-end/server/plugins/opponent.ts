/**
 * Opponent Plugin - Nitro Plugin
 *
 * @description
 * 初始化 Opponent BC，負責 AI 對手功能。
 *
 * 架構說明：
 * - OpponentContainer 是 Opponent BC 的 DI Container
 * - AiNeededHandler 訂閱 AI_OPPONENT_NEEDED 事件
 * - OpponentInstance 負責單場遊戲的 AI 邏輯（使用 OpponentStateTracker 追蹤狀態）
 * - OpponentStore 負責儲存 AI 實例（供 CompositeEventPublisher 使用）
 *
 * 事件驅動設計：
 * - Core-Game BC 發布 AI_OPPONENT_NEEDED 事件
 * - Opponent BC 訂閱事件，建立 AI 對手
 * - AI 透過 Core-Game Input Ports 進行遊戲操作
 *
 * @module server/plugins/opponent
 */

import { opponentContainer } from '~~/server/utils/container'
import { logger } from '~~/server/utils/logger'

export default defineNitroPlugin(() => {
  // 啟動 Opponent BC（訂閱 AI_OPPONENT_NEEDED 事件）
  opponentContainer.start()

  logger.info('[Opponent Plugin] AI opponent service started (event-driven)')
})
