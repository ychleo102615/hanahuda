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
import type { YakuScore, PlayerScore, Yaku, ScoreMultipliers, RoundEndReason } from '#shared/contracts'
import { useUIStateStore } from '../stores/uiState'
import type { CountdownManager } from '../services/CountdownManager'
import type { YakuCategory } from '~/constants/announcement-styles'

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

    showGameFinishedModal(winnerId: string | null, finalScores: PlayerScore[], isPlayerWinner: boolean): void {
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

    // ===== Toast (Unified Toast System) =====
    showErrorMessage(message: string): void {
      store.addToast({
        type: 'error',
        message,
        duration: 5000,
        dismissible: true,
      })
      console.info('[NotificationPort] Error message:', message)
    },

    showSuccessMessage(message: string): void {
      store.addToast({
        type: 'success',
        message,
        duration: 3000,
        dismissible: false,
      })
      console.info('[NotificationPort] Success message:', message)
    },

    showInfoMessage(message: string): void {
      store.addToast({
        type: 'info',
        message,
        duration: 5000,
        dismissible: false,
      })
      console.info('[NotificationPort] Info message:', message)
    },

    showReconnectionMessage(): void {
      // Remove any existing loading toast first
      store.removeToastByType('loading')
      // Add persistent loading toast
      store.addToast({
        type: 'loading',
        message: 'Connection lost, reconnecting...',
        duration: null, // Persistent until manually removed
        dismissible: false,
      })
      store.reconnecting = true
      console.info('[NotificationPort] Reconnecting...')
    },

    hideReconnectionMessage(): void {
      // Remove loading toast
      store.removeToastByType('loading')
      store.reconnecting = false
      // Show success toast
      store.addToast({
        type: 'success',
        message: 'Connection restored',
        duration: 3000,
        dismissible: false,
      })
      console.info('[NotificationPort] Connection restored')
    },

    // ===== 等待訊息 =====
    showWaitingMessage(timeoutSeconds: number): void {
      store.showWaitingMessage(timeoutSeconds)
    },

    hideWaitingMessage(): void {
      store.hideWaitingMessage()
    },

    setDealingInProgress(inProgress: boolean): void {
      store.setDealingInProgress(inProgress)
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

    isRoundEndModalVisible(): boolean {
      return (
        store.roundScoredModalVisible ||
        store.roundDrawnModalVisible ||
        store.roundEndedInstantlyModalVisible
      )
    },

    setPendingGameFinished(data: { winnerId: string | null; finalScores: PlayerScore[]; isPlayerWinner: boolean }): void {
      store.setPendingGameFinished(data)
    },

    // ===== 倒數計時 =====
    startActionCountdown(seconds: number): void {
      countdown.cleanup()
      countdown.startActionCountdown(seconds)
    },

    stopActionCountdown(): void {
      countdown.stopActionCountdown()
    },

    startDisplayCountdown(seconds: number, onComplete?: () => void): void {
      countdown.cleanup()
      countdown.startDisplayCountdown(seconds, onComplete)
    },

    stopDisplayCountdown(): void {
      countdown.stopDisplayCountdown()
    },

    cleanup(): void {
      countdown.cleanup()
    },

    // ===== 遊戲公告系統 =====
    showKoiKoiAnnouncement(): void {
      store.queueAnnouncement({
        type: 'koikoi',
        duration: 1800, // 1.8 秒
      })
    },

    hideKoiKoiAnnouncement(): void {
      // No-op: 由佇列系統自動管理
    },

    showOpponentYakuAnnouncement(
      yakuList: ReadonlyArray<{
        yakuType: string
        yakuName: string
        yakuNameJa: string
        category: string
      }>
    ): void {
      if (yakuList.length === 0) return
      store.queueAnnouncement({
        type: 'yaku',
        yakuList: yakuList.map(y => ({
          yakuType: y.yakuType,
          yakuName: y.yakuName,
          yakuNameJa: y.yakuNameJa,
          category: y.category as YakuCategory,
        })),
        duration: 2200, // 2.2 秒
      })
    },

    // ===== 確認繼續遊戲 =====
    showContinueConfirmation(timeoutSeconds: number, onConfirm: () => void): void {
      store.showContinueConfirmation(timeoutSeconds, onConfirm)
    },

    hideContinueConfirmation(): void {
      store.hideContinueConfirmation()
    },
  }
}
