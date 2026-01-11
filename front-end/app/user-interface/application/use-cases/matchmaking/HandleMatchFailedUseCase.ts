/**
 * HandleMatchFailedUseCase
 *
 * @description
 * 處理 MatchFailed SSE 事件（配對成功但遊戲創建失敗）。
 * 更新 UI 錯誤狀態並清除 session。
 *
 * @module app/user-interface/application/use-cases/matchmaking/HandleMatchFailedUseCase
 */

import type { MatchmakingStatePort, SessionContextPort } from '../../ports/output'
import type { HandleMatchFailedPort, ExecuteOptions } from '../../ports/input'
import type { MatchFailedEvent } from '#shared/contracts'

/**
 * HandleMatchFailedUseCase
 *
 * 實作 HandleMatchFailedPort Input Port
 */
export class HandleMatchFailedUseCase implements HandleMatchFailedPort {
  constructor(
    private readonly matchmakingState: MatchmakingStatePort,
    private readonly sessionContext: SessionContextPort
  ) {}

  /**
   * 處理 MatchFailed 事件
   *
   * @description
   * 1. 設置配對狀態為錯誤
   * 2. 設置錯誤訊息
   * 3. 清除 session context（gameId, playerId）
   */
  execute(event: MatchFailedEvent, _options?: ExecuteOptions): void {
    this.matchmakingState.setStatus('error')
    this.matchmakingState.setErrorMessage(event.message)

    // 清除 session context，讓使用者可以重新配對
    this.sessionContext.clearSession()
  }
}
