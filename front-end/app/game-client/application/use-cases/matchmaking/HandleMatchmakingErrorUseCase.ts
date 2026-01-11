/**
 * HandleMatchmakingErrorUseCase
 *
 * @description
 * 處理 MatchmakingError SSE 事件，更新 UI 錯誤狀態。
 *
 * @module app/game-client/application/use-cases/matchmaking/HandleMatchmakingErrorUseCase
 */

import type { MatchmakingStatePort } from '../../ports/output'
import type { HandleMatchmakingErrorPort, ExecuteOptions } from '../../ports/input'
import type { MatchmakingErrorEvent } from '#shared/contracts'

/**
 * HandleMatchmakingErrorUseCase
 *
 * 實作 HandleMatchmakingErrorPort Input Port
 */
export class HandleMatchmakingErrorUseCase implements HandleMatchmakingErrorPort {
  constructor(
    private readonly matchmakingState: MatchmakingStatePort
  ) {}

  /**
   * 處理 MatchmakingError 事件
   */
  execute(event: MatchmakingErrorEvent, _options?: ExecuteOptions): void {
    this.matchmakingState.setStatus('error')
    this.matchmakingState.setErrorMessage(event.message)
  }
}
