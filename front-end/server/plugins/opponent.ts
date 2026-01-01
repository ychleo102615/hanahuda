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
import { resolve, BACKEND_TOKENS } from '~~/server/utils/container'
import type { InternalEventPublisherPort } from '~~/server/application/ports/output/internalEventPublisherPort'
import type { JoinGameAsAiInputPort } from '~~/server/application/ports/input/joinGameAsAiInputPort'
import type { PlayHandCardInputPort } from '~~/server/application/ports/input/playHandCardInputPort'
import type { SelectTargetInputPort } from '~~/server/application/ports/input/selectTargetInputPort'
import type { MakeDecisionInputPort } from '~~/server/application/ports/input/makeDecisionInputPort'
import type { GameStorePort } from '~~/server/application/ports/output/gameStorePort'

export default defineNitroPlugin(() => {
  // 建立 OpponentRegistry（注入依賴）
  // 注意：不再需要注入 actionTimeoutManager，Opponent BC 使用內部的 aiActionScheduler
  const opponentRegistry = new OpponentRegistry({
    internalEventBus: resolve<InternalEventPublisherPort>(BACKEND_TOKENS.InternalEventBus),
    joinGameAsAi: resolve<JoinGameAsAiInputPort>(BACKEND_TOKENS.JoinGameAsAiInputPort),
    playHandCard: resolve<PlayHandCardInputPort>(BACKEND_TOKENS.PlayHandCardInputPort),
    selectTarget: resolve<SelectTargetInputPort>(BACKEND_TOKENS.SelectTargetInputPort),
    makeDecision: resolve<MakeDecisionInputPort>(BACKEND_TOKENS.MakeDecisionInputPort),
    gameStore: resolve<GameStorePort>(BACKEND_TOKENS.GameStore),
  })

  // 啟動 Registry（開始監聽 ROOM_CREATED 事件）
  opponentRegistry.start()
})
