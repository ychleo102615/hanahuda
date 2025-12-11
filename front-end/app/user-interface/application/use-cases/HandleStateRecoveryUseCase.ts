/**
 * HandleStateRecoveryUseCase
 *
 * @description
 * 統一處理遊戲狀態恢復。
 * 實作 HandleStateRecoveryPort，支援四種情境：
 * - 正常快照恢復（handleSnapshotRestore）
 * - 遊戲已結束（handleGameFinished）
 * - 遊戲已過期（handleGameExpired）
 * - 快照獲取失敗（handleFetchFailed）
 *
 * 使用者：
 * - TriggerStateRecoveryUseCase（主動請求快照後）
 * - SSE GameSnapshotRestore 事件處理（被動接收）
 *
 * 業務流程（handleSnapshotRestore）：
 * 1. 立即中斷所有進行中的動畫（防止視覺混亂）
 * 2. 清除動畫層的所有隱藏卡片狀態
 * 3. 清除配對狀態（防止殘留）
 * 4. 重置遊戲狀態（確保乾淨的起始狀態）
 * 5. 靜默恢復完整遊戲狀態（無動畫）
 * 6. 隱藏重連訊息
 * 7. 啟動操作倒數
 *
 * @module user-interface/application/use-cases/HandleStateRecoveryUseCase
 */

import type { GameSnapshotRestore, GameFinishedInfo, YakuScore } from '#shared/contracts'
import type {
  UIStatePort,
  NotificationPort,
  NavigationPort,
  AnimationPort,
  MatchmakingStatePort,
  SnapshotError,
} from '../ports/output'
import { HandleStateRecoveryPort } from '../ports/input/handle-state-recovery.port'
import type { OperationSessionManager } from '../../adapter/abort'

export class HandleStateRecoveryUseCase extends HandleStateRecoveryPort {
  constructor(
    private readonly updateUIState: UIStatePort,
    private readonly notification: NotificationPort,
    private readonly navigation: NavigationPort,
    private readonly animationPort: AnimationPort,
    private readonly matchmakingState: MatchmakingStatePort,
    private readonly operationSession: OperationSessionManager
  ) {
    super()
  }

  /**
   * 處理正常快照恢復
   *
   * @param snapshot - 遊戲狀態快照
   */
  handleSnapshotRestore(snapshot: GameSnapshotRestore): void {
    console.info('[HandleStateRecoveryUseCase] Restoring game state from snapshot', {
      gameId: snapshot.game_id,
      flowStage: snapshot.current_flow_stage,
    })

    // 1. 中斷所有進行中的 Use Cases
    // 原因：重連後的快照是權威狀態，進行中的操作已無意義
    // 呼叫 abortAll() 會讓所有 await delay(ms, signal) 拋出 AbortOperationError
    // 各 Use Case 的 try-catch 會捕獲此錯誤並靜默結束
    this.operationSession.abortAll()

    // 2. 清除動畫層狀態
    this.animationPort.interrupt()
    this.animationPort.clearHiddenCards()

    // 3. 清除配對狀態（防止殘留，重連時已有遊戲會話）
    this.matchmakingState.clearSession()

    // 4. 重置遊戲狀態（確保乾淨的起始狀態）
    // 原因：避免舊狀態殘留，完全按照快照內容恢復
    this.updateUIState.resetState()

    // 5. 靜默恢復完整遊戲狀態（無動畫）
    // 注意：restoreGameState 會恢復 selection_context（drawnCard, possibleTargetCardIds）
    this.updateUIState.restoreGameState(snapshot)

    // 6. 隱藏重連訊息
    this.notification.hideReconnectionMessage()

    // 7. 根據 flow_stage 恢復 UI 面板
    this.restoreUIPanel(snapshot)

    // 8. 啟動操作倒數（如果有）
    this.notification.startActionCountdown(snapshot.action_timeout_seconds)

    console.info('[HandleStateRecoveryUseCase] Game state restored successfully')
  }

