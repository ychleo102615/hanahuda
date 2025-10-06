import type { GameState } from '@/features/game-engine/domain/entities/GameState'

/**
 * GameRepository - 只負責遊戲狀態的數據存取
 *
 * 職責：
 * - 創建/讀取/更新/刪除遊戲狀態
 * - 數據持久化
 *
 * 不應包含：
 * - 業務邏輯（由 UseCase 處理）
 * - 遊戲規則（由 Domain 層處理）
 * - 狀態轉換（由 UseCase 處理）
 */
export interface GameRepository {
  /**
   * 創建新的空遊戲狀態並返回 gameId
   */
  createGame(): Promise<string>

  /**
   * 獲取遊戲狀態
   */
  getGameState(gameId: string): Promise<GameState | null>

  /**
   * 保存遊戲狀態
   */
  saveGame(gameId: string, gameState: GameState): Promise<boolean>

  /**
   * 刪除遊戲
   */
  deleteGame(gameId: string): Promise<boolean>

  /**
   * 清除所有遊戲
   */
  clearAllGames(): Promise<boolean>
}