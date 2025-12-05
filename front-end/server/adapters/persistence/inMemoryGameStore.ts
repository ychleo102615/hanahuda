/**
 * In-Memory Game Store
 *
 * @description
 * 使用 Map 儲存活躍遊戲狀態。
 * 用於快速存取遊戲狀態，避免每次都查詢資料庫。
 *
 * 參考: specs/008-nuxt-backend-server/data-model.md#Memory-State-Management
 */

import type { PlayerScore, Ruleset, KoiStatus, FlowState, CardPlay } from '#shared/contracts'

/**
 * 玩家實體（簡化版，完整版在 Domain Layer）
 */
export interface PlayerEntity {
  readonly id: string
  readonly name: string
  readonly isAi: boolean
}

/**
 * 玩家局內狀態
 */
export interface PlayerRoundState {
  readonly playerId: string
  readonly hand: string[]
  readonly depository: string[]
}

/**
 * 等待選擇的配對資訊
 */
export interface PendingSelection {
  readonly drawnCard: string
  readonly possibleTargets: readonly string[]
  readonly handCardPlay: CardPlay
}

/**
 * 局狀態
 */
export interface RoundState {
  readonly dealerId: string
  readonly field: string[]
  readonly deck: string[]
  readonly playerStates: PlayerRoundState[]
  readonly flowState: FlowState
  readonly activePlayerId: string
  readonly koiStatuses: KoiStatus[]
  readonly pendingSelection: PendingSelection | null
}

/**
 * 遊戲狀態
 */
export type GameStatus = 'WAITING' | 'IN_PROGRESS' | 'FINISHED'

/**
 * 遊戲聚合根狀態（記憶體中的完整遊戲狀態）
 */
export interface GameState {
  readonly id: string
  readonly sessionToken: string
  readonly players: PlayerEntity[]
  readonly ruleset: Ruleset
  readonly cumulativeScores: PlayerScore[]
  readonly roundsPlayed: number
  readonly totalRounds: number
  readonly currentRound: RoundState | null
  readonly status: GameStatus
  readonly createdAt: Date
  readonly updatedAt: Date
}

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
