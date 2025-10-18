import type { GameState } from '@/game-engine/domain/entities/GameState'
import type { IGameStateRepository } from '@/game-engine/application/ports/IGameStateRepository'
import { v4 as uuidv4 } from 'uuid'

/**
 * LocalGameRepository - 記憶體內遊戲狀態儲存庫實作
 *
 * 實作 IGameStateRepository 介面,提供記憶體內的遊戲狀態持久化
 *
 * 特點:
 * - 僅包含狀態持久化邏輯,不包含業務邏輯
 * - 使用 Map 儲存遊戲狀態
 * - 所有操作返回 GameState 的 clone,保證不可變性
 *
 * 未來擴展:
 * - 可替換為 IndexedDB 實作
 * - 可替換為 Server API 實作
 */
export class LocalGameRepository implements IGameStateRepository {
  private games: Map<string, GameState> = new Map()

  /**
   * 創建新遊戲,返回遊戲 ID
   */
  async createGame(): Promise<string> {
    const gameId = uuidv4()
    return gameId
  }

  /**
   * 取得遊戲狀態
   *
   * @param gameId - 遊戲 ID
   * @returns 遊戲狀態的 clone (保證不可變性),如果不存在則返回 null
   */
  async getGameState(gameId: string): Promise<GameState | null> {
    const gameState = this.games.get(gameId)
    return gameState ? gameState.clone() : null
  }

  /**
   * 儲存遊戲狀態
   *
   * @param gameId - 遊戲 ID
   * @param gameState - 遊戲狀態
   * @returns 儲存是否成功
   */
  async saveGameState(gameId: string, gameState: GameState): Promise<boolean> {
    try {
      // 儲存 clone 以保證不可變性
      this.games.set(gameId, gameState.clone())
      return true
    } catch (error) {
      console.error('Failed to save game state:', error)
      return false
    }
  }

  /**
   * 刪除遊戲
   *
   * @param gameId - 遊戲 ID
   * @returns 刪除是否成功
   */
  async deleteGame(gameId: string): Promise<boolean> {
    return this.games.delete(gameId)
  }
}
