/**
 * ClearOrphanedSessionUseCase
 *
 * @description
 * 清除孤立的會話資訊。
 * 用於進入首頁時，確保沒有殘留的配對資訊（roomTypeId、entryId）。
 *
 * 邏輯：
 * - 如果沒有活躍的遊戲（currentGameId 為 null），清除 sessionContext
 * - 如果有活躍遊戲，不做任何事（保留 roomTypeId 供 Rematch 使用）
 *
 * @module game-client/application/use-cases/ClearOrphanedSessionUseCase
 */

import { ClearOrphanedSessionPort } from '../ports/input/clear-orphaned-session.port'
import type { GameStatePort, SessionContextPort, MatchmakingStatePort } from '../ports/output'

export class ClearOrphanedSessionUseCase extends ClearOrphanedSessionPort {
  constructor(
    private readonly gameState: GameStatePort,
    private readonly sessionContext: SessionContextPort,
    private readonly matchmakingState: MatchmakingStatePort
  ) {
    super()
  }

  /**
   * 執行清除孤立會話
   *
   * @description
   * 檢查是否有活躍遊戲，若無則清除所有配對相關資訊。
   */
  execute(): void {
    // 如果有活躍遊戲，保留 sessionContext（供 Rematch 使用）
    const currentGameId = this.gameState.getCurrentGameId()
    if (currentGameId) {
      return
    }

    // 沒有活躍遊戲，清除所有配對相關資訊
    this.sessionContext.clearSession()
    this.matchmakingState.clearSession()
  }
}
