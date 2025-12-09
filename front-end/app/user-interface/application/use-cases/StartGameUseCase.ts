/**
 * StartGameUseCase - Use Case
 *
 * @description
 * 處理遊戲啟動流程：調用 joinGame API 並保存 session token。
 *
 * 業務流程：
 * 1. 調用 SendCommandPort.joinGame() 發送配對請求
 * 2. 保存 session_token 到 MatchmakingStatePort
 * 3. 保存 session_token 到 sessionStorage（用於頁面刷新恢復）
 * 4. 記錄日誌
 *
 * 依賴的 Output Ports：
 * - SendCommandPort: 發送 joinGame 命令
 * - MatchmakingStatePort: 管理配對狀態
 *
 * @example
 * ```typescript
 * const startGameUseCase = new StartGameUseCase(
 *   sendCommandPort,
 *   matchmakingStatePort
 * )
 * await startGameUseCase.execute()
 * ```
 */

import type { StartGamePort, StartGameRequest } from '../ports/input'
import type { SendCommandPort, MatchmakingStatePort } from '../ports/output'

export class StartGameUseCase implements StartGamePort {
  constructor(
    private readonly sendCommand: SendCommandPort,
    private readonly matchmakingState: MatchmakingStatePort
  ) {}

  async execute(request: StartGameRequest): Promise<void> {
    // 1. 調用 joinGame API
    const response = await this.sendCommand.joinGame({
      player_id: request.playerId,
      player_name: request.playerName,
      session_token: request.sessionToken,
    })

    // 2. 保存 session token 和 game id 到 store
    this.matchmakingState.setSessionToken(response.session_token)
    this.matchmakingState.setGameId(response.game_id)

    // 3. 保存到 sessionStorage（用於重連）
    sessionStorage.setItem('session_token', response.session_token)
    sessionStorage.setItem('game_id', response.game_id)
    sessionStorage.setItem('player_id', response.player_id)

    // 4. 記錄日誌
    console.info('[StartGameUseCase] 遊戲啟動成功', {
      sessionToken: response.session_token,
      gameId: response.game_id,
      playerId: response.player_id,
      sseEndpoint: response.sse_endpoint,
    })
  }
}
