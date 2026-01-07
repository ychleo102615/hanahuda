/**
 * HandleMatchmakingCancelledUseCase
 *
 * @description
 * 處理 MatchmakingCancelled SSE 事件，更新 UI 狀態。
 *
 * @module app/user-interface/application/use-cases/matchmaking/HandleMatchmakingCancelledUseCase
 */

import type { MatchmakingStatePort } from '../../ports/output'
import type { HandleMatchmakingCancelledPort, ExecuteOptions } from '../../ports/input'
import type { MatchmakingCancelledEvent } from '#shared/contracts'

/**
 * HandleMatchmakingCancelledUseCase
 *
 * 實作 HandleMatchmakingCancelledPort Input Port
 */
export class HandleMatchmakingCancelledUseCase implements HandleMatchmakingCancelledPort {
  constructor(
    private readonly matchmakingState: MatchmakingStatePort
  ) {}

  /**
   * 處理 MatchmakingCancelled 事件
   *
   * 配對取消後重置為 idle 狀態，讓使用者可以重新開始配對。
   */
  execute(event: MatchmakingCancelledEvent, _options?: ExecuteOptions): void {
    this.matchmakingState.setStatusMessage(event.message)
    this.matchmakingState.clearSession()
  }
}
