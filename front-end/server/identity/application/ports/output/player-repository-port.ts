/**
 * Player Repository Port
 *
 * @description
 * Player 持久化的 Output Port 介面。
 * 由 Adapter Layer 實作。
 *
 * 參考: specs/010-player-account/plan.md - Application Layer
 */

import type { Player, PlayerId } from '../../../domain/player/player'

/**
 * Player Repository Port
 *
 * 定義 Player 持久化操作的介面
 */
export abstract class PlayerRepositoryPort {
  /**
   * 儲存新的 Player
   */
  abstract save(player: Player): Promise<Player>

  /**
   * 根據 ID 查詢 Player
   */
  abstract findById(id: PlayerId): Promise<Player | null>

  /**
   * 根據顯示名稱查詢 Player
   */
  abstract findByDisplayName(displayName: string): Promise<Player | null>

  /**
   * 更新 Player
   */
  abstract update(player: Player): Promise<Player>

  /**
   * 刪除 Player
   */
  abstract delete(id: PlayerId): Promise<void>

  /**
   * 刪除長時間未活躍的訪客 (FR-010a)
   *
   * @param inactiveDays - 未活躍天數閾值
   * @returns 被刪除的訪客數量
   */
  abstract deleteInactiveGuests(inactiveDays: number): Promise<number>

  /**
   * 硬刪除無任何遊戲記錄的訪客
   *
   * @description
   * 刪除已軟刪除且在 game_logs 中沒有任何記錄的訪客。
   * 這些訪客資料沒有保留價值，可以永久刪除以節省儲存空間。
   *
   * @returns 被刪除的訪客數量
   */
  abstract hardDeleteGuestsWithoutGameLogs(): Promise<number>
}
