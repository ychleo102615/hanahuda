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
import type { YakuCategory } from '~/constants/announcement-styles'

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
  winnerId: string | null
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
 * 重導向目標
 */
export type RedirectTarget = 'home' | 'lobby'

/**
 * 重導向 Modal 資料
 */
export interface RedirectModalData {
  message: string
  target: RedirectTarget
  title?: string
}

/**
 * 確認繼續遊戲的狀態
 *
 * @description
 * - HIDDEN: 無需確認或已完成處理
 * - AWAITING_INPUT: 等待玩家選擇（顯示 Continue / Leave 按鈕）
 * - AWAITING_SERVER: 等待伺服器回應（顯示 Processing...）
 */
export type ContinueConfirmationState = 'HIDDEN' | 'AWAITING_INPUT' | 'AWAITING_SERVER'

/**
 * Toast 類型
 */
export type ToastType = 'info' | 'success' | 'error' | 'warning' | 'loading'

/**
 * Toast 資料
 */
export interface ToastData {
  id: string
  type: ToastType
  message: string
  duration: number | null // null = persistent (won't auto-dismiss)
  dismissible: boolean
}

/**
 * 公告類型
 */
export type AnnouncementType = 'koikoi' | 'yaku'

/**
 * 役種顯示資訊
 */
export interface YakuDisplayInfo {
  yakuType: string
  yakuName: string
  yakuNameJa: string
  category: YakuCategory
}

/**
 * 公告資料
 */
export interface AnnouncementData {
  id: string
  type: AnnouncementType
  /** 多役種顯示（同時顯示所有新形成的役種） */
  yakuList?: YakuDisplayInfo[]
  duration: number
}

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

  // 重導向 Modal（取代遊戲錯誤 Modal）
  redirectModalVisible: boolean
  redirectModalData: RedirectModalData | null

  // 訊息提示
  errorMessage: string | null
  infoMessage: string | null

  // 連線狀態
  connectionStatus: ConnectionStatus
  reconnecting: boolean

  // 等待對手狀態
  waitingForOpponent: boolean
  waitingTimeoutSeconds: number | null

  // 發牌動畫狀態
  dealingInProgress: boolean

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

  // 倒數計時（統一）
  countdownRemaining: number | null
  countdownMode: 'ACTION' | 'DISPLAY' | null

  // 操作超時狀態（ACTION 模式倒數完成時為 true，禁止玩家操作）
  isActionTimeoutExpired: boolean

  // 正在提交操作（防止弱網環境下重複點擊）
  isSubmittingAction: boolean

  // 待處理的遊戲結束資料（最後一回合緩存用）
  pendingGameFinishedData: GameFinishedData | null

  // 統一 Toast 系統
  activeToasts: ToastData[]

  // 遊戲公告佇列系統
  announcementQueue: AnnouncementData[]
  currentAnnouncement: AnnouncementData | null

  // 確認繼續遊戲
  continueConfirmationState: ContinueConfirmationState
  continueConfirmationTimeoutSeconds: number | null
  continueConfirmationCallback: ((decision: 'CONTINUE' | 'LEAVE') => void) | null
}

/**
 * UIStateStore Actions 介面（部分實作 TriggerUIEffectPort）
 */
export interface UIStateStoreActions {
  // TriggerUIEffectPort 方法（不含 triggerAnimation）
  showDecisionModal(currentYaku: YakuScore[], currentScore: number, potentialScore?: number): void
  showErrorMessage(message: string): void
  showReconnectionMessage(): void
  showWaitingMessage(timeoutSeconds: number): void
  showGameFinishedModal(winnerId: string | null, finalScores: PlayerScore[], isPlayerWinner: boolean): void
  showRoundDrawnModal(currentTotalScores: PlayerScore[]): void
  showRoundScoredModal(winnerId: string, yakuList: ReadonlyArray<Yaku>, baseScore: number, finalScore: number, multipliers: ScoreMultipliers, updatedTotalScores: PlayerScore[]): void
  showRoundEndedInstantlyModal(reason: RoundEndReason, winnerId: string | null, awardedPoints: number, updatedTotalScores: PlayerScore[]): void

  // 內部輔助方法
  hideDecisionModal(): void
  hideGameFinishedModal(): void
  hideRoundDrawnModal(): void
  hideRoundScoredModal(): void
  hideRoundEndedInstantlyModal(): void
  showGameErrorModal(message: string): void
  hideGameErrorModal(): void
  hideModal(): void
  hideReconnectionMessage(): void
  hideWaitingMessage(): void
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

