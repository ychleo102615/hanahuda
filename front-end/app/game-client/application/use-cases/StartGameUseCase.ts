/**
 * StartGameUseCase - Use Case
 *
 * @description
 * 啟動遊戲連線流程：重置狀態並建立 WebSocket 連線。
 *
 * Gateway Architecture：
 * - 連線建立後，後端透過 InitialState 事件決定遊戲狀態
 * - playerId、playerName 由呼叫端提供（來自 authStore）
 * - roomTypeId 由 WebSocket 事件（GameStarted/GameSnapshotRestore）提供，存入 gameState
 *
 * 業務流程（順序至關重要！）：
 * 1. 如果 isNewGame 為 true，清除 gameState 中的 currentGameId
 * 2. **首先斷開現有連線**：停止接收舊事件，並清空事件處理鏈
 * 3. 中斷所有進行中的操作和動畫（避免重連時視覺混亂）
 * 4. 重置遊戲狀態和 UI 狀態
 * 5. 建立新的遊戲連線
 *
 * **重要**：disconnect() 必須在 clearHiddenCards() 和 reset() 之前執行！
 * 否則舊的 WebSocket 事件可能在清理過程中繼續進入，導致：
 * - 動畫層的 hideCards() 被呼叫，卡片消失
 * - UI 狀態被舊事件覆蓋（如顯示錯誤的 "Round Over"）
 *
 * 依賴的 Output Ports：
 * - GameConnectionPort: 管理 WebSocket 連線
 * - GameStatePort: 管理遊戲狀態
 * - NotificationPort: 管理 UI 通知狀態
 * - AnimationPort: 中斷動畫、清除隱藏卡片
 * - OperationSessionPort: 中斷進行中的 Use Cases
 *
 * @example
 * ```typescript
 * // 進入遊戲頁面
 * startGameUseCase.execute({
 *   playerId: authStore.playerId,
 *   playerName: authStore.displayName
 * })
 *
 * // 開始新遊戲
 * startGameUseCase.execute({
 *   playerId: authStore.playerId,
 *   playerName: authStore.displayName,
 *   isNewGame: true
 * })
 * ```
 */

import type { StartGamePort, StartGameOptions } from '../ports/input'
import type {
  GameConnectionPort,
  GameStatePort,
  NotificationPort,
  AnimationPort,
  OperationSessionPort,
} from '../ports/output'

export class StartGameUseCase implements StartGamePort {
  constructor(
    private readonly gameConnection: GameConnectionPort,
    private readonly gameState: GameStatePort,
    private readonly notification: NotificationPort,
    private readonly animation: AnimationPort,
    private readonly operationSession: OperationSessionPort,
  ) {}

  execute(options: StartGameOptions): void {
    const { playerId, playerName = 'Player', isNewGame = false } = options

    // 1. 新遊戲：清除 currentGameId 和遊戲結束標記
    if (isNewGame) {
      this.gameState.setCurrentGameId(null)
      this.gameState.setGameEnded(false)
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
    this.notification.resetUITemporaryState()

    // 5. 建立新連線
    const gameId = this.gameState.getCurrentGameId()
    this.gameConnection.connect({
      playerId,
      playerName,
      gameId: gameId ?? undefined,
    })
  }
}
