/**
 * HandleGameErrorUseCase - Use Case
 *
 * @description
 * 實作 HandleGameErrorPort，處理 GameError 事件（遊戲層級錯誤）。
 *
 * 依賴的 Output Ports：
 * - NotificationPort: 顯示 RedirectModal（5 秒倒數後導向大廳）
 * - GameStatePort: 清除遊戲 ID
 * - MatchmakingStatePort: 重置配對狀態（讓大廳按鈕恢復可點擊）
 * - SessionContextPort: 清除 selectedRoomTypeId 和 currentGameId
 *
 * @note
 * GameError 是各 Use Case 的 fallback 結果，此 Use Case 負責統一處理前端展示。
 * RedirectModal 會顯示 5 秒倒數，之後自動導航回大廳。
 *
 * @example
 * ```typescript
 * // DI Container 註冊
 * const handleGameErrorUseCase = new HandleGameErrorUseCase(
 *   notificationPort,
 *   gameStatePort,
 *   matchmakingStatePort,
 *   sessionContextPort
 * )
 * ```
 */

import type { HandleGameErrorPort, ExecuteOptions } from '../../ports/input'
import type {
  NotificationPort,
  GameStatePort,
  MatchmakingStatePort,
  SessionContextPort,
} from '../../ports/output'
import type { GameErrorEvent } from '#shared/contracts'

export class HandleGameErrorUseCase implements HandleGameErrorPort {
  constructor(
    private readonly notification: NotificationPort,
    private readonly gameState: GameStatePort,
    private readonly matchmakingState: MatchmakingStatePort,
    private readonly sessionContext: SessionContextPort
  ) {}

  execute(event: GameErrorEvent, _options: ExecuteOptions): void {
    // 1. 清理：停止所有倒數計時
    this.notification.cleanup()

    // 2. 清除遊戲 ID（遊戲已無效）
    this.gameState.setCurrentGameId(null)

    // 3. 重置配對狀態（讓大廳按鈕恢復可點擊）
    this.matchmakingState.clearSession()

    // 4. 清除 SessionContext（selectedRoomTypeId、currentGameId）
    this.sessionContext.clearSession()

    // 5. 顯示 RedirectModal（5 秒倒數後導向大廳）
    this.notification.showRedirectModal(event.message, 'lobby', 'Game Error')
  }
}
