/**
 * HandleRoundScoredUseCase
 */

import type { RoundScoredEvent } from '#shared/contracts'
import type { UIStatePort, NotificationPort } from '../../ports/output'
import type { DomainFacade } from '../../types/domain-facade'
import type { HandleRoundScoredPort } from '../../ports/input'

export class HandleRoundScoredUseCase implements HandleRoundScoredPort {
  constructor(
    private readonly updateUIState: UIStatePort,
    private readonly domainFacade: DomainFacade,
    private readonly notification: NotificationPort
  ) {}

  execute(event: RoundScoredEvent): void {
    // TODO: Post-MVP 實作分數更新動畫
    // 當前直接更新分數，視覺效果由 UI 層的 Pinia store 反應式更新處理

    // 1. 更新分數（使用動態 player_id，而非硬編碼）
    const localPlayerId = this.updateUIState.getLocalPlayerId()
    const myScore = event.updated_total_scores.find((s) => s.player_id === localPlayerId)?.score ?? 0
    const opponentScore = event.updated_total_scores.find((s) => s.player_id !== localPlayerId)?.score ?? 0
    this.updateUIState.updateScores(myScore, opponentScore)

    // 2. 顯示回合計分面板
    this.notification.showRoundScoredModal(
      event.winner_id,
      event.yaku_list,
      event.base_score,
      event.final_score,
      event.multipliers,
      [...event.updated_total_scores]
    )

    // 3. 啟動顯示倒數（傳入回調，倒數結束時自動關閉面板）
    this.notification.startDisplayCountdown(event.display_timeout_seconds, () => {
      this.notification.hideModal()
    })
  }
}
