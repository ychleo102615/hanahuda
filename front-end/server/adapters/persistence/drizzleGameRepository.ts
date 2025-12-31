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
import { randomUUID } from 'node:crypto'
import type { Game, GameStatus } from '~~/server/domain/game/game'
import { getDefaultRuleset } from '~~/server/domain/game/game'
import type { Player } from '~~/server/domain/game/player'
import { AI_PLAYER_DEFAULT_NAME } from '~~/server/domain/game/player'
import type { PlayerScore } from '#shared/contracts'
import type { GameRepositoryPort } from '~~/server/application/ports/output/gameRepositoryPort'
import { db } from '~~/server/utils/db'
import { games, type NewGame } from '~~/server/database/schema'

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
          isPlayer2Ai: dbRecord.isPlayer2Ai,
          status: dbRecord.status,
          roundsPlayed: dbRecord.roundsPlayed,
          player1Score: dbRecord.player1Score,
          player2Score: dbRecord.player2Score,
          updatedAt: new Date(),
        },
      })
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
   * Domain Game → DB Record 轉換
   */
  private toDbRecord(game: Game): NewGame {
    const player1 = game.players[0]
    const player2 = game.players[1]

    if (!player1) {
      throw new Error('Game must have at least one player')
    }

    // 從 cumulativeScores 提取分數
    const player1Score = game.cumulativeScores.find(
      s => s.player_id === player1.id
    )?.score ?? 0
    const player2Score = game.cumulativeScores.find(
      s => s.player_id === player2?.id
    )?.score ?? 0

    return {
      id: game.id,
      player1Id: player1.id,
      player2Id: player2?.id ?? null,
      isPlayer2Ai: player2?.isAi ?? true,
      status: game.status,
      totalRounds: game.totalRounds,
      roundsPlayed: game.roundsPlayed,
      player1Score,
      player2Score,
      createdAt: game.createdAt,
      updatedAt: game.updatedAt,
    }
  }

  /**
   * DB Record → Domain Game 轉換
   *
   * 注意：此轉換無法還原完整的 Domain Game（如 currentRound），
   * 因為 DB 只儲存基本遊戲資訊。完整狀態由記憶體 Store 管理。
   *
   * sessionToken 和 player names 使用臨時/預設值，
   * 因為這些資訊不再儲存於 DB。
   */
  private toDomainModel(record: typeof games.$inferSelect): Game {
    // 建立 players 陣列（使用預設名稱）
    const players: Player[] = [
      {
        id: record.player1Id,
        name: 'Player',
        isAi: false, // player1 一定是人類
      },
    ]

    if (record.player2Id) {
      players.push({
        id: record.player2Id,
        name: record.isPlayer2Ai ? AI_PLAYER_DEFAULT_NAME : 'Player 2',
        isAi: record.isPlayer2Ai,
      })
    }

    // 從兩個 score 欄位重建 cumulativeScores
    const cumulativeScores: PlayerScore[] = [
      { player_id: record.player1Id, score: record.player1Score },
    ]
    if (record.player2Id) {
      cumulativeScores.push({
        player_id: record.player2Id,
        score: record.player2Score,
      })
    }

    // 使用預設 ruleset，但覆寫 total_rounds 以匹配 DB 記錄
    const baseRuleset = getDefaultRuleset()
    const ruleset = Object.freeze({
      ...baseRuleset,
      total_rounds: record.totalRounds,
    })

    // 初始化玩家連線狀態（從 DB 恢復時預設為 CONNECTED）
    const playerConnectionStatuses = players.map(p => ({
      player_id: p.id,
      status: 'CONNECTED' as const,
    }))

    return Object.freeze({
      id: record.id,
      sessionToken: randomUUID(), // 臨時 sessionToken（DB 不再儲存）
      players: Object.freeze(players),
      ruleset,
      cumulativeScores: Object.freeze(cumulativeScores),
      roundsPlayed: record.roundsPlayed,
      totalRounds: record.totalRounds,
      currentRound: null, // DB 不儲存 currentRound，由記憶體 Store 管理
      status: record.status,
      playerConnectionStatuses: Object.freeze(playerConnectionStatuses),
      pendingContinueConfirmations: Object.freeze([]),
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    })
  }
}

/**
 * DrizzleGameRepository 單例
 */
export const gameRepository = new DrizzleGameRepository()
