/**
 * UIStateStore - Pinia Store
 *
 * @description
 * 管理 UI 互動狀態（前端臨時狀態），實作 TriggerUIEffectPort 介面的非動畫部分。
 *
 * 職責:
 * - 管理配對選擇狀態 (selectionMode, selectionPossibleTargets)
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
import type { TriggerUIEffectPort, AnimationType, AnimationParams } from '../../application/ports/output/trigger-ui-effect.port'
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
  // 配對選擇
  selectionMode: boolean
  selectionSourceCard: string | null
  selectionPossibleTargets: string[]

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
}

/**
 * UIStateStore Actions 介面（部分實作 TriggerUIEffectPort）
 */
export interface UIStateStoreActions {
  // TriggerUIEffectPort 方法（不含 triggerAnimation）
  showSelectionUI(possibleTargets: string[]): void
  showDecisionModal(currentYaku: YakuScore[], currentScore: number, potentialScore?: number): void
  showErrorMessage(message: string): void
  showReconnectionMessage(): void
  showGameFinishedUI(winnerId: string, finalScores: PlayerScore[], isPlayerWinner: boolean): void
  showRoundDrawnUI(currentTotalScores: PlayerScore[]): void

  // 內部輔助方法
  hideSelectionUI(): void
  hideDecisionModal(): void
  hideGameFinishedUI(): void
  hideRoundDrawnUI(): void
  hideReconnectionMessage(): void
  setConnectionStatus(status: ConnectionStatus): void
  reset(): void
}

/**
 * UIStateStore 定義
 */
export const useUIStateStore = defineStore('uiState', {
  state: (): UIStateStoreState => ({
    // 配對選擇
    selectionMode: false,
    selectionSourceCard: null,
    selectionPossibleTargets: [],

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
  }),

  actions: {
    /**
     * 顯示選擇配對 UI
     *
     * @param possibleTargets - 可選目標列表
     */
    showSelectionUI(possibleTargets: string[]): void {
      this.selectionMode = true
      this.selectionPossibleTargets = [...possibleTargets]
      console.info('[UIStateStore] 顯示配對選擇 UI', { possibleTargets })
    },

    /**
     * 隱藏選擇配對 UI
     */
    hideSelectionUI(): void {
      this.selectionMode = false
      this.selectionSourceCard = null
      this.selectionPossibleTargets = []
      console.info('[UIStateStore] 隱藏配對選擇 UI')
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
      this.selectionMode = false
      this.selectionSourceCard = null
      this.selectionPossibleTargets = []

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

      console.info('[UIStateStore] 狀態已重置')
    },
  },
})

/**
 * 建立 TriggerUIEffectPort Adapter
 *
 * @description
 * 將 UIStateStore 與 AnimationService 組合適配為 TriggerUIEffectPort 介面。
 * 由 DI Container 使用。
 *
 * @param animationService - AnimationService 實例 (負責 triggerAnimation 方法)
 * @returns TriggerUIEffectPort 實作
 */
export function createTriggerUIEffectPortAdapter(animationService: {
  trigger<T extends AnimationType>(type: T, params: AnimationParams<T>): void
}): TriggerUIEffectPort {
  const store = useUIStateStore()
  return {
    showSelectionUI: store.showSelectionUI.bind(store),
    showDecisionModal: store.showDecisionModal.bind(store),
    showErrorMessage: store.showErrorMessage.bind(store),
    showReconnectionMessage: store.showReconnectionMessage.bind(store),
    triggerAnimation: animationService.trigger.bind(animationService), // 委派給 AnimationService
    showGameFinishedUI: store.showGameFinishedUI.bind(store),
    showRoundDrawnUI: store.showRoundDrawnUI.bind(store),
  }
}
