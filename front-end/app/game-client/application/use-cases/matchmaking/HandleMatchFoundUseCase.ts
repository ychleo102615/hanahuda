/**
 * HandleMatchFoundUseCase
 *
 * @description
 * 處理 MatchFound 事件，更新狀態並準備導航到遊戲。
 *
 * 流程：
 * 1. 更新配對狀態為 'matched'
 * 2. 儲存對手資訊
 * 3. 儲存 game_id 供後續 WebSocket 連線使用
 * 4. 清除 selectedRoomTypeId（配對完成，遊戲已開始）
 *
 * @module app/game-client/application/use-cases/matchmaking/HandleMatchFoundUseCase
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
    // 1. 批量更新配對狀態（使用 $patch 減少響應式更新次數）
    this.matchmakingState.setMatchedState({
      opponentName: event.opponent_name,
      isBot: event.is_bot,
      gameId: event.game_id,
    })

    // 2. 設定 gameState 的 currentGameId
    // GameApiClient 會從 GameStatePort 讀取 gameId
    this.gameState.setCurrentGameId(event.game_id)

    // 3. 設定 SessionContext 的 currentGameId（持久化，供頁面刷新後重連使用）
    this.sessionContext.setCurrentGameId(event.game_id)

    // 4. 清除 selectedRoomTypeId（配對完成，遊戲已開始）
    this.sessionContext.setSelectedRoomTypeId(null)
  }
}
