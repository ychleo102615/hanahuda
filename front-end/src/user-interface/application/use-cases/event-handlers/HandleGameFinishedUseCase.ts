/**
 * HandleGameFinishedUseCase
 */

import type { GameFinishedEvent } from '../../types/events'
import type { TriggerUIEffectPort } from '../../ports/output'
import type { HandleGameFinishedPort } from '../../ports/input'

export class HandleGameFinishedUseCase implements HandleGameFinishedPort {
  constructor(private readonly triggerUIEffect: TriggerUIEffectPort) {}

  execute(event: GameFinishedEvent): void {
    // 顯示遊戲結束畫面（通過 animation 或 message）
    // 暫時省略，視 UI 需求而定
  }
}
