/**
 * MakeDecisionUseCase Tests
 *
 * @description
 * Koi-Koi 決策用例的單元測試。
 * 測試玩家選擇繼續（Koi-Koi）或結束回合的邏輯。
 *
 * @module server/__tests__/application/use-cases/makeDecisionUseCase.test
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { MakeDecisionUseCase, MakeDecisionError } from '~/server/core-game/application/use-cases/makeDecisionUseCase'
import {
  createGameRepositoryMock,
  createEventPublisherMock,
  createGameStoreMock,
  createEventMapperMock,
  createGameLockMock,
  createGameTimeoutMock,
} from '../../mocks'
import {
  createTestInProgressGame,
  createRoundAwaitingDecision,
  PLAYER_1_ID,
  PLAYER_2_ID,
  GAME_ID,
} from '../../fixtures/games'

describe('MakeDecisionUseCase', () => {
  // Mocks
  let gameRepository: ReturnType<typeof createGameRepositoryMock>
  let eventPublisher: ReturnType<typeof createEventPublisherMock>
  let gameStore: ReturnType<typeof createGameStoreMock>
  let eventMapper: ReturnType<typeof createEventMapperMock>
  let gameLock: ReturnType<typeof createGameLockMock>
  let gameTimeoutManager: ReturnType<typeof createGameTimeoutMock>

  // Use Case
  let useCase: MakeDecisionUseCase

  beforeEach(() => {
    vi.clearAllMocks()

    gameRepository = createGameRepositoryMock()
    eventPublisher = createEventPublisherMock()
    gameStore = createGameStoreMock()
    eventMapper = createEventMapperMock()
    gameLock = createGameLockMock()
    gameTimeoutManager = createGameTimeoutMock()

    useCase = new MakeDecisionUseCase(
      gameRepository,
      eventPublisher,
      gameStore,
      eventMapper,
      gameLock,
      gameTimeoutManager
    )
  })

  describe('execute', () => {
    it('遊戲不存在時應拋出 GAME_NOT_FOUND', async () => {
      // Arrange
      gameStore.get.mockReturnValue(undefined)
      gameRepository.findById.mockResolvedValue(null)

      const input = {
        gameId: 'non-existent-game',
        playerId: PLAYER_1_ID,
        decision: 'STOP' as const,
      }

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow(MakeDecisionError)
      await expect(useCase.execute(input)).rejects.toMatchObject({
        code: 'GAME_NOT_FOUND',
      })
    })

    it('非決策階段應拋出 INVALID_STATE', async () => {
      // Arrange
      const game = createTestInProgressGame() // 預設為 AWAITING_HAND_PLAY
      gameStore.get.mockReturnValue(game)

      const input = {
        gameId: GAME_ID,
        playerId: PLAYER_1_ID,
        decision: 'STOP' as const,
      }

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow(MakeDecisionError)
      await expect(useCase.execute(input)).rejects.toMatchObject({
        code: 'INVALID_STATE',
      })
    })

    it('非當前玩家應拋出 WRONG_PLAYER', async () => {
      // Arrange
      const game = createTestInProgressGame({
        currentRound: createRoundAwaitingDecision({ activePlayerId: PLAYER_1_ID }),
      })
      gameStore.get.mockReturnValue(game)

      const input = {
        gameId: GAME_ID,
        playerId: PLAYER_2_ID, // 不是當前玩家
        decision: 'STOP' as const,
      }

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow(MakeDecisionError)
      await expect(useCase.execute(input)).rejects.toMatchObject({
        code: 'WRONG_PLAYER',
      })
    })

    // 注意：成功案例（STOP/KOI_KOI）需要更複雜的 Domain 邏輯模擬，
    // 將在整合測試中涵蓋，此處專注於錯誤處理驗證
  })
})
