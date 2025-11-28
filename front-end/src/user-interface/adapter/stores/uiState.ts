/**
 * UIStateStore - Pinia Store
 *
 * @description
 * 管理 UI 互動狀態（前端臨時狀態），實作 TriggerUIEffectPort 介面的非動畫部分。
 *
 * 職責:
 * - 管理 Modal 顯示狀態 (decisionModal, gameFinishedModal)
 * - 管理訊息提示 (errorMessage, infoMessage)
 * - 管理連線狀態 (connectionStatus, reconnecting)
 *
 * 特性:
 * - 不參與快照恢復 (重連後重置為初始狀態)
 * - 不持久化
 * - 單例模式 (整個應用程式生命週期只有一個實例)
 */

import { defineStore } from 'pinia'
import type { YakuScore, PlayerScore } from '../../application/types'

/**
 * 決策 Modal 資料
 */
export interface DecisionModalData {
  currentYaku: YakuScore[]
  currentScore: number
  potentialScore?: number
}

/**
 * 遊戲結束資料
 */
export interface GameFinishedData {
  winnerId: string
  finalScores: PlayerScore[]
  isPlayerWinner: boolean
}

/**
 * 連線狀態
 */
export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected'

/**
 * UIStateStore State 介面
 */
export interface UIStateStoreState {
  // Koi-Koi 決策 Modal
  decisionModalVisible: boolean
  decisionModalData: DecisionModalData | null

  // 遊戲結束 Modal
  gameFinishedVisible: boolean
  gameFinishedData: GameFinishedData | null

  // 平局 UI
  roundDrawnVisible: boolean
  roundDrawnScores: PlayerScore[]

  // 訊息提示
  errorMessage: string | null
  infoMessage: string | null

  // 連線狀態
  connectionStatus: ConnectionStatus
  reconnecting: boolean

  // 手牌確認模式（兩次點擊）
  handCardConfirmationMode: boolean
  handCardAwaitingConfirmation: string | null
  matchableFieldCards: string[]
  matchCount: number

  // 手牌懸浮預覽
  handCardHoverPreview: string | null
  previewHighlightedTargets: string[]

  // 場牌選擇模式（翻牌多重配對）
  fieldCardSelectionMode: boolean
  fieldCardSelectableTargets: string[]
  fieldCardHighlightType: 'single' | 'multiple' | null
  fieldCardSourceCard: string | null

  // 倒數計時
  actionTimeoutRemaining: number | null
  displayTimeoutRemaining: number | null
}

/**
 * UIStateStore Actions 介面（部分實作 TriggerUIEffectPort）
 */
export interface UIStateStoreActions {
  // TriggerUIEffectPort 方法（不含 triggerAnimation）
  showDecisionModal(currentYaku: YakuScore[], currentScore: number, potentialScore?: number): void
  showErrorMessage(message: string): void
  showReconnectionMessage(): void
  showGameFinishedUI(winnerId: string, finalScores: PlayerScore[], isPlayerWinner: boolean): void
  showRoundDrawnUI(currentTotalScores: PlayerScore[]): void

  // 內部輔助方法
  hideDecisionModal(): void
  hideGameFinishedUI(): void
  hideRoundDrawnUI(): void
  hideReconnectionMessage(): void
  setConnectionStatus(status: ConnectionStatus): void
  reset(): void

  // 手牌確認模式管理
  enterHandCardConfirmationMode(cardId: string, matchableCards: string[], matchCount: number): void
  exitHandCardConfirmationMode(): void

  // 手牌懸浮預覽管理
  setHandCardHoverPreview(cardId: string, highlightedTargets: string[]): void
  clearHandCardHoverPreview(): void

  // 場牌選擇模式管理
  enterFieldCardSelectionMode(sourceCard: string, selectableTargets: string[], highlightType: 'single' | 'multiple'): void
  exitFieldCardSelectionMode(): void

  // 倒數計時管理
  startActionCountdown(seconds: number): void
  stopActionCountdown(): void
  startDisplayCountdown(seconds: number, onComplete?: () => void): void
  stopDisplayCountdown(): void
}

/**
 * UIStateStore 定義
 */