  // 統一 Toast 系統
  addToast(toast: Omit<ToastData, 'id'>): string
  removeToast(id: string): void
  removeToastByType(type: ToastType): void
  clearAllToasts(): void

  // 遊戲公告佇列系統
  queueAnnouncement(announcement: Omit<AnnouncementData, 'id'>): void
  processNextAnnouncement(): void
  clearCurrentAnnouncement(): void
  clearAllAnnouncements(): void

  // 確認繼續遊戲
  showContinueConfirmation(timeoutSeconds: number, onDecision: (decision: 'CONTINUE' | 'LEAVE') => void): void
  hideContinueConfirmation(): void

  // 操作超時狀態
  setActionTimeoutExpired(value: boolean): void

  // 提交操作狀態（防止重複點擊）
  setSubmittingAction(value: boolean): void
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

    // 重導向 Modal（取代遊戲錯誤 Modal）
    redirectModalVisible: false,
    redirectModalData: null,

    // 訊息提示
    errorMessage: null,
    infoMessage: null,

    // 連線狀態
    connectionStatus: 'disconnected',
    reconnecting: false,

    // 等待對手狀態
    waitingForOpponent: false,
    waitingTimeoutSeconds: null,

    // 發牌動畫狀態
    dealingInProgress: false,

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

    // 倒數計時（統一）
    countdownRemaining: null,
    countdownMode: null,

    // 操作超時狀態
    isActionTimeoutExpired: false,

    // 正在提交操作
    isSubmittingAction: false,

    // 待處理的遊戲結束資料
    pendingGameFinishedData: null,

    // 統一 Toast 系統
    activeToasts: [],

    // 遊戲公告佇列系統
    announcementQueue: [],
    currentAnnouncement: null,

    // 確認繼續遊戲
    continueConfirmationState: 'HIDDEN' as ContinueConfirmationState,
    continueConfirmationTimeoutSeconds: null,
    continueConfirmationCallback: null,
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

