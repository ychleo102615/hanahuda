/**
 * Opponent Plugin - Nitro Plugin
 *
 * @description
 * 初始化 OpponentService，負責 AI 對手的自動行為。
 *
 * 職責：
 * - 在伺服器啟動時初始化 OpponentService
 * - OpponentService 監聽 ROOM_CREATED 事件，自動加入 AI 對手
 * - OpponentService 監聽遊戲事件，自動執行 AI 回合
 *
 * @module server/plugins/opponent
 */

import { OpponentService } from '~~/server/adapters/opponent/opponentService'
import { container } from '~~/server/utils/container'

export default defineNitroPlugin(() => {
  // 初始化 OpponentService（注入 Input Ports）
  new OpponentService(
    container.internalEventBus,
    container.opponentEventBus,
    container.joinGameUseCase,
    container.playHandCardUseCase,
    container.selectTargetUseCase,
    container.makeDecisionUseCase,
    container.actionTimeoutManager,
    container.gameStore
  )

  console.log('[OpponentPlugin] OpponentService initialized')
})
