import { describe, it, expect } from 'vitest'
import Ajv from 'ajv'
import addFormats from 'ajv-formats'
import integrationEventsSchema from '../../specs/001-game-ui-game/contracts/integration-events-schema.json'

/**
 * 契約測試：驗證整合事件是否符合 JSON Schema 定義
 *
 * 目的：確保 game-engine 和 game-ui 之間的整合事件符合契約規範
 *
 * 測試策略：
 * 1. 使用 AJV 驗證器載入 JSON Schema
 * 2. 為每種事件類型建立有效和無效的測試案例
 * 3. 驗證事件結構符合 Schema 定義
 * 4. 驗證嵌套結構（YakuResult, MatchResult, TurnTransition）
 */

describe('Integration Events Contract Tests', () => {
  const ajv = new Ajv({ strict: false, allErrors: true, strictSchema: false })
  addFormats(ajv)

  // 載入整合事件 Schema
  ajv.addSchema(integrationEventsSchema, 'integration-events')

  describe('Base IntegrationEvent', () => {
    it('應該要求所有基礎欄位', () => {
      const validate = ajv.getSchema('integration-events#/definitions/IntegrationEvent')
      expect(validate).toBeDefined()

      const validEvent = {
        eventId: '550e8400-e29b-41d4-a716-446655440000',
        eventType: 'TestEvent',
        timestamp: Date.now(),
        sequenceNumber: 1,
      }

      const result = validate!(validEvent)
      expect(result).toBe(true)
    })

    it('應該拒絕缺少必要欄位的事件', () => {
      const validate = ajv.getSchema('integration-events#/definitions/IntegrationEvent')

      const invalidEvent = {
        eventId: '550e8400-e29b-41d4-a716-446655440000',
        // 缺少 eventType, timestamp, sequenceNumber
      }

      const result = validate!(invalidEvent)
      expect(result).toBe(false)
      expect(validate!.errors).toBeDefined()
    })

    it('應該驗證 sequenceNumber 為正整數', () => {
      const validate = ajv.getSchema('integration-events#/definitions/IntegrationEvent')

      const invalidEvent = {
        eventId: '550e8400-e29b-41d4-a716-446655440000',
        eventType: 'TestEvent',
        timestamp: Date.now(),
        sequenceNumber: 0, // 應該 >= 1
      }

      const result = validate!(invalidEvent)
      expect(result).toBe(false)
    })
  })

  describe('GameInitializedEvent', () => {
    it('應該接受完整的遊戲初始化事件', () => {
      const validate = ajv.getSchema('integration-events#/definitions/GameInitializedEvent')
      expect(validate).toBeDefined()

      const validEvent = {
        eventId: '550e8400-e29b-41d4-a716-446655440000',
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
              handCardIds: ['1-bright-1', '2-animal-1'],
              capturedCardIds: [],
              totalScore: 0,
              roundScore: 0,
            },
            {
              id: 'player2',
              name: '玩家2',
              handCardIds: ['3-ribbon-1', '4-plain-1'],
              capturedCardIds: [],
              totalScore: 0,
              roundScore: 0,
            },
          ],
          fieldCardIds: ['5-plain-1', '6-plain-1'],
          deckCardCount: 24,
          koikoiPlayerId: null,
        },
        cardDefinitions: Array.from({ length: 48 }, (_, i) => ({
          id: `${Math.floor(i / 4) + 1}-${['bright', 'animal', 'ribbon', 'plain'][i % 4]}-${(i % 4) + 1}`,
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

      const result = validate!(validEvent)
      if (!result) {
        console.error('Validation errors:', validate!.errors)
      }
      expect(result).toBe(true)
    })

    it('應該要求 48 張卡牌定義', () => {
      const validate = ajv.getSchema('integration-events#/definitions/GameInitializedEvent')

      const invalidEvent = {
        eventId: '550e8400-e29b-41d4-a716-446655440000',
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
              handCardIds: [],
              capturedCardIds: [],
              totalScore: 0,
              roundScore: 0,
            },
            {
              id: 'player2',
              name: '玩家2',
              handCardIds: [],
              capturedCardIds: [],
              totalScore: 0,
              roundScore: 0,
            },
          ],
          fieldCardIds: [],
          deckCardCount: 24,
          koikoiPlayerId: null,
        },
        cardDefinitions: [], // 應該有 48 張
        turnTransition: {
          previousPlayerId: null,
          currentPlayerId: 'player1',
          reason: 'game_initialized',
        },
      }

      const result = validate!(invalidEvent)
      expect(result).toBe(false)
    })
  })

  describe('CardPlayedEvent', () => {
    it('應該接受完整的出牌事件（包含兩次配對結果）', () => {
      const validate = ajv.getSchema('integration-events#/definitions/CardPlayedEvent')
      expect(validate).toBeDefined()

      const validEvent = {
        eventId: '550e8400-e29b-41d4-a716-446655440000',
        eventType: 'CardPlayed',
        timestamp: Date.now(),
        sequenceNumber: 2,
        playerId: 'player1',
        playedCardId: '1-bright-1',
        handMatch: {
          sourceCardId: '1-bright-1',
          sourceType: 'hand',
          matchType: 'single_match',
          matchedFieldCardId: '1-animal-1',
          capturedCardIds: ['1-bright-1', '1-animal-1'],
        },
        deckMatch: {
          sourceCardId: '1-ribbon-1',
          sourceType: 'deck',
          matchType: 'no_match',
        },
        turnTransition: {
          previousPlayerId: 'player1',
          currentPlayerId: 'player2',
          reason: 'card_played',
        },
      }

      const result = validate!(validEvent)
      if (!result) {
        console.error('Validation errors:', validate!.errors)
      }
      expect(result).toBe(true)
    })

    it('應該接受多重配對情況（等待玩家選擇）', () => {
      const validate = ajv.getSchema('integration-events#/definitions/CardPlayedEvent')

      const validEvent = {
        eventId: '550e8400-e29b-41d4-a716-446655440000',
        eventType: 'CardPlayed',
        timestamp: Date.now(),
        sequenceNumber: 2,
        playerId: 'player1',
        playedCardId: '1-bright-1',
        handMatch: {
          sourceCardId: '1-bright-1',
          sourceType: 'hand',
          matchType: 'single_match',
          matchedFieldCardId: '1-animal-1',
          capturedCardIds: ['1-bright-1', '1-animal-1'],
        },
        deckMatch: {
          sourceCardId: '1-ribbon-1',
          sourceType: 'deck',
          matchType: 'multiple_matches',
          selectableFieldCardIds: ['1-plain-1', '1-plain-2'],
          selectionTimeout: 10000,
        },
        turnTransition: null, // 等待玩家選擇，尚未轉換回合
      }

      const result = validate!(validEvent)
      if (!result) {
        console.error('Validation errors:', validate!.errors)
      }
      expect(result).toBe(true)
    })

    it('應該接受包含達成役種的出牌事件', () => {
      const validate = ajv.getSchema('integration-events#/definitions/CardPlayedEvent')

      const validEvent = {
        eventId: '550e8400-e29b-41d4-a716-446655440000',
        eventType: 'CardPlayed',
        timestamp: Date.now(),
        sequenceNumber: 2,
        playerId: 'player1',
        playedCardId: '1-bright-1',
        handMatch: {
          sourceCardId: '1-bright-1',
          sourceType: 'hand',
          matchType: 'single_match',
          matchedFieldCardId: '1-animal-1',
          capturedCardIds: ['1-bright-1', '1-animal-1'],
          achievedYaku: [
            {
              yaku: 'GOKO',
              points: 15,
              cardIds: ['1-bright-1', '3-bright-1', '8-bright-1', '11-bright-1', '12-bright-1'],
            },
          ],
        },
        deckMatch: {
          sourceCardId: '2-ribbon-1',
          sourceType: 'deck',
          matchType: 'no_match',
        },
        turnTransition: null, // 等待 Koi-Koi 決定
      }

      const result = validate!(validEvent)
      if (!result) {
        console.error('Validation errors:', validate!.errors)
      }
      expect(result).toBe(true)
    })
  })

  describe('MatchSelectedEvent', () => {
    it('應該接受玩家選擇配對事件', () => {
      const validate = ajv.getSchema('integration-events#/definitions/MatchSelectedEvent')
      expect(validate).toBeDefined()

      const validEvent = {
        eventId: '550e8400-e29b-41d4-a716-446655440000',
        eventType: 'MatchSelected',
        timestamp: Date.now(),
        sequenceNumber: 3,
        playerId: 'player1',
        sourceCardId: '1-ribbon-1',
        selectedFieldCardId: '1-plain-1',
        autoSelected: false,
        capturedCardIds: ['1-ribbon-1', '1-plain-1'],
        achievedYaku: [],
        turnTransition: {
          previousPlayerId: 'player1',
          currentPlayerId: 'player2',
          reason: 'card_played',
        },
      }

      const result = validate!(validEvent)
      if (!result) {
        console.error('Validation errors:', validate!.errors)
      }
      expect(result).toBe(true)
    })

    it('應該接受自動選擇（超時）事件', () => {
      const validate = ajv.getSchema('integration-events#/definitions/MatchSelectedEvent')

      const validEvent = {
        eventId: '550e8400-e29b-41d4-a716-446655440000',
        eventType: 'MatchSelected',
        timestamp: Date.now(),
        sequenceNumber: 3,
        playerId: 'player1',
        sourceCardId: '1-ribbon-1',
        selectedFieldCardId: '1-plain-1',
        autoSelected: true, // 超時自動選擇
        capturedCardIds: ['1-ribbon-1', '1-plain-1'],
        achievedYaku: [],
        turnTransition: {
          previousPlayerId: 'player1',
          currentPlayerId: 'player2',
          reason: 'card_played',
        },
      }

      const result = validate!(validEvent)
      expect(result).toBe(true)
    })
  })

  describe('KoikoiDeclaredEvent', () => {
    it('應該接受 Koi-Koi 宣告事件（繼續遊戲）', () => {
      const validate = ajv.getSchema('integration-events#/definitions/KoikoiDeclaredEvent')
      expect(validate).toBeDefined()

      const validEvent = {
        eventId: '550e8400-e29b-41d4-a716-446655440000',
        eventType: 'KoikoiDeclared',
        timestamp: Date.now(),
        sequenceNumber: 4,
        playerId: 'player1',
        declared: true, // Koi-Koi，繼續遊戲
        turnTransition: {
          previousPlayerId: 'player1',
          currentPlayerId: 'player2',
          reason: 'koikoi_declared',
        },
      }

      const result = validate!(validEvent)
      if (!result) {
        console.error('Validation errors:', validate!.errors)
      }
      expect(result).toBe(true)
    })

    it('應該接受 Shobu 宣告事件（結束回合）', () => {
      const validate = ajv.getSchema('integration-events#/definitions/KoikoiDeclaredEvent')

      const validEvent = {
        eventId: '550e8400-e29b-41d4-a716-446655440000',
        eventType: 'KoikoiDeclared',
        timestamp: Date.now(),
        sequenceNumber: 4,
        playerId: 'player1',
        declared: false, // Shobu，結束回合
        turnTransition: null, // 回合結束，無回合轉換
      }

      const result = validate!(validEvent)
      expect(result).toBe(true)
    })
  })

  describe('RoundEndedEvent', () => {
    it('應該接受回合結束事件（有贏家）', () => {
      const validate = ajv.getSchema('integration-events#/definitions/RoundEndedEvent')
      expect(validate).toBeDefined()

      const validEvent = {
        eventId: '550e8400-e29b-41d4-a716-446655440000',
        eventType: 'RoundEnded',
        timestamp: Date.now(),
        sequenceNumber: 5,
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
                  cardIds: ['1-bright-1', '3-bright-1', '8-bright-1', '11-bright-1', '12-bright-1'],
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

      const result = validate!(validEvent)
      if (!result) {
        console.error('Validation errors:', validate!.errors)
      }
      expect(result).toBe(true)
    })

    it('應該接受回合結束事件（平局）', () => {
      const validate = ajv.getSchema('integration-events#/definitions/RoundEndedEvent')

      const validEvent = {
        eventId: '550e8400-e29b-41d4-a716-446655440000',
        eventType: 'RoundEnded',
        timestamp: Date.now(),
        sequenceNumber: 5,
        winnerId: null, // 平局
        roundResult: {
          round: 1,
          playerResults: [
            {
              playerId: 'player1',
              yakuResults: [],
              baseScore: 0,
              multiplier: 1,
              finalScore: 0,
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

      const result = validate!(validEvent)
      expect(result).toBe(true)
    })

    it('應該接受 Koi-Koi 加倍計分', () => {
      const validate = ajv.getSchema('integration-events#/definitions/RoundEndedEvent')

      const validEvent = {
        eventId: '550e8400-e29b-41d4-a716-446655440000',
        eventType: 'RoundEnded',
        timestamp: Date.now(),
        sequenceNumber: 5,
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
                  cardIds: ['1-bright-1', '3-bright-1', '8-bright-1', '11-bright-1', '12-bright-1'],
                },
              ],
              baseScore: 15,
              multiplier: 2, // Koi-Koi 加倍
              finalScore: 30,
            },
            {
              playerId: 'player2',
              yakuResults: [],
              baseScore: 0,
              multiplier: 1,
              finalScore: 0,
            },
          ],
          koikoiDeclared: true,
          koikoiPlayerId: 'player1',
        },
      }

      const result = validate!(validEvent)
      expect(result).toBe(true)
    })
  })

  describe('GameEndedEvent', () => {
    it('應該接受遊戲結束事件（所有回合完成）', () => {
      const validate = ajv.getSchema('integration-events#/definitions/GameEndedEvent')
      expect(validate).toBeDefined()

      const validEvent = {
        eventId: '550e8400-e29b-41d4-a716-446655440000',
        eventType: 'GameEnded',
        timestamp: Date.now(),
        sequenceNumber: 6,
        winnerId: 'player1',
        reason: 'all_rounds_completed',
        finalResult: {
          playerFinalScores: [
            {
              playerId: 'player1',
              totalScore: 50,
              roundsWon: 2,
            },
            {
              playerId: 'player2',
              totalScore: 30,
              roundsWon: 1,
            },
          ],
          roundsPlayed: 3,
        },
      }

      const result = validate!(validEvent)
      if (!result) {
        console.error('Validation errors:', validate!.errors)
      }
      expect(result).toBe(true)
    })

    it('應該接受遊戲結束事件（玩家放棄）', () => {
      const validate = ajv.getSchema('integration-events#/definitions/GameEndedEvent')

      const validEvent = {
        eventId: '550e8400-e29b-41d4-a716-446655440000',
        eventType: 'GameEnded',
        timestamp: Date.now(),
        sequenceNumber: 6,
        winnerId: 'player2',
        reason: 'player_abandoned',
        finalResult: {
          playerFinalScores: [
            {
              playerId: 'player1',
              totalScore: 10,
              roundsWon: 0,
            },
            {
              playerId: 'player2',
              totalScore: 0,
              roundsWon: 0,
            },
          ],
          roundsPlayed: 1,
        },
      }

      const result = validate!(validEvent)
      expect(result).toBe(true)
    })
  })

  describe('GameAbandonedEvent', () => {
    it('應該接受遊戲放棄事件', () => {
      const validate = ajv.getSchema('integration-events#/definitions/GameAbandonedEvent')
      expect(validate).toBeDefined()

      const validEvent = {
        eventId: '550e8400-e29b-41d4-a716-446655440000',
        eventType: 'GameAbandoned',
        timestamp: Date.now(),
        sequenceNumber: 7,
        abandonedPlayerId: 'player1',
        winnerId: 'player2',
        currentRound: 2,
        phase: 'playing',
      }

      const result = validate!(validEvent)
      if (!result) {
        console.error('Validation errors:', validate!.errors)
      }
      expect(result).toBe(true)
    })
  })

  describe('Nested Structures', () => {
    describe('YakuResult', () => {
      it('應該驗證所有役種類型', () => {
        const validate = ajv.getSchema('integration-events#/definitions/YakuResult')
        expect(validate).toBeDefined()

        const yakuTypes = [
          'GOKO',
          'SHIKO',
          'AME_SHIKO',
          'SANKO',
          'INOSHIKACHO',
          'AKA_TAN',
          'AO_TAN',
          'TANE',
          'TAN',
          'KASU',
        ]

        yakuTypes.forEach((yaku) => {
          const validYaku = {
            yaku,
            points: 10,
            cardIds: ['1-bright-1', '2-bright-1'],
          }

          const result = validate!(validYaku)
          expect(result).toBe(true)
        })
      })

      it('應該拒絕無效的役種類型', () => {
        const validate = ajv.getSchema('integration-events#/definitions/YakuResult')

        const invalidYaku = {
          yaku: 'INVALID_YAKU',
          points: 10,
          cardIds: ['1-bright-1'],
        }

        const result = validate!(invalidYaku)
        expect(result).toBe(false)
      })
    })

    describe('MatchResult', () => {
      it('應該驗證所有配對類型', () => {
        const validate = ajv.getSchema('integration-events#/definitions/MatchResult')
        expect(validate).toBeDefined()

        const matchTypes = ['no_match', 'single_match', 'multiple_matches']

        matchTypes.forEach((matchType) => {
          const validMatch = {
            sourceCardId: '1-bright-1',
            sourceType: 'hand' as const,
            matchType,
          }

          const result = validate!(validMatch)
          expect(result).toBe(true)
        })
      })
    })

    describe('TurnTransition', () => {
      it('應該驗證所有回合轉換原因', () => {
        const validate = ajv.getSchema('integration-events#/definitions/TurnTransition')
        expect(validate).toBeDefined()

        const reasons = ['game_initialized', 'card_played', 'koikoi_declared']

        reasons.forEach((reason) => {
          const validTransition = {
            previousPlayerId: 'player1',
            currentPlayerId: 'player2',
            reason,
          }

          const result = validate!(validTransition)
          expect(result).toBe(true)
        })
      })

      it('應該接受 previousPlayerId 為 null（遊戲初始化）', () => {
        const validate = ajv.getSchema('integration-events#/definitions/TurnTransition')

        const validTransition = {
          previousPlayerId: null,
          currentPlayerId: 'player1',
          reason: 'game_initialized',
        }

        const result = validate!(validTransition)
        expect(result).toBe(true)
      })
    })
  })
})
