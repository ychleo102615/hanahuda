/**
 * HandleRoundScoredUseCase
 */

import type { RoundScoredEvent } from '../../types/events'
import type { UpdateUIStatePort, TriggerUIEffectPort } from '../../ports/output'
import type { DomainFacade } from '../../types/domain-facade'
import type { HandleRoundScoredPort } from '../../ports/input'

export class HandleRoundScoredUseCase implements HandleRoundScoredPort {
  constructor(
    private readonly updateUIState: UpdateUIStatePort,
    private readonly triggerUIEffect: TriggerUIEffectPort,
    private readonly domainFacade: DomainFacade
  ) {}

  execute(event: RoundScoredEvent): void {
    // 1. 觸發分數更新動畫
    const winnerScore = event.updated_total_scores.find((s) => s.player_id === event.winner_id)
    if (winnerScore) {
      this.triggerUIEffect.triggerAnimation('SCORE_UPDATE', {
        playerId: event.winner_id,
        oldScore: winnerScore.score - event.final_score,
        newScore: winnerScore.score,
      })
    }

    // 2. 更新分數
    const player1Score = event.updated_total_scores.find((s) => s.player_id === 'player-1')?.score || 0
    const player2Score = event.updated_total_scores.find((s) => s.player_id === 'player-2')?.score || 0
    this.updateUIState.updateScores(player1Score, player2Score)
  }
}