      this.redirectModalVisible = false
      this.redirectModalData = null
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
    },

    /**
     * 隱藏 Koi-Koi 決策 Modal
     */
    hideDecisionModal(): void {
      this.decisionModalVisible = false
      this.decisionModalData = null
    },

    /**
     * 顯示錯誤訊息
     *
     * @param message - 錯誤訊息
     */
    showErrorMessage(message: string): void {
      this.errorMessage = message

      // 自動消失（3 秒後）
      setTimeout(() => {
        if (this.errorMessage === message) {
          this.errorMessage = null
        }
      }, 3000)
    },

    /**
     * 顯示重連訊息
     *
     * @note 只設定 reconnecting 狀態，ReconnectionBanner 會自動顯示訊息。
     *       不設定 infoMessage 避免重複顯示。
     */
    showReconnectionMessage(): void {
      this.reconnecting = true
    },

    /**
     * 隱藏重連訊息（重連成功）
     */
    hideReconnectionMessage(): void {
      this.reconnecting = false
      this.infoMessage = 'Connection restored'

      // 自動消失（3 秒後）
      setTimeout(() => {
        if (this.infoMessage === 'Connection restored') {
          this.infoMessage = null
        }
      }, 3000)
    },

    /**
     * 顯示等待對手訊息
     *
     * @param timeoutSeconds - 等待超時秒數
     */
    showWaitingMessage(timeoutSeconds: number): void {
      this.waitingForOpponent = true
      this.waitingTimeoutSeconds = timeoutSeconds
    },

    /**
     * 隱藏等待對手訊息
     */
    hideWaitingMessage(): void {
      this.waitingForOpponent = false
      this.waitingTimeoutSeconds = null
    },

    /**
     * 設置發牌動畫狀態
     *
     * @param inProgress - 是否正在發牌
     */
    setDealingInProgress(inProgress: boolean): void {
      this.dealingInProgress = inProgress
    },

    /**
     * 顯示遊戲結束 Modal
     *
     * @param winnerId - 贏家玩家 ID
     * @param finalScores - 最終分數列表
     * @param isPlayerWinner - 是否為當前玩家獲勝
     */
    showGameFinishedModal(winnerId: string | null, finalScores: PlayerScore[], isPlayerWinner: boolean): void {
      this._hideAllModals()

      this.gameFinishedModalVisible = true
      this.gameFinishedModalData = {
        winnerId,
        finalScores: [...finalScores],
        isPlayerWinner,
      }
    },

    /**
     * 隱藏遊戲結束 Modal
     */
    hideGameFinishedModal(): void {
      this.gameFinishedModalVisible = false
      this.gameFinishedModalData = null
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
    },

    /**
     * 隱藏平局 Modal
     */
    hideRoundDrawnModal(): void {
      this.roundDrawnModalVisible = false
      this.roundDrawnModalScores = []
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
    },

    /**
     * 隱藏回合計分 Modal
     */
    hideRoundScoredModal(): void {
      this.roundScoredModalVisible = false
      this.roundScoredModalData = null
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
    },

    /**
     * 隱藏局即時結束 Modal
     */
    hideRoundEndedInstantlyModal(): void {
      this.roundEndedInstantlyModalVisible = false
      this.roundEndedInstantlyModalData = null
    },

    /**
     * 顯示重導向 Modal
     *
     * @param message - 訊息
     * @param target - 重導向目標 ('home' | 'lobby')
     * @param title - 可選標題
     */
    showRedirectModal(message: string, target: RedirectTarget, title?: string): void {
      this._hideAllModals()

      this.redirectModalVisible = true
      this.redirectModalData = { message, target, title }
    },

    /**
     * 隱藏重導向 Modal
     */
    hideRedirectModal(): void {
      this.redirectModalVisible = false
      this.redirectModalData = null
    },

    /**
     * 顯示遊戲錯誤 Modal（向後相容）
     *
     * @deprecated 使用 showRedirectModal(message, 'lobby')
     * @param message - 錯誤訊息
     */
    showGameErrorModal(message: string): void {
      this.showRedirectModal(message, 'lobby')
    },

    /**
     * 隱藏遊戲錯誤 Modal（向後相容）
     *
     * @deprecated 使用 hideRedirectModal()
     */
    hideGameErrorModal(): void {
      this.hideRedirectModal()
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
    },

    /**
     * 設定連線狀態
     *
     * @param status - 連線狀態
     */
    setConnectionStatus(status: ConnectionStatus): void {
      this.connectionStatus = status
    },

    /**
     * 設定待處理的遊戲結束資料
     *
     * @description
     * 當 GameFinished 事件到達時，如果有回合結束面板正在顯示，
     * 會將資料緩存在此，等待玩家關閉回合面板後再顯示遊戲結束面板。
     *
     * @param data - 遊戲結束資料
     */
    setPendingGameFinished(data: GameFinishedData): void {
      this.pendingGameFinishedData = { ...data, finalScores: [...data.finalScores] }
    },

    /**
     * 清除待處理的遊戲結束資料
     */
    clearPendingGameFinished(): void {
      this.pendingGameFinishedData = null
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

      this.redirectModalVisible = false
      this.redirectModalData = null

      this.errorMessage = null
      this.infoMessage = null

      this.connectionStatus = 'disconnected'
      this.reconnecting = false

      // 等待對手狀態
      this.waitingForOpponent = false
      this.waitingTimeoutSeconds = null

      // 發牌動畫狀態
      this.dealingInProgress = false

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

      // 倒數計時（只重置 state，interval 由 CountdownManager 管理）
      this.countdownRemaining = null
      this.countdownMode = null

      // 操作超時狀態
      this.isActionTimeoutExpired = false

      // 正在提交操作
      this.isSubmittingAction = false

      // 待處理的遊戲結束資料
      this.pendingGameFinishedData = null

      // 統一 Toast 系統
      this.activeToasts = []

      // 遊戲公告佇列系統
      this.announcementQueue = []
      this.currentAnnouncement = null

    },

    /**
     * 進入手牌確認模式
     */
    enterHandCardConfirmationMode(cardId: string, matchableCards: string[], matchCount: number): void {
      this.handCardConfirmationMode = true
      this.handCardAwaitingConfirmation = cardId
      this.matchableFieldCards = [...matchableCards]
      this.matchCount = matchCount
    },

    /**
     * 退出手牌確認模式
     */
    exitHandCardConfirmationMode(): void {
      this.handCardConfirmationMode = false
      this.handCardAwaitingConfirmation = null
      this.matchableFieldCards = []
      this.matchCount = 0
      // 清除懸浮預覽狀態，避免殘留高亮
      this.handCardHoverPreview = null
      this.previewHighlightedTargets = []
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
    },

    /**
     * 退出場牌選擇模式
     */
    exitFieldCardSelectionMode(): void {
      this.fieldCardSelectionMode = false
      this.fieldCardSelectableTargets = []
      this.fieldCardHighlightType = null
      this.fieldCardSourceCard = null
    },

    // ========================================
    // 統一 Toast 系統
    // ========================================

    /**
     * 添加 Toast
     *
     * @param toast - Toast 資料（不含 id）
     * @returns 生成的 Toast ID
     */
    addToast(toast: Omit<ToastData, 'id'>): string {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
      const newToast: ToastData = { ...toast, id }
      this.activeToasts.push(newToast)

      // 設定自動移除計時器
      if (toast.duration !== null) {
        setTimeout(() => {
          this.removeToast(id)
        }, toast.duration)
      }

      return id
    },

    /**
     * 移除指定 Toast
     *
     * @param id - Toast ID
     */
    removeToast(id: string): void {
      const index = this.activeToasts.findIndex((t) => t.id === id)
      if (index !== -1) {
        this.activeToasts.splice(index, 1)
      }
    },

    /**
     * 移除指定類型的所有 Toast
     *
     * @param type - Toast 類型
     */
    removeToastByType(type: ToastType): void {
      const initialLength = this.activeToasts.length
      this.activeToasts = this.activeToasts.filter((t) => t.type !== type)
      const removedCount = initialLength - this.activeToasts.length
      if (removedCount > 0) {
      }
    },

    /**
     * 清除所有 Toast
     */
    clearAllToasts(): void {
      this.activeToasts = []
    },

    // ========================================
    // 遊戲公告佇列系統
    // ========================================

    /**
     * 將公告加入佇列
     *
     * @description
     * 若沒有正在播放的公告，會立即開始播放。
     * 否則加入佇列等待。
     *
     * @param announcement - 公告資料（不含 id）
     */
    queueAnnouncement(announcement: Omit<AnnouncementData, 'id'>): void {
      const id = `announcement-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
      const newAnnouncement: AnnouncementData = { ...announcement, id }
      this.announcementQueue.push(newAnnouncement)

      // 如果沒有正在播放的公告，立即播放
      if (!this.currentAnnouncement) {
        this.processNextAnnouncement()
      }
    },

    /**
     * 處理下一個公告
     *
     * @description
     * 從佇列取出下一個公告開始播放。
     * 若佇列為空則清除當前公告。
     */
    processNextAnnouncement(): void {
      if (this.announcementQueue.length === 0) {
        this.currentAnnouncement = null
        return
      }

      const next = this.announcementQueue.shift()
      if (next) {
        this.currentAnnouncement = next
      }
    },

    /**
     * 清除當前公告
     */
    clearCurrentAnnouncement(): void {
      this.currentAnnouncement = null
    },

    /**
     * 清除所有公告
     */
    clearAllAnnouncements(): void {
      this.announcementQueue = []
      this.currentAnnouncement = null
    },

    // ===== 確認繼續遊戲 =====

    /**
     * 顯示確認繼續遊戲介面
     *
     * @param timeoutSeconds - 確認超時秒數
     * @param onDecision - 玩家選擇後的回調，傳入決策類型
     */
    showContinueConfirmation(timeoutSeconds: number, onDecision: (decision: 'CONTINUE' | 'LEAVE') => void): void {
      this.continueConfirmationState = 'AWAITING_INPUT'
      this.continueConfirmationTimeoutSeconds = timeoutSeconds
      this.continueConfirmationCallback = onDecision
    },

    /**
     * 設置確認狀態為等待伺服器回應
     *
     * @description
     * 當玩家點擊按鈕或倒數結束時調用，切換到等待伺服器回應狀態。
     * 清除 callback 防止重複調用。
     */
    setContinueConfirmationProcessing(): void {
      this.continueConfirmationState = 'AWAITING_SERVER'
      this.continueConfirmationCallback = null
    },

    /**
     * 隱藏確認繼續遊戲介面
     */
    hideContinueConfirmation(): void {
      this.continueConfirmationState = 'HIDDEN'
      this.continueConfirmationTimeoutSeconds = null
      this.continueConfirmationCallback = null
    },

    // ===== 操作超時狀態 =====

    /**
     * 設置操作超時狀態
     *
     * @description
     * 當 ACTION 模式倒數完成時設為 true，禁止玩家繼續操作。
     * 同時清除所有操作相關的高亮狀態（手牌選中、懸浮預覽、場牌選擇）。
     * 當啟動新的 ACTION 倒數時重置為 false。
     *
     * @param value - 是否超時
     */
    setActionTimeoutExpired(value: boolean): void {
      this.isActionTimeoutExpired = value
      if (value) {
        // 清除所有操作相關的高亮狀態
        this.exitHandCardConfirmationMode()
        this.clearHandCardHoverPreview()
        this.exitFieldCardSelectionMode()
      }
    },

    /**
     * 設置提交操作狀態
     *
     * @description
     * 防止弱網環境下玩家重複點擊導致多次提交。
     * 在呼叫 API 前設為 true，收到回應後設為 false。
     *
     * @param value - 是否正在提交
     */
    setSubmittingAction(value: boolean): void {
      this.isSubmittingAction = value
    },
  },
})

