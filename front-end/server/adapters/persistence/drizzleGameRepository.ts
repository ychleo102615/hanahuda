/**
 * DrizzleGameRepository - Adapter Layer
 *
 * @description
 * 實作 GameRepositoryPort，將 Domain Game 持久化到 PostgreSQL。
 * 使用 Drizzle ORM 進行資料庫操作。
 *
 * @module server/adapters/persistence/drizzleGameRepository
 */

import { eq } from 'drizzle-orm'
import type { Game, GameStatus } from '~~/server/domain/game/game'
import { getDefaultRuleset } from '~~/server/domain/game/game'
import type { Player } from '~~/server/domain/game/player'
import type { GameRepositoryPort } from '~~/server/application/ports/output/gameRepositoryPort'
import { db } from '~~/server/utils/db'
import { games, sessions, type NewGame } from '~~/server/database/schema'
import { gameConfig } from '~~/server/utils/config'

/**
 * DrizzleGameRepository
 *
 * 實作 GameRepositoryPort，處理 Domain ↔ DB 轉換
 */
export class DrizzleGameRepository implements GameRepositoryPort {
  /**
   * 儲存遊戲
   *
   * 將 Domain Game 轉換為 DB Record 並儲存
   */
  async save(game: Game): Promise<void> {
    const dbRecord = this.toDbRecord(game)

    // Upsert: 如果存在則更新，否則插入
    await db
      .insert(games)
      .values(dbRecord)
      .onConflictDoUpdate({
        target: games.id,
        set: {
          player2Id: dbRecord.player2Id,
          player2Name: dbRecord.player2Name,
          isPlayer2Ai: dbRecord.isPlayer2Ai,
          status: dbRecord.status,
          roundsPlayed: dbRecord.roundsPlayed,
          cumulativeScores: dbRecord.cumulativeScores,
          updatedAt: new Date(),
        },
      })

    // 注意：Session 的建立由 UseCase 層透過 saveSession() 明確控制
    // 不在此處自動建立，避免重複插入
  }

  /**
   * 透過 ID 查找遊戲
   */
  async findById(gameId: string): Promise<Game | null> {
    const results = await db.select().from(games).where(eq(games.id, gameId)).limit(1)
    const record = results[0]

    if (!record) {
      return null
    }

    return this.toDomainModel(record)
  }

  /**
   * 透過會話 Token 查找遊戲
   */
  async findBySessionToken(sessionToken: string): Promise<Game | null> {
    const results = await db.select().from(games).where(eq(games.sessionToken, sessionToken)).limit(1)
    const record = results[0]

    if (!record) {
      return null
    }

    return this.toDomainModel(record)
  }

  /**
   * 透過玩家 ID 查找遊戲
   */
  async findByPlayerId(playerId: string): Promise<Game | null> {
    // 查找 player1 或 player2 符合的遊戲
    const results = await db
      .select()
      .from(games)
      .where(eq(games.player1Id, playerId))
      .limit(1)

    const record1 = results[0]
    if (record1) {
      return this.toDomainModel(record1)
    }

    // 如果 player1 沒找到，嘗試 player2
    const results2 = await db
      .select()
      .from(games)
      .where(eq(games.player2Id, playerId))
      .limit(1)

    const record2 = results2[0]
    if (record2) {
      return this.toDomainModel(record2)
    }

    return null
  }

  /**
   * 更新遊戲狀態
   */
  async updateStatus(gameId: string, status: GameStatus): Promise<void> {
    await db.update(games).set({ status, updatedAt: new Date() }).where(eq(games.id, gameId))
  }

  /**
   * 刪除遊戲
   */
  async delete(gameId: string): Promise<void> {
    // Sessions 會因為 CASCADE 被自動刪除
    await db.delete(games).where(eq(games.id, gameId))
  }

  /**
   * 查找等待中的遊戲（用於配對）
   *
   * 返回最早建立的等待中遊戲。
   */
  async findWaitingGame(): Promise<Game | null> {
    const results = await db
      .select()
      .from(games)
      .where(eq(games.status, 'WAITING'))
      .orderBy(games.createdAt)
      .limit(1)

    const record = results[0]
    return record ? this.toDomainModel(record) : null
  }

  /**
   * 儲存玩家會話
   *
   * 為玩家建立獨立的 session_token。
   */
  async saveSession(gameId: string, playerId: string, sessionToken: string): Promise<void> {
    const expiresAt = new Date(Date.now() + gameConfig.session_timeout_ms)

    await db.insert(sessions).values({
      token: sessionToken,
      gameId,
      playerId,
      connectedAt: new Date(),
      lastActivityAt: new Date(),
      expiresAt,
    })

    console.log(`[DrizzleGameRepository] Saved session ${sessionToken} for player ${playerId} in game ${gameId}`)
  }

  /**
   * Domain Game → DB Record 轉換
   */
  private toDbRecord(game: Game): NewGame {
    const player1 = game.players[0]
    const player2 = game.players[1]

    if (!player1) {
      throw new Error('Game must have at least one player')
    }

    return {
      id: game.id,
      sessionToken: game.sessionToken,
      player1Id: player1.id,
      player1Name: player1.name,
      player2Id: player2?.id ?? null,
      player2Name: player2?.name ?? null,
      isPlayer2Ai: player2?.isAi ?? true,
      status: game.status,
      totalRounds: game.totalRounds,
      roundsPlayed: game.roundsPlayed,
      cumulativeScores: [...game.cumulativeScores],
      createdAt: game.createdAt,
      updatedAt: game.updatedAt,
    }
  }

  /**
   * DB Record → Domain Game 轉換
   *
   * 注意：此轉換無法還原完整的 Domain Game（如 currentRound），
   * 因為 DB 只儲存基本遊戲資訊。完整狀態由記憶體 Store 管理。
   */
  private toDomainModel(record: typeof games.$inferSelect): Game {
    // 建立 players 陣列
    const players: Player[] = [
      {
        id: record.player1Id,
        name: record.player1Name,
        isAi: false, // player1 一定是人類
      },
    ]

    if (record.player2Id && record.player2Name) {
      players.push({
        id: record.player2Id,
        name: record.player2Name,
        isAi: record.isPlayer2Ai,
      })
    }

    // 使用預設 ruleset，但覆寫 total_rounds 以匹配 DB 記錄
    const baseRuleset = getDefaultRuleset()
    const ruleset = Object.freeze({
      ...baseRuleset,
      total_rounds: record.totalRounds,
    })

    return Object.freeze({
      id: record.id,
      sessionToken: record.sessionToken,
      players: Object.freeze(players),
      ruleset,
      cumulativeScores: Object.freeze(record.cumulativeScores ?? []),
      roundsPlayed: record.roundsPlayed,
      totalRounds: record.totalRounds,
      currentRound: null, // DB 不儲存 currentRound，由記憶體 Store 管理
      status: record.status,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    })
  }
}

/**
 * DrizzleGameRepository 單例
 */
export const gameRepository = new DrizzleGameRepository()
