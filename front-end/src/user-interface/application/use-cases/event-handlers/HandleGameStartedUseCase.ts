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

import type { GameStartedEvent } from '../../types/events'
import type { UIStatePort, TriggerUIEffectPort, GameStatePort } from '../../ports/output'
import type { HandleGameStartedPort } from '../../ports/input'

export class HandleGameStartedUseCase implements HandleGameStartedPort {
  constructor(
    private readonly updateUIState: UIStatePort,
    private readonly triggerUIEffect: TriggerUIEffectPort,
    private readonly gameState: GameStatePort
  ) {}

  execute(event: GameStartedEvent): void {
    // 1. 初始化遊戲上下文（game_id, players, ruleset）
    this.updateUIState.initializeGameContext(
      event.game_id,
      [...event.players], // Convert readonly array to mutable
      event.ruleset
    )

    // 2. 設置初始牌堆數量（48 張）
    this.gameState.updateDeckRemaining(48)
  }
}
