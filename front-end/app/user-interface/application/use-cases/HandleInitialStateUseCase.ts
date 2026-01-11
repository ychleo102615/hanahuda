/**
 * HandleInitialStateUseCase
 *
 * @description
 * 處理 SSE 連線後的第一個事件 InitialState。
 * 統一處理新遊戲加入和斷線重連的所有情境。
 *
 * 支援五種 response_type：
 * - game_waiting: 顯示等待對手畫面
 * - game_started: 設定初始遊戲狀態
 * - snapshot: 恢復進行中的遊戲狀態（無動畫）
 * - game_finished: 顯示遊戲結果，導航回大廳
 * - game_expired: 顯示錯誤訊息，導航回大廳
 *
 * @module user-interface/application/use-cases/HandleInitialStateUseCase
 */

import type {
  InitialStateEvent,
  GameWaitingData,
  GameStartedData,
  GameSnapshotRestore,
  GameFinishedInfo,
  YakuScore,
} from '#shared/contracts'
import type {
  UIStatePort,
  NotificationPort,
  NavigationPort,
  AnimationPort,
  MatchmakingStatePort,
  GameStatePort,
  OperationSessionPort,
} from '../ports/output'
import { HandleInitialStatePort } from '../ports/input/handle-initial-state.port'

export class HandleInitialStateUseCase extends HandleInitialStatePort {
  constructor(
    private readonly updateUIState: UIStatePort,
    private readonly notification: NotificationPort,
    private readonly navigation: NavigationPort,
    private readonly animationPort: AnimationPort,
    private readonly matchmakingState: MatchmakingStatePort,
    private readonly gameState: GameStatePort,
    private readonly operationSession: OperationSessionPort
  ) {
    super()
  }

  /**
   * 執行 InitialState 事件處理
   *
   * @param event - InitialState 事件
   * @param signal - AbortSignal（可選），用於取消操作
   */
  execute(event: InitialStateEvent, _signal?: AbortSignal): void {

    // 儲存遊戲 ID 到 GameState
    this.gameState.setCurrentGameId(event.game_id)

    switch (event.response_type) {
      case 'game_waiting':
        this.handleGameWaiting(event.data as GameWaitingData)
        break

      case 'game_started':
        this.handleGameStarted(event.data as GameStartedData)
        break

      case 'snapshot':
        this.handleSnapshotRestore(event.data as GameSnapshotRestore)
        break

      case 'game_finished':
        this.handleGameFinished(event.data as GameFinishedInfo)
        break

      case 'game_expired':
        this.handleGameExpired()
        break

      default: {
        const _exhaustiveCheck: never = event.response_type
      }
    }
  }

  /**
   * 處理 game_waiting（等待對手）
   *
   * @description
   * 新遊戲建立，等待對手加入。
   * 前端顯示等待畫面，等待後續 GameStarted 事件。
   *
   * @param data - 等待資料
   */
  private handleGameWaiting(data: GameWaitingData): void {

    // 1. 更新配對狀態為等待中
    this.matchmakingState.setStatus('waiting')
    this.matchmakingState.setGameId(data.game_id)

    // 2. 顯示等待訊息
    this.notification.showWaitingMessage(data.timeout_seconds)

    // 3. 啟動配對超時倒數
    this.notification.startCountdown(data.timeout_seconds, 'ACTION')

  }

  /**
   * 處理 game_started（遊戲開始）
   *
   * @description
   * 雙方玩家都加入，遊戲開始。
   * 設定初始遊戲狀態，準備接收 RoundDealt 事件。
   *
   * @param data - 遊戲開始資料
   */
  private handleGameStarted(data: GameStartedData): void {

    // 1. 清除配對狀態（遊戲已開始）
    this.matchmakingState.clearSession()

    // 2. 隱藏等待訊息並停止配對倒數
    this.notification.hideWaitingMessage()
    this.notification.stopCountdown()

    // 3. 設定遊戲初始狀態
    this.updateUIState.initializeGameContext(data.game_id, data.room_type_id, [...data.players], data.ruleset)

  }

  /**
   * 處理 snapshot（快照恢復）
   *
   * @description
   * 重連進行中的遊戲，恢復完整狀態。
   * 無動畫，立即顯示最新狀態。
   *
   * @param snapshot - 遊戲快照
   */
  private handleSnapshotRestore(snapshot: GameSnapshotRestore): void {

    // 1. 中斷所有進行中的 Use Cases
    this.operationSession.abortAll()

    // 2. 清除動畫層狀態
    this.animationPort.interrupt()
    this.animationPort.clearHiddenCards()

    // 3. 清除配對狀態（重連時已有遊戲會話）
    this.matchmakingState.clearSession()

    // 4. 重置遊戲狀態（確保乾淨的起始狀態）
    this.updateUIState.resetState()

    // 5. 靜默恢復完整遊戲狀態（無動畫）
    this.updateUIState.restoreGameState(snapshot)

    // 6. 隱藏重連訊息和等待訊息
    this.notification.hideReconnectionMessage()
    this.notification.hideWaitingMessage()

    // 7. 根據 flow_stage 恢復 UI 面板
    this.restoreUIPanel(snapshot)

    // 8. 啟動操作倒數（根據 flow_stage 判斷 mode）
    // 注意：ROUND_ENDED 狀態由 restoreRoundEndedState() 處理倒數，不需要在這裡啟動
    if (snapshot.current_flow_stage !== 'ROUND_ENDED') {
      const countdownMode = snapshot.current_flow_stage === 'AWAITING_DECISION' ? 'DISPLAY' : 'ACTION'
      this.notification.startCountdown(snapshot.timeout_seconds, countdownMode)
    }

  }

