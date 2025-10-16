import { describe, it, expect } from 'vitest'
import type { CardPlayedEvent } from '@shared/events/game/CardPlayedEvent'
import type { MatchSelectedEvent } from '@shared/events/game/MatchSelectedEvent'
import type { KoikoiDeclaredEvent } from '@shared/events/game/KoikoiDeclaredEvent'
import type { RoundEndedEvent } from '@shared/events/game/RoundEndedEvent'
import type { GameEndedEvent } from '@shared/events/game/GameEndedEvent'
import type { GameAbandonedEvent } from '@shared/events/game/GameAbandonedEvent'

/**
 * Event Size Validation Tests
 *
 * Validates that all non-initialization events are under 1KB in size.
 * This ensures efficient event transmission for future client-server architecture.
 */
describe('Integration Event Size Validation', () => {
  const MAX_EVENT_SIZE_BYTES = 1024 // 1KB

  /**
   * Helper function to calculate event size in bytes
   * Simulates JSON serialization size
   */
  function getEventSize(event: unknown): number {
    const json = JSON.stringify(event)
    return new Blob([json]).size
  }

  describe('CardPlayedEvent', () => {
    it('should be under 1KB with typical payload', () => {
      const event: CardPlayedEvent = {
        eventId: '123e4567-e89b-12d3-a456-426614174000',
        eventType: 'CardPlayed',
        timestamp: Date.now(),
        sequenceNumber: 10,
        playerId: 'player-1',
        playedCardId: '1-bright-0',
        handMatch: {
          sourceCardId: '1-bright-0',
          sourceType: 'hand',
          matchType: 'single_match',
          matchedFieldCardId: '1-animal-0',
          capturedCardIds: ['1-bright-0', '1-animal-0'],
          achievedYaku: [],
        },
        deckMatch: {
          sourceCardId: '2-ribbon-0',
          sourceType: 'deck',
          matchType: 'no_match',
          capturedCardIds: [],
          achievedYaku: [],
        },
        turnTransition: {
          previousPlayerId: 'player-1',
          currentPlayerId: 'player-2',
          reason: 'card_played',
        },
      }

      const size = getEventSize(event)
      expect(size).toBeLessThan(MAX_EVENT_SIZE_BYTES)
    })

    it('should be under 1KB with yaku achievement', () => {
      const event: CardPlayedEvent = {
        eventId: '123e4567-e89b-12d3-a456-426614174001',
        eventType: 'CardPlayed',
        timestamp: Date.now(),
        sequenceNumber: 15,
        playerId: 'player-1',
        playedCardId: '1-bright-0',
        handMatch: {
          sourceCardId: '1-bright-0',
          sourceType: 'hand',
          matchType: 'single_match',
          matchedFieldCardId: '1-animal-0',
          capturedCardIds: ['1-bright-0', '1-animal-0'],
          achievedYaku: [
            {
              yaku: 'GOKO',
              points: 10,
              cardIds: ['1-bright-0', '3-bright-0', '8-bright-0', '11-bright-0', '12-bright-0'],
            },
          ],
        },
        deckMatch: {
          sourceCardId: '2-ribbon-0',
          sourceType: 'deck',
          matchType: 'no_match',
          capturedCardIds: [],
          achievedYaku: [],
        },
        turnTransition: null, // Waiting for Koi-Koi decision
      }

      const size = getEventSize(event)
      expect(size).toBeLessThan(MAX_EVENT_SIZE_BYTES)
    })

    it('should be under 1KB with multiple matches scenario', () => {
      const event: CardPlayedEvent = {
        eventId: '123e4567-e89b-12d3-a456-426614174002',
        eventType: 'CardPlayed',
        timestamp: Date.now(),
        sequenceNumber: 20,
        playerId: 'player-1',
        playedCardId: '1-bright-0',
        handMatch: {
          sourceCardId: '1-bright-0',
          sourceType: 'hand',
          matchType: 'single_match',
          matchedFieldCardId: '1-animal-0',
          capturedCardIds: ['1-bright-0', '1-animal-0'],
          achievedYaku: [],
        },
        deckMatch: {
          sourceCardId: '2-ribbon-0',
          sourceType: 'deck',
          matchType: 'multiple_matches',
          capturedCardIds: [],
          selectableFieldCardIds: ['2-animal-0', '2-ribbon-1', '2-plain-0'],
          selectionTimeout: 10000,
          achievedYaku: [],
        },
        turnTransition: null, // Waiting for player selection
      }

      const size = getEventSize(event)
      expect(size).toBeLessThan(MAX_EVENT_SIZE_BYTES)
    })
  })

  describe('MatchSelectedEvent', () => {
    it('should be under 1KB with typical payload', () => {
      const event: MatchSelectedEvent = {
        eventId: '123e4567-e89b-12d3-a456-426614174003',
        eventType: 'MatchSelected',
        timestamp: Date.now(),
        sequenceNumber: 21,
        playerId: 'player-1',
        sourceCardId: '2-ribbon-0',
        selectedFieldCardId: '2-animal-0',
        autoSelected: false,
        capturedCardIds: ['2-ribbon-0', '2-animal-0'],
        achievedYaku: [
          {
            yaku: 'TANE',
            points: 1,
            cardIds: ['2-animal-0', '4-animal-0', '5-animal-0', '6-animal-0', '7-animal-0'],
          },
        ],
        turnTransition: {
          previousPlayerId: 'player-1',
          currentPlayerId: 'player-2',
          reason: 'match_selected',
        },
      }

      const size = getEventSize(event)
      expect(size).toBeLessThan(MAX_EVENT_SIZE_BYTES)
    })

    it('should be under 1KB with auto-selection', () => {
      const event: MatchSelectedEvent = {
        eventId: '123e4567-e89b-12d3-a456-426614174004',
        eventType: 'MatchSelected',
        timestamp: Date.now(),
        sequenceNumber: 22,
        playerId: 'player-1',
        sourceCardId: '3-ribbon-0',
        selectedFieldCardId: '3-ribbon-1',
        autoSelected: true,
        capturedCardIds: ['3-ribbon-0', '3-ribbon-1'],
        turnTransition: {
          previousPlayerId: 'player-1',
          currentPlayerId: 'player-2',
          reason: 'match_selected',
        },
      }

      const size = getEventSize(event)
      expect(size).toBeLessThan(MAX_EVENT_SIZE_BYTES)
    })
  })

  describe('KoikoiDeclaredEvent', () => {
    it('should be under 1KB when player declares Koi-Koi', () => {
      const event: KoikoiDeclaredEvent = {
        eventId: '123e4567-e89b-12d3-a456-426614174005',
        eventType: 'KoikoiDeclared',
        timestamp: Date.now(),
        sequenceNumber: 25,
        playerId: 'player-1',
        continueGame: true,
        currentYaku: ['GOKO', 'TANE'],
        currentScore: 11,
        turnTransition: {
          previousPlayerId: 'player-1',
          currentPlayerId: 'player-2',
          reason: 'koikoi_declared',
        },
      }

      const size = getEventSize(event)
      expect(size).toBeLessThan(MAX_EVENT_SIZE_BYTES)
    })

    it('should be under 1KB when player ends round', () => {
      const event: KoikoiDeclaredEvent = {
        eventId: '123e4567-e89b-12d3-a456-426614174006',
        eventType: 'KoikoiDeclared',
        timestamp: Date.now(),
        sequenceNumber: 26,
        playerId: 'player-1',
        continueGame: false,
        currentYaku: ['SANKO', 'AKA_TAN'],
        currentScore: 10,
        turnTransition: null, // Round ends
      }

      const size = getEventSize(event)
      expect(size).toBeLessThan(MAX_EVENT_SIZE_BYTES)
    })
  })

  describe('RoundEndedEvent', () => {
    it('should be under 1KB with typical round result', () => {
      const event: RoundEndedEvent = {
        eventId: '123e4567-e89b-12d3-a456-426614174007',
        eventType: 'RoundEnded',
        timestamp: Date.now(),
        sequenceNumber: 30,
        winnerId: 'player-1',
        roundResult: {
          round: 1,
          playerResults: [
            {
              playerId: 'player-1',
              yakuResults: [
                {
                  yaku: 'GOKO',
                  points: 10,
                  cardIds: ['1-bright-0', '3-bright-0', '8-bright-0', '11-bright-0', '12-bright-0'],
                },
                {
                  yaku: 'TANE',
                  points: 1,
                  cardIds: ['2-animal-0', '4-animal-0', '5-animal-0', '6-animal-0', '7-animal-0'],
                },
              ],
              baseScore: 11,
              multiplier: 2,
              finalScore: 22,
            },
            {
              playerId: 'player-2',
              yakuResults: [],
              baseScore: 0,
              multiplier: 1,
              finalScore: 0,
            },
          ],
          koikoiDeclared: true,
          koikoiPlayerId: 'player-1',
        },
      }

      const size = getEventSize(event)
      expect(size).toBeLessThan(MAX_EVENT_SIZE_BYTES)
    })
  })

  describe('GameEndedEvent', () => {
    it('should be under 1KB with game completion', () => {
      const event: GameEndedEvent = {
        eventId: '123e4567-e89b-12d3-a456-426614174008',
        eventType: 'GameEnded',
        timestamp: Date.now(),
        sequenceNumber: 100,
        winnerId: 'player-1',
        reason: 'all_rounds_completed',
        finalResult: {
          playerFinalScores: [
            {
              playerId: 'player-1',
              totalScore: 150,
              roundsWon: 8,
            },
            {
              playerId: 'player-2',
              totalScore: 95,
              roundsWon: 4,
            },
          ],
          roundsPlayed: 12,
        },
      }

      const size = getEventSize(event)
      expect(size).toBeLessThan(MAX_EVENT_SIZE_BYTES)
    })
  })

  describe('GameAbandonedEvent', () => {
    it('should be under 1KB', () => {
      const event: GameAbandonedEvent = {
        eventId: '123e4567-e89b-12d3-a456-426614174009',
        eventType: 'GameAbandoned',
        timestamp: Date.now(),
        sequenceNumber: 50,
        abandonedPlayerId: 'player-2',
        winnerId: 'player-1',
        currentRound: 5,
        phase: 'playing',
      }

      const size = getEventSize(event)
      expect(size).toBeLessThan(MAX_EVENT_SIZE_BYTES)
    })
  })

  describe('Event Size Summary', () => {
    it('should report sizes of all event types', () => {
      const events = {
        CardPlayedEvent: {
          eventId: '123e4567-e89b-12d3-a456-426614174000',
          eventType: 'CardPlayed',
          timestamp: Date.now(),
          sequenceNumber: 10,
          playerId: 'player-1',
          playedCardId: '1-bright-0',
          handMatch: {
            sourceCardId: '1-bright-0',
            sourceType: 'hand',
            matchType: 'single_match',
            matchedFieldCardId: '1-animal-0',
            capturedCardIds: ['1-bright-0', '1-animal-0'],
            achievedYaku: [
              {
                yaku: 'GOKO',
                points: 10,
                cardIds: ['1-bright-0', '3-bright-0', '8-bright-0', '11-bright-0', '12-bright-0'],
              },
            ],
          },
          deckMatch: {
            sourceCardId: '2-ribbon-0',
            sourceType: 'deck',
            matchType: 'no_match',
            capturedCardIds: [],
            achievedYaku: [],
          },
          turnTransition: {
            previousPlayerId: 'player-1',
            currentPlayerId: 'player-2',
            reason: 'card_played',
          },
        },
        MatchSelectedEvent: {
          eventId: '123e4567-e89b-12d3-a456-426614174003',
          eventType: 'MatchSelected',
          timestamp: Date.now(),
          sequenceNumber: 21,
          playerId: 'player-1',
          sourceCardId: '2-ribbon-0',
          selectedFieldCardId: '2-animal-0',
          autoSelected: false,
          capturedCardIds: ['2-ribbon-0', '2-animal-0'],
          achievedYaku: [
            {
              yaku: 'TANE',
              points: 1,
              cardIds: ['2-animal-0', '4-animal-0', '5-animal-0', '6-animal-0', '7-animal-0'],
            },
          ],
          turnTransition: {
            previousPlayerId: 'player-1',
            currentPlayerId: 'player-2',
            reason: 'match_selected',
          },
        },
        KoikoiDeclaredEvent: {
          eventId: '123e4567-e89b-12d3-a456-426614174005',
          eventType: 'KoikoiDeclared',
          timestamp: Date.now(),
          sequenceNumber: 25,
          playerId: 'player-1',
          continueGame: true,
          currentYaku: ['GOKO', 'TANE', 'AKA_TAN'],
          currentScore: 16,
          turnTransition: {
            previousPlayerId: 'player-1',
            currentPlayerId: 'player-2',
            reason: 'koikoi_declared',
          },
        },
        RoundEndedEvent: {
          eventId: '123e4567-e89b-12d3-a456-426614174007',
          eventType: 'RoundEnded',
          timestamp: Date.now(),
          sequenceNumber: 30,
          winnerId: 'player-1',
          roundResult: {
            round: 1,
            playerResults: [
              {
                playerId: 'player-1',
                yakuResults: [
                  {
                    yaku: 'GOKO',
                    points: 10,
                    cardIds: ['1-bright-0', '3-bright-0', '8-bright-0', '11-bright-0', '12-bright-0'],
                  },
                  {
                    yaku: 'TANE',
                    points: 1,
                    cardIds: ['2-animal-0', '4-animal-0', '5-animal-0', '6-animal-0', '7-animal-0'],
                  },
                ],
                baseScore: 11,
                multiplier: 2,
                finalScore: 22,
              },
              {
                playerId: 'player-2',
                yakuResults: [],
                baseScore: 0,
                multiplier: 1,
                finalScore: 0,
              },
            ],
            koikoiDeclared: true,
            koikoiPlayerId: 'player-1',
          },
        },
        GameEndedEvent: {
          eventId: '123e4567-e89b-12d3-a456-426614174008',
          eventType: 'GameEnded',
          timestamp: Date.now(),
          sequenceNumber: 100,
          winnerId: 'player-1',
          reason: 'all_rounds_completed',
          finalResult: {
            playerFinalScores: [
              {
                playerId: 'player-1',
                totalScore: 150,
                roundsWon: 8,
              },
              {
                playerId: 'player-2',
                totalScore: 95,
                roundsWon: 4,
              },
            ],
            roundsPlayed: 12,
          },
        },
        GameAbandonedEvent: {
          eventId: '123e4567-e89b-12d3-a456-426614174009',
          eventType: 'GameAbandoned',
          timestamp: Date.now(),
          sequenceNumber: 50,
          abandonedPlayerId: 'player-2',
          winnerId: 'player-1',
          currentRound: 5,
          phase: 'playing',
        },
      }

      const sizes = Object.entries(events).map(([name, event]) => ({
        name,
        size: getEventSize(event),
        percentage: (getEventSize(event) / MAX_EVENT_SIZE_BYTES) * 100,
      }))

      console.log('\n📊 Event Size Report:')
      console.log('═'.repeat(60))
      sizes.forEach(({ name, size, percentage }) => {
        const bar = '█'.repeat(Math.floor(percentage / 5))
        const status = size < MAX_EVENT_SIZE_BYTES ? '✓' : '✗'
        console.log(`${status} ${name.padEnd(25)} ${size.toString().padStart(4)} bytes (${percentage.toFixed(1)}%) ${bar}`)
      })
      console.log('═'.repeat(60))
      console.log(`Max allowed: ${MAX_EVENT_SIZE_BYTES} bytes (1KB)\n`)

      // All events should pass
      sizes.forEach(({ name, size }) => {
        expect(size, `${name} should be under 1KB`).toBeLessThan(MAX_EVENT_SIZE_BYTES)
      })
    })
  })
})
