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

import type { YakuScore, PlayerScore } from '../../types'

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
   * 顯示遊戲結束 UI
   *
   * @description
   * 遊戲結束時，顯示最終結果 Modal。
   *
   * @param winnerId - 贏家玩家 ID
   * @param finalScores - 最終分數列表
   * @param isPlayerWinner - 是否為當前玩家獲勝
   *
   * @example
   * ```typescript
   * notification.showGameFinishedUI(
   *   'player-1',
   *   [
   *     { player_id: 'player-1', score: 50 },
   *     { player_id: 'player-2', score: 30 }
   *   ],
   *   true
   * )
   * ```
   */
  showGameFinishedUI(winnerId: string, finalScores: PlayerScore[], isPlayerWinner: boolean): void

  /**
   * 顯示平局 UI
   *
   * @description
   * 回合平局時，顯示平局訊息。
   *
   * @param currentTotalScores - 當前總分列表
   *
   * @example
   * ```typescript
   * notification.showRoundDrawnUI([
   *   { player_id: 'player-1', score: 25 },
   *   { player_id: 'player-2', score: 25 }
   * ])
   * ```
   */
  showRoundDrawnUI(currentTotalScores: PlayerScore[]): void

  /**
   * 隱藏當前 Modal
   *
   * @description
   * 隱藏當前顯示的 Modal（Decision Modal 等）。
   * 遊戲流程中一次只會有一個 Modal 顯示。
   */
  hideModal(): void

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
   * 顯示重連成功訊息
   *
   * @description
   * 重連成功後顯示的提示訊息。
   *
   * @example
   * ```typescript
   * notification.showReconnectionMessage()
   * ```
   */
  showReconnectionMessage(): void

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
}
