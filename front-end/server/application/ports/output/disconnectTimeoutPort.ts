/**
 * DisconnectTimeoutPort - Output Port
 *
 * @description
 * 斷線超時管理 Port。
 * Application Layer 透過此 Port 管理玩家斷線超時。
 *
 * @module server/application/ports/output/disconnectTimeoutPort
 */

/**
 * 斷線超時管理 Port
 */
export interface DisconnectTimeoutPort {
  /**
   * 開始斷線超時計時
   *
   * @param gameId 遊戲 ID
   * @param playerId 玩家 ID
   * @param onTimeout 超時回調函數
   */
  startDisconnectTimeout(
    gameId: string,
    playerId: string,
    onTimeout: () => void
  ): void

  /**
   * 清除指定玩家的斷線計時器
   *
   * @param gameId 遊戲 ID
   * @param playerId 玩家 ID
   */
  clearDisconnectTimeout(gameId: string, playerId: string): void

  /**
   * 清除指定遊戲的所有斷線計時器
   *
   * @param gameId 遊戲 ID
   */
  clearAllForGame(gameId: string): void

  /**
   * 檢查玩家是否有進行中的斷線計時器
   *
   * @param gameId 遊戲 ID
   * @param playerId 玩家 ID
   * @returns 是否有斷線計時器
   */
  hasTimeout(gameId: string, playerId: string): boolean
}