  /**
   * 根據流程階段恢復 UI 面板
   *
   * @param snapshot - 遊戲狀態快照
   */
  private restoreUIPanel(snapshot: GameSnapshotRestore): void {
    // 取得本地玩家 ID，判斷是否為玩家的回合
    let localPlayerId: string | null = null
    try {
      localPlayerId = this.updateUIState.getLocalPlayerId()
    } catch {
      // 初始化失敗時，從 snapshot.players 找出非 AI 玩家
      const localPlayer = snapshot.players.find(p => !p.is_ai)
      localPlayerId = localPlayer?.player_id ?? null
    }

    const isMyTurn = localPlayerId === snapshot.active_player_id

    switch (snapshot.current_flow_stage) {
      case 'AWAITING_SELECTION':
        // selection_context 已由 restoreGameState 恢復到 GameStateStore
        // Adapter Layer 的 watcher 會監聽 FlowStage 變化，觸發場牌選擇 UI
        console.info('[HandleStateRecoveryUseCase] AWAITING_SELECTION - selection UI will be triggered by watcher', {
          isMyTurn,
          hasSelectionContext: !!snapshot.selection_context,
        })
        break

      case 'AWAITING_DECISION':
        // 如果是本地玩家的回合，顯示決策 Modal
        if (isMyTurn && snapshot.decision_context) {
          const yakuScores = this.convertYakuToYakuScores(snapshot.decision_context.all_active_yaku)
          const currentScore = this.calculateCurrentScore(
            snapshot.decision_context.all_active_yaku,
            snapshot.decision_context.current_multipliers,
            snapshot.active_player_id
          )
          this.notification.showDecisionModal(yakuScores, currentScore)
          console.info('[HandleStateRecoveryUseCase] AWAITING_DECISION - decision modal shown', {
            yakuCount: yakuScores.length,
            currentScore,
          })
        }
        break

      default:
        // 其他狀態不需要特殊的 UI 恢復
        break
    }
  }

  /**
   * 將 Yaku 陣列轉換為 YakuScore 陣列
   *
   * @param yaku - Yaku 陣列
   * @returns YakuScore 陣列
   */
  private convertYakuToYakuScores(yaku: ReadonlyArray<{ yaku_type: string; base_points: number }>): YakuScore[] {
    return yaku.map(y => ({
      yaku_type: y.yaku_type,
      base_points: y.base_points,
    }))
  }

  /**
   * 計算當前分數
   *
   * @param yaku - 役種列表
   * @param multipliers - 分數倍率
   * @param playerId - 玩家 ID
   * @returns 計算後的分數
   */
  private calculateCurrentScore(
    yaku: ReadonlyArray<{ base_points: number }>,
    multipliers: { player_multipliers: Record<string, number> },
    playerId: string
  ): number {
    const baseScore = yaku.reduce((sum, y) => sum + y.base_points, 0)
    const multiplier = multipliers.player_multipliers[playerId] ?? 1
    return baseScore * multiplier
  }

  /**
   * 處理遊戲已結束
   *
   * @param result - 遊戲結束資訊
   */
  handleGameFinished(result: GameFinishedInfo): void {
    console.info('[HandleStateRecoveryUseCase] Game already finished', {
      gameId: result.game_id,
      winnerId: result.winner_id,
      roundsPlayed: result.rounds_played,
    })

    // 1. 建構訊息
    const winnerMsg = result.winner_id
      ? `Game finished! Final scores: ${result.final_scores.map(s => s.score).join(' - ')}`
      : `Game finished! It's a draw! Final scores: ${result.final_scores.map(s => s.score).join(' - ')}`

    // 2. 顯示遊戲結果訊息
    this.notification.showInfoMessage(winnerMsg)

    // 3. 導航回大廳
    this.navigation.navigateToLobby()
  }

  /**
   * 處理遊戲已過期
   */
  handleGameExpired(): void {
    console.info('[HandleStateRecoveryUseCase] Game expired')

    // 1. 顯示錯誤訊息
    this.notification.showErrorMessage('Your game session has expired. Please start a new game.')

    // 2. 導航回大廳
    this.navigation.navigateToLobby()
  }

  /**
   * 處理快照獲取失敗
   *
   * @param error - 錯誤類型
   */
  handleFetchFailed(error: SnapshotError): void {
    console.warn('[HandleStateRecoveryUseCase] Failed to fetch game snapshot', { error })

    // 1. 根據錯誤類型顯示不同訊息
    let message: string
    switch (error) {
      case 'network_error':
        message = 'Network error. Please check your connection.'
        break
      case 'timeout':
        message = 'Request timed out. Please try again.'
        break
      case 'server_error':
        message = 'Server error. Please try again later.'
        break
      case 'not_found':
      default:
        message = 'Game not found. Returning to lobby.'
        break
    }

    // 2. 顯示錯誤訊息
    this.notification.showErrorMessage(message)

    // 3. 導航回大廳
    this.navigation.navigateToLobby()
  }
}
