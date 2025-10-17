import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { InMemoryEventBus } from '@/shared/events/base/EventBus'
import type { IntegrationEvent } from '@/shared/events/base/IntegrationEvent'
import type { GameInitializedEvent } from '@/shared/events/game/GameInitializedEvent'
import type { CardPlayedEvent } from '@/shared/events/game/CardPlayedEvent'
import type { MatchSelectedEvent } from '@/shared/events/game/MatchSelectedEvent'
import type { KoikoiDeclaredEvent } from '@/shared/events/game/KoikoiDeclaredEvent'
import type { RoundEndedEvent } from '@/shared/events/game/RoundEndedEvent'
import type { GameEndedEvent } from '@/shared/events/game/GameEndedEvent'
import type { GameAbandonedEvent } from '@/shared/events/game/GameAbandonedEvent'

/**
 * 整合事件結構測試
 *
 * 目的：驗證實際的事件實現符合契約定義
 *
 * 測試策略：
 * 1. 建立 EventBus 實例並測試事件發布訂閱機制
 * 2. 驗證各類型事件的結構包含所有必要欄位
 * 3. 驗證事件序號機制正確運作
 * 4. 驗證事件大小（非初始化事件 < 1KB）
 */

describe('Integration Events Structure Tests', () => {
  let eventBus: InMemoryEventBus
  let receivedEvents: IntegrationEvent[] = []

  beforeEach(async () => {
    eventBus = new InMemoryEventBus('test-bus')
    await eventBus.start()
    receivedEvents = []

    // 訂閱所有事件
    eventBus.subscribe('*', async (event) => {
      receivedEvents.push(event)
    })
  })

  afterEach(async () => {
    await eventBus.stop()
  })

  describe('Event Bus Mechanism', () => {
    it('應該正確分配事件序號', async () => {
      const event1: GameAbandonedEvent = {
        eventId: 'event-1',
        eventType: 'GameAbandoned',
        timestamp: Date.now(),
        sequenceNumber: eventBus.getNextSequenceNumber(),
        abandonedPlayerId: 'player1',
        winnerId: 'player2',
        currentRound: 1,
        phase: 'playing',
      }

      const event2: GameAbandonedEvent = {
        eventId: 'event-2',
        eventType: 'GameAbandoned',
        timestamp: Date.now(),
        sequenceNumber: eventBus.getNextSequenceNumber(),
        abandonedPlayerId: 'player1',
        winnerId: 'player2',
        currentRound: 1,
        phase: 'playing',
      }

      await eventBus.publishEvent(event1)
      await eventBus.publishEvent(event2)

      // 等待事件處理完成
      await new Promise((resolve) => setTimeout(resolve, 10))

      expect(receivedEvents).toHaveLength(2)
      expect(receivedEvents[0].sequenceNumber).toBe(1)
      expect(receivedEvents[1].sequenceNumber).toBe(2)
    })

    it('應該支援根據事件類型訂閱', async () => {
      let gameEndedCount = 0
      let gameAbandonedCount = 0

      eventBus.subscribe('GameEnded', async () => {
        gameEndedCount++
      })

      eventBus.subscribe('GameAbandoned', async () => {
        gameAbandonedCount++
      })

      const gameEndedEvent: GameEndedEvent = {
        eventId: 'event-1',
        eventType: 'GameEnded',
        timestamp: Date.now(),
        sequenceNumber: eventBus.getNextSequenceNumber(),
        winnerId: 'player1',
        reason: 'all_rounds_completed',
        finalResult: {
          playerFinalScores: [
            {
              playerId: 'player1',
              totalScore: 100,
              roundsWon: 3,
            },
            {
              playerId: 'player2',
              totalScore: 50,
              roundsWon: 0,
            },
          ],
          roundsPlayed: 3,
        },
      }

      const gameAbandonedEvent: GameAbandonedEvent = {
        eventId: 'event-2',
        eventType: 'GameAbandoned',
        timestamp: Date.now(),
        sequenceNumber: eventBus.getNextSequenceNumber(),
        abandonedPlayerId: 'player1',
        winnerId: 'player2',
        currentRound: 1,
        phase: 'playing',
      }

      await eventBus.publishEvent(gameEndedEvent)
      await eventBus.publishEvent(gameAbandonedEvent)

      // 等待事件處理完成
      await new Promise((resolve) => setTimeout(resolve, 10))

      expect(gameEndedCount).toBe(1)
      expect(gameAbandonedCount).toBe(1)
    })

    it('應該記錄事件歷史', async () => {
      const event: GameAbandonedEvent = {
        eventId: 'event-1',
        eventType: 'GameAbandoned',
        timestamp: Date.now(),
        sequenceNumber: eventBus.getNextSequenceNumber(),
        abandonedPlayerId: 'player1',
        winnerId: 'player2',
        currentRound: 1,
        phase: 'playing',
      }

      await eventBus.publishEvent(event)

      // 等待事件處理完成
      await new Promise((resolve) => setTimeout(resolve, 10))

      const history = eventBus.getEventHistory()
      expect(history.length).toBeGreaterThan(0)
      expect(history[0].eventType).toBe('GameAbandoned')
    })

    it('應該追蹤事件健康狀態', async () => {
      const event: GameAbandonedEvent = {
        eventId: 'event-1',
        eventType: 'GameAbandoned',
        timestamp: Date.now(),
        sequenceNumber: eventBus.getNextSequenceNumber(),
        abandonedPlayerId: 'player1',
        winnerId: 'player2',
        currentRound: 1,
        phase: 'playing',
      }

      await eventBus.publishEvent(event)

      // 等待事件處理完成
      await new Promise((resolve) => setTimeout(resolve, 10))

      const health = eventBus.getHealth()
      expect(health.isRunning).toBe(true)
      expect(health.eventsPublished).toBeGreaterThan(0)
      expect(health.eventsProcessed).toBeGreaterThan(0)
      expect(health.latency).toBeDefined()
      expect(health.latency.average).toBeLessThan(10) // < 10ms
    })
  })

  describe('Event Size Validation', () => {
    it('CardPlayedEvent 應該小於 1KB', () => {
      const event: CardPlayedEvent = {
        eventId: 'event-1',
        eventType: 'CardPlayed',
        timestamp: Date.now(),
        sequenceNumber: 1,
        playerId: 'player1',
        playedCardId: '1-bright-0',
        handMatch: {
          sourceCardId: '1-bright-0',
          sourceType: 'hand',
          matchType: 'single_match',
          matchedFieldCardId: '1-animal-0',
          capturedCardIds: ['1-bright-0', '1-animal-0'],
        },
        deckMatch: {
          sourceCardId: '1-ribbon-0',
          sourceType: 'deck',
          matchType: 'no_match',
        },
        turnTransition: {
          previousPlayerId: 'player1',
          currentPlayerId: 'player2',
          reason: 'card_played',
        },
      }

      const size = new Blob([JSON.stringify(event)]).size
      console.log(`CardPlayedEvent size: ${size} bytes`)
      expect(size).toBeLessThan(1024)
    })

    it('KoikoiDeclaredEvent 應該小於 1KB', () => {
      const event: KoikoiDeclaredEvent = {
        eventId: 'event-1',
        eventType: 'KoikoiDeclared',
        timestamp: Date.now(),
        sequenceNumber: 1,
        playerId: 'player1',
        declared: true,
        turnTransition: {
          previousPlayerId: 'player1',
          currentPlayerId: 'player2',
          reason: 'koikoi_declared',
        },
      }

      const size = new Blob([JSON.stringify(event)]).size
      console.log(`KoikoiDeclaredEvent size: ${size} bytes`)
      expect(size).toBeLessThan(1024)
    })

    it('RoundEndedEvent 應該小於 1KB', () => {
      const event: RoundEndedEvent = {
        eventId: 'event-1',
        eventType: 'RoundEnded',
        timestamp: Date.now(),
        sequenceNumber: 1,
        winnerId: 'player1',
        roundResult: {
          round: 1,
          playerResults: [
            {
              playerId: 'player1',
              yakuResults: [
                {
                  yaku: 'GOKO',
                  points: 15,
                  cardIds: ['1-bright-0', '3-bright-0', '8-bright-0', '11-bright-0', '12-bright-0'],
                },
              ],
              baseScore: 15,
              multiplier: 1,
              finalScore: 15,
            },
            {
              playerId: 'player2',
              yakuResults: [],
              baseScore: 0,
              multiplier: 1,
              finalScore: 0,
            },
          ],
          koikoiDeclared: false,
          koikoiPlayerId: null,
        },
      }

      const size = new Blob([JSON.stringify(event)]).size
      console.log(`RoundEndedEvent size: ${size} bytes`)
      expect(size).toBeLessThan(1024)
    })

    it('GameEndedEvent 應該小於 1KB', () => {
      const event: GameEndedEvent = {
        eventId: 'event-1',
        eventType: 'GameEnded',
        timestamp: Date.now(),
        sequenceNumber: 1,
        winnerId: 'player1',
        reason: 'all_rounds_completed',
        finalResult: {
          playerFinalScores: [
            {
              playerId: 'player1',
              totalScore: 100,
              roundsWon: 3,
            },
            {
              playerId: 'player2',
              totalScore: 50,
              roundsWon: 0,
            },
          ],
          roundsPlayed: 3,
        },
      }

      const size = new Blob([JSON.stringify(event)]).size
      console.log(`GameEndedEvent size: ${size} bytes`)
      expect(size).toBeLessThan(1024)
    })

    it('GameAbandonedEvent 應該小於 1KB', () => {
      const event: GameAbandonedEvent = {
        eventId: 'event-1',
        eventType: 'GameAbandoned',
        timestamp: Date.now(),
        sequenceNumber: 1,
        abandonedPlayerId: 'player1',
        winnerId: 'player2',
        currentRound: 1,
        phase: 'playing',
      }

      const size = new Blob([JSON.stringify(event)]).size
      console.log(`GameAbandonedEvent size: ${size} bytes`)
      expect(size).toBeLessThan(1024)
    })

    it('MatchSelectedEvent（包含役種）應該小於 1KB', () => {
      const event: MatchSelectedEvent = {
        eventId: 'event-1',
        eventType: 'MatchSelected',
        timestamp: Date.now(),
        sequenceNumber: 1,
        playerId: 'player1',
        sourceCardId: '1-ribbon-0',
        selectedFieldCardId: '1-plain-0',
        autoSelected: false,
        capturedCardIds: ['1-ribbon-0', '1-plain-0'],
        achievedYaku: [
          {
            yaku: 'GOKO',
            points: 15,
            cardIds: ['1-bright-0', '3-bright-0', '8-bright-0', '11-bright-0', '12-bright-0'],
          },
        ],
        turnTransition: {
          previousPlayerId: 'player1',
          currentPlayerId: 'player2',
          reason: 'card_played',
        },
      }

      const size = new Blob([JSON.stringify(event)]).size
      console.log(`MatchSelectedEvent size: ${size} bytes`)
      expect(size).toBeLessThan(1024)
    })

    it('GameInitializedEvent 可以大於 1KB（完整狀態快照）', () => {
      const event: GameInitializedEvent = {
        eventId: 'event-1',
        eventType: 'GameInitialized',
        timestamp: Date.now(),
        sequenceNumber: 1,
        gameState: {
          gameId: 'game-123',
          currentRound: 1,
          phase: 'playing',
          currentPlayerId: 'player1',
          players: [
            {
              id: 'player1',
              name: '玩家1',
              handCardIds: ['1-bright-0', '2-animal-0'],
              capturedCardIds: [],
              totalScore: 0,
              roundScore: 0,
            },
            {
              id: 'player2',
              name: '玩家2',
              handCardIds: ['3-ribbon-0', '4-plain-0'],
              capturedCardIds: [],
              totalScore: 0,
              roundScore: 0,
            },
          ],
          fieldCardIds: ['5-plain-0', '6-plain-0'],
          deckCardCount: 24,
          koikoiPlayerId: null,
        },
        cardDefinitions: Array.from({ length: 48 }, (_, i) => ({
          id: `${Math.floor(i / 4) + 1}-${['bright', 'animal', 'ribbon', 'plain'][i % 4]}-${i % 4}`,
          suit: Math.floor(i / 4) + 1,
          type: ['bright', 'animal', 'ribbon', 'plain'][i % 4] as 'bright' | 'animal' | 'ribbon' | 'plain',
          points: [20, 10, 5, 1][i % 4],
        })),
        turnTransition: {
          previousPlayerId: null,
          currentPlayerId: 'player1',
          reason: 'game_initialized',
        },
      }

      const size = new Blob([JSON.stringify(event)]).size
      console.log(`GameInitializedEvent size: ${size} bytes`)

      // GameInitializedEvent 是完整快照，允許較大
      // 但仍應該在合理範圍內（< 10KB）
      expect(size).toBeGreaterThan(1024)
      expect(size).toBeLessThan(10240)
    })
  })
})
