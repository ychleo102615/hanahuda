/**
 * Opponent Plugin - Nitro Plugin
 *
 * @description
 * 初始化 OpponentRegistry，負責 AI 對手的生命週期管理。
 *
 * 職責：
 * - 在伺服器啟動時初始化並啟動 OpponentRegistry
 * - OpponentRegistry 監聽 ROOM_CREATED 事件，建立 OpponentInstance 並加入遊戲
 * - OpponentInstance 監聽遊戲事件，自動執行 AI 回合
 *
 * 架構變更（對比舊 OpponentService）：
 * - OpponentRegistry 負責生命週期管理
 * - OpponentInstance 負責單場遊戲的 AI 邏輯
 * - OpponentStore 負責儲存 AI 實例（供 CompositeEventPublisher 使用）
 *
 * @module server/plugins/opponent
 */

import { OpponentRegistry } from '~~/server/adapters/opponent/opponentRegistry'
import { container } from '~~/server/utils/container'

export default defineNitroPlugin(() => {
  // 建立 OpponentRegistry（注入依賴）
  const opponentRegistry = new OpponentRegistry({
    internalEventBus: container.internalEventBus,
    joinGameAsAi: container.joinGameAsAiUseCase,
    playHandCard: container.playHandCardUseCase,
    selectTarget: container.selectTargetUseCase,
    makeDecision: container.makeDecisionUseCase,
    actionTimeoutManager: container.actionTimeoutManager,
    gameStore: container.gameStore,
  })

  // 啟動 Registry（開始監聽 ROOM_CREATED 事件）
  opponentRegistry.start()

  console.log('[OpponentPlugin] OpponentRegistry started')
})
