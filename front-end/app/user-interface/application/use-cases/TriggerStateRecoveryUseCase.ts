/**
 * TriggerStateRecoveryUseCase - Use Case
 *
 * @description
 * 協調狀態恢復流程，用於頁面恢復可見或 SSE 重連成功時。
 *
 * 業務流程：
 * 1. 獲取遊戲快照或遊戲狀態
 * 2. 根據回應類型委派給 HandleStateRecoveryPort 處理：
 *    - `snapshot`: 執行狀態恢復
 *    - `game_finished`: 顯示遊戲結果，導航回大廳
 *    - `game_expired`: 顯示錯誤訊息，導航回大廳
 *
 * 設計原則：
 * - 職責分離：本 Use Case 負責「業務邏輯」，Adapter 層負責「技術細節」
 * - 清理操作（取消 delays、清空事件鏈）由 Adapter 層在呼叫前處理
 * - 符合 Clean Architecture：Application Layer 不關心 SSE 連線管理
 *
 * 依賴的 Ports：
 * - ReconnectionPort (Output): 獲取快照
 * - HandleStateRecoveryPort (Input): 執行狀態恢復
 *
 * @example
 * ```typescript
 * const triggerStateRecoveryUseCase = new TriggerStateRecoveryUseCase(
 *   reconnectionPort,
 *   handleStateRecoveryPort
 * )
 * await triggerStateRecoveryUseCase.execute(gameId)
 * ```
 *
 * @module user-interface/application/use-cases/TriggerStateRecoveryUseCase
 */

import { TriggerStateRecoveryPort, HandleStateRecoveryPort } from '../ports/input'
import { ReconnectionPort } from '../ports/output'

export class TriggerStateRecoveryUseCase extends TriggerStateRecoveryPort {
  constructor(
    private readonly reconnectionPort: ReconnectionPort,
    private readonly handleStateRecovery: HandleStateRecoveryPort
  ) {
    super()
  }

  async execute(gameId: string): Promise<void> {
    console.info('[TriggerStateRecoveryUseCase] Starting state recovery', { gameId })

    // 注意：清理操作（取消 delays、清空事件鏈）由 Adapter 層在呼叫前處理
    // 這符合 Clean Architecture 原則：Application Layer 只負責業務邏輯

    // 1. Fetch game snapshot or game status
    const result = await this.reconnectionPort.fetchSnapshot(gameId)

    // 3. Handle fetch failure
    if (!result.success) {
      console.warn('[TriggerStateRecoveryUseCase] Failed to fetch game snapshot', { error: result.error })
      this.handleStateRecovery.handleFetchFailed(result.error)
      return
    }

    // 4. Handle different response types - delegate to HandleStateRecoveryPort
    const response = result.data

    switch (response.response_type) {
      case 'snapshot': {
        console.info('[TriggerStateRecoveryUseCase] Game snapshot fetched', {
          gameId: response.data.game_id,
          flowStage: response.data.current_flow_stage,
        })
        this.handleStateRecovery.handleSnapshotRestore(response.data)
        console.info('[TriggerStateRecoveryUseCase] State recovery completed')
        break
      }

      case 'game_finished': {
        console.info('[TriggerStateRecoveryUseCase] Game already finished', {
          gameId: response.data.game_id,
          winnerId: response.data.winner_id,
          roundsPlayed: response.data.rounds_played,
        })
        this.handleStateRecovery.handleGameFinished(response.data)
        break
      }

      case 'game_expired': {
        console.info('[TriggerStateRecoveryUseCase] Game expired')
        this.handleStateRecovery.handleGameExpired()
        break
      }
    }
  }
}
