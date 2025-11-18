/**
 * HandleGameStartedUseCase
 *
 * @description
 * 處理 GameStarted 事件，初始化遊戲上下文並顯示遊戲開始訊息。
 *
 * 業務流程：
 * 1. 解析玩家資訊與規則集
 * 2. 調用 UpdateUIStatePort.initializeGameContext() 初始化遊戲上下文
 * 3. 調用 TriggerUIEffectPort 顯示「遊戲開始」訊息
 *
 * @see specs/003-ui-application-layer/contracts/events.md#GameStartedEvent
 * @see specs/003-ui-application-layer/data-model.md#HandleGameStartedUseCase
 */

import type { GameStartedEvent } from '../../types/events'
import type { UpdateUIStatePort, TriggerUIEffectPort } from '../../ports/output'
import type { HandleGameStartedPort } from '../../ports/input'

export class HandleGameStartedUseCase implements HandleGameStartedPort {
  constructor(
    private readonly updateUIState: UpdateUIStatePort,
    private readonly triggerUIEffect: TriggerUIEffectPort
  ) {}

  execute(event: GameStartedEvent): void {
    // 1. 初始化遊戲上下文（game_id, players, ruleset）
    this.updateUIState.initializeGameContext(
      event.game_id,
      [...event.players], // Convert readonly array to mutable
      event.ruleset
    )

    // 2. 觸發遊戲開始動畫/訊息
    // 使用 triggerAnimation 顯示遊戲開始的視覺效果
    this.triggerUIEffect.triggerAnimation('DEAL_CARDS', {
      fieldCards: [],
      hands: [],
    })
  }
}
