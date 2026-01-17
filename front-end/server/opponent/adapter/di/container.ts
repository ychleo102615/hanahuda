/**
 * Opponent BC Container - Adapter Layer
 *
 * @description
 * Opponent BC 的 DI Container。
 * 負責組裝 Opponent BC 的所有元件。
 *
 * 設計原則：
 * - 只對外暴露 start() 和 stop() 方法
 * - 內部元件（AiNeededHandler、opponentStore 等）不對外暴露
 * - 只依賴 Core-Game BC 的 Input Ports（不依賴 Output Ports）
 *
 * @module server/opponent/adapter/di/container
 */

import type { JoinGameAsAiInputPort } from '~~/server/core-game/application/ports/input/joinGameAsAiInputPort'
import type { PlayHandCardInputPort } from '~~/server/core-game/application/ports/input/playHandCardInputPort'
import type { SelectTargetInputPort } from '~~/server/core-game/application/ports/input/selectTargetInputPort'
import type { MakeDecisionInputPort } from '~~/server/core-game/application/ports/input/makeDecisionInputPort'
import { AiNeededHandler } from '../event-handler/aiNeededHandler'

/**
 * Opponent BC Container 依賴
 *
 * @description
 * 只依賴 Core-Game BC 的 Input Ports。
 * 注意：不依賴 GameStorePort！Opponent BC 透過 OpponentStateTracker 維護自己的狀態。
 */
export interface OpponentContainerDependencies {
  readonly joinGameAsAi: JoinGameAsAiInputPort
  readonly playHandCard: PlayHandCardInputPort
  readonly selectTarget: SelectTargetInputPort
  readonly makeDecision: MakeDecisionInputPort
}

/**
 * Opponent BC Container 介面
 *
 * @description
 * 對外只暴露生命週期方法。
 */
export interface OpponentContainer {
  /**
   * 啟動 Opponent BC
   *
   * @description
   * 開始訂閱 AI_OPPONENT_NEEDED 事件。
   */
  start(): void

  /**
   * 停止 Opponent BC
   *
   * @description
   * 取消訂閱並清理所有 AI 實例。
   */
  stop(): void
}

/**
 * 建立 Opponent BC Container
 *
 * @param deps - Container 依賴（Core-Game BC 的 Input Ports）
 * @returns Opponent BC Container
 */
export function createOpponentContainer(
  deps: OpponentContainerDependencies
): OpponentContainer {
  // 建立 AiNeededHandler
  const aiNeededHandler = new AiNeededHandler({
    joinGameAsAi: deps.joinGameAsAi,
    playHandCard: deps.playHandCard,
    selectTarget: deps.selectTarget,
    makeDecision: deps.makeDecision,
  })

  return {
    start: () => aiNeededHandler.start(),
    stop: () => aiNeededHandler.stop(),
  }
}
