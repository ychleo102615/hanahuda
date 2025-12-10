/**
 * TriggerStateRecoveryUseCase - Use Case
 *
 * @description
 * 協調狀態恢復流程，用於頁面恢復可見或 SSE 重連成功時。
 *
 * 業務流程：
 * 1. 清空累積的事件隊列（丟棄過時事件）
 * 2. 獲取遊戲快照（最新狀態）
 * 3. 委派 HandleReconnectionUseCase 執行狀態恢復
 *
 * 設計原則：
 * - 職責分離：本 Use Case 負責「協調」，HandleReconnectionUseCase 負責「執行」
 * - 錯誤容忍：快照獲取失敗時顯示錯誤訊息，但不中斷程式
 *
 * 依賴的 Ports：
 * - ReconnectionPort (Output): 清空事件隊列、獲取快照
 * - HandleReconnectionPort (Input): 執行狀態恢復
 * - NotificationPort (Output): 顯示錯誤訊息
 *
 * @example
 * ```typescript
 * const triggerStateRecoveryUseCase = new TriggerStateRecoveryUseCase(
 *   reconnectionPort,
 *   handleReconnectionUseCase,
 *   notificationPort
 * )
 * await triggerStateRecoveryUseCase.execute(gameId)
 * ```
 */

import { TriggerStateRecoveryPort } from '../ports/input'
import { ReconnectionPort } from '../ports/output'
import type { HandleReconnectionPort } from '../ports/input'
import type { NotificationPort } from '../ports/output'

export class TriggerStateRecoveryUseCase extends TriggerStateRecoveryPort {
  constructor(
    private readonly reconnectionPort: ReconnectionPort,
    private readonly handleReconnection: HandleReconnectionPort,
    private readonly notification: NotificationPort
  ) {
    super()
  }

  async execute(gameId: string): Promise<void> {
    console.info('[TriggerStateRecoveryUseCase] Starting state recovery', { gameId })

    // 1. Clear accumulated event queue
    // Reason: Events accumulated during page unfocus are outdated
    this.reconnectionPort.clearPendingEvents()
    console.info('[TriggerStateRecoveryUseCase] Cleared accumulated events')

    // 2. Fetch game snapshot
    const snapshot = await this.reconnectionPort.fetchSnapshot(gameId)

    if (!snapshot) {
      console.warn('[TriggerStateRecoveryUseCase] Failed to fetch game snapshot')
      this.notification.showErrorMessage('Failed to restore game state. Please refresh the page.')
      return
    }

    console.info('[TriggerStateRecoveryUseCase] Game snapshot fetched', {
      gameId: snapshot.game_id,
      flowStage: snapshot.current_flow_stage,
    })

    // 3. Delegate to HandleReconnectionUseCase for state restoration
    // HandleReconnectionUseCase handles: interrupt animations, clear pairing state, restore game state, show notification
    this.handleReconnection.execute(snapshot)

    console.info('[TriggerStateRecoveryUseCase] State recovery completed')
  }
}
