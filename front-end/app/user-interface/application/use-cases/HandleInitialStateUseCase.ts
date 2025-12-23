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
  SessionContextPort,
} from '../ports/output'
import { HandleInitialStatePort } from '../ports/input/handle-initial-state.port'
import type { OperationSessionManager } from '../../adapter/abort'

export class HandleInitialStateUseCase extends HandleInitialStatePort {
  constructor(
    private readonly updateUIState: UIStatePort,
    private readonly notification: NotificationPort,
    private readonly navigation: NavigationPort,
    private readonly animationPort: AnimationPort,
    private readonly matchmakingState: MatchmakingStatePort,
    private readonly sessionContext: SessionContextPort,
    private readonly operationSession: OperationSessionManager
  ) {
    super()
  }

  /**
   * 執行 InitialState 事件處理
   *
   * @param event - InitialState 事件
   * @param signal - AbortSignal（可選），用於取消操作
   */
  execute(event: InitialStateEvent, signal?: AbortSignal): void {
    console.info('[HandleInitialStateUseCase] Processing InitialState', {
      responseType: event.response_type,
      gameId: event.game_id,
      playerId: event.player_id,
    })

    // 儲存遊戲 ID 到 SessionContext
    this.sessionContext.setGameId(event.game_id)

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
        console.error('[HandleInitialStateUseCase] Unknown response_type:', _exhaustiveCheck)
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
    console.info('[HandleInitialStateUseCase] Game waiting for opponent', {
      gameId: data.game_id,
      playerId: data.player_id,
      timeoutSeconds: data.timeout_seconds,
    })

    // 1. 更新配對狀態為等待中
    this.matchmakingState.setStatus('waiting')
    this.matchmakingState.setGameId(data.game_id)

    // 2. 顯示等待訊息
    this.notification.showWaitingMessage(data.timeout_seconds)

    // 3. 啟動配對超時倒數（沿用 actionTimeoutRemaining）
    this.notification.startActionCountdown(data.timeout_seconds)

    console.info('[HandleInitialStateUseCase] Waiting for opponent, showing waiting UI')
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
    console.info('[HandleInitialStateUseCase] Game started', {
      gameId: data.game_id,
      playerCount: data.players.length,
      startingPlayerId: data.starting_player_id,
    })

    // 1. 清除配對狀態（遊戲已開始）
    this.matchmakingState.clearSession()

    // 2. 隱藏等待訊息並停止配對倒數
    this.notification.hideWaitingMessage()
    this.notification.stopActionCountdown()

    // 3. 設定遊戲初始狀態
    this.updateUIState.initializeGameContext(data.game_id, [...data.players], data.ruleset)

    console.info('[HandleInitialStateUseCase] Game state initialized, waiting for RoundDealt')
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
    console.info('[HandleInitialStateUseCase] Restoring game state from snapshot', {
      gameId: snapshot.game_id,
      flowStage: snapshot.current_flow_stage,
    })

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

    // 8. 啟動操作倒數（如果有）
    this.notification.startActionCountdown(snapshot.action_timeout_seconds)

    console.info('[HandleInitialStateUseCase] Game state restored successfully')
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
        console.info('[HandleInitialStateUseCase] AWAITING_SELECTION - selection UI will be triggered by watcher', {
          isMyTurn,
          hasSelectionContext: !!snapshot.selection_context,
        })
        break

      case 'AWAITING_DECISION':
        if (isMyTurn && snapshot.decision_context) {
          const yakuScores = this.convertYakuToYakuScores(snapshot.decision_context.all_active_yaku)
          const currentScore = this.calculateCurrentScore(
            snapshot.decision_context.all_active_yaku,
            snapshot.decision_context.current_multipliers,
            snapshot.active_player_id
          )
          this.notification.showDecisionModal(yakuScores, currentScore)
          console.info('[HandleInitialStateUseCase] AWAITING_DECISION - decision modal shown', {
            yakuCount: yakuScores.length,
            currentScore,
          })
        }
        break

      default:
        break
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
    multipliers: { player_multipliers: Record<string, number> },
    playerId: string
  ): number {
    const baseScore = yaku.reduce((sum, y) => sum + y.base_points, 0)
    const multiplier = multipliers.player_multipliers[playerId] ?? 1
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
    console.info('[HandleInitialStateUseCase] Game already finished', {
      gameId: result.game_id,
      winnerId: result.winner_id,
      roundsPlayed: result.rounds_played,
    })

    // 1. 清除配對狀態
    this.matchmakingState.clearSession()

    // 2. 清除遊戲 ID
    this.sessionContext.setGameId(null)

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
    console.info('[HandleInitialStateUseCase] Game expired')

    // 1. 清除配對狀態
    this.matchmakingState.clearSession()

    // 2. 清除遊戲 ID
    this.sessionContext.setGameId(null)

    // 3. 顯示錯誤訊息
    this.notification.showErrorMessage('Your game session has expired. Please start a new game.')

    // 4. 導航回大廳
    this.navigation.navigateToLobby()
  }
}
