/**
 * HandleGameFinishedUseCase
 */

import type { GameFinishedEvent } from '../../types/events'
import type { TriggerUIEffectPort } from '../../ports/output'
import type { HandleGameFinishedPort } from '../../ports/input'

export class HandleGameFinishedUseCase implements HandleGameFinishedPort {
  constructor(private readonly triggerUIEffect: TriggerUIEffectPort) {}

  execute(event: GameFinishedEvent): void {
    // 顯示遊戲結束畫面
    // TODO: 實作遊戲結束 UI（顯示最終分數）
    // event.final_scores 是 PlayerScore[] 陣列
    console.log('Game finished:', event.final_scores)
  }
}
