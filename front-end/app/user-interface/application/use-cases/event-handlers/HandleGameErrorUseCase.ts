/**
 * HandleGameErrorUseCase - Use Case
 *
 * @description
 * 實作 HandleGameErrorPort，處理 GameError 事件（遊戲層級錯誤）。
 *
 * 依賴的 Output Ports：
 * - NotificationPort: 顯示錯誤通知
 * - MatchmakingStatePort: 更新配對狀態
 * - NavigationPort: 導航回首頁（若不可恢復）
 *
 * @example
 * ```typescript
 * // DI Container 註冊
 * const handleGameErrorUseCase = new HandleGameErrorUseCase(
 *   notificationPort,
 *   matchmakingStatePort,
 *   navigationPort
 * )
 * ```
 */

import type { HandleGameErrorPort, ExecuteOptions } from '../../ports/input'
import type {
  NotificationPort,
  MatchmakingStatePort,
  NavigationPort,
} from '../../ports/output'
import type { GameErrorEvent } from '#shared/contracts'

export class HandleGameErrorUseCase implements HandleGameErrorPort {
  constructor(
    private readonly notification: NotificationPort,
    private readonly matchmakingState: MatchmakingStatePort,
    private readonly navigation: NavigationPort
  ) {}

  execute(event: GameErrorEvent, _options: ExecuteOptions): void {
    // 0. 清理：停止倒數計時
    this.notification.cleanup()

    // 1. 顯示錯誤通知
    this.notification.showErrorMessage(event.message)

    // 2. 更新配對狀態為錯誤
    this.matchmakingState.setStatus('error')
    this.matchmakingState.setErrorMessage(event.message)

    // 3. 若不可恢復，清除會話並導航回首頁
    if (!event.recoverable) {
      this.matchmakingState.clearSession()
      this.navigation.navigateToHome()
      return
    }

    // 4. 可恢復的錯誤，根據 suggested_action 處理
    if (event.suggested_action === 'RETURN_HOME') {
      this.matchmakingState.clearSession()
      this.navigation.navigateToHome()
    }
    // 若 suggested_action 為 'RETRY_MATCHMAKING'，則保持在大廳（使用者可手動重試）
  }
}
