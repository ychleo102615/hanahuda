/**
 * MatchResult Unit Tests
 */

import { describe, it, expect } from 'vitest'
import { MatchResult } from '~~/server/matchmaking/domain/matchResult'

describe('MatchResult', () => {
  describe('create', () => {
    it('should create a match result with valid input', () => {
      const result = MatchResult.create({
        player1Id: 'player-1',
        player2Id: 'player-2',
        roomType: 'STANDARD',
        matchType: 'HUMAN',
      })

      expect(result.player1Id).toBe('player-1')
      expect(result.player2Id).toBe('player-2')
      expect(result.roomType).toBe('STANDARD')
      expect(result.matchType).toBe('HUMAN')
      expect(result.matchedAt).toBeInstanceOf(Date)
    })

    it('should use provided matchedAt date', () => {
      const customDate = new Date('2026-01-01T12:00:00Z')
      const result = MatchResult.create({
        player1Id: 'player-1',
        player2Id: 'player-2',
        roomType: 'STANDARD',
        matchType: 'HUMAN',
        matchedAt: customDate,
      })

      expect(result.matchedAt).toEqual(customDate)
    })

    it('should throw error if player1Id is empty', () => {
      expect(() =>
        MatchResult.create({
          player1Id: '',
          player2Id: 'player-2',
          roomType: 'STANDARD',
          matchType: 'HUMAN',
        })
      ).toThrow('Player 1 ID is required')
    })

    it('should throw error if player2Id is empty', () => {
      expect(() =>
        MatchResult.create({
          player1Id: 'player-1',
          player2Id: '',
          roomType: 'STANDARD',
          matchType: 'HUMAN',
        })
      ).toThrow('Player 2 ID is required')
    })

    it('should throw error if both players are the same', () => {
      expect(() =>
        MatchResult.create({
          player1Id: 'player-1',
          player2Id: 'player-1',
          roomType: 'STANDARD',
          matchType: 'HUMAN',
        })
      ).toThrow('Player 1 and Player 2 cannot be the same')
    })
  })

  describe('createHumanMatch', () => {
    it('should create a human match result', () => {
      const result = MatchResult.createHumanMatch('player-1', 'player-2', 'QUICK')

      expect(result.matchType).toBe('HUMAN')
      expect(result.player1Id).toBe('player-1')
      expect(result.player2Id).toBe('player-2')
      expect(result.roomType).toBe('QUICK')
    })
  })

  describe('createBotMatch', () => {
    it('should create a bot match result with BOT_PLAYER_ID', () => {
      const result = MatchResult.createBotMatch('player-1', 'MARATHON')

      expect(result.matchType).toBe('BOT')
      expect(result.player1Id).toBe('player-1')
      expect(result.player2Id).toBe('BOT')
      expect(result.roomType).toBe('MARATHON')
    })
  })

  describe('isHumanMatch and isBotMatch', () => {
    it('should identify human match correctly', () => {
      const humanMatch = MatchResult.createHumanMatch('p1', 'p2', 'STANDARD')
      const botMatch = MatchResult.createBotMatch('p1', 'STANDARD')

      expect(humanMatch.isHumanMatch()).toBe(true)
      expect(humanMatch.isBotMatch()).toBe(false)
      expect(botMatch.isHumanMatch()).toBe(false)
      expect(botMatch.isBotMatch()).toBe(true)
    })
  })

  describe('includesPlayer', () => {
    it('should return true for player1', () => {
      const result = MatchResult.createHumanMatch('player-1', 'player-2', 'STANDARD')
      expect(result.includesPlayer('player-1')).toBe(true)
    })

    it('should return true for player2', () => {
      const result = MatchResult.createHumanMatch('player-1', 'player-2', 'STANDARD')
      expect(result.includesPlayer('player-2')).toBe(true)
    })

    it('should return false for non-participant', () => {
      const result = MatchResult.createHumanMatch('player-1', 'player-2', 'STANDARD')
      expect(result.includesPlayer('player-3')).toBe(false)
    })
  })

  describe('getOpponentId', () => {
    it('should return player2 for player1', () => {
      const result = MatchResult.createHumanMatch('player-1', 'player-2', 'STANDARD')
      expect(result.getOpponentId('player-1')).toBe('player-2')
    })

    it('should return player1 for player2', () => {
      const result = MatchResult.createHumanMatch('player-1', 'player-2', 'STANDARD')
      expect(result.getOpponentId('player-2')).toBe('player-1')
    })

    it('should return undefined for non-participant', () => {
      const result = MatchResult.createHumanMatch('player-1', 'player-2', 'STANDARD')
      expect(result.getOpponentId('player-3')).toBeUndefined()
    })
  })
})
