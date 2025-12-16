/**
 * HandleRoundEndedUseCase
 *
 * @description
 * 處理統一的 RoundEnded 事件，根據 reason 決定顯示哪種 Modal。
 * 取代 HandleRoundScoredUseCase、HandleRoundDrawnUseCase、HandleRoundEndedInstantlyUseCase。
 */

import type { RoundEndedEvent } from '#shared/contracts'
import type { UIStatePort, NotificationPort, GameStatePort } from '../../ports/output'
import type { HandleRoundEndedPort } from '../../ports/input'

export class HandleRoundEndedUseCase implements HandleRoundEndedPort {
  constructor(
    private readonly updateUIState: UIStatePort,
    private readonly notification: NotificationPort,
    private readonly gameState: GameStatePort
  ) {}

  execute(event: RoundEndedEvent): void {
    // 0. 清理：停止倒數計時、清除流程階段
    this.notification.cleanup()
    this.gameState.setFlowStage(null)

    // 1. 更新分數（使用動態 player_id）
    const localPlayerId = this.updateUIState.getLocalPlayerId()
    const myScore = event.updated_total_scores.find((s) => s.player_id === localPlayerId)?.score ?? 0
    const opponentScore = event.updated_total_scores.find((s) => s.player_id !== localPlayerId)?.score ?? 0
    this.updateUIState.updateScores(myScore, opponentScore)

    // 2. 根據 reason 顯示對應 Modal
    switch (event.reason) {
      case 'SCORED':
        if (event.scoring_data) {
          this.notification.showRoundScoredModal(
            event.scoring_data.winner_id,
            [...event.scoring_data.yaku_list],
            event.scoring_data.base_score,
            event.scoring_data.final_score,
            event.scoring_data.multipliers,
            [...event.updated_total_scores]
          )
        }
        break

      case 'DRAWN':
        this.notification.showRoundDrawnModal([...event.updated_total_scores])
        break

      case 'INSTANT_TESHI':
      case 'INSTANT_FIELD_KUTTSUKI':
        if (event.instant_data) {
          this.notification.showRoundEndedInstantlyModal(
            event.reason,
            event.instant_data.winner_id,
            event.instant_data.awarded_points,
            [...event.updated_total_scores]
          )
        }
        break
    }

    // 3. 處理確認繼續遊戲的需求
    // TODO: Phase 4 實作 - 若 require_continue_confirmation 為 true，顯示確認按鈕
    if (event.require_continue_confirmation) {
      // TODO: 顯示確認繼續遊戲按鈕，啟動倒數
      console.log('[HandleRoundEndedUseCase] Confirmation required - not yet implemented')
    }

    // 4. 啟動顯示倒數（若有值，倒數結束時自動關閉面板）
    // 無值時表示最後一回合，面板需手動關閉
    if (event.display_timeout_seconds !== undefined) {
      this.notification.startDisplayCountdown(event.display_timeout_seconds, () => {
        this.notification.hideModal()
      })
    }
  }
}
