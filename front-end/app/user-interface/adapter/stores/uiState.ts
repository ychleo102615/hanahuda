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
import type { YakuScore, PlayerScore, Yaku, ScoreMultipliers, RoundEndReason } from '#shared/contracts'

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
 * 回合計分資料
 */
export interface RoundScoredData {
  winnerId: string
  yakuList: ReadonlyArray<Yaku>
  baseScore: number
  finalScore: number
  multipliers: ScoreMultipliers
  updatedTotalScores: PlayerScore[]
}

/**
 * 局即時結束資料
 */
export interface RoundEndedInstantlyData {
  reason: RoundEndReason
  winnerId: string | null
  awardedPoints: number
  updatedTotalScores: PlayerScore[]
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
  gameFinishedModalVisible: boolean
  gameFinishedModalData: GameFinishedData | null

  // 平局 Modal
  roundDrawnModalVisible: boolean
  roundDrawnModalScores: PlayerScore[]

  // 回合計分 Modal
  roundScoredModalVisible: boolean
  roundScoredModalData: RoundScoredData | null

  // 局即時結束 Modal
  roundEndedInstantlyModalVisible: boolean
  roundEndedInstantlyModalData: RoundEndedInstantlyData | null

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
  showGameFinishedModal(winnerId: string, finalScores: PlayerScore[], isPlayerWinner: boolean): void
  showRoundDrawnModal(currentTotalScores: PlayerScore[]): void
  showRoundScoredModal(winnerId: string, yakuList: ReadonlyArray<Yaku>, baseScore: number, finalScore: number, multipliers: ScoreMultipliers, updatedTotalScores: PlayerScore[]): void
  showRoundEndedInstantlyModal(reason: RoundEndReason, winnerId: string | null, awardedPoints: number, updatedTotalScores: PlayerScore[]): void

  // 內部輔助方法
  hideDecisionModal(): void
  hideGameFinishedModal(): void
  hideRoundDrawnModal(): void
  hideRoundScoredModal(): void
  hideRoundEndedInstantlyModal(): void
  hideModal(): void
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
    gameFinishedModalVisible: false,
    gameFinishedModalData: null,

    // 平局 Modal
    roundDrawnModalVisible: false,
    roundDrawnModalScores: [],

    // 回合計分 Modal
    roundScoredModalVisible: false,
    roundScoredModalData: null,

    // 局即時結束 Modal
    roundEndedInstantlyModalVisible: false,
    roundEndedInstantlyModalData: null,

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
     * 關閉所有 Modal（內部輔助方法）
     *
     * @description
     * 確保 modal 互斥性：一次只能顯示一個 modal。
     * 所有 show*Modal 方法都會先調用此方法。
     */
    _hideAllModals(): void {
      this.decisionModalVisible = false
      this.decisionModalData = null

      this.gameFinishedModalVisible = false
      this.gameFinishedModalData = null

      this.roundDrawnModalVisible = false
      this.roundDrawnModalScores = []

      this.roundScoredModalVisible = false
      this.roundScoredModalData = null

      this.roundEndedInstantlyModalVisible = false
      this.roundEndedInstantlyModalData = null
    },

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
      this._hideAllModals()

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
     * 顯示遊戲結束 Modal
     *
     * @param winnerId - 贏家玩家 ID
     * @param finalScores - 最終分數列表
     * @param isPlayerWinner - 是否為當前玩家獲勝
     */
    showGameFinishedModal(winnerId: string, finalScores: PlayerScore[], isPlayerWinner: boolean): void {
      this._hideAllModals()

      this.gameFinishedModalVisible = true
      this.gameFinishedModalData = {
        winnerId,
        finalScores: [...finalScores],
        isPlayerWinner,
      }
      console.info('[UIStateStore] 顯示遊戲結束 Modal', this.gameFinishedModalData)
    },

    /**
     * 隱藏遊戲結束 Modal
     */
    hideGameFinishedModal(): void {
      this.gameFinishedModalVisible = false
      this.gameFinishedModalData = null
      console.info('[UIStateStore] 隱藏遊戲結束 Modal')
    },

