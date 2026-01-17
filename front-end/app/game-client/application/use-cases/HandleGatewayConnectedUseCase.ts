/**
 * HandleGatewayConnectedUseCase - 處理 Gateway 連線成功事件
 *
 * @description
 * 處理 Gateway WebSocket 連線建立後的初始狀態事件。
 * 根據玩家狀態同步前端 UI：
 * - IDLE: 閒置狀態，不做任何導航（導航由 middleware 處理）
 * - MATCHMAKING: 配對中，恢復配對 UI
 * - IN_GAME: 遊戲中，恢復遊戲狀態
 *
 * 設計原則：此 UseCase 只負責「同步狀態」，不負責「決定導航」。
 * 導航決策由以下機制處理：
 * - 直接訪問 /game：由 middleware 阻止
 * - 遊戲結束後：由用戶操作（Leave 或 Rematch）
 * - 配對失敗/取消：由對應的 UseCase 處理
 *
 * @module app/game-client/application/use-cases/HandleGatewayConnectedUseCase
 */

import type { EventHandlerPort, ExecuteOptions } from '../ports/input'
import type { MatchmakingStatePort, SessionContextPort, GameStatePort, ConnectionReadyPort } from '../ports/output'

/**
 * GatewayConnected 事件 Payload
 */
export interface GatewayConnectedPayload {
  readonly player_id: string
  readonly status: 'IDLE' | 'MATCHMAKING' | 'IN_GAME'
  // MATCHMAKING 狀態
  readonly roomType?: string
  readonly elapsedSeconds?: number
  // IN_GAME 狀態
  readonly gameId?: string
  readonly gameStatus?: string
}

/**
 * HandleGatewayConnectedUseCase
 *
 * @description
 * 處理 Gateway 連線成功事件，根據玩家狀態設定 UI。
 */
export class HandleGatewayConnectedUseCase implements EventHandlerPort<GatewayConnectedPayload> {
  constructor(
    private readonly matchmakingState: MatchmakingStatePort,
    private readonly sessionContext: SessionContextPort,
    private readonly gameState: GameStatePort,
    private readonly connectionReady: ConnectionReadyPort
  ) {}

  async execute(payload: GatewayConnectedPayload, _options?: ExecuteOptions): Promise<void> {
    switch (payload.status) {
      case 'IDLE':
        // 閒置狀態：清除可能殘留的 currentGameId（以後端狀態為準）
        // - 遊戲結束後重新整理，後端返回 IDLE，應清除本地殘留的 gameId
        // - 導航由 middleware 或用戶操作處理
        // - 如果用戶在遊戲結束後查看結果面板，不應該被踢出
        // - 如果有 selectedRoomTypeId，onInitialState 回調會處理 enterMatchmaking
        this.sessionContext.setCurrentGameId(null)
        break

      case 'MATCHMAKING':
        // 配對中：恢復配對 UI
        // 注意：不清除 selectedRoomTypeId，保留作為 middleware 判斷依據
        // selectedRoomTypeId 會在遊戲開始時（HandleMatchFoundUseCase）清除
        // 重要：先設定 elapsedSeconds，再設定 status
        // 避免 status 變更觸發 UI 更新時，elapsedSeconds 還是 0 的時序問題
        if (payload.elapsedSeconds !== undefined) {
          this.matchmakingState.setElapsedSeconds(payload.elapsedSeconds)
        }
        this.matchmakingState.setStatus('searching')
        break

      case 'IN_GAME':
        // 遊戲中：根據 gameStatus 決定行為
        if (payload.gameStatus === 'STARTING') {
          // 遊戲正在啟動中（尚未發牌）：顯示「遊戲開始中...」
          // 不清除 selectedRoomTypeId，等待 GameStarted 事件
          this.matchmakingState.setStatus('starting')
          if (payload.gameId) {
            this.gameState.setCurrentGameId(payload.gameId)
            this.sessionContext.setCurrentGameId(payload.gameId)
          }
        } else {
          // 遊戲進行中（IN_PROGRESS）：設定 currentGameId，後續會收到 GameSnapshotRestore
          this.sessionContext.setSelectedRoomTypeId(null)
          if (payload.gameId) {
            this.gameState.setCurrentGameId(payload.gameId)
            this.sessionContext.setCurrentGameId(payload.gameId)
          }
        }
        break
    }

    // 通知連線已就緒，讓 useGatewayConnection 的 onInitialState 回調執行
    // 回調可以根據 status 決定是否需要 enterMatchmaking
    this.connectionReady.notifyConnectionReady({
      playerId: payload.player_id,
      status: payload.status,
      roomType: payload.roomType,
      elapsedSeconds: payload.elapsedSeconds,
      gameId: payload.gameId,
    })
  }
}
