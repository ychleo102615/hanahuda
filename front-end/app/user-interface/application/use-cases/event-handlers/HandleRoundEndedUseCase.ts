/**
 * HandleRoundEndedUseCase
 *
 * @description
 * 處理統一的 RoundEnded 事件，根據 reason 決定顯示哪種 Modal。
 * 取代 HandleRoundScoredUseCase、HandleRoundDrawnUseCase、HandleRoundEndedInstantlyUseCase。
 */

import type { RoundEndedEvent } from '#shared/contracts'
import type { UIStatePort, NotificationPort, GameStatePort, SendCommandPort } from '../../ports/output'
import type { HandleRoundEndedPort, ExecuteOptions } from '../../ports/input'
import { DEFAULT_CONFIRMATION_TIMEOUT_SECONDS } from '~/constants'

export class HandleRoundEndedUseCase implements HandleRoundEndedPort {
  constructor(
    private readonly updateUIState: UIStatePort,
    private readonly notification: NotificationPort,
    private readonly gameState: GameStatePort,
    private readonly sendCommand: SendCommandPort
  ) {}

  execute(event: RoundEndedEvent, options: ExecuteOptions): void {
    // 0. 清理：停止倒數計時、清除流程階段
    this.notification.cleanup()
    this.gameState.setFlowStage(null)

    // 計算事件處理延遲（秒），用於調整倒數時間（使用 ceil 確保不低估延遲）
    const deltaSeconds = Math.ceil((Date.now() - options.receivedAt) / 1000)

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
    // 確認倒數使用 timeout_seconds 減去事件處理延遲
    if (event.require_continue_confirmation) {
      const rawTimeout = event.timeout_seconds ?? DEFAULT_CONFIRMATION_TIMEOUT_SECONDS
      const adjustedTimeout = rawTimeout - deltaSeconds
      this.notification.showContinueConfirmation(
        adjustedTimeout,
        (decision: 'CONTINUE' | 'LEAVE') => {
          // 立即切換到等待伺服器回應狀態
          this.notification.setContinueConfirmationProcessing()

          // 發送確認命令
          this.sendCommand.confirmContinue(decision).then(() => {
            console.log(`[HandleRoundEndedUseCase] Confirmation sent: ${decision}`)
            // 不調用 hideContinueConfirmation，等待 GameFinished / RoundDealt 事件
          }).catch((error) => {
            console.error('[HandleRoundEndedUseCase] Failed to send confirmation:', error)
            this.notification.showErrorMessage('Failed to confirm. Please try again.')
            // 保持 AWAITING_SERVER 狀態，等待 Server 回應
          })
        }
      )
      console.log(`[HandleRoundEndedUseCase] Confirmation required (adjusted timeout: ${adjustedTimeout}s)`)
    }

    // 4. 啟動顯示倒數（若有值），扣除事件處理延遲
    // 無值時表示最後一回合，面板需手動關閉
    if (event.timeout_seconds !== undefined) {
      const adjustedDisplayTimeout = event.timeout_seconds - deltaSeconds
      this.notification.startCountdown(adjustedDisplayTimeout, 'DISPLAY', () => {
        // 倒數結束時：
        // - 若有確認需求，切換到等待伺服器狀態（server 已處理超時）
        // - 若無確認需求，直接關閉 Modal
        if (event.require_continue_confirmation) {
          this.notification.setContinueConfirmationProcessing()
        } else {
          this.notification.hideModal()
        }
      })
    }
  }
}
