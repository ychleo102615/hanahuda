/**
 * StartGameUseCase - Use Case
 *
 * @description
 * 處理遊戲啟動流程：調用 joinGame API 並保存 session 識別資訊。
 *
 * 業務流程：
 * 1. 調用 SendCommandPort.joinGame() 發送配對請求
 * 2. 保存 gameId 到 MatchmakingStatePort（用於 SSE 連線）
 * 3. 保存識別資訊（gameId, playerId）到 SessionContextPort
 * 4. 記錄日誌
 *
 * 安全性設計：
 * - session_token 由後端透過 HttpOnly Cookie 設定，前端不處理
 * - 僅非敏感的識別資訊（gameId, playerId）存放在 sessionStorage
 *
 * 依賴的 Output Ports：
 * - SendCommandPort: 發送 joinGame 命令
 * - MatchmakingStatePort: 管理配對狀態
 * - SessionContextPort: 管理 session 識別資訊
 *
 * @example
 * ```typescript
 * const startGameUseCase = new StartGameUseCase(
 *   sendCommandPort,
 *   matchmakingStatePort,
 *   sessionContextPort
 * )
 * await startGameUseCase.execute({ playerId, playerName })
 * ```
 */

import type { StartGamePort, StartGameRequest } from '../ports/input'
import type { SendCommandPort, MatchmakingStatePort } from '../ports/output'
import type { SessionContextPort } from '../ports/output/session-context.port'

export class StartGameUseCase implements StartGamePort {
  constructor(
    private readonly sendCommand: SendCommandPort,
    private readonly matchmakingState: MatchmakingStatePort,
    private readonly sessionContext: SessionContextPort
  ) {}

  async execute(request: StartGameRequest): Promise<void> {
    // 1. 調用 joinGame API
    // 注意：session_token 由後端透過 Set-Cookie 設定，回應不包含 token
    const response = await this.sendCommand.joinGame({
      player_id: request.playerId,
      player_name: request.playerName,
    })

    // 2. 保存 gameId 到 MatchmakingStatePort（用於 SSE 連線）
    this.matchmakingState.setGameId(response.game_id)

    // 3. 保存識別資訊到 SessionContextPort（用於重連）
    // session_token 由 HttpOnly Cookie 管理，不在此處理
    this.sessionContext.setIdentity({
      gameId: response.game_id,
      playerId: response.player_id,
    })

    // 4. 記錄日誌（不再記錄 session_token）
    console.info('[StartGameUseCase] 遊戲啟動成功', {
      gameId: response.game_id,
      playerId: response.player_id,
      sseEndpoint: response.sse_endpoint,
    })
  }
}
