/**
 * NotificationPort - Output Port
 *
 * @description
 * 由 Application Layer 定義，Adapter Layer 實作。
 * 負責通知效果（Modal、Toast 等）。
 *
 * 與 AnimationPort 的區別：
 * - NotificationPort: 同步觸發，顯示 UI 元素
 * - AnimationPort: 異步執行，返回 Promise
 *
 * 使用於：
 * - HandleDecisionRequiredUseCase (顯示 Koi-Koi 決策 Modal)
 * - HandleGameFinishedUseCase (顯示遊戲結束 Modal)
 * - HandleTurnErrorUseCase (顯示錯誤訊息)
 */

import type { YakuScore, PlayerScore, Yaku, ScoreMultipliers, RoundEndReason } from '#shared/contracts'

/**
 * NotificationPort 介面
 *
 * @description
 * 通知系統的 Application Layer 介面。
 * 所有方法皆為同步，觸發後由 Adapter 層管理 UI 狀態。
 */
export interface NotificationPort {
  // ===== Modal =====

  /**
   * 顯示 Koi-Koi 決策 Modal
   *
   * @description
   * 玩家達成役種後，顯示 Koi-Koi 或 結束回合 的決策介面。
   *
   * @param currentYaku - 當前達成的役種列表
   * @param currentScore - 當前分數
   *
   * @example
   * ```typescript
   * notification.showDecisionModal(
   *   [{ yaku_type: 'INOU_SHIKO', base_points: 5 }],
   *   5
   * )
   * ```
   */
  showDecisionModal(currentYaku: YakuScore[], currentScore: number): void

  /**
   * 顯示遊戲結束 Modal
   *
   * @description
   * 遊戲結束時，顯示最終結果 Modal。
   *
   * @param winnerId - 贏家玩家 ID（平局時為 null）
   * @param finalScores - 最終分數列表
   * @param isPlayerWinner - 是否為當前玩家獲勝
   *
   * @example
   * ```typescript
   * notification.showGameFinishedModal(
   *   'player-1',
   *   [
   *     { player_id: 'player-1', score: 50 },
   *     { player_id: 'player-2', score: 30 }
   *   ],
   *   true
   * )
   * ```
   */
  showGameFinishedModal(winnerId: string | null, finalScores: PlayerScore[], isPlayerWinner: boolean): void

  /**
   * 顯示平局 Modal
   *
   * @description
   * 回合平局時，顯示平局訊息。
   *
   * @param currentTotalScores - 當前總分列表
   *
   * @example
   * ```typescript
   * notification.showRoundDrawnModal([
   *   { player_id: 'player-1', score: 25 },
   *   { player_id: 'player-2', score: 25 }
   * ])
   * ```
   */
  showRoundDrawnModal(currentTotalScores: PlayerScore[]): void

  /**
   * 顯示回合計分 Modal
   *
   * @description
   * 回合結束計分時，顯示勝者、役種列表、分數計算和總分。
   *
   * @param winnerId - 勝者玩家 ID
   * @param yakuList - 役種列表
   * @param baseScore - 基礎分數
   * @param finalScore - 最終分數
   * @param multipliers - 分數倍率
   * @param updatedTotalScores - 更新後的總分列表
   *
   * @example
   * ```typescript
   * notification.showRoundScoredModal(
   *   'player-1',
   *   [{ yaku_type: 'TANE', base_points: 1, contributing_cards: ['0301', '0401'] }],
   *   1,
   *   2,
   *   { koi_koi_applied: true, is_score_doubled: false },
   *   [
   *     { player_id: 'player-1', score: 2 },
   *     { player_id: 'player-2', score: 0 }
   *   ]
   * )
   * ```
   */
  showRoundScoredModal(
    winnerId: string,
    yakuList: ReadonlyArray<Yaku>,
    baseScore: number,
    finalScore: number,
    multipliers: ScoreMultipliers,
    updatedTotalScores: PlayerScore[]
  ): void

