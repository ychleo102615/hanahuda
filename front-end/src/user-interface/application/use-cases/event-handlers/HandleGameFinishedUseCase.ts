/**
 * HandleGameFinishedUseCase
 */

import type { GameFinishedEvent } from '../../types/events'
import type { NotificationPort, UIStatePort } from '../../ports/output'
import type { HandleGameFinishedPort } from '../../ports/input'

export class HandleGameFinishedUseCase implements HandleGameFinishedPort {
  constructor(
    private readonly notification: NotificationPort,
    private readonly updateUIState: UIStatePort,
  ) {}

  execute(event: GameFinishedEvent): void {
    // 1. 取得當前玩家 ID
    const currentPlayerId = this.updateUIState.getLocalPlayerId()

    // 2. 判斷是否為當前玩家獲勝
    const isPlayerWinner = event.winner_id === currentPlayerId

    // 3. 顯示遊戲結束畫面
    this.notification.showGameFinishedUI(
      event.winner_id,
      [...event.final_scores],
      isPlayerWinner,
    )
  }
}
