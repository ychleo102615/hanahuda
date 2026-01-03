/**
 * Session Store Port
 *
 * @description
 * Session 儲存的 Output Port 介面。
 * 由 Adapter Layer 實作（In-Memory 或 DB-backed）。
 *
 * 參考: specs/010-player-account/plan.md - Application Layer
 */

import type { Session, SessionId } from '../../../domain/types/session'
import type { PlayerId } from '../../../domain/player/player'

/**
 * Session Store Port
 *
 * 定義 Session 儲存操作的介面
 */
export abstract class SessionStorePort {
  /**
   * 儲存新的 Session
   */
  abstract save(session: Session): Promise<Session>

  /**
   * 根據 ID 查詢 Session
   */
  abstract findById(id: SessionId): Promise<Session | null>

  /**
   * 刪除 Session
   */
  abstract delete(id: SessionId): Promise<void>

  /**
   * 刪除指定玩家的所有 Sessions
   */
  abstract deleteByPlayerId(playerId: PlayerId): Promise<void>

  /**
   * 刷新 Session（更新 lastAccessedAt 和 expiresAt）
   */
  abstract refresh(session: Session): Promise<Session>
}
