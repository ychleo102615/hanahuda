/**
 * In-Memory Game Store
 *
 * @description
 * 使用 Map 儲存活躍遊戲狀態。
 * 用於快速存取遊戲狀態，避免每次都查詢資料庫。
 *
 * 參考: specs/008-nuxt-backend-server/data-model.md#Memory-State-Management
 *
 * @note
 * Adapter Layer 依賴 Domain Layer，符合 Clean Architecture 依賴方向。
 */

// Domain Layer imports
import type { Player } from '~~/server/domain/game/player'
import type { Game, GameStatus } from '~~/server/domain/game/game'
import type { Round, PlayerRoundState, PendingSelection } from '~~/server/domain/round/round'
import type { KoiStatus } from '~~/server/domain/round/koiStatus'

// Re-export Domain types for backwards compatibility
export type { Player, Game, GameStatus, Round, PlayerRoundState, PendingSelection, KoiStatus }

// Type aliases for backwards compatibility with existing code
export type PlayerEntity = Player
export type RoundState = Round
export type GameState = Game

/**
 * 記憶體遊戲儲存
 *
 * @description
 * 單例模式，全域共用。
 * 提供快速的遊戲狀態存取。
 */
class InMemoryGameStore {
  /**
   * 遊戲 ID -> 遊戲狀態
   */
  private games: Map<string, GameState> = new Map()

  /**
   * 玩家 ID -> 遊戲 ID（用於快速查找玩家所在的遊戲）
   */
  private playerGameMap: Map<string, string> = new Map()

  /**
   * 會話 Token -> 遊戲 ID（用於驗證會話）
   */
  private sessionGameMap: Map<string, string> = new Map()

  /**
   * 取得遊戲狀態
   *
   * @param gameId 遊戲 ID
   * @returns 遊戲狀態（若存在）
   */
  get(gameId: string): GameState | undefined {
    return this.games.get(gameId)
  }

  /**
   * 儲存遊戲狀態
   *
   * @param game 遊戲狀態
   */
  set(game: GameState): void {
    const existingGame = this.games.get(game.id)

    // 如果是新遊戲，建立索引
    if (!existingGame) {
      for (const player of game.players) {
        this.playerGameMap.set(player.id, game.id)
      }
      this.sessionGameMap.set(game.sessionToken, game.id)
    }

    this.games.set(game.id, game)
    console.log(`[InMemoryGameStore] Saved game ${game.id}, status: ${game.status}`)
  }

  /**
   * 刪除遊戲狀態
   *
   * @param gameId 遊戲 ID
   */
  delete(gameId: string): void {
    const game = this.games.get(gameId)
    if (game) {
      // 清除索引
      for (const player of game.players) {
        this.playerGameMap.delete(player.id)
      }
      this.sessionGameMap.delete(game.sessionToken)
      this.games.delete(gameId)
      console.log(`[InMemoryGameStore] Deleted game ${gameId}`)
    }
  }

  /**
   * 透過玩家 ID 取得遊戲狀態
   *
   * @param playerId 玩家 ID
   * @returns 遊戲狀態（若存在）
   */
  getByPlayerId(playerId: string): GameState | undefined {
    const gameId = this.playerGameMap.get(playerId)
    return gameId ? this.games.get(gameId) : undefined
  }

  /**
   * 透過會話 Token 取得遊戲狀態
   *
   * @param sessionToken 會話 Token
   * @returns 遊戲狀態（若存在）
   */
  getBySessionToken(sessionToken: string): GameState | undefined {
    const gameId = this.sessionGameMap.get(sessionToken)
    return gameId ? this.games.get(gameId) : undefined
  }

  /**
   * 檢查遊戲是否存在
   *
   * @param gameId 遊戲 ID
   * @returns 是否存在
   */
  has(gameId: string): boolean {
    return this.games.has(gameId)
  }

  /**
   * 取得所有活躍遊戲
   *
   * @returns 遊戲狀態列表
   */
  getAll(): GameState[] {
    return Array.from(this.games.values())
  }

  /**
   * 取得活躍遊戲數量
   *
   * @returns 遊戲數量
   */
  getCount(): number {
    return this.games.size
  }

  /**
   * 取得等待中的遊戲（用於配對）
   *
   * @returns 等待中的遊戲列表
   */
  getWaitingGames(): GameState[] {
    return Array.from(this.games.values()).filter((game) => game.status === 'WAITING')
  }

  /**
   * 查找等待中的遊戲（用於配對）
   *
   * 返回最早建立的等待中遊戲。
   *
   * @returns 等待中的遊戲（若存在）
   */
  findWaitingGame(): GameState | undefined {
    const waiting = this.getWaitingGames()
    // 按建立時間排序，返回最早的
    if (waiting.length === 0) {
      return undefined
    }
    return waiting.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0]
  }

  /**
   * 為玩家新增 session 映射
   *
   * 用於第二位玩家加入遊戲時，建立其 session token 到 game 的映射。
   *
   * @param sessionToken - 玩家的 session token
   * @param gameId - 遊戲 ID
   * @param playerId - 玩家 ID
   */
  addPlayerSession(sessionToken: string, gameId: string, playerId: string): void {
    this.sessionGameMap.set(sessionToken, gameId)
    this.playerGameMap.set(playerId, gameId)
    console.log(`[InMemoryGameStore] Added session ${sessionToken} for player ${playerId} in game ${gameId}`)
  }

  /**
   * 清除所有遊戲（用於測試）
   */
  clear(): void {
    this.games.clear()
    this.playerGameMap.clear()
    this.sessionGameMap.clear()
    console.log('[InMemoryGameStore] Cleared all games')
  }

  /**
   * 清除過期遊戲
   *
   * @param maxAgeMs 最大存活時間（毫秒）
   * @returns 清除的遊戲數量
   */
  cleanupExpired(maxAgeMs: number): number {
    const now = Date.now()
    let cleaned = 0

    for (const [gameId, game] of this.games.entries()) {
      const age = now - game.updatedAt.getTime()
      if (age > maxAgeMs && game.status !== 'IN_PROGRESS') {
        this.delete(gameId)
        cleaned++
      }
    }

    if (cleaned > 0) {
      console.log(`[InMemoryGameStore] Cleaned up ${cleaned} expired games`)
    }

    return cleaned
  }
}

/**
 * 記憶體遊戲儲存單例
 */
export const inMemoryGameStore = new InMemoryGameStore()
