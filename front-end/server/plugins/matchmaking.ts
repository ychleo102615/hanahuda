/**
 * Matchmaking Plugin - Nitro Plugin
 *
 * @description
 * 初始化 Matchmaking BC，負責線上配對功能。
 *
 * 職責：
 * - 在伺服器啟動時初始化 GameCreationHandler
 * - GameCreationHandler 監聽 MATCH_FOUND 事件，建立遊戲
 *
 * 事件流程：
 * 1. 玩家呼叫 POST /matchmaking/enter 進入配對佇列
 * 2. EnterMatchmakingUseCase 嘗試配對，成功則發布 MATCH_FOUND
 * 3. GameCreationHandler 接收 MATCH_FOUND，建立遊戲
 *    - HUMAN match: 直接建立雙人遊戲
 *    - BOT match: 透過 AiOpponentPort 請求 AI 加入
 * 4. 遊戲建立後，玩家可透過 WebSocket 接收遊戲狀態
 *
 * @module server/plugins/matchmaking
 */

import { initGameCreationHandler } from '~~/server/core-game/adapters/event-subscriber/gameCreationHandler'
import { resolve, BACKEND_TOKENS } from '~~/server/utils/container'
import type { JoinGameInputPort } from '~~/server/core-game/application/ports/input/joinGameInputPort'
import type { AiOpponentPort } from '~~/server/core-game/application/ports/output/aiOpponentPort'
import { logger } from '~~/server/utils/logger'

export default defineNitroPlugin(() => {
  // 取得 Core Game BC 的依賴
  const joinGameUseCase = resolve<JoinGameInputPort>(BACKEND_TOKENS.JoinGameInputPort)
  const aiOpponentPort = resolve<AiOpponentPort>(BACKEND_TOKENS.AiOpponentPort)

  // 初始化 GameCreationHandler（監聽 MATCH_FOUND 事件）
  initGameCreationHandler(joinGameUseCase, aiOpponentPort)

  logger.info('[Matchmaking Plugin] GameCreationHandler initialized')
})
