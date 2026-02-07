/**
 * InMemoryPrivateRoomStore Unit Tests
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  InMemoryPrivateRoomStore,
} from '~~/server/matchmaking/adapters/persistence/inMemoryPrivateRoomStore'
import { PrivateRoom } from '~~/server/matchmaking/domain/privateRoom'

describe('InMemoryPrivateRoomStore', () => {
  let store: InMemoryPrivateRoomStore

  beforeEach(() => {
    store = new InMemoryPrivateRoomStore()
  })

  function createRoom(overrides?: Partial<{ hostId: string; hostName: string }>) {
    return PrivateRoom.create({
      hostId: overrides?.hostId ?? 'host-1',
      hostName: overrides?.hostName ?? 'HostPlayer',
      roomType: 'STANDARD',
    })
  }

  describe('save and findByRoomId', () => {
    it('should save and find room by roomId', async () => {
      const room = createRoom()
      await store.save(room)

      const found = await store.findByRoomId(room.roomId)
      expect(found).toBeDefined()
      expect(found!.id).toBe(room.id)
      expect(found!.roomId).toBe(room.roomId)
    })

    it('should return undefined for unknown roomId', async () => {
      const found = await store.findByRoomId('XXXXXX')
      expect(found).toBeUndefined()
    })
  })

  describe('findById', () => {
    it('should find room by internal id', async () => {
      const room = createRoom()
      await store.save(room)

      const found = await store.findById(room.id)
      expect(found).toBeDefined()
      expect(found!.id).toBe(room.id)
    })

    it('should return undefined for unknown id', async () => {
      const found = await store.findById('unknown-uuid')
      expect(found).toBeUndefined()
    })
  })

  describe('findByPlayerId', () => {
    it('should find room by host playerId', async () => {
      const room = createRoom({ hostId: 'player-A' })
      await store.save(room)

      const found = await store.findByPlayerId('player-A')
      expect(found).toBeDefined()
      expect(found!.hostId).toBe('player-A')
    })

    it('should find room by guest playerId', async () => {
      const room = createRoom({ hostId: 'host-1' })
      room.join('guest-1', 'GuestPlayer')
      await store.save(room)

      const found = await store.findByPlayerId('guest-1')
      expect(found).toBeDefined()
      expect(found!.guestId).toBe('guest-1')
    })

    it('should return undefined for unknown playerId', async () => {
      const room = createRoom()
      await store.save(room)

      const found = await store.findByPlayerId('unknown-player')
      expect(found).toBeUndefined()
    })

    it('should only return active rooms (not EXPIRED)', async () => {
      const room = createRoom({ hostId: 'player-A' })
      room.expire()
      await store.save(room)

      const found = await store.findByPlayerId('player-A')
      expect(found).toBeUndefined()
    })

    it('should only return active rooms (not DISSOLVED)', async () => {
      const room = createRoom({ hostId: 'player-A' })
      room.dissolve()
      await store.save(room)

      const found = await store.findByPlayerId('player-A')
      expect(found).toBeUndefined()
    })

    it('should return IN_GAME rooms (still active)', async () => {
      const room = createRoom({ hostId: 'player-A' })
      room.join('guest-1', 'GuestPlayer')
      room.startGame('game-1')
      await store.save(room)

      const found = await store.findByPlayerId('player-A')
      expect(found).toBeDefined()
      expect(found!.status).toBe('IN_GAME')
    })
  })

  describe('delete', () => {
    it('should delete room and clean up indexes', async () => {
      const room = createRoom()
      await store.save(room)

      await store.delete(room.id)

      expect(await store.findById(room.id)).toBeUndefined()
      expect(await store.findByRoomId(room.roomId)).toBeUndefined()
    })

    it('should not throw when deleting non-existent room', async () => {
      await expect(store.delete('non-existent')).resolves.not.toThrow()
    })
  })

  describe('findAllWaiting', () => {
    it('should return only WAITING rooms', async () => {
      const room1 = createRoom({ hostId: 'host-1' })
      const room2 = createRoom({ hostId: 'host-2' })
      room2.join('guest-2', 'GuestPlayer')
      const room3 = createRoom({ hostId: 'host-3' })

      await store.save(room1)
      await store.save(room2)
      await store.save(room3)

      const waiting = await store.findAllWaiting()
      expect(waiting).toHaveLength(2)
      expect(waiting.map(r => r.hostId)).toContain('host-1')
      expect(waiting.map(r => r.hostId)).toContain('host-3')
    })

    it('should return empty array when no WAITING rooms', async () => {
      const room = createRoom()
      room.expire()
      await store.save(room)

      const waiting = await store.findAllWaiting()
      expect(waiting).toHaveLength(0)
    })
  })

  describe('findAllFull', () => {
    it('should return only FULL rooms', async () => {
      const room1 = createRoom({ hostId: 'host-1' })
      const room2 = createRoom({ hostId: 'host-2' })
      room2.join('guest-2', 'GuestPlayer')

      await store.save(room1)
      await store.save(room2)

      const full = await store.findAllFull()
      expect(full).toHaveLength(1)
      expect(full[0]!.hostId).toBe('host-2')
    })
  })

  describe('save updates', () => {
    it('should update existing room on re-save', async () => {
      const room = createRoom()
      await store.save(room)

      room.join('guest-1', 'GuestPlayer')
      await store.save(room)

      const found = await store.findByRoomId(room.roomId)
      expect(found!.status).toBe('FULL')
      expect(found!.guestId).toBe('guest-1')
    })
  })
})
