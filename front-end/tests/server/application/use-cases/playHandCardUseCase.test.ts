/**
 * PlayHandCardUseCase Tests
 *
 * @description
 * 打手牌用例的單元測試。
 * 測試手牌配對、翻牌、役種檢測等場景。
 *
 * @module server/__tests__/application/use-cases/playHandCardUseCase.test
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { PlayHandCardUseCase, PlayHandCardError } from '~/server/core-game/application/use-cases/playHandCardUseCase'
import {
  createGameRepositoryMock,
  createEventPublisherMock,
  createGameStoreMock,
  createEventMapperMock,
  createGameTimeoutMock,
  createGameLockMock,
} from '../../mocks'
import {
  createTestInProgressGame,
  createTestRound,
  PLAYER_1_ID,
  PLAYER_2_ID,
  GAME_ID,
} from '../../fixtures/games'
import { HAND_STANDARD } from '../../fixtures/cards'

describe('PlayHandCardUseCase', () => {
  // Mocks
  let gameRepository: ReturnType<typeof createGameRepositoryMock>
  let eventPublisher: ReturnType<typeof createEventPublisherMock>
  let gameStore: ReturnType<typeof createGameStoreMock>
  let eventMapper: ReturnType<typeof createEventMapperMock>
  let gameLock: ReturnType<typeof createGameLockMock>
  let gameTimeoutManager: ReturnType<typeof createGameTimeoutMock>

  // Use Case
  let useCase: PlayHandCardUseCase

  beforeEach(() => {
    vi.clearAllMocks()

    gameRepository = createGameRepositoryMock()
    eventPublisher = createEventPublisherMock()
    gameStore = createGameStoreMock()
    eventMapper = createEventMapperMock()
    gameLock = createGameLockMock()
    gameTimeoutManager = createGameTimeoutMock()

    useCase = new PlayHandCardUseCase(
      gameRepository,
      eventPublisher,
      gameStore,
      eventMapper,
      gameLock,
      gameTimeoutManager
    )
  })

  describe('基本操作', () => {
    it('遊戲不存在時應拋出 GAME_NOT_FOUND', async () => {
      // Arrange
      gameStore.get.mockReturnValue(undefined)
      gameRepository.findById.mockResolvedValue(null)

      const input = {
        gameId: 'non-existent-game',
        playerId: PLAYER_1_ID,
        cardId: '0111',
      }

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow(PlayHandCardError)
      await expect(useCase.execute(input)).rejects.toMatchObject({
        code: 'GAME_NOT_FOUND',
      })
    })

    it('非玩家回合時應拋出 WRONG_PLAYER', async () => {
      // Arrange
      const game = createTestInProgressGame({
        currentRound: createTestRound({ activePlayerId: PLAYER_2_ID }),
      })
      gameStore.get.mockReturnValue(game)

      const input = {
        gameId: GAME_ID,
        playerId: PLAYER_1_ID, // 不是當前回合的玩家
        cardId: '0111',
      }

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow(PlayHandCardError)
      await expect(useCase.execute(input)).rejects.toMatchObject({
        code: 'WRONG_PLAYER',
      })
    })

    it('卡片不在手牌中應拋出 INVALID_CARD', async () => {
      // Arrange
      const game = createTestInProgressGame({
        currentRound: createTestRound({
          activePlayerId: PLAYER_1_ID,
          playerStates: [
            { playerId: PLAYER_1_ID, hand: HAND_STANDARD, depository: [] },
            { playerId: PLAYER_2_ID, hand: HAND_STANDARD, depository: [] },
          ],
        }),
      })
      gameStore.get.mockReturnValue(game)

      const input = {
        gameId: GAME_ID,
        playerId: PLAYER_1_ID,
        cardId: '9999', // 不在手牌中的卡片
      }

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow(PlayHandCardError)
      await expect(useCase.execute(input)).rejects.toMatchObject({
        code: 'INVALID_CARD',
      })
    })
  })

  // 注意：配對邏輯的詳細測試由 Domain Layer 的 matchingService.test.ts 涵蓋
  // Application Layer 測試專注於基本錯誤處理（GAME_NOT_FOUND, WRONG_PLAYER, INVALID_STATE）

  describe('狀態驗證', () => {
    it('當前不是手牌階段應拋出 INVALID_STATE', async () => {
      // Arrange
      const game = createTestInProgressGame({
        currentRound: createTestRound({
          activePlayerId: PLAYER_1_ID,
          flowState: 'AWAITING_SELECTION', // 不是手牌階段
        }),
      })
      gameStore.get.mockReturnValue(game)

      const input = {
        gameId: GAME_ID,
        playerId: PLAYER_1_ID,
        cardId: '0111',
      }

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow(PlayHandCardError)
      await expect(useCase.execute(input)).rejects.toMatchObject({
        code: 'INVALID_STATE',
      })
    })
  })
})
