/**
 * In-Memory Private Room Store
 *
 * @description
 * PrivateRoomRepositoryPort 的記憶體實作。
 * 使用 Map 儲存房間，並維護索引以加速查詢。
 *
 * @module server/matchmaking/adapters/persistence/inMemoryPrivateRoomStore
 */

import { PrivateRoom } from '../../domain/privateRoom'
import { PrivateRoomRepositoryPort } from '../../application/ports/output/privateRoomRepositoryPort'

/**
 * InMemoryPrivateRoomStore
 */
export class InMemoryPrivateRoomStore extends PrivateRoomRepositoryPort {
  /** 主儲存：id → PrivateRoom */
  private rooms = new Map<string, PrivateRoom>()
  /** 索引：roomId → id */
  private roomIdIndex = new Map<string, string>()

  async save(room: PrivateRoom): Promise<void> {
    this.rooms.set(room.id, room)
    this.roomIdIndex.set(room.roomId, room.id)
  }

  async findByRoomId(roomId: string): Promise<PrivateRoom | undefined> {
    const id = this.roomIdIndex.get(roomId)
    if (!id) return undefined
    return this.rooms.get(id)
  }

  async findById(id: string): Promise<PrivateRoom | undefined> {
    return this.rooms.get(id)
  }

  async findByPlayerId(playerId: string): Promise<PrivateRoom | undefined> {
    for (const room of this.rooms.values()) {
      if (room.isActive() && room.hasPlayer(playerId)) {
        return room
      }
    }
    return undefined
  }

  async delete(id: string): Promise<void> {
    const room = this.rooms.get(id)
    if (room) {
      this.roomIdIndex.delete(room.roomId)
      this.rooms.delete(id)
    }
  }

  async findAllWaiting(): Promise<PrivateRoom[]> {
    const result: PrivateRoom[] = []
    for (const room of this.rooms.values()) {
      if (room.status === 'WAITING') {
        result.push(room)
      }
    }
    return result
  }

  async findAllFull(): Promise<PrivateRoom[]> {
    const result: PrivateRoom[] = []
    for (const room of this.rooms.values()) {
      if (room.status === 'FULL') {
        result.push(room)
      }
    }
    return result
  }
}

// =============================================================================
// Singleton
// =============================================================================

let instance: InMemoryPrivateRoomStore | null = null

/**
 * 取得 InMemoryPrivateRoomStore 單例
 */
export function getInMemoryPrivateRoomStore(): InMemoryPrivateRoomStore {
  if (!instance) {
    instance = new InMemoryPrivateRoomStore()
  }
  return instance
}

/**
 * 重置 InMemoryPrivateRoomStore（僅用於測試）
 */
export function resetInMemoryPrivateRoomStore(): void {
  instance = null
}
