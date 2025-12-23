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
} from '~~/server/application/ports/output/gameLogRepositoryPort'
import { db } from '~~/server/utils/db'
import { gameLogs, type GameLog } from '~~/server/database/schema'
import { loggers } from '~~/server/utils/logger'

/** Module logger instance */
const logger = loggers.adapter('DrizzleGameLogRepository')

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
   * @param entry - 遊戲日誌條目
   */
  logAsync(entry: GameLogEntry): void {
    // Fire-and-forget: 不等待 Promise，讓遊戲流程繼續
    this.writeLog(entry).catch((error) => {
      // 錯誤隔離：僅記錄錯誤，不向外傳播
      logger.error('Failed to write game log', error, {
        gameId: entry.gameId,
        eventType: entry.eventType,
      })
    })
  }

  /**
   * 實際執行日誌寫入
   *
   * @param entry - 遊戲日誌條目
   */
  private async writeLog(entry: GameLogEntry): Promise<void> {
    const startTime = Date.now()

    await db.insert(gameLogs).values({
      gameId: entry.gameId,
      playerId: entry.playerId ?? null,
      eventType: entry.eventType,
      payload: entry.payload,
    })

    const duration = Date.now() - startTime

    // 效能監控：如果寫入超過 10ms，記錄警告
    if (duration > 10) {
      logger.warn('Slow game log write', {
        gameId: entry.gameId,
        eventType: entry.eventType,
        durationMs: duration,
      })
    }
  }

  /**
   * 查詢指定遊戲的所有日誌
   *
   * @param gameId - 遊戲 ID
   * @returns 按時間排序的日誌列表
   */
  async findByGameId(gameId: string): Promise<readonly GameLog[]> {
    const results = await db
      .select()
      .from(gameLogs)
      .where(eq(gameLogs.gameId, gameId))
      .orderBy(asc(gameLogs.createdAt))

    return results
  }
}

/**
 * DrizzleGameLogRepository 單例
 */
export const gameLogRepository = new DrizzleGameLogRepository()
