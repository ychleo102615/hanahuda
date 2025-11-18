/**
 * HandleRoundDrawnUseCase
 */

import type { RoundDrawnEvent } from '../../types/events'
import type { TriggerUIEffectPort } from '../../ports/output'
import type { HandleRoundDrawnPort } from '../../ports/input'

export class HandleRoundDrawnUseCase implements HandleRoundDrawnPort {
  constructor(private readonly triggerUIEffect: TriggerUIEffectPort) {}

  execute(event: RoundDrawnEvent): void {
    // 顯示平局訊息
    this.triggerUIEffect.showRoundDrawnUI([...event.current_total_scores])
  }
}