  /**
   * 顯示局即時結束 Modal
   *
   * @description
   * 回合因特殊原因立即結束時（Teshi、場牌流局、無役種），顯示結束原因和分數。
   *
   * @param reason - 結束原因（TESHI、KUTTSUKI、FIELD_TESHI、NO_YAKU）
   * @param winnerId - 勝者玩家 ID（可能為 null）
   * @param awardedPoints - 獲得的分數
   * @param updatedTotalScores - 更新後的總分列表
   *
   * @example
   * ```typescript
   * notification.showRoundEndedInstantlyModal(
   *   'TESHI',
   *   'player-1',
   *   6,
   *   [
   *     { player_id: 'player-1', score: 6 },
   *     { player_id: 'player-2', score: 0 }
   *   ]
   * )
   * ```
   */
  showRoundEndedInstantlyModal(
    reason: RoundEndReason,
    winnerId: string | null,
    awardedPoints: number,
    updatedTotalScores: PlayerScore[]
  ): void

  /**
   * 隱藏當前 Modal
   *
   * @description
   * 隱藏當前顯示的 Modal（Decision Modal 等）。
   * 遊戲流程中一次只會有一個 Modal 顯示。
   */
  hideModal(): void

  /**
   * 顯示重導向 Modal
   *
   * @description
   * 顯示重導向 Modal，包含訊息和倒數返回指定頁面功能。
   * 用於處理需要離開遊戲頁面的錯誤（session 過期、遊戲不存在等）。
   *
   * @param message - 訊息
   * @param target - 重導向目標 ('home' | 'lobby')
   * @param title - 可選標題
   *
   * @example
   * ```typescript
   * notification.showRedirectModal('Session expired', 'home')
   * notification.showRedirectModal('Game has ended', 'lobby')
   * ```
   */
  showRedirectModal(message: string, target: 'home' | 'lobby', title?: string): void

  /**
   * 隱藏重導向 Modal
   *
   * @description
   * 隱藏重導向 Modal，通常在倒數結束或玩家手動關閉時調用。
   */
  hideRedirectModal(): void

  /**
   * 顯示遊戲錯誤 Modal（向後相容）
   *
   * @deprecated 使用 showRedirectModal(message, 'lobby')
   * @param message - 錯誤訊息
   */
  showGameErrorModal(message: string): void

  /**
   * 隱藏遊戲錯誤 Modal（向後相容）
   *
   * @deprecated 使用 hideRedirectModal()
   */
  hideGameErrorModal(): void

  // ===== Toast =====

  /**
   * 顯示錯誤訊息
   *
   * @description
   * 顯示錯誤 Toast，通常用於操作失敗或驗證錯誤。
   *
   * @param message - 錯誤訊息
   *
   * @example
   * ```typescript
   * notification.showErrorMessage('This card is not in your hand')
   * ```
   */
  showErrorMessage(message: string): void

  /**
   * 顯示成功訊息
   *
   * @description
   * 顯示成功 Toast，用於操作成功的回饋。
   *
   * @param message - 成功訊息
   *
   * @example
   * ```typescript
   * notification.showSuccessMessage('Match successful!')
   * ```
   */
  showSuccessMessage(message: string): void

  /**
   * 顯示資訊訊息
   *
   * @description
   * 顯示資訊 Toast，用於一般性訊息（非錯誤、非成功）。
   *
   * @param message - 資訊訊息
   *
   * @example
   * ```typescript
   * notification.showInfoMessage('Game finished!')
   * ```
   */
  showInfoMessage(message: string): void

  /**
   * 顯示警告訊息
   *
   * @description
   * 顯示警告 Toast，用於可恢復但需注意的錯誤（如 429 Rate Limit）。
   * 與錯誤訊息區分：警告表示暫時性問題，玩家稍後可重試。
   *
   * @param message - 警告訊息
   *
   * @example
   * ```typescript
   * notification.showWarningMessage('Too many requests. Please wait a moment.')
   * ```
   */
  showWarningMessage(message: string): void

  /**
   * 顯示正在重連訊息
   *
   * @description
   * WebSocket 連線中斷時顯示的提示訊息。
   *
   * @example
   * ```typescript
   * notification.showReconnectionMessage()
   * ```
   */
  showReconnectionMessage(): void

