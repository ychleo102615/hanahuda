/**
 * DrizzleGameLogRepository - Adapter Layer
 *
 * @description
 * 實作 GameLogRepositoryPort，將遊戲日誌持久化到 PostgreSQL。
 * 使用 Drizzle ORM 進行資料庫操作。
 *
 * 關鍵設計：
 * - Fire-and-Forget 模式：logAsync 不阻塞遊戲操作
 * - 錯誤隔離：日誌寫入失敗不影響遊戲流程
 * - 非同步批次寫入（未來優化方向）
 *
 * @module server/adapters/persistence/drizzleGameLogRepository
 */

import { eq, asc } from 'drizzle-orm'
import type {
  GameLogRepositoryPort,
  GameLogEntry,
} from '~~/server/core-game/application/ports/output/gameLogRepositoryPort'
import { db } from '~~/server/utils/db'
import { gameLogs, type GameLog } from '~~/server/database/schema'

/**
 * 應用層序號計數器
 *
 * @description
 * 單調遞增，保證 Fire-and-Forget 模式下的寫入順序。
 * 序號在 logAsync 調用時產生（非 DB 寫入時），確保調用順序 = 邏輯順序。
 */
let sequenceCounter = 0

/**
 * DrizzleGameLogRepository
 *
 * 實作 GameLogRepositoryPort，處理遊戲日誌的持久化操作。
 */
export class DrizzleGameLogRepository implements GameLogRepositoryPort {
  /**
   * 非同步記錄遊戲事件（Fire-and-Forget）
   *
   * @description
   * 非阻塞式寫入，即使寫入失敗也不影響遊戲流程。
   * 所有錯誤都會被捕獲並記錄，不會向外傳播。
   *
   * 序號在此處產生（非 DB 寫入時），確保調用順序 = 邏輯順序。
   *
   * @param entry - 遊戲日誌條目
   */
  logAsync(entry: GameLogEntry): void {
    // 在調用時產生序號，保證順序
    const sequenceNumber = ++sequenceCounter

    // Fire-and-forget: 不等待 Promise，讓遊戲流程繼續
    this.writeLog(entry, sequenceNumber).catch(() => {
      // 錯誤隔離：僅忽略錯誤，不向外傳播
    })
  }

  /**
   * 實際執行日誌寫入
   *
   * @param entry - 遊戲日誌條目
   * @param sequenceNumber - 應用層序號
   */
  private async writeLog(entry: GameLogEntry, sequenceNumber: number): Promise<void> {
    await db.insert(gameLogs).values({
      sequenceNumber,
      gameId: entry.gameId,
      playerId: entry.playerId ?? null,
      eventType: entry.eventType,
      payload: entry.payload,
    })
  }

  /**
   * 查詢指定遊戲的所有日誌
   *
   * @param gameId - 遊戲 ID
   * @returns 按序號排序的日誌列表（保證邏輯順序）
   */
  async findByGameId(gameId: string): Promise<readonly GameLog[]> {
    const results = await db
      .select()
      .from(gameLogs)
      .where(eq(gameLogs.gameId, gameId))
      .orderBy(asc(gameLogs.sequenceNumber))

    return results
  }
}

/**
 * DrizzleGameLogRepository 單例
 */
export const gameLogRepository = new DrizzleGameLogRepository()
