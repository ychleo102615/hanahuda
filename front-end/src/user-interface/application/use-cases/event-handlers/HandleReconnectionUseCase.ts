/**
 * HandleReconnectionUseCase
 *
 * @description
 * 處理斷線重連後的狀態恢復，確保遊戲狀態與後端完全同步。
 *
 * 業務流程：
 * 1. 立即中斷所有進行中的動畫（防止視覺混亂）
 * 2. 清除動畫層的所有隱藏卡片狀態
 * 3. 靜默恢復完整遊戲狀態（無動畫）
 * 4. 顯示「連線已恢復」提示訊息
 */

import type { GameSnapshotRestore } from '../../types/events'
import type {
  UIStatePort,
  NotificationPort,
  AnimationPort,
  MatchmakingStatePort,
} from '../../ports/output'
import type { HandleReconnectionPort } from '../../ports/input'

export class HandleReconnectionUseCase implements HandleReconnectionPort {
  constructor(
    private readonly updateUIState: UIStatePort,
    private readonly notification: NotificationPort,
    private readonly animationPort: AnimationPort,
    private readonly matchmakingState: MatchmakingStatePort
  ) {}

  execute(snapshot: GameSnapshotRestore): void {
    // 0. 立即中斷所有動畫，清除動畫層狀態
    // 原因：重連後的快照是權威狀態，進行中的動畫已無意義
    this.animationPort.interrupt()
    this.animationPort.clearHiddenCards()

    // 0.5. 清除配對狀態（防止殘留，重連時已有遊戲會話）
    this.matchmakingState.clearSession()

    // 1. 靜默恢復完整遊戲狀態（無動畫）
    this.updateUIState.restoreGameState(snapshot)

    // 2. 顯示「連線已恢復」提示訊息
    this.notification.showReconnectionMessage()

    // 3. 恢復操作倒數（如果有）
    this.notification.startActionCountdown(snapshot.action_timeout_seconds)
  }
}
