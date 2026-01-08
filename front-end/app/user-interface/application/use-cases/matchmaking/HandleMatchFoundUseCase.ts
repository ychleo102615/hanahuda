/**
 * HandleMatchFoundUseCase
 *
 * @description
 * 處理 MatchFound SSE 事件，更新狀態並準備導航到遊戲。
 *
 * 流程：
 * 1. 更新配對狀態為 'matched'
 * 2. 儲存對手資訊
 * 3. 儲存 game_id 供後續 SSE 連線使用
 * 4. 清除 SessionContext 中的 entryId（配對完成後不再需要）
 *
 * @module app/user-interface/application/use-cases/matchmaking/HandleMatchFoundUseCase
 */

import type { MatchmakingStatePort, NavigationPort, GameStatePort, SessionContextPort } from '../../ports/output'
import type { HandleMatchFoundPort, ExecuteOptions } from '../../ports/input'
import type { MatchFoundEvent } from '#shared/contracts'

/**
 * HandleMatchFoundUseCase
 *
 * 實作 HandleMatchFoundPort Input Port
 */
export class HandleMatchFoundUseCase implements HandleMatchFoundPort {
  constructor(
    private readonly matchmakingState: MatchmakingStatePort,
    private readonly navigation: NavigationPort,
    private readonly gameState: GameStatePort,
    private readonly sessionContext: SessionContextPort
  ) {}

  /**
   * 處理 MatchFound 事件
   */
  execute(event: MatchFoundEvent, _options?: ExecuteOptions): void {
    // 1. 更新配對狀態（Pinia store）
    this.matchmakingState.setStatus('matched')
    this.matchmakingState.setOpponentInfo(event.opponent_name, event.is_bot)
    this.matchmakingState.setGameId(event.game_id)

    // 2. 設定 gameState 的 currentGameId
    // GameApiClient 會從 GameStatePort 讀取 gameId
    this.gameState.setCurrentGameId(event.game_id)

    // 3. 清除 SessionContext 中的 entryId（配對完成後不再需要）
    this.sessionContext.clearMatchmaking()
  }
}
