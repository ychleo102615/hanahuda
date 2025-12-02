/**
 * SendCommandPort - Output Port
 *
 * @description
 * 由 Application Layer 定義，Adapter Layer 實作。
 * 負責發送命令到後端伺服器。
 *
 * 使用於：
 * - PlayHandCardUseCase
 * - SelectMatchTargetUseCase
 * - MakeKoiKoiDecisionUseCase
 * - useLeaveGame composable
 *
 * @example
 * ```typescript
 * // Adapter Layer 實作範例
 * class RestSendCommandAdapter implements SendCommandPort {
 *   async playHandCard(cardId: string, target?: string): Promise<void> {
 *     await fetch('/api/game/turn/play', {
 *       method: 'POST',
 *       body: JSON.stringify({ cardId, target })
 *     })
 *   }
 * }
 * ```
 */
export interface SendCommandPort {
  /**
   * 離開遊戲
   *
   * @param gameId - 遊戲 ID
   * @throws 當網路錯誤或伺服器拒絕時拋出異常
   *
   * @example
   * ```typescript
   * await sendCommand.leaveGame('game-123')
   * ```
   */
  leaveGame(gameId: string): Promise<void>
  /**
   * 發送打牌命令（TurnPlayHandCard）
   *
   * @param cardId - 手牌 ID
   * @param target - 配對目標 ID（可選）
   * @throws 當網路錯誤或伺服器拒絕時拋出異常
   *
   * @example
   * ```typescript
   * await sendCommand.playHandCard('0341', '0343')
   * ```
   */
  playHandCard(cardId: string, target?: string): Promise<void>

  /**
   * 發送選擇配對目標命令（TurnSelectTarget）
   *
   * @param source - 來源卡片 ID
   * @param target - 目標卡片 ID
   * @throws 當網路錯誤或伺服器拒絕時拋出異常
   *
   * @example
   * ```typescript
   * await sendCommand.selectTarget('0341', '0343')
   * ```
   */
  selectTarget(source: string, target: string): Promise<void>

  /**
   * 發送 Koi-Koi 決策命令（RoundMakeDecision）
   *
   * @param decision - 決策（繼續或結束）
   * @throws 當網路錯誤或伺服器拒絕時拋出異常
   *
   * @example
   * ```typescript
   * await sendCommand.makeDecision('KOI_KOI')
   * await sendCommand.makeDecision('END_ROUND')
   * ```
   */
  makeDecision(decision: 'KOI_KOI' | 'END_ROUND'): Promise<void>
}
