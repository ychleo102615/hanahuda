/**
 * HandleRoundEndedInstantlyUseCase
 */

import type { RoundEndedInstantlyEvent } from '../../types/events'
import type { UIStatePort, TriggerUIEffectPort } from '../../ports/output'
import type { HandleRoundEndedInstantlyPort } from '../../ports/input'

export class HandleRoundEndedInstantlyUseCase implements HandleRoundEndedInstantlyPort {
  constructor(
    private readonly updateUIState: UIStatePort,
    private readonly triggerUIEffect: TriggerUIEffectPort
  ) {}

  execute(event: RoundEndedInstantlyEvent): void {
    // 1. 更新分數
    const player1Score = event.updated_total_scores.find((s) => s.player_id === 'player-1')?.score || 0
    const player2Score = event.updated_total_scores.find((s) => s.player_id === 'player-2')?.score || 0
    this.updateUIState.updateScores(player1Score, player2Score)

    // 2. 顯示特殊結束訊息（通過 animation 或 message）
    // 暫時省略，視 UI 需求而定
  }
}
