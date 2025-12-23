/**
 * HandleGameStartedUseCase
 *
 * @description
 * 處理 GameStarted 事件，初始化遊戲上下文並顯示遊戲開始訊息。
 *
 * 業務流程：
 * 1. 解析玩家資訊與規則集
 * 2. 調用 UIStatePort.initializeGameContext() 初始化遊戲上下文
 * 3. 調用 TriggerUIEffectPort 顯示「遊戲開始」訊息
 *
 * @see specs/003-ui-application-layer/contracts/events.md#GameStartedEvent
 * @see specs/003-ui-application-layer/data-model.md#HandleGameStartedUseCase
 */

import type { GameStartedEvent } from '#shared/contracts'
import type { UIStatePort, GameStatePort, MatchmakingStatePort, NavigationPort, NotificationPort } from '../../ports/output'
import type { HandleGameStartedPort, ExecuteOptions } from '../../ports/input'

export class HandleGameStartedUseCase implements HandleGameStartedPort {
  constructor(
    private readonly updateUIState: UIStatePort,
    private readonly gameState: GameStatePort,
    private readonly matchmakingState: MatchmakingStatePort,
    private readonly navigationPort: NavigationPort,
    private readonly notification: NotificationPort
  ) {}

  execute(event: GameStartedEvent, _options: ExecuteOptions): void {
    // 1. 隱藏等待訊息並停止配對倒數（玩家 A 在等待時收到 GameStarted 事件）
    this.notification.hideWaitingMessage()
    this.notification.stopActionCountdown()

    // 2. 初始化遊戲上下文（game_id, players, ruleset）
    this.updateUIState.initializeGameContext(
      event.game_id,
      [...event.players], // Convert readonly array to mutable
      event.ruleset
    )

    // 3. 設置初始牌堆數量（從 ruleset 取得）
    this.gameState.updateDeckRemaining(event.ruleset.total_deck_cards)

    // 4. 清除配對狀態（配對已成功，進入遊戲）
    this.matchmakingState.clearSession()

    // 5. 導航至遊戲頁面
    this.navigationPort.navigateToGame()
  }
}
