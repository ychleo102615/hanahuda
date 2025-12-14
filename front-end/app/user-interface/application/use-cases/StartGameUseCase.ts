/**
 * StartGameUseCase - Use Case
 *
 * @description
 * 啟動遊戲連線流程：重置狀態並建立 SSE 連線。
 *
 * SSE-First Architecture：
 * - 連線建立後，後端透過 InitialState 事件決定遊戲狀態
 * - 所有必要資訊從 SessionContextPort 取得
 * - 調用者只需表達業務意圖（是否新遊戲）
 *
 * 業務流程：
 * 1. 如果 isNewGame 為 true，清除 SessionContext 中的 gameId
 * 2. 重置遊戲狀態和 UI 狀態
 * 3. 斷開現有連線（如果有）
 * 4. 建立新的遊戲連線
 *
 * 依賴的 Output Ports：
 * - GameConnectionPort: 管理 SSE 連線
 * - SessionContextPort: 管理會話資訊
 * - GameStatePort: 管理遊戲狀態
 * - NotificationPort: 管理 UI 通知狀態
 *
 * @example
 * ```typescript
 * // 進入遊戲頁面
 * startGameUseCase.execute()
 *
 * // 開始新遊戲
 * startGameUseCase.execute({ isNewGame: true })
 * ```
 */

import type { StartGamePort, StartGameOptions } from '../ports/input'
import type {
  GameConnectionPort,
  SessionContextPort,
  GameStatePort,
  NotificationPort,
} from '../ports/output'

export class StartGameUseCase implements StartGamePort {
  constructor(
    private readonly gameConnection: GameConnectionPort,
    private readonly sessionContext: SessionContextPort,
    private readonly gameState: GameStatePort,
    private readonly notification: NotificationPort,
  ) {}

  execute(options?: StartGameOptions): void {
    const isNewGame = options?.isNewGame ?? false

    // 從 SessionContext 取得必要資訊
    const playerId = this.sessionContext.getPlayerId()
    const playerName = this.sessionContext.getPlayerName() || 'Player'
    const roomTypeId = this.sessionContext.getRoomTypeId()

    if (!playerId) {
      console.error('[StartGameUseCase] 無 playerId，無法啟動遊戲')
      throw new Error('No player ID found in session')
    }

    console.info('[StartGameUseCase] 啟動遊戲連線', {
      playerId,
      playerName,
      roomTypeId,
      isNewGame,
    })

    // 1. 新遊戲：清除 gameId
    if (isNewGame) {
      this.sessionContext.setGameId(null)
    }

    // 2. 重置狀態
    this.gameState.reset()
    this.notification.cleanup()

    // 3. 斷開現有連線
    if (this.gameConnection.isConnected()) {
      this.gameConnection.disconnect()
    }

    // 4. 建立新連線
    const gameId = this.sessionContext.getGameId()
    this.gameConnection.connect({
      playerId,
      playerName,
      gameId: gameId ?? undefined,
      roomTypeId: roomTypeId ?? undefined,
    })
  }
}
