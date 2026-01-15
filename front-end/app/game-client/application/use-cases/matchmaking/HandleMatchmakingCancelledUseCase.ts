/**
 * HandleMatchmakingCancelledUseCase
 *
 * @description
 * 處理 MatchmakingCancelled 事件，更新 UI 狀態。
 *
 * 清理項目：
 * - MatchmakingState: 重置為 idle 狀態
 * - SessionContext: 清除 selectedRoomTypeId 和 currentGameId
 *
 * @module app/game-client/application/use-cases/matchmaking/HandleMatchmakingCancelledUseCase
 */

import type { MatchmakingStatePort, SessionContextPort } from '../../ports/output'
import type { HandleMatchmakingCancelledPort, ExecuteOptions } from '../../ports/input'
import type { MatchmakingCancelledEvent } from '#shared/contracts'

/**
 * HandleMatchmakingCancelledUseCase
 *
 * 實作 HandleMatchmakingCancelledPort Input Port
 */
export class HandleMatchmakingCancelledUseCase implements HandleMatchmakingCancelledPort {
  constructor(
    private readonly matchmakingState: MatchmakingStatePort,
    private readonly sessionContext: SessionContextPort
  ) {}

  /**
   * 處理 MatchmakingCancelled 事件
   *
   * 配對取消後重置為 idle 狀態，讓使用者可以重新開始配對。
   */
  execute(event: MatchmakingCancelledEvent, _options?: ExecuteOptions): void {
    this.matchmakingState.setStatusMessage(event.message)
    this.matchmakingState.clearSession()

    // 清除 SessionContext 中的 selectedRoomTypeId 和 currentGameId
    this.sessionContext.clearSession()
  }
}