  /**
   * 隱藏重連訊息並顯示連線已恢復
   *
   * @description
   * 重連成功後隱藏「正在重連」訊息，顯示短暫的「連線已恢復」提示。
   *
   * @example
   * ```typescript
   * notification.hideReconnectionMessage()
   * ```
   */
  hideReconnectionMessage(): void

  // ===== 查詢 =====

  /**
   * 查詢是否有 Modal 顯示中
   *
   * @description
   * 用於判斷是否應阻止某些操作。
   *
   * @returns 是否有 Modal 顯示中
   *
   * @example
   * ```typescript
   * if (notification.isModalVisible()) {
   *   // Modal 顯示中，阻止其他操作
   *   return
   * }
   * ```
   */
  isModalVisible(): boolean

  /**
   * 查詢是否有回合結束面板顯示中
   *
   * @description
   * 用於判斷 GameFinished 事件是否需要緩存等待。
   * 回合結束面板包括：RoundScored、RoundDrawn、RoundEndedInstantly。
   *
   * @returns 是否有回合結束面板顯示中
   *
   * @example
   * ```typescript
   * if (notification.isRoundEndModalVisible()) {
   *   // 緩存 GameFinished 事件，等待玩家關閉回合面板
   * }
   * ```
   */
  isRoundEndModalVisible(): boolean

  /**
   * 設定待處理的遊戲結束資料
   *
   * @description
   * 當 GameFinished 事件到達時，如果有回合結束面板正在顯示，
   * 會將資料緩存，等待玩家關閉回合面板後再顯示遊戲結束面板。
   *
   * @param data - 遊戲結束資料
   *
   * @example
   * ```typescript
   * notification.setPendingGameFinished({
   *   winnerId: 'player-1',
   *   finalScores: [{ player_id: 'player-1', score: 50 }],
   *   isPlayerWinner: true
   * })
   * ```
   */
  setPendingGameFinished(data: { winnerId: string | null; finalScores: PlayerScore[]; isPlayerWinner: boolean }): void

  // ===== 等待訊息 =====

  /**
   * 顯示等待對手訊息
   *
   * @description
   * 遊戲建立後等待對手加入時顯示的提示訊息。
   *
   * @param timeoutSeconds - 等待超時秒數
   *
   * @example
   * ```typescript
   * notification.showWaitingMessage(120) // 等待 120 秒
   * ```
   */
  showWaitingMessage(timeoutSeconds: number): void

  /**
   * 隱藏等待對手訊息
   *
   * @description
   * 對手已加入或超時時隱藏等待訊息。
   *
   * @example
   * ```typescript
   * notification.hideWaitingMessage()
   * ```
   */
  hideWaitingMessage(): void

  /**
   * 設置發牌動畫狀態
   *
   * @description
   * 發牌動畫開始時設為 true，結束時設為 false。
   * 用於 TopInfoBar 顯示 "Dealing..." 狀態。
   *
   * @param inProgress - 是否正在發牌
   *
   * @example
   * ```typescript
   * notification.setDealingInProgress(true)
   * // ... 發牌動畫 ...
   * notification.setDealingInProgress(false)
   * ```
   */
  setDealingInProgress(inProgress: boolean): void

  // ===== 倒數計時 =====

  /**
   * 啟動倒數計時
   *
   * @description
   * 統一的倒數計時方法，根據 mode 決定顯示位置：
   * - 'ACTION': TopInfoBar 顯示（玩家操作時限）
   * - 'DISPLAY': Modal 內顯示（面板自動關閉）
   *
   * @param seconds - 倒數秒數
   * @param mode - 倒數模式
   * @param onComplete - 倒數結束時的回調（可選）
   *
   * @example
   * ```typescript
   * notification.startCountdown(30, 'ACTION')
   * notification.startCountdown(5, 'DISPLAY', () => {
   *   // 自動進入下一回合
   * })
   * ```
   */
  startCountdown(seconds: number, mode: 'ACTION' | 'DISPLAY', onComplete?: () => void): void

  /**
   * 停止倒數計時
   *
   * @description
   * 停止當前倒數計時，清除 mode 和 remaining 狀態。
   *
   * @example
   * ```typescript
   * notification.stopCountdown()
   * ```
   */
  stopCountdown(): void