export const useUIStateStore = defineStore('uiState', {
  state: (): UIStateStoreState => ({
    // Koi-Koi 決策 Modal
    decisionModalVisible: false,
    decisionModalData: null,

    // 遊戲結束 Modal
    gameFinishedVisible: false,
    gameFinishedData: null,

    // 平局 UI
    roundDrawnVisible: false,
    roundDrawnScores: [],

    // 訊息提示
    errorMessage: null,
    infoMessage: null,

    // 連線狀態
    connectionStatus: 'disconnected',
    reconnecting: false,

    // 手牌確認模式
    handCardConfirmationMode: false,
    handCardAwaitingConfirmation: null,
    matchableFieldCards: [],
    matchCount: 0,

    // 手牌懸浮預覽
    handCardHoverPreview: null,
    previewHighlightedTargets: [],

    // 場牌選擇模式
    fieldCardSelectionMode: false,
    fieldCardSelectableTargets: [],
    fieldCardHighlightType: null,
    fieldCardSourceCard: null,

    // 倒數計時
    actionTimeoutRemaining: null,
    displayTimeoutRemaining: null,
  }),

  actions: {
    /**
     * 顯示 Koi-Koi 決策 Modal
     *
     * @param currentYaku - 當前役種列表
     * @param currentScore - 當前分數
     * @param potentialScore - 潛在分數（可選）
     */
    showDecisionModal(
      currentYaku: YakuScore[],
      currentScore: number,
      potentialScore?: number,
    ): void {
      this.decisionModalVisible = true
      this.decisionModalData = {
        currentYaku: [...currentYaku],
        currentScore,
        potentialScore,
      }
      console.info('[UIStateStore] 顯示 Koi-Koi 決策 Modal', this.decisionModalData)
    },

    /**
     * 隱藏 Koi-Koi 決策 Modal
     */
    hideDecisionModal(): void {
      this.decisionModalVisible = false
      this.decisionModalData = null
      console.info('[UIStateStore] 隱藏 Koi-Koi 決策 Modal')
    },

    /**
     * 顯示錯誤訊息
     *
     * @param message - 錯誤訊息
     */
    showErrorMessage(message: string): void {
      this.errorMessage = message
      console.error('[UIStateStore] 錯誤訊息:', message)

      // 自動消失（3 秒後）
      setTimeout(() => {
        if (this.errorMessage === message) {
          this.errorMessage = null
        }
      }, 3000)
    },

    /**
     * 顯示重連訊息
     */
    showReconnectionMessage(): void {
      this.reconnecting = true
      this.infoMessage = '連線中斷，正在嘗試重連...'
      console.info('[UIStateStore]', this.infoMessage)
    },

    /**
     * 隱藏重連訊息（重連成功）
     */
    hideReconnectionMessage(): void {
      this.reconnecting = false
      this.infoMessage = '連線已恢復'
      console.info('[UIStateStore]', this.infoMessage)

      // 自動消失（3 秒後）
      setTimeout(() => {
        if (this.infoMessage === '連線已恢復') {
          this.infoMessage = null
        }
      }, 3000)
    },

    /**
     * 顯示遊戲結束 UI
     *
     * @param winnerId - 贏家玩家 ID
     * @param finalScores - 最終分數列表
     * @param isPlayerWinner - 是否為當前玩家獲勝
     */
    showGameFinishedUI(winnerId: string, finalScores: PlayerScore[], isPlayerWinner: boolean): void {
      this.gameFinishedVisible = true
      this.gameFinishedData = {
        winnerId,
        finalScores: [...finalScores],
        isPlayerWinner,
      }
      console.info('[UIStateStore] 顯示遊戲結束 UI', this.gameFinishedData)
    },

    /**
     * 隱藏遊戲結束 UI
     */
    hideGameFinishedUI(): void {
      this.gameFinishedVisible = false
      this.gameFinishedData = null
      console.info('[UIStateStore] 隱藏遊戲結束 UI')
    },

    /**
     * 顯示平局 UI
     *
     * @param currentTotalScores - 當前總分列表
     */
    showRoundDrawnUI(currentTotalScores: PlayerScore[]): void {
      this.roundDrawnVisible = true
      this.roundDrawnScores = [...currentTotalScores]
      console.info('[UIStateStore] 顯示平局 UI', this.roundDrawnScores)
    },

    /**
     * 隱藏平局 UI
     */
    hideRoundDrawnUI(): void {
      this.roundDrawnVisible = false
      this.roundDrawnScores = []
      console.info('[UIStateStore] 隱藏平局 UI')
    },

    /**
     * 設定連線狀態
     *
     * @param status - 連線狀態
     */
    setConnectionStatus(status: ConnectionStatus): void {
      this.connectionStatus = status
      console.info('[UIStateStore] 連線狀態變更:', status)
    },

    /**
     * 重置所有狀態（用於離開遊戲或重連後）
     */
    reset(): void {
      this.decisionModalVisible = false
      this.decisionModalData = null

      this.gameFinishedVisible = false
      this.gameFinishedData = null

      this.roundDrawnVisible = false
      this.roundDrawnScores = []

      this.errorMessage = null
      this.infoMessage = null

      this.connectionStatus = 'disconnected'
      this.reconnecting = false

      // 手牌確認模式
      this.handCardConfirmationMode = false
      this.handCardAwaitingConfirmation = null
      this.matchableFieldCards = []
      this.matchCount = 0

      // 手牌懸浮預覽
      this.handCardHoverPreview = null
      this.previewHighlightedTargets = []

      // 場牌選擇模式
      this.fieldCardSelectionMode = false
      this.fieldCardSelectableTargets = []
      this.fieldCardHighlightType = null
      this.fieldCardSourceCard = null

      // 倒數計時
      this.stopActionCountdown()
      this.stopDisplayCountdown()

      console.info('[UIStateStore] 狀態已重置')
    },

    /**
     * 進入手牌確認模式
     */
    enterHandCardConfirmationMode(cardId: string, matchableCards: string[], matchCount: number): void {
      this.handCardConfirmationMode = true
      this.handCardAwaitingConfirmation = cardId
      this.matchableFieldCards = [...matchableCards]
      this.matchCount = matchCount
      console.info('[UIStateStore] 進入手牌確認模式', { cardId, matchCount })
    },

    /**
     * 退出手牌確認模式
     */
    exitHandCardConfirmationMode(): void {
      this.handCardConfirmationMode = false
      this.handCardAwaitingConfirmation = null
      this.matchableFieldCards = []
      this.matchCount = 0
      console.info('[UIStateStore] 退出手牌確認模式')
    },

    /**
     * 設定手牌懸浮預覽
     */
    setHandCardHoverPreview(cardId: string, highlightedTargets: string[]): void {
      this.handCardHoverPreview = cardId
      this.previewHighlightedTargets = [...highlightedTargets]
    },

    /**
     * 清除手牌懸浮預覽
     */
    clearHandCardHoverPreview(): void {
      this.handCardHoverPreview = null
      this.previewHighlightedTargets = []
    },

    /**
     * 進入場牌選擇模式
     */
    enterFieldCardSelectionMode(sourceCard: string, selectableTargets: string[], highlightType: 'single' | 'multiple'): void {
      // 如果正在確認模式，先退出
      if (this.handCardConfirmationMode) {
        this.exitHandCardConfirmationMode()
      }

      this.fieldCardSelectionMode = true
      this.fieldCardSelectableTargets = [...selectableTargets]
      this.fieldCardHighlightType = highlightType
      this.fieldCardSourceCard = sourceCard
      console.info('[UIStateStore] 進入場牌選擇模式', { sourceCard, highlightType, targetCount: selectableTargets.length })
    },

    /**
     * 退出場牌選擇模式
     */
    exitFieldCardSelectionMode(): void {
      this.fieldCardSelectionMode = false
      this.fieldCardSelectableTargets = []
      this.fieldCardHighlightType = null
      this.fieldCardSourceCard = null
      console.info('[UIStateStore] 退出場牌選擇模式')
    },

    /**
     * 啟動操作倒數
     *
     * @param seconds - 倒數秒數
     */
    startActionCountdown(seconds: number): void {
      // 停止現有倒數
      this.stopActionCountdown()

      this.actionTimeoutRemaining = seconds
      console.info('[UIStateStore] 啟動操作倒數:', seconds)

      // 建立 interval ID（存在 Store 外部，因為 Pinia state 不應存 interval ID）
      const intervalId = window.setInterval(() => {
        if (this.actionTimeoutRemaining !== null && this.actionTimeoutRemaining > 0) {
          this.actionTimeoutRemaining--
        } else {
          this.stopActionCountdown()
        }
      }, 1000)

      // 使用 Symbol 作為 key 存在 Store 實例上（非 reactive state）
      ;(this as any)._actionIntervalId = intervalId
    },

    /**
     * 停止操作倒數
     */
    stopActionCountdown(): void {
      const intervalId = (this as any)._actionIntervalId
      if (intervalId !== undefined) {
        clearInterval(intervalId)
        ;(this as any)._actionIntervalId = undefined
      }
      this.actionTimeoutRemaining = null
      console.info('[UIStateStore] 停止操作倒數')
    },

    /**
     * 啟動顯示倒數
     *
     * @param seconds - 倒數秒數
     * @param onComplete - 倒數結束時的回調（可選）
     */
    startDisplayCountdown(seconds: number, onComplete?: () => void): void {
      // 停止現有倒數
      this.stopDisplayCountdown()

      this.displayTimeoutRemaining = seconds
      console.info('[UIStateStore] 啟動顯示倒數:', seconds)

      // 存儲回調
      ;(this as any)._displayOnComplete = onComplete

      // 建立 interval ID
      const intervalId = window.setInterval(() => {
        if (this.displayTimeoutRemaining !== null && this.displayTimeoutRemaining > 0) {
          this.displayTimeoutRemaining--
        } else {
          // 倒數結束，執行回調並停止
          const callback = (this as any)._displayOnComplete
          this.stopDisplayCountdown()
          if (callback) {
            callback()
          }
        }
      }, 1000)

      ;(this as any)._displayIntervalId = intervalId
    },

    /**
     * 停止顯示倒數
     */
    stopDisplayCountdown(): void {
      const intervalId = (this as any)._displayIntervalId
      if (intervalId !== undefined) {
        clearInterval(intervalId)
        ;(this as any)._displayIntervalId = undefined
      }
      ;(this as any)._displayOnComplete = undefined
      this.displayTimeoutRemaining = null
      console.info('[UIStateStore] 停止顯示倒數')
    },
  },
})

