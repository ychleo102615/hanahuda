/**
 * Player Domain Model Tests
 *
 * @description
 * 測試 Player Aggregate Root 的建立與行為。
 *
 * 參考: specs/010-player-account/data-model.md#1.1-Player
 */

import { describe, it, expect } from 'vitest'
import {
  type Player,
  type PlayerId,
  createPlayer,
  createGuestPlayer,
  isValidPlayerId,
  isValidDisplayName,
  upgradeToRegistered,
} from '~~/server/identity/domain/player/player'

describe('Player Domain Model', () => {
  describe('PlayerId validation', () => {
    it('should accept valid UUID v4', () => {
      const validId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
      expect(isValidPlayerId(validId)).toBe(true)
    })

    it('should reject invalid UUID format', () => {
      expect(isValidPlayerId('not-a-uuid')).toBe(false)
      expect(isValidPlayerId('')).toBe(false)
      expect(isValidPlayerId('12345')).toBe(false)
    })
  })

  describe('DisplayName validation', () => {
    it('should accept valid display names (1-50 chars)', () => {
      expect(isValidDisplayName('Player1')).toBe(true)
      expect(isValidDisplayName('Guest_ABCD')).toBe(true)
      expect(isValidDisplayName('A')).toBe(true)
      expect(isValidDisplayName('A'.repeat(50))).toBe(true)
    })

    it('should reject empty display names', () => {
      expect(isValidDisplayName('')).toBe(false)
    })

    it('should reject display names exceeding 50 chars', () => {
      expect(isValidDisplayName('A'.repeat(51))).toBe(false)
    })
  })

  describe('createPlayer', () => {
    it('should create a registered player with valid inputs', () => {
      const id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479' as PlayerId
      const displayName = 'TestPlayer'
      const now = new Date()

      const player = createPlayer({
        id,
        displayName,
        isGuest: false,
        createdAt: now,
        updatedAt: now,
      })

      expect(player.id).toBe(id)
      expect(player.displayName).toBe(displayName)
      expect(player.isGuest).toBe(false)
      expect(player.createdAt).toEqual(now)
      expect(player.updatedAt).toEqual(now)
    })

    it('should throw error for invalid player id', () => {
      expect(() => createPlayer({
        id: 'invalid-id' as PlayerId,
        displayName: 'Test',
        isGuest: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      })).toThrow('Invalid player ID')
    })

    it('should throw error for invalid display name', () => {
      expect(() => createPlayer({
        id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' as PlayerId,
        displayName: '',
        isGuest: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      })).toThrow('Invalid display name')
    })
  })

  describe('createGuestPlayer', () => {
    it('should create a guest player with Guest_XXXX format name', () => {
      const guest = createGuestPlayer()

      expect(guest.isGuest).toBe(true)
      expect(guest.displayName).toMatch(/^Guest_[A-Z0-9]{4}$/)
      expect(isValidPlayerId(guest.id)).toBe(true)
    })

    it('should create unique guest players', () => {
      const guest1 = createGuestPlayer()
      const guest2 = createGuestPlayer()

      expect(guest1.id).not.toBe(guest2.id)
    })
  })

  describe('upgradeToRegistered', () => {
    it('should convert guest player to registered player', () => {
      const guest = createGuestPlayer()
      const newDisplayName = 'RegisteredUser'

      const registered = upgradeToRegistered(guest, newDisplayName)

      expect(registered.id).toBe(guest.id)
      expect(registered.displayName).toBe(newDisplayName)
      expect(registered.isGuest).toBe(false)
      expect(registered.createdAt).toEqual(guest.createdAt)
      expect(registered.updatedAt.getTime()).toBeGreaterThanOrEqual(guest.updatedAt.getTime())
    })

    it('should throw error when upgrading non-guest player', () => {
      const registered = createPlayer({
        id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' as PlayerId,
        displayName: 'AlreadyRegistered',
        isGuest: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      expect(() => upgradeToRegistered(registered, 'NewName'))
        .toThrow('Cannot upgrade non-guest player')
    })
  })
})