  /**
   * 根據流程階段恢復 UI 面板
   *
   * @param snapshot - 遊戲狀態快照
   */
  private restoreUIPanel(snapshot: GameSnapshotRestore): void {
    let localPlayerId: string | null = null
    try {
      localPlayerId = this.updateUIState.getLocalPlayerId()
    } catch {
      const localPlayer = snapshot.players.find(p => !p.is_ai)
      localPlayerId = localPlayer?.player_id ?? null
    }

    const isMyTurn = localPlayerId === snapshot.active_player_id

    switch (snapshot.current_flow_stage) {
      case 'AWAITING_SELECTION':
        break

      case 'AWAITING_DECISION':
        if (isMyTurn && snapshot.decision_context) {
          const yakuScores = this.convertYakuToYakuScores(snapshot.decision_context.all_active_yaku)
          const currentScore = this.calculateCurrentScore(
            snapshot.decision_context.all_active_yaku,
            snapshot.decision_context.current_multipliers
          )
          this.notification.showDecisionModal(yakuScores, currentScore)
        }
        break

      case 'ROUND_ENDED':
        // 恢復局間結算狀態，顯示 RoundEndedModal
        if (snapshot.round_end_info) {
          this.restoreRoundEndedState(snapshot)
        }
        break

      default:
        break
    }
  }

  /**
   * 恢復局間結算狀態
   *
   * @description
   * 當 flowStage === 'ROUND_ENDED' 時，恢復 RoundEndedModal 的顯示。
   * 根據 reason 決定顯示哪種類型的 Modal。
   *
   * @param snapshot - 遊戲狀態快照
   */
  private restoreRoundEndedState(snapshot: GameSnapshotRestore): void {
    const roundEndInfo = snapshot.round_end_info!


    // 根據 reason 顯示對應的 Modal
    switch (roundEndInfo.reason) {
      case 'SCORED':
        if (roundEndInfo.scoring_data && roundEndInfo.winner_id) {
          this.notification.showRoundScoredModal(
            roundEndInfo.winner_id,
            roundEndInfo.scoring_data.yaku_list,
            roundEndInfo.scoring_data.base_score,
            roundEndInfo.scoring_data.final_score,
            roundEndInfo.scoring_data.multipliers,
            [...snapshot.player_scores]
          )
        }
        break

      case 'DRAWN':
        this.notification.showRoundDrawnModal([...snapshot.player_scores])
        break

      case 'INSTANT_TESHI':
      case 'INSTANT_KUTTSUKI':
      case 'INSTANT_FIELD_TESHI':
        this.notification.showRoundEndedInstantlyModal(
          roundEndInfo.reason,
          roundEndInfo.winner_id,
          roundEndInfo.awarded_points,
          [...snapshot.player_scores]
        )
        break

      default:
    }

    // 啟動剩餘倒數（DISPLAY mode）
    if (roundEndInfo.timeout_remaining_seconds > 0) {
      this.notification.startCountdown(roundEndInfo.timeout_remaining_seconds, 'DISPLAY')
    }
  }

  /**
   * 將 Yaku 陣列轉換為 YakuScore 陣列
   */
  private convertYakuToYakuScores(yaku: ReadonlyArray<{ yaku_type: string; base_points: number }>): YakuScore[] {
    return yaku.map(y => ({
      yaku_type: y.yaku_type,
      base_points: y.base_points,
    }))
  }

  /**
   * 計算當前分數
   */
  private calculateCurrentScore(
    yaku: ReadonlyArray<{ base_points: number }>,
    multipliers: { koi_koi_applied: boolean }
  ): number {
    const baseScore = yaku.reduce((sum, y) => sum + y.base_points, 0)
    const multiplier = multipliers.koi_koi_applied ? 2 : 1
    return baseScore * multiplier
  }

  /**
   * 處理 game_finished（遊戲已結束）
   *
   * @description
   * 重連時發現遊戲已結束（從 DB 查到）。
   * 顯示遊戲結果，導航回大廳。
   *
   * @param result - 遊戲結束資訊
   */
  private handleGameFinished(result: GameFinishedInfo): void {

    // 1. 清除配對狀態
    this.matchmakingState.clearSession()

    // 2. 清除遊戲 ID
    this.gameState.setCurrentGameId(null)

    // 3. 建構訊息
    const winnerMsg = result.winner_id
      ? `Game finished! Final scores: ${result.final_scores.map(s => s.score).join(' - ')}`
      : `Game finished! It's a draw! Final scores: ${result.final_scores.map(s => s.score).join(' - ')}`

    // 4. 顯示遊戲結果訊息
    this.notification.showInfoMessage(winnerMsg)

    // 5. 導航回大廳
    this.navigation.navigateToLobby()
  }

  /**
   * 處理 game_expired（遊戲已過期）
   *
   * @description
   * 重連時發現遊戲已過期（在 DB 但不在記憶體）。
   * 顯示錯誤訊息，導航回大廳。
   */
  private handleGameExpired(): void {

    // 1. 清除配對狀態
    this.matchmakingState.clearSession()

    // 2. 清除遊戲 ID
    this.gameState.setCurrentGameId(null)

    // 3. 顯示錯誤訊息
    this.notification.showErrorMessage('Your game session has expired. Please start a new game.')

    // 4. 導航回大廳
    this.navigation.navigateToLobby()
  }
}
