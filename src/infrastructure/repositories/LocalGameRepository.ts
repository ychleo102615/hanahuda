import type { GameState } from '@/features/game-engine/domain/entities/GameState'
import { GameState as GameStateClass } from '@/features/game-engine/domain/entities/GameState'
import type { GameRepository } from '@/features/game-engine/application/ports/repositories/GameRepository'
import { v4 as uuidv4 } from 'uuid'

/**
 * LocalGameRepository - 使用記憶體存儲遊戲狀態
 *
 * 職責：只負責遊戲狀態的 CRUD 操作
 * 不包含任何業務邏輯或遊戲規則
 */
export class LocalGameRepository implements GameRepository {
  private games: Map<string, GameState> = new Map()

  async createGame(): Promise<string> {
    const gameId = uuidv4()
    const gameState = new GameStateClass()
    this.games.set(gameId, gameState)
    return gameId
  }

  async getGameState(gameId: string): Promise<GameState | null> {
    const gameState = this.games.get(gameId)
    return gameState ? gameState.clone() : null
  }

  async saveGame(gameId: string, gameState: GameState): Promise<boolean> {
    try {
      this.games.set(gameId, gameState.clone())
      return true
    } catch (error) {
      console.error('Failed to save game:', error)
      return false
    }
  }

  async deleteGame(gameId: string): Promise<boolean> {
    return this.games.delete(gameId)
  }

  async clearAllGames(): Promise<boolean> {
    try {
      this.games.clear()
      return true
    } catch (error) {
      console.error('Failed to clear all games:', error)
      return false
    }
  }
}