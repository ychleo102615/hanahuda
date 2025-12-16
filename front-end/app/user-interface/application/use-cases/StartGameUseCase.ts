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
 * 業務流程（順序至關重要！）：
 * 1. 如果 isNewGame 為 true，清除 SessionContext 中的 gameId
 * 2. **首先斷開現有連線**：停止接收舊事件，並清空事件處理鏈
 * 3. 中斷所有進行中的操作和動畫（避免重連時視覺混亂）
 * 4. 重置遊戲狀態和 UI 狀態
 * 5. 建立新的遊戲連線
 *
 * **重要**：disconnect() 必須在 clearHiddenCards() 和 reset() 之前執行！
 * 否則舊的 SSE 事件可能在清理過程中繼續進入，導致：
 * - 動畫層的 hideCards() 被呼叫，卡片消失
 * - UI 狀態被舊事件覆蓋（如顯示錯誤的 "Round Over"）
 *
 * 依賴的 Output Ports：
 * - GameConnectionPort: 管理 SSE 連線
 * - SessionContextPort: 管理會話資訊
 * - GameStatePort: 管理遊戲狀態
 * - NotificationPort: 管理 UI 通知狀態
 * - AnimationPort: 中斷動畫、清除隱藏卡片
 * - OperationSessionManager: 中斷進行中的 Use Cases
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
  AnimationPort,
} from '../ports/output'
import type { OperationSessionManager } from '../../adapter/abort'

export class StartGameUseCase implements StartGamePort {
  constructor(
    private readonly gameConnection: GameConnectionPort,
    private readonly sessionContext: SessionContextPort,
    private readonly gameState: GameStatePort,
    private readonly notification: NotificationPort,
    private readonly animation: AnimationPort,
    private readonly operationSession: OperationSessionManager,
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

    // 1. 新遊戲：清除 gameId 和遊戲結束標記
    if (isNewGame) {
      this.sessionContext.setGameId(null)
      this.sessionContext.setGameFinished(false)
    }

    // 2. **首先**斷開現有連線（停止接收舊事件 + 清空事件鏈）
    //    這必須在任何狀態清理之前執行！
    if (this.gameConnection.isConnected()) {
      this.gameConnection.disconnect()
    }

    // 3. 中斷所有進行中的操作和動畫（避免重連時視覺混亂）
    this.operationSession.abortAll()
    this.animation.interrupt()
    this.animation.clearHiddenCards()

    // 4. 重置狀態
    this.gameState.reset()
    this.notification.cleanup()

    // 5. 建立新連線
    const gameId = this.sessionContext.getGameId()
    this.gameConnection.connect({
      playerId,
      playerName,
      gameId: gameId ?? undefined,
      roomTypeId: roomTypeId ?? undefined,
    })
  }
}
