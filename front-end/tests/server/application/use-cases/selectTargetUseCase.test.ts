/**
 * SelectTargetUseCase Tests
 *
 * @description
 * 選擇配對目標用例的單元測試。
 * 測試翻牌後選擇場上配對目標的邏輯。
 *
 * @module server/__tests__/application/use-cases/selectTargetUseCase.test
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { SelectTargetUseCase, SelectTargetError } from '~/server/core-game/application/use-cases/selectTargetUseCase'
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
  createRoundAwaitingSelection,
  PLAYER_1_ID,
  PLAYER_2_ID,
  GAME_ID,
} from '../../fixtures/games'

describe('SelectTargetUseCase', () => {
  // Mocks
  let gameRepository: ReturnType<typeof createGameRepositoryMock>
  let eventPublisher: ReturnType<typeof createEventPublisherMock>
  let gameStore: ReturnType<typeof createGameStoreMock>
  let eventMapper: ReturnType<typeof createEventMapperMock>
  let gameLock: ReturnType<typeof createGameLockMock>
  let gameTimeoutManager: ReturnType<typeof createGameTimeoutMock>

  // Use Case
  let useCase: SelectTargetUseCase

  beforeEach(() => {
    vi.clearAllMocks()

    gameRepository = createGameRepositoryMock()
    eventPublisher = createEventPublisherMock()
    gameStore = createGameStoreMock()
    eventMapper = createEventMapperMock()
    gameLock = createGameLockMock()
    gameTimeoutManager = createGameTimeoutMock()

    useCase = new SelectTargetUseCase(
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
        targetCardId: '0131',
      }

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow(SelectTargetError)
      await expect(useCase.execute(input)).rejects.toMatchObject({
        code: 'GAME_NOT_FOUND',
      })
    })

    it('非選擇階段應拋出 INVALID_STATE', async () => {
      // Arrange
      const game = createTestInProgressGame() // 預設為 AWAITING_HAND_PLAY
      gameStore.get.mockReturnValue(game)

      const input = {
        gameId: GAME_ID,
        playerId: PLAYER_1_ID,
        targetCardId: '0131',
      }

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow(SelectTargetError)
      await expect(useCase.execute(input)).rejects.toMatchObject({
        code: 'INVALID_STATE',
      })
    })

    it('非當前玩家應拋出 WRONG_PLAYER', async () => {
      // Arrange
      const game = createTestInProgressGame({
        currentRound: createRoundAwaitingSelection({ activePlayerId: PLAYER_1_ID }),
      })
      gameStore.get.mockReturnValue(game)

      const input = {
        gameId: GAME_ID,
        playerId: PLAYER_2_ID, // 不是當前玩家
        targetCardId: '0131',
      }

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow(SelectTargetError)
      await expect(useCase.execute(input)).rejects.toMatchObject({
        code: 'WRONG_PLAYER',
      })
    })

    it('目標不在可選列表中應拋出 INVALID_SELECTION', async () => {
      // Arrange
      const round = createRoundAwaitingSelection({
        activePlayerId: PLAYER_1_ID,
        // pendingSelection.possibleTargets = ['0131', '0141']
      })
      const game = createTestInProgressGame({ currentRound: round })
      gameStore.get.mockReturnValue(game)

      const input = {
        gameId: GAME_ID,
        playerId: PLAYER_1_ID,
        targetCardId: '9999', // 不在可選列表中
      }

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow(SelectTargetError)
      await expect(useCase.execute(input)).rejects.toMatchObject({
        code: 'INVALID_SELECTION',
      })
    })

    // 注意：成功案例需要更複雜的 Domain 邏輯模擬，
    // 將在整合測試中涵蓋，此處專注於錯誤處理驗證
  })
})
