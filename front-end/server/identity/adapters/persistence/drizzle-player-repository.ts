/**
 * DrizzlePlayerRepository
 *
 * @description
 * Player Repository 的 Drizzle ORM 實作。
 *
 * 參考: specs/010-player-account/plan.md - Adapter Layer
 */

import { eq, and, lt, isNull } from 'drizzle-orm'
import { PlayerRepositoryPort } from '../../application/ports/output/player-repository-port'
import { players, type NewPlayer } from '~~/server/database/schema'
import type { Player, PlayerId } from '../../domain/player/player'

/**
 * 將資料庫記錄轉換為 Domain Player
 */
function toDomainPlayer(record: typeof players.$inferSelect): Player {
  return {
    id: record.id as PlayerId,
    displayName: record.displayName,
    isGuest: record.isGuest,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  }
}

/**
 * 將 Domain Player 轉換為資料庫記錄格式
 */
function toDbRecord(player: Player): NewPlayer {
  return {
    id: player.id,
    displayName: player.displayName,
    isGuest: player.isGuest,
    createdAt: player.createdAt,
    updatedAt: player.updatedAt,
  }
}

/**
 * Drizzle ORM 實作的 Player Repository
 */
export class DrizzlePlayerRepository extends PlayerRepositoryPort {
  constructor(private readonly db: typeof import('~~/server/utils/db').db) {
    super()
  }

  async save(player: Player): Promise<Player> {
    const [inserted] = await this.db
      .insert(players)
      .values(toDbRecord(player))
      .returning()

    if (!inserted) {
      throw new Error('Failed to insert player')
    }

    return toDomainPlayer(inserted)
  }

  async findById(id: PlayerId): Promise<Player | null> {
    const [record] = await this.db
      .select()
      .from(players)
      .where(
        and(
          eq(players.id, id),
          isNull(players.deletedAt),
        ),
      )
      .limit(1)

    return record ? toDomainPlayer(record) : null
  }

  async findByDisplayName(displayName: string): Promise<Player | null> {
    const [record] = await this.db
      .select()
      .from(players)
      .where(
        and(
          eq(players.displayName, displayName),
          isNull(players.deletedAt),
        ),
      )
      .limit(1)

    return record ? toDomainPlayer(record) : null
  }

  async update(player: Player): Promise<Player> {
    const [updated] = await this.db
      .update(players)
      .set({
        displayName: player.displayName,
        isGuest: player.isGuest,
        updatedAt: player.updatedAt,
      })
      .where(eq(players.id, player.id))
      .returning()

    if (!updated) {
      throw new Error('Failed to update player')
    }

    return toDomainPlayer(updated)
  }

  async delete(id: PlayerId): Promise<void> {
    // 軟刪除：設定 deletedAt 時間戳
    await this.db
      .update(players)
      .set({ deletedAt: new Date() })
      .where(eq(players.id, id))
  }

  async deleteInactiveGuests(inactiveDays: number): Promise<number> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - inactiveDays)

    // 軟刪除：設定 deletedAt 時間戳
    const deleted = await this.db
      .update(players)
      .set({ deletedAt: new Date() })
      .where(
        and(
          eq(players.isGuest, true),
          lt(players.updatedAt, cutoffDate),
          isNull(players.deletedAt),
        ),
      )
      .returning({ id: players.id })

    return deleted.length
  }
}
