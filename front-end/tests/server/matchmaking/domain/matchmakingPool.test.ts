/**
 * MatchmakingPool Unit Tests
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { MatchmakingPool } from '~~/server/matchmaking/domain/matchmakingPool'
import { MatchmakingEntry } from '~~/server/matchmaking/domain/matchmakingEntry'

describe('MatchmakingPool', () => {
  let pool: MatchmakingPool

  beforeEach(() => {
    pool = new MatchmakingPool()
  })

  function createEntry(overrides: Partial<Parameters<typeof MatchmakingEntry.create>[0]> = {}) {
    return MatchmakingEntry.create({
      id: `entry-${Math.random().toString(36).slice(2)}`,
      playerId: `player-${Math.random().toString(36).slice(2)}`,
      playerName: 'TestPlayer',
      roomType: 'STANDARD',
      ...overrides,
    })
  }

  describe('add', () => {
    it('should add entry to pool', () => {
      const entry = createEntry({ id: 'entry-1', playerId: 'player-1' })
      pool.add(entry)

      expect(pool.size).toBe(1)
      expect(pool.findByPlayerId('player-1')).toBe(entry)
    })

    it('should throw error if player already in queue', () => {
      const entry1 = createEntry({ id: 'entry-1', playerId: 'player-1' })
      const entry2 = createEntry({ id: 'entry-2', playerId: 'player-1' })

      pool.add(entry1)

      expect(() => pool.add(entry2)).toThrow(
        'Player player-1 is already in the matchmaking queue'
      )
    })

    it('should group entries by room type', () => {
      const quickEntry = createEntry({ id: 'e1', playerId: 'p1', roomType: 'QUICK' })
      const standardEntry = createEntry({ id: 'e2', playerId: 'p2', roomType: 'STANDARD' })

      pool.add(quickEntry)
      pool.add(standardEntry)

      expect(pool.getByRoomType('QUICK')).toHaveLength(1)
      expect(pool.getByRoomType('STANDARD')).toHaveLength(1)
      expect(pool.getByRoomType('MARATHON')).toHaveLength(0)
    })
  })

  describe('remove', () => {
    it('should remove entry from pool', () => {
      const entry = createEntry({ id: 'entry-1', playerId: 'player-1' })
      pool.add(entry)

      const removed = pool.remove('entry-1')

      expect(removed).toBe(entry)
      expect(pool.size).toBe(0)
      expect(pool.findByPlayerId('player-1')).toBeUndefined()
    })

    it('should return undefined if entry not found', () => {
      const removed = pool.remove('non-existent')
      expect(removed).toBeUndefined()
    })
  })

  describe('findByPlayerId', () => {
    it('should find entry by player id', () => {
      const entry = createEntry({ id: 'entry-1', playerId: 'player-1' })
      pool.add(entry)

      expect(pool.findByPlayerId('player-1')).toBe(entry)
    })

    it('should return undefined if player not in pool', () => {
      expect(pool.findByPlayerId('non-existent')).toBeUndefined()
    })
  })

  describe('findById', () => {
    it('should find entry by id', () => {
      const entry = createEntry({ id: 'entry-1', playerId: 'player-1' })
      pool.add(entry)

      expect(pool.findById('entry-1')).toBe(entry)
    })

    it('should return undefined if entry not found', () => {
      expect(pool.findById('non-existent')).toBeUndefined()
    })
  })

  describe('findMatch (FIFO ordering)', () => {
    it('should find first available opponent in same room type', () => {
      const entry1 = createEntry({
        id: 'entry-1',
        playerId: 'player-1',
        roomType: 'STANDARD',
        enteredAt: new Date('2026-01-01T12:00:00Z'),
      })
      const entry2 = createEntry({
        id: 'entry-2',
        playerId: 'player-2',
        roomType: 'STANDARD',
        enteredAt: new Date('2026-01-01T12:00:05Z'),
      })

      pool.add(entry1)
      pool.add(entry2)

      // entry2 looking for match should find entry1 (FIFO - first in)
      const match = pool.findMatch(entry2)
      expect(match).toBe(entry1)
    })

    it('should return undefined if no match available', () => {
      const entry = createEntry({ id: 'entry-1', playerId: 'player-1' })
      pool.add(entry)

      expect(pool.findMatch(entry)).toBeUndefined()
    })

    it('should not match entries in different room types', () => {
      const quickEntry = createEntry({
        id: 'entry-1',
        playerId: 'player-1',
        roomType: 'QUICK',
      })
      const standardEntry = createEntry({
        id: 'entry-2',
        playerId: 'player-2',
        roomType: 'STANDARD',
      })

      pool.add(quickEntry)
      pool.add(standardEntry)

      expect(pool.findMatch(quickEntry)).toBeUndefined()
      expect(pool.findMatch(standardEntry)).toBeUndefined()
    })

    it('should not match with non-matchable entries', () => {
      const entry1 = createEntry({ id: 'entry-1', playerId: 'player-1', roomType: 'STANDARD' })
      const entry2 = createEntry({ id: 'entry-2', playerId: 'player-2', roomType: 'STANDARD' })

      pool.add(entry1)
      pool.add(entry2)

      // Mark entry1 as matched (not matchable)
      entry1.transitionToMatched()

      expect(pool.findMatch(entry2)).toBeUndefined()
    })

    it('should not match entry with itself', () => {
      const entry = createEntry({ id: 'entry-1', playerId: 'player-1' })
      pool.add(entry)

      expect(pool.findMatch(entry)).toBeUndefined()
    })
  })

  describe('room type segregation', () => {
    it('should keep entries segregated by room type', () => {
      const quickEntries = [
        createEntry({ id: 'q1', playerId: 'p1', roomType: 'QUICK' }),
        createEntry({ id: 'q2', playerId: 'p2', roomType: 'QUICK' }),
      ]
      const standardEntries = [
        createEntry({ id: 's1', playerId: 'p3', roomType: 'STANDARD' }),
        createEntry({ id: 's2', playerId: 'p4', roomType: 'STANDARD' }),
      ]
      const marathonEntries = [
        createEntry({ id: 'm1', playerId: 'p5', roomType: 'MARATHON' }),
      ]

      quickEntries.forEach((e) => pool.add(e))
      standardEntries.forEach((e) => pool.add(e))
      marathonEntries.forEach((e) => pool.add(e))

      expect(pool.getByRoomType('QUICK')).toHaveLength(2)
      expect(pool.getByRoomType('STANDARD')).toHaveLength(2)
      expect(pool.getByRoomType('MARATHON')).toHaveLength(1)
      expect(pool.size).toBe(5)
    })

    it('should not match players with different room types', () => {
      const quickPlayer = createEntry({ id: 'q1', playerId: 'p1', roomType: 'QUICK' })
      const standardPlayer = createEntry({ id: 's1', playerId: 'p2', roomType: 'STANDARD' })

      pool.add(quickPlayer)
      pool.add(standardPlayer)

      // Quick player should not match with Standard player
      expect(pool.findMatch(quickPlayer)).toBeUndefined()
      expect(pool.findMatch(standardPlayer)).toBeUndefined()

      // Add another Quick player
      const quickPlayer2 = createEntry({ id: 'q2', playerId: 'p3', roomType: 'QUICK' })
      pool.add(quickPlayer2)

      // Now Quick players should match
      expect(pool.findMatch(quickPlayer)).toBe(quickPlayer2)
      expect(pool.findMatch(quickPlayer2)).toBe(quickPlayer)
    })
  })

  describe('updateStatus', () => {
    it('should update entry status', () => {
      const entry = createEntry({ id: 'entry-1', playerId: 'player-1' })
      pool.add(entry)

      pool.updateStatus('entry-1', 'LOW_AVAILABILITY')

      expect(entry.status).toBe('LOW_AVAILABILITY')
    })

    it('should throw error if entry not found', () => {
      expect(() => pool.updateStatus('non-existent', 'MATCHED')).toThrow(
        'Entry non-existent not found in matchmaking pool'
      )
    })
  })

  describe('hasPlayer', () => {
    it('should return true if player in pool', () => {
      const entry = createEntry({ id: 'entry-1', playerId: 'player-1' })
      pool.add(entry)

      expect(pool.hasPlayer('player-1')).toBe(true)
    })

    it('should return false if player not in pool', () => {
      expect(pool.hasPlayer('non-existent')).toBe(false)
    })
  })

  describe('getStatistics', () => {
    it('should return correct statistics', () => {
      pool.add(createEntry({ id: 'e1', playerId: 'p1', roomType: 'QUICK' }))
      pool.add(createEntry({ id: 'e2', playerId: 'p2', roomType: 'STANDARD' }))
      pool.add(createEntry({ id: 'e3', playerId: 'p3', roomType: 'STANDARD' }))

      const stats = pool.getStatistics()

      expect(stats.totalEntries).toBe(3)
      expect(stats.entriesByRoomType.QUICK).toBe(1)
      expect(stats.entriesByRoomType.STANDARD).toBe(2)
      expect(stats.entriesByRoomType.MARATHON).toBe(0)
      expect(stats.entriesByStatus.SEARCHING).toBe(3)
    })
  })

  describe('clear', () => {
    it('should clear all entries', () => {
      pool.add(createEntry({ id: 'e1', playerId: 'p1' }))
      pool.add(createEntry({ id: 'e2', playerId: 'p2' }))

      pool.clear()

      expect(pool.size).toBe(0)
      expect(pool.isEmpty).toBe(true)
    })
  })

  describe('getAll and getMatchableEntries', () => {
    it('should return all entries', () => {
      const entry1 = createEntry({ id: 'e1', playerId: 'p1', roomType: 'QUICK' })
      const entry2 = createEntry({ id: 'e2', playerId: 'p2', roomType: 'STANDARD' })

      pool.add(entry1)
      pool.add(entry2)

      const allEntries = pool.getAll()
      expect(allEntries).toHaveLength(2)
    })

    it('should return only matchable entries', () => {
      const entry1 = createEntry({ id: 'e1', playerId: 'p1' })
      const entry2 = createEntry({ id: 'e2', playerId: 'p2' })

      pool.add(entry1)
      pool.add(entry2)

      entry1.transitionToMatched()

      const matchable = pool.getMatchableEntries()
      expect(matchable).toHaveLength(1)
      expect(matchable[0]).toBe(entry2)
    })
  })
})
