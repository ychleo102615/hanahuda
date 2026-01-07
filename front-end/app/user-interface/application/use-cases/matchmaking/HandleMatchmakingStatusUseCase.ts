/**
 * HandleMatchmakingStatusUseCase
 *
 * @description
 * 處理 MatchmakingStatus SSE 事件，更新 UI 狀態。
 *
 * 事件類型：
 * - MatchmakingStatus: 狀態更新 (SEARCHING, LOW_AVAILABILITY)
 *
 * @module app/user-interface/application/use-cases/matchmaking/HandleMatchmakingStatusUseCase
 */

import type { MatchmakingStatePort, MatchmakingStatus } from '../../ports/output'

/**
 * MatchmakingStatus SSE 事件
 */
export interface MatchmakingStatusEvent {
  readonly event_type: 'MatchmakingStatus'
  readonly entry_id: string
  readonly status: 'SEARCHING' | 'LOW_AVAILABILITY'
  readonly message: string
  readonly elapsed_seconds: number
}

/**
 * HandleMatchmakingStatusUseCase
 */
export class HandleMatchmakingStatusUseCase {
  constructor(
    private readonly matchmakingState: MatchmakingStatePort
  ) {}

  /**
   * 處理 MatchmakingStatus 事件
   */
  execute(event: MatchmakingStatusEvent): void {
    // 1. 轉換狀態
    const status: MatchmakingStatus = event.status === 'SEARCHING'
      ? 'searching'
      : 'low_availability'

    // 2. 更新 UI 狀態
    this.matchmakingState.setStatus(status)
    this.matchmakingState.setElapsedSeconds(event.elapsed_seconds)
    this.matchmakingState.setStatusMessage(event.message)
  }
}
