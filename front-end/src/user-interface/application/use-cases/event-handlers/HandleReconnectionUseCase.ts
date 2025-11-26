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
import type { UIStatePort, TriggerUIEffectPort, AnimationPort } from '../../ports/output'
import type { HandleReconnectionPort } from '../../ports/input'

export class HandleReconnectionUseCase implements HandleReconnectionPort {
  constructor(
    private readonly updateUIState: UIStatePort,
    private readonly triggerUIEffect: TriggerUIEffectPort,
    private readonly animationPort: AnimationPort
  ) {}

  execute(snapshot: GameSnapshotRestore): void {
    // 0. 立即中斷所有動畫，清除動畫層狀態
    // 原因：重連後的快照是權威狀態，進行中的動畫已無意義
    this.animationPort.interrupt()
    this.animationPort.clearHiddenCards()

    // 1. 靜默恢復完整遊戲狀態（無動畫）
    this.updateUIState.restoreGameState(snapshot)

    // 2. 顯示「連線已恢復」提示訊息
    this.triggerUIEffect.showReconnectionMessage()
  }
}