    /**
     * 顯示平局 Modal
     *
     * @param currentTotalScores - 當前總分列表
     */
    showRoundDrawnModal(currentTotalScores: PlayerScore[]): void {
      this._hideAllModals()

      this.roundDrawnModalVisible = true
      this.roundDrawnModalScores = [...currentTotalScores]
      console.info('[UIStateStore] 顯示平局 Modal', this.roundDrawnModalScores)
    },

    /**
     * 隱藏平局 Modal
     */
    hideRoundDrawnModal(): void {
      this.roundDrawnModalVisible = false
      this.roundDrawnModalScores = []
      console.info('[UIStateStore] 隱藏平局 Modal')
    },

    /**
     * 顯示回合計分 Modal
     *
     * @param winnerId - 勝者玩家 ID
     * @param yakuList - 役種列表
     * @param baseScore - 基礎分數
     * @param finalScore - 最終分數
     * @param multipliers - 分數倍率
     * @param updatedTotalScores - 更新後的總分列表
     */
    showRoundScoredModal(
      winnerId: string,
      yakuList: ReadonlyArray<Yaku>,
      baseScore: number,
      finalScore: number,
      multipliers: ScoreMultipliers,
      updatedTotalScores: PlayerScore[],
    ): void {
      this._hideAllModals()

      this.roundScoredModalVisible = true
      this.roundScoredModalData = {
        winnerId,
        yakuList: [...yakuList],
        baseScore,
        finalScore,
        multipliers,
        updatedTotalScores: [...updatedTotalScores],
      }
      console.info('[UIStateStore] 顯示回合計分 Modal', this.roundScoredModalData)
    },

    /**
     * 隱藏回合計分 Modal
     */
    hideRoundScoredModal(): void {
      this.roundScoredModalVisible = false
      this.roundScoredModalData = null
      console.info('[UIStateStore] 隱藏回合計分 Modal')
    },

    /**
     * 顯示局即時結束 Modal
     *
     * @param reason - 結束原因
     * @param winnerId - 勝者玩家 ID（可能為 null）
     * @param awardedPoints - 獲得的分數
     * @param updatedTotalScores - 更新後的總分列表
     */
    showRoundEndedInstantlyModal(
      reason: RoundEndReason,
      winnerId: string | null,
      awardedPoints: number,
      updatedTotalScores: PlayerScore[],
    ): void {
      this._hideAllModals()

      this.roundEndedInstantlyModalVisible = true
      this.roundEndedInstantlyModalData = {
        reason,
        winnerId,
        awardedPoints,
        updatedTotalScores: [...updatedTotalScores],
      }
      console.info('[UIStateStore] 顯示局即時結束 Modal', this.roundEndedInstantlyModalData)
    },

    /**
     * 隱藏局即時結束 Modal
     */
    hideRoundEndedInstantlyModal(): void {
      this.roundEndedInstantlyModalVisible = false
      this.roundEndedInstantlyModalData = null
      console.info('[UIStateStore] 隱藏局即時結束 Modal')
    },

    /**
     * 隱藏當前 Modal
     *
     * @description
     * 通用方法，關閉所有可能打開的 modal/panel。
     * 倒數計時由 CountdownManager 管理，不在此處停止。
     */
    hideModal(): void {
      this._hideAllModals()
      console.info('[UIStateStore] 隱藏所有 Modal')
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

      this.gameFinishedModalVisible = false
      this.gameFinishedModalData = null

      this.roundDrawnModalVisible = false
      this.roundDrawnModalScores = []

      this.roundScoredModalVisible = false
      this.roundScoredModalData = null

      this.roundEndedInstantlyModalVisible = false
      this.roundEndedInstantlyModalData = null

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

      // 倒數計時（只重置 state，interval 由 useCountdown 管理）
      this.actionTimeoutRemaining = null
      this.displayTimeoutRemaining = null

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
  },
})

