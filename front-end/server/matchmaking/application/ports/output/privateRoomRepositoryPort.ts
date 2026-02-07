/**
 * PrivateRoom Repository Port
 *
 * @description
 * 私房儲存庫的抽象介面。
 * 由 InMemoryPrivateRoomStore (Adapter 層) 實作。
 *
 * @module server/matchmaking/application/ports/output/privateRoomRepositoryPort
 */

import type { PrivateRoom } from '../../../domain/privateRoom'

/**
 * PrivateRoom Repository Port
 */
export abstract class PrivateRoomRepositoryPort {
  /** 儲存房間 */
  abstract save(room: PrivateRoom): Promise<void>

  /** 依 Room ID 查詢 (6 位英數字元) */
  abstract findByRoomId(roomId: string): Promise<PrivateRoom | undefined>

  /** 依內部 ID 查詢 (UUID) */
  abstract findById(id: string): Promise<PrivateRoom | undefined>

  /** 依玩家 ID 查詢活躍房間 (房主或訪客) */
  abstract findByPlayerId(playerId: string): Promise<PrivateRoom | undefined>

  /** 刪除房間 */
  abstract delete(id: string): Promise<void>

  /** 取得所有等待中的房間 */
  abstract findAllWaiting(): Promise<PrivateRoom[]>

  /** 取得所有滿人的房間 */
  abstract findAllFull(): Promise<PrivateRoom[]>
}
