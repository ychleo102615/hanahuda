/**
 * HandleReconnectionUseCase
 */

import type { GameSnapshotRestore } from '../../types/events'
import type { UIStatePort, TriggerUIEffectPort } from '../../ports/output'
import type { HandleReconnectionPort } from '../../ports/input'

export class HandleReconnectionUseCase implements HandleReconnectionPort {
  constructor(
    private readonly updateUIState: UIStatePort,
    private readonly triggerUIEffect: TriggerUIEffectPort
  ) {}

  execute(snapshot: GameSnapshotRestore): void {
    // 1. 靜默恢復完整遊戲狀態（無動畫）
    this.updateUIState.restoreGameState(snapshot)

    // 2. 顯示「Connection is restored」提示訊息
    this.triggerUIEffect.showReconnectionMessage()
  }
}
