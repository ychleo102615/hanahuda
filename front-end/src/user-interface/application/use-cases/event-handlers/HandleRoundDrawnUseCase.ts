/**
 * HandleRoundDrawnUseCase
 */

import type { RoundDrawnEvent } from '../../types/events'
import type { TriggerUIEffectPort } from '../../ports/output'
import type { HandleRoundDrawnPort } from '../../ports/input'

export class HandleRoundDrawnUseCase implements HandleRoundDrawnPort {
  constructor(private readonly triggerUIEffect: TriggerUIEffectPort) {}

  execute(event: RoundDrawnEvent): void {
    // 顯示平局訊息（通過 animation 或 message）
    // 暫時省略，視 UI 需求而定
  }
}
