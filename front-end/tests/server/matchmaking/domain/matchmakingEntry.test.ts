/**
 * MatchmakingEntry Unit Tests
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { MatchmakingEntry } from '~~/server/matchmaking/domain/matchmakingEntry'

describe('MatchmakingEntry', () => {
  describe('create', () => {
    it('should create a new entry with valid input', () => {
      const entry = MatchmakingEntry.create({
        id: 'entry-1',
        playerId: 'player-1',
        playerName: 'TestPlayer',
        roomType: 'STANDARD',
      })

      expect(entry.id).toBe('entry-1')
      expect(entry.playerId).toBe('player-1')
      expect(entry.playerName).toBe('TestPlayer')
      expect(entry.roomType).toBe('STANDARD')
      expect(entry.status).toBe('SEARCHING')
      expect(entry.enteredAt).toBeInstanceOf(Date)
    })

    it('should use provided enteredAt date', () => {
      const customDate = new Date('2026-01-01T12:00:00Z')
      const entry = MatchmakingEntry.create({
        id: 'entry-1',
        playerId: 'player-1',
        playerName: 'TestPlayer',
        roomType: 'STANDARD',
        enteredAt: customDate,
      })

      expect(entry.enteredAt).toEqual(customDate)
    })

    it('should throw error if id is empty', () => {
      expect(() =>
        MatchmakingEntry.create({
          id: '',
          playerId: 'player-1',
          playerName: 'TestPlayer',
          roomType: 'STANDARD',
        })
      ).toThrow('Entry ID is required')
    })

    it('should throw error if playerId is empty', () => {
      expect(() =>
        MatchmakingEntry.create({
          id: 'entry-1',
          playerId: '',
          playerName: 'TestPlayer',
          roomType: 'STANDARD',
        })
      ).toThrow('Player ID is required')
    })

    it('should throw error if playerName is empty', () => {
      expect(() =>
        MatchmakingEntry.create({
          id: 'entry-1',
          playerId: 'player-1',
          playerName: '',
          roomType: 'STANDARD',
        })
      ).toThrow('Player name is required')
    })

    it('should throw error if playerName exceeds 20 characters', () => {
      expect(() =>
        MatchmakingEntry.create({
          id: 'entry-1',
          playerId: 'player-1',
          playerName: 'A'.repeat(21),
          roomType: 'STANDARD',
        })
      ).toThrow('Player name must be 20 characters or less')
    })
  })

  describe('reconstitute', () => {
    it('should reconstitute entry from props', () => {
      const entry = MatchmakingEntry.reconstitute({
        id: 'entry-1',
        playerId: 'player-1',
        playerName: 'TestPlayer',
        roomType: 'MARATHON',
        status: 'LOW_AVAILABILITY',
        enteredAt: new Date('2026-01-01T12:00:00Z'),
      })

      expect(entry.id).toBe('entry-1')
      expect(entry.status).toBe('LOW_AVAILABILITY')
      expect(entry.roomType).toBe('MARATHON')
    })
  })

  describe('isSearching', () => {
    it('should return true for SEARCHING status', () => {
      const entry = MatchmakingEntry.create({
        id: 'entry-1',
        playerId: 'player-1',
        playerName: 'TestPlayer',
        roomType: 'STANDARD',
      })

      expect(entry.isSearching()).toBe(true)
    })

    it('should return true for LOW_AVAILABILITY status', () => {
      const entry = MatchmakingEntry.create({
        id: 'entry-1',
        playerId: 'player-1',
        playerName: 'TestPlayer',
        roomType: 'STANDARD',
      })
      entry.transitionToLowAvailability()

      expect(entry.isSearching()).toBe(true)
    })

    it('should return false for MATCHED status', () => {
      const entry = MatchmakingEntry.create({
        id: 'entry-1',
        playerId: 'player-1',
        playerName: 'TestPlayer',
        roomType: 'STANDARD',
      })
      entry.transitionToMatched()

      expect(entry.isSearching()).toBe(false)
    })
  })

  describe('getElapsedSeconds', () => {
    it('should calculate elapsed seconds correctly', () => {
      const enteredAt = new Date('2026-01-01T12:00:00Z')
      const now = new Date('2026-01-01T12:00:10Z')

      const entry = MatchmakingEntry.create({
        id: 'entry-1',
        playerId: 'player-1',
        playerName: 'TestPlayer',
        roomType: 'STANDARD',
        enteredAt,
      })

      expect(entry.getElapsedSeconds(now)).toBe(10)
    })
  })

  describe('state transitions', () => {
    let entry: MatchmakingEntry

    beforeEach(() => {
      entry = MatchmakingEntry.create({
        id: 'entry-1',
        playerId: 'player-1',
        playerName: 'TestPlayer',
        roomType: 'STANDARD',
      })
    })

    it('should transition from SEARCHING to LOW_AVAILABILITY', () => {
      entry.transitionToLowAvailability()
      expect(entry.status).toBe('LOW_AVAILABILITY')
    })

    it('should transition from SEARCHING to MATCHED', () => {
      entry.transitionToMatched()
      expect(entry.status).toBe('MATCHED')
    })

    it('should transition from LOW_AVAILABILITY to MATCHED', () => {
      entry.transitionToLowAvailability()
      entry.transitionToMatched()
      expect(entry.status).toBe('MATCHED')
    })

    it('should transition from SEARCHING to CANCELLED', () => {
      entry.transitionToCancelled()
      expect(entry.status).toBe('CANCELLED')
    })

    it('should throw error when transitioning from MATCHED to any state', () => {
      entry.transitionToMatched()
      expect(() => entry.transitionToLowAvailability()).toThrow(
        'Cannot transition to LOW_AVAILABILITY from status: MATCHED'
      )
    })

    it('should throw error when transitioning from CANCELLED to any state', () => {
      entry.transitionToCancelled()
      expect(() => entry.transitionToMatched()).toThrow(
        'Cannot transition to MATCHED from status: CANCELLED'
      )
    })
  })
})
