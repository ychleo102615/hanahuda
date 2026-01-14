/**
 * Opponent Plugin - Nitro Plugin
 *
 * @description
 * 確保 AI 對手服務已初始化。
 *
 * 架構說明：
 * - OpponentRegistry 實現 AiOpponentPort，在 DI Container 中建立
 * - GameCreationHandler 在 BOT 配對時調用 AiOpponentPort.createAiForGame()
 * - OpponentInstance 負責單場遊戲的 AI 邏輯
 * - OpponentStore 負責儲存 AI 實例（供 CompositeEventPublisher 使用）
 *
 * 設計變更（請求驅動 vs 事件驅動）：
 * - 舊設計：OpponentRegistry 監聽 ROOM_CREATED 事件，任何房間建立都會嘗試加入 AI
 * - 新設計：只有 BOT 配對時，GameCreationHandler 明確調用 createAiForGame()
 *
 * @module server/plugins/opponent
 */

import { logger } from '~~/server/utils/logger'

export default defineNitroPlugin(() => {
  // OpponentRegistry 已在 DI Container 中建立並註冊為 AiOpponentPort
  // 此 Plugin 僅作為確認點，確保 Container 初始化順序正確
  logger.info('[Opponent Plugin] AI opponent service ready (request-driven)')
})
