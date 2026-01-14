/**
 * HandleGatewayConnectedUseCase - 處理 Gateway 連線成功事件
 *
 * @description
 * 處理 Gateway WebSocket 連線建立後的初始狀態事件。
 * 根據玩家狀態決定後續行為：
 * - IDLE: 閒置狀態，可進入大廳
 * - MATCHMAKING: 配對中，顯示配對 UI
 * - IN_GAME: 遊戲中，恢復遊戲狀態
 *
 * @module app/game-client/application/use-cases/HandleGatewayConnectedUseCase
 */

import type { EventHandlerPort, ExecuteOptions } from '../ports/input'
import type { MatchmakingStatePort, SessionContextPort, NavigationPort, GameStatePort } from '../ports/output'

/**
 * GatewayConnected 事件 Payload
 */
export interface GatewayConnectedPayload {
  readonly player_id: string
  readonly status: 'IDLE' | 'MATCHMAKING' | 'IN_GAME'
  // MATCHMAKING 狀態
  readonly entryId?: string
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
    private readonly navigation: NavigationPort,
    private readonly gameState: GameStatePort
  ) {}

  async execute(payload: GatewayConnectedPayload, _options?: ExecuteOptions): Promise<void> {
    switch (payload.status) {
      case 'IDLE':
        // 閒置狀態：清除配對狀態
        this.matchmakingState.clearSession()
        // 只清除 entryId 和 currentGameId，保留 pendingRoomTypeId
        // 因為 Rematch 流程需要在連線成功後讀取 pendingRoomTypeId 發送配對命令
        this.sessionContext.setEntryId(null)
        this.sessionContext.setCurrentGameId(null)
        break

      case 'MATCHMAKING':
        // 配對中：恢復配對狀態
        if (payload.entryId) {
          this.matchmakingState.setEntryId(payload.entryId)
          this.matchmakingState.setStatus('searching')
          this.sessionContext.setEntryId(payload.entryId)
        }
        break

      case 'IN_GAME':
        // 遊戲中：設定 currentGameId，後續會收到遊戲事件
        if (payload.gameId) {
          this.gameState.setCurrentGameId(payload.gameId)
          // 同步到 SessionContext（確保頁面刷新後可重連）
          this.sessionContext.setCurrentGameId(payload.gameId)
        }
        break
    }
  }
}
