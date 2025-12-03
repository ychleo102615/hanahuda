/**
 * NotificationPortAdapter
 *
 * @description
 * 實作 NotificationPort 介面，包裝 UIStateStore 處理通知效果。
 *
 * 職責：
 * - Modal 顯示/隱藏（Decision、GameFinished、RoundDrawn）
 * - Toast 訊息（Error、Success、Reconnection）
 * - 倒數計時管理（透過注入的 countdown composable）
 */

import type { NotificationPort } from '../../application/ports/output/notification.port'
import type { YakuScore, PlayerScore, Yaku, ScoreMultipliers } from '../../application/types'
import type { RoundEndReason } from '../../application/types/errors'
import { useUIStateStore } from '../stores/uiState'
import type { CountdownManager } from '../services/CountdownManager'

/**
 * 建立 NotificationPort Adapter
 *
 * @param countdown - 倒數計時管理器（依賴注入）
 * @returns NotificationPort 實作
 */
export function createNotificationPortAdapter(
  countdown: CountdownManager
): NotificationPort {
  const store = useUIStateStore()

  return {
    // ===== Modal =====
    showDecisionModal(currentYaku: YakuScore[], currentScore: number): void {
      store.showDecisionModal(currentYaku, currentScore)
    },

    showGameFinishedModal(winnerId: string, finalScores: PlayerScore[], isPlayerWinner: boolean): void {
      store.showGameFinishedModal(winnerId, finalScores, isPlayerWinner)
    },

    showRoundDrawnModal(currentTotalScores: PlayerScore[]): void {
      store.showRoundDrawnModal(currentTotalScores)
    },

    showRoundScoredModal(
      winnerId: string,
      yakuList: ReadonlyArray<Yaku>,
      baseScore: number,
      finalScore: number,
      multipliers: ScoreMultipliers,
      updatedTotalScores: PlayerScore[],
    ): void {
      store.showRoundScoredModal(winnerId, yakuList, baseScore, finalScore, multipliers, updatedTotalScores)
    },

    showRoundEndedInstantlyModal(
      reason: RoundEndReason,
      winnerId: string | null,
      awardedPoints: number,
      updatedTotalScores: PlayerScore[],
    ): void {
      store.showRoundEndedInstantlyModal(reason, winnerId, awardedPoints, updatedTotalScores)
    },

    hideModal(): void {
      // 隱藏所有 Modal（Store 層已確保互斥性）
      store.hideModal()
    },

    // ===== Toast =====
    showErrorMessage(message: string): void {
      store.showErrorMessage(message)
    },

    showSuccessMessage(message: string): void {
      // 使用 infoMessage 顯示成功訊息
      store.infoMessage = message
      console.info('[NotificationPort] 成功訊息:', message)

      // 自動消失（3 秒後）
      setTimeout(() => {
        if (store.infoMessage === message) {
          store.infoMessage = null
        }
      }, 3000)
    },

    showReconnectionMessage(): void {
      store.showReconnectionMessage()
    },

    // ===== 查詢 =====
    isModalVisible(): boolean {
      return (
        store.decisionModalVisible ||
        store.gameFinishedModalVisible ||
        store.roundDrawnModalVisible ||
        store.roundScoredModalVisible ||
        store.roundEndedInstantlyModalVisible
      )
    },

    // ===== 倒數計時 =====
    startActionCountdown(seconds: number): void {
      countdown.startActionCountdown(seconds)
    },

    stopActionCountdown(): void {
      countdown.stopActionCountdown()
    },

    startDisplayCountdown(seconds: number, onComplete?: () => void): void {
      countdown.startDisplayCountdown(seconds, onComplete)
    },

    stopDisplayCountdown(): void {
      countdown.stopDisplayCountdown()
    },

    cleanup(): void {
      countdown.cleanup()
    },
  }
}
