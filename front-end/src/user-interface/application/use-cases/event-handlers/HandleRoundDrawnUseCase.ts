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
    // TODO: 實作平局 UI（顯示當前總分）
    console.log('Round drawn:', event.current_total_scores)
  }
}
