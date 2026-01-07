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
 *
 * @module app/user-interface/application/use-cases/matchmaking/HandleMatchFoundUseCase
 */

import type { MatchmakingStatePort, NavigationPort } from '../../ports/output'
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
    private readonly navigation: NavigationPort
  ) {}

  /**
   * 處理 MatchFound 事件
   */
  execute(event: MatchFoundEvent, _options?: ExecuteOptions): void {
    // 1. 更新狀態
    this.matchmakingState.setStatus('matched')
    this.matchmakingState.setOpponentInfo(event.opponent_name, event.is_bot)
    this.matchmakingState.setGameId(event.game_id)

    // 2. 短暫延遲後導航到遊戲（讓用戶看到配對成功訊息）
    // 注意：實際導航由 game page 處理，這裡只更新狀態
    // game page 會偵測到 matched 狀態並切換到遊戲 SSE
  }
}
