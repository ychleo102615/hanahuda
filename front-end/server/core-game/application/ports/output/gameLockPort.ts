/**
 * GameLockPort - Output Port
 *
 * @description
 * 遊戲狀態悲觀鎖介面。
 * 確保同一遊戲的狀態修改操作互斥執行。
 *
 * 設計特性：
 * - Per-gameId 鎖粒度（不同遊戲可並行）
 * - 支援可重入鎖（Reentrant Lock）以處理巢狀呼叫
 * - 自動釋放（確保異常時也能釋放）
 *
 * @module server/application/ports/output/gameLockPort
 */

/**
 * GameLockPort
 *
 * 遊戲狀態悲觀鎖的 Output Port 介面。
 */
export abstract class GameLockPort {
  /**
   * 取得遊戲鎖並執行操作
   *
   * @description
   * 若鎖已被佔用，等待鎖釋放後再執行。
   * 支援可重入：若當前呼叫鏈已持有鎖，直接執行不等待。
   *
   * @example
   * ```typescript
   * const result = await gameLock.withLock(gameId, async () => {
   *   // 執行需要互斥的操作
   *   const game = gameStore.get(gameId)
   *   // ... 修改遊戲狀態
   *   gameStore.set(game)
   *   return { success: true }
   * })
   * ```
   *
   * @param gameId - 遊戲 ID
   * @param operation - 要執行的操作
   * @returns 操作結果
   */
  abstract withLock<T>(gameId: string, operation: () => Promise<T>): Promise<T>
}