  /**
   * 清理所有資源
   *
   * @description
   * 離開遊戲時調用，清理所有 interval 和監聯器。
   *
   * @example
   * ```typescript
   * notification.cleanup()
   * ```
   */
  cleanup(): void

  /**
   * 重置 UI 臨時狀態
   *
   * @description
   * 重置所有 UI 臨時狀態（UIStateStore 管理的狀態），包括：
   * - dealingInProgress（發牌動畫狀態）
   * - waitingForOpponent（等待對手狀態）
   * - reconnecting（重連狀態）
   * - 所有 Modal 和 Toast
   * - 手牌確認模式、場牌選擇模式等互動狀態
   *
   * 使用場景：
   * - StartGameUseCase 啟動新連線前清理舊狀態
   * - 避免 abortAll() 中斷動畫後狀態殘留
   *
   * @note 此方法重置 UIStateStore，與 UIStatePort.resetState()（重置 GameStateStore）不同
   *
   * @example
   * ```typescript
   * notification.resetUITemporaryState()
   * ```
   */
  resetUITemporaryState(): void

  // ===== 遊戲公告系統 =====

  /**
   * 顯示對手 Koi-Koi 公告動畫
   *
   * @description
   * 當對手選擇 Koi-Koi 時，在畫面中央顯示「Koi-Koi!」動畫提示。
   * 公告會加入佇列，依序播放後自動隱藏。
   *
   * @example
   * ```typescript
   * notification.showKoiKoiAnnouncement()
   * ```
   */
  showKoiKoiAnnouncement(): void

  /**
   * 隱藏對手 Koi-Koi 公告動畫
   *
   * @description
   * 保留用於向後相容，實際上由佇列系統自動管理。
   *
   * @deprecated 由公告佇列系統自動管理，此方法為 no-op
   */
  hideKoiKoiAnnouncement(): void

  /**
   * 顯示對手役種公告動畫
   *
   * @description
   * 當對手形成役種時，在畫面中央同時顯示所有新形成的役種名稱（含日文）。
   * 公告會加入佇列，依序播放後自動隱藏。
   *
   * @param yakuList - 新形成的役種列表
   *
   * @example
   * ```typescript
   * notification.showOpponentYakuAnnouncement([
   *   { yakuType: 'GOKO', yakuName: 'Five Brights', yakuNameJa: '五光', category: 'hikari' },
   *   { yakuType: 'HANAMI_ZAKE', yakuName: 'Cherry Blossom Viewing', yakuNameJa: '花見酒', category: 'tane' }
   * ])
   * ```
   */
  showOpponentYakuAnnouncement(
    yakuList: ReadonlyArray<{
      yakuType: string
      yakuName: string
      yakuNameJa: string
      category: string
    }>
  ): void

  // ===== 確認繼續遊戲 =====

  /**
   * 顯示確認繼續遊戲介面
   *
   * @description
   * 當玩家因閒置而需要確認繼續遊戲時顯示。
   * 包含倒數計時，玩家可選擇繼續遊戲或離開。
   *
   * @param timeoutSeconds - 確認超時秒數
   * @param onDecision - 玩家選擇後的回調，傳入決策類型
   *
   * @example
   * ```typescript
   * notification.showContinueConfirmation(7, async (decision) => {
   *   await sendCommand.confirmContinue(decision)
   * })
   * ```
   */
  showContinueConfirmation(timeoutSeconds: number, onDecision: (decision: 'CONTINUE' | 'LEAVE') => void): void

  /**
   * 隱藏確認繼續遊戲介面
   *
   * @description
   * 確認成功或超時後隱藏確認介面。
   *
   * @example
   * ```typescript
   * notification.hideContinueConfirmation()
   * ```
   */
  hideContinueConfirmation(): void

  /**
   * 設置確認狀態為等待伺服器回應
   *
   * @description
   * 當玩家點擊確認按鈕或倒數結束時，切換至等待伺服器回應狀態。
   * UI 會顯示 "Processing..." 並禁用按鈕。
   *
   * @example
   * ```typescript
   * notification.setContinueConfirmationProcessing()
   * ```
   */
  setContinueConfirmationProcessing(): void
}
