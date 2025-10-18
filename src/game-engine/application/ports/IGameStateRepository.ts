import type { GameState } from '@/game-engine/domain/entities/GameState'

/**
 * IGameStateRepository - 遊戲狀態儲存庫介面
 *
 * 職責:
 * - 僅負責遊戲狀態的持久化操作
 * - 不包含任何業務邏輯
 * - 提供最小化的介面 (4 個方法)
 *
 * 設計原則:
 * - 符合 Repository Pattern
 * - 符合單一職責原則 (SRP)
 * - 符合介面隔離原則 (ISP)
 */
export interface IGameStateRepository {
  /**
   * 創建新遊戲,返回遊戲 ID
   *
   * @returns Promise<string> - 新創建的遊戲 ID
   */
  createGame(): Promise<string>

  /**
   * 取得遊戲狀態
   *
   * @param gameId - 遊戲 ID
   * @returns Promise<GameState | null> - 遊戲狀態,如果不存在則返回 null
   */
  getGameState(gameId: string): Promise<GameState | null>

  /**
   * 儲存遊戲狀態
   *
   * @param gameId - 遊戲 ID
   * @param gameState - 遊戲狀態
   * @returns Promise<boolean> - 儲存是否成功
   */
  saveGameState(gameId: string, gameState: GameState): Promise<boolean>

  /**
   * 刪除遊戲
   *
   * @param gameId - 遊戲 ID
   * @returns Promise<boolean> - 刪除是否成功
   */
  deleteGame(gameId: string): Promise<boolean>
}
