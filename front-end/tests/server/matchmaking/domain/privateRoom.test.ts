/**
 * PrivateRoom Aggregate Root Unit Tests
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { PrivateRoom } from '~~/server/matchmaking/domain/privateRoom'

describe('PrivateRoom', () => {
  describe('create', () => {
    it('should create a new room with WAITING status', () => {
      const room = PrivateRoom.create({
        hostId: 'host-1',
        hostName: 'HostPlayer',
        roomType: 'STANDARD',
      })

      expect(room.hostId).toBe('host-1')
      expect(room.hostName).toBe('HostPlayer')
      expect(room.roomType).toBe('STANDARD')
      expect(room.status).toBe('WAITING')
      expect(room.guestId).toBeNull()
      expect(room.guestName).toBeNull()
      expect(room.gameId).toBeNull()
    })

    it('should generate a 6-character room ID from custom alphabet', () => {
      const room = PrivateRoom.create({
        hostId: 'host-1',
        hostName: 'HostPlayer',
        roomType: 'STANDARD',
      })

      expect(room.roomId).toHaveLength(6)
      // 不包含混淆字元: 0, O, 1, I, l
      expect(room.roomId).toMatch(/^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$/)
    })

    it('should generate a UUID as internal id', () => {
      const room = PrivateRoom.create({
        hostId: 'host-1',
        hostName: 'HostPlayer',
        roomType: 'STANDARD',
      })

      // UUID format
      expect(room.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
    })

    it('should set expiresAt to createdAt + 10 minutes', () => {
      const createdAt = new Date('2026-01-01T12:00:00Z')
      const room = PrivateRoom.create({
        hostId: 'host-1',
        hostName: 'HostPlayer',
        roomType: 'STANDARD',
        createdAt,
      })

      expect(room.createdAt).toEqual(createdAt)
      const expectedExpiry = new Date('2026-01-01T12:10:00Z')
      expect(room.expiresAt).toEqual(expectedExpiry)
    })

    it('should throw error if hostId is empty', () => {
      expect(() =>
        PrivateRoom.create({
          hostId: '',
          hostName: 'HostPlayer',
          roomType: 'STANDARD',
        })
      ).toThrow('Host ID is required')
    })

    it('should throw error if hostName is empty', () => {
      expect(() =>
        PrivateRoom.create({
          hostId: 'host-1',
          hostName: '',
          roomType: 'STANDARD',
        })
      ).toThrow('Host name is required')
    })

    it('should generate unique room IDs', () => {
      const room1 = PrivateRoom.create({
        hostId: 'host-1',
        hostName: 'HostPlayer',
        roomType: 'STANDARD',
      })
      const room2 = PrivateRoom.create({
        hostId: 'host-2',
        hostName: 'HostPlayer2',
        roomType: 'STANDARD',
      })

      expect(room1.roomId).not.toBe(room2.roomId)
      expect(room1.id).not.toBe(room2.id)
    })
  })

  describe('reconstitute', () => {
    it('should reconstitute room from props', () => {
      const room = PrivateRoom.reconstitute({
        id: 'uuid-1',
        roomId: 'ABC123',
        hostId: 'host-1',
        hostName: 'HostPlayer',
        roomType: 'MARATHON',
        createdAt: new Date('2026-01-01T12:00:00Z'),
        expiresAt: new Date('2026-01-01T12:10:00Z'),
        status: 'FULL',
        guestId: 'guest-1',
        guestName: 'GuestPlayer',
        gameId: null,
      })

      expect(room.id).toBe('uuid-1')
      expect(room.roomId).toBe('ABC123')
      expect(room.status).toBe('FULL')
      expect(room.guestId).toBe('guest-1')
    })
  })

  describe('join', () => {
    let room: PrivateRoom

    beforeEach(() => {
      room = PrivateRoom.create({
        hostId: 'host-1',
        hostName: 'HostPlayer',
        roomType: 'STANDARD',
      })
    })

    it('should transition from WAITING to FULL', () => {
      room.join('guest-1', 'GuestPlayer')

      expect(room.status).toBe('FULL')
      expect(room.guestId).toBe('guest-1')
      expect(room.guestName).toBe('GuestPlayer')
    })

    it('should throw error if room is not WAITING', () => {
      room.join('guest-1', 'GuestPlayer')

      expect(() => room.join('guest-2', 'GuestPlayer2'))
        .toThrow('Cannot join room in status: FULL')
    })

    it('should throw error if guestId is empty', () => {
      expect(() => room.join('', 'GuestPlayer'))
        .toThrow('Guest ID is required')
    })

    it('should throw error if guestName is empty', () => {
      expect(() => room.join('guest-1', ''))
        .toThrow('Guest name is required')
    })

    it('should throw error if guest is host (cannot join own room)', () => {
      expect(() => room.join('host-1', 'HostPlayer'))
        .toThrow('Cannot join own room')
    })
  })

  describe('startGame', () => {
    let room: PrivateRoom

    beforeEach(() => {
      room = PrivateRoom.create({
        hostId: 'host-1',
        hostName: 'HostPlayer',
        roomType: 'STANDARD',
      })
      room.join('guest-1', 'GuestPlayer')
    })

    it('should transition from FULL to IN_GAME', () => {
      room.startGame('game-123')

      expect(room.status).toBe('IN_GAME')
      expect(room.gameId).toBe('game-123')
    })

    it('should throw error if room is not FULL', () => {
      const waitingRoom = PrivateRoom.create({
        hostId: 'host-2',
        hostName: 'Host2',
        roomType: 'STANDARD',
      })

      expect(() => waitingRoom.startGame('game-123'))
        .toThrow('Cannot start game in status: WAITING')
    })

    it('should throw error if gameId is empty', () => {
      expect(() => room.startGame(''))
        .toThrow('Game ID is required')
    })
  })

  describe('expire', () => {
    it('should transition from WAITING to EXPIRED', () => {
      const room = PrivateRoom.create({
        hostId: 'host-1',
        hostName: 'HostPlayer',
        roomType: 'STANDARD',
      })

      room.expire()
      expect(room.status).toBe('EXPIRED')
    })

    it('should transition from FULL to EXPIRED', () => {
      const room = PrivateRoom.create({
        hostId: 'host-1',
        hostName: 'HostPlayer',
        roomType: 'STANDARD',
      })
      room.join('guest-1', 'GuestPlayer')

      room.expire()
      expect(room.status).toBe('EXPIRED')
    })

    it('should throw error if room is IN_GAME', () => {
      const room = PrivateRoom.create({
        hostId: 'host-1',
        hostName: 'HostPlayer',
        roomType: 'STANDARD',
      })
      room.join('guest-1', 'GuestPlayer')
      room.startGame('game-1')

      expect(() => room.expire())
        .toThrow('Cannot expire room in status: IN_GAME')
    })

    it('should throw error if room is already EXPIRED', () => {
      const room = PrivateRoom.create({
        hostId: 'host-1',
        hostName: 'HostPlayer',
        roomType: 'STANDARD',
      })
      room.expire()

      expect(() => room.expire())
        .toThrow('Cannot expire room in status: EXPIRED')
    })
  })

  describe('dissolve', () => {
    it('should transition from WAITING to DISSOLVED', () => {
      const room = PrivateRoom.create({
        hostId: 'host-1',
        hostName: 'HostPlayer',
        roomType: 'STANDARD',
      })

      room.dissolve()
      expect(room.status).toBe('DISSOLVED')
    })

    it('should transition from FULL to DISSOLVED', () => {
      const room = PrivateRoom.create({
        hostId: 'host-1',
        hostName: 'HostPlayer',
        roomType: 'STANDARD',
      })
      room.join('guest-1', 'GuestPlayer')

      room.dissolve()
      expect(room.status).toBe('DISSOLVED')
    })

    it('should throw error if room is IN_GAME', () => {
      const room = PrivateRoom.create({
        hostId: 'host-1',
        hostName: 'HostPlayer',
        roomType: 'STANDARD',
      })
      room.join('guest-1', 'GuestPlayer')
      room.startGame('game-1')

      expect(() => room.dissolve())
        .toThrow('Cannot dissolve room in status: IN_GAME')
    })

    it('should throw error if room is already DISSOLVED', () => {
      const room = PrivateRoom.create({
        hostId: 'host-1',
        hostName: 'HostPlayer',
        roomType: 'STANDARD',
      })
      room.dissolve()

      expect(() => room.dissolve())
        .toThrow('Cannot dissolve room in status: DISSOLVED')
    })
  })

  describe('isActive', () => {
    it('should return true for WAITING', () => {
      const room = PrivateRoom.create({
        hostId: 'host-1',
        hostName: 'HostPlayer',
        roomType: 'STANDARD',
      })

      expect(room.isActive()).toBe(true)
    })

    it('should return true for FULL', () => {
      const room = PrivateRoom.create({
        hostId: 'host-1',
        hostName: 'HostPlayer',
        roomType: 'STANDARD',
      })
      room.join('guest-1', 'GuestPlayer')

      expect(room.isActive()).toBe(true)
    })

    it('should return true for IN_GAME', () => {
      const room = PrivateRoom.create({
        hostId: 'host-1',
        hostName: 'HostPlayer',
        roomType: 'STANDARD',
      })
      room.join('guest-1', 'GuestPlayer')
      room.startGame('game-1')

      expect(room.isActive()).toBe(true)
    })

    it('should return false for EXPIRED', () => {
      const room = PrivateRoom.create({
        hostId: 'host-1',
        hostName: 'HostPlayer',
        roomType: 'STANDARD',
      })
      room.expire()

      expect(room.isActive()).toBe(false)
    })

    it('should return false for DISSOLVED', () => {
      const room = PrivateRoom.create({
        hostId: 'host-1',
        hostName: 'HostPlayer',
        roomType: 'STANDARD',
      })
      room.dissolve()

      expect(room.isActive()).toBe(false)
    })
  })

  describe('hasPlayer', () => {
    it('should return true for host', () => {
      const room = PrivateRoom.create({
        hostId: 'host-1',
        hostName: 'HostPlayer',
        roomType: 'STANDARD',
      })

      expect(room.hasPlayer('host-1')).toBe(true)
    })

    it('should return true for guest', () => {
      const room = PrivateRoom.create({
        hostId: 'host-1',
        hostName: 'HostPlayer',
        roomType: 'STANDARD',
      })
      room.join('guest-1', 'GuestPlayer')

      expect(room.hasPlayer('guest-1')).toBe(true)
    })

    it('should return false for unknown player', () => {
      const room = PrivateRoom.create({
        hostId: 'host-1',
        hostName: 'HostPlayer',
        roomType: 'STANDARD',
      })

      expect(room.hasPlayer('unknown')).toBe(false)
    })
  })

  describe('isHost', () => {
    it('should return true for host', () => {
      const room = PrivateRoom.create({
        hostId: 'host-1',
        hostName: 'HostPlayer',
        roomType: 'STANDARD',
      })

      expect(room.isHost('host-1')).toBe(true)
    })

    it('should return false for guest', () => {
      const room = PrivateRoom.create({
        hostId: 'host-1',
        hostName: 'HostPlayer',
        roomType: 'STANDARD',
      })
      room.join('guest-1', 'GuestPlayer')

      expect(room.isHost('guest-1')).toBe(false)
    })
  })
})
