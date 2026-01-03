/**
 * GameLogRepositoryPort - Output Port
 *
 * @description
 * Application Layer 定義的遊戲日誌儲存介面，由 Adapter Layer 實作。
 * 符合 Clean Architecture 的依賴反轉原則。
 *
 * 設計為 Fire-and-Forget 模式，日誌寫入不應阻塞遊戲操作。
 *
 * @module server/application/ports/output/gameLogRepositoryPort
 */

import type { GameLog, GameLogEventType } from '~~/server/database/schema/gameLogs'

/**
 * 遊戲日誌條目輸入
 */
export interface GameLogEntry {
  /** 遊戲 ID */
  readonly gameId: string

  /** 觸發事件的玩家 ID (系統事件為 undefined) */
  readonly playerId?: string

  /** 事件類型 */
  readonly eventType: GameLogEventType

  /** 事件參數 */
  readonly payload: Readonly<Record<string, unknown>>
}

/**
 * 遊戲日誌儲存庫介面
 *
 * Application Layer 透過此介面記錄遊戲事件，
 * 不需要知道具體的實作細節（PostgreSQL、記憶體等）。
 */
export interface GameLogRepositoryPort {
  /**
   * 非同步記錄遊戲事件（Fire-and-Forget）
   *
   * @description
   * 非阻塞式寫入，即使寫入失敗也不應影響遊戲流程。
   * 實作必須捕獲並記錄所有錯誤，不可向外傳播。
   *
   * @param entry - 遊戲日誌條目
   */
  logAsync(entry: GameLogEntry): void

  /**
   * 查詢指定遊戲的所有日誌
   *
   * @param gameId - 遊戲 ID
   * @returns 按時間排序的日誌列表
   */
  findByGameId(gameId: string): Promise<readonly GameLog[]>
}
