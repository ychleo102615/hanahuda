/**
 * HandleTurnErrorUseCase
 */

import type { TurnErrorEvent } from '../../types/events'
import type { TriggerUIEffectPort } from '../../ports/output'
import type { HandleTurnErrorPort } from '../../ports/input'

export class HandleTurnErrorUseCase implements HandleTurnErrorPort {
  constructor(private readonly triggerUIEffect: TriggerUIEffectPort) {}

  execute(event: TurnErrorEvent): void {
    // 顯示錯誤訊息
    this.triggerUIEffect.showErrorMessage(event.error_message)
  }
}
