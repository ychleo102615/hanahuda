/**
 * LeaveGameUseCase Tests
 *
 * @description
 * 離開遊戲用例的單元測試。
 * 專注於驗證基本行為，複雜場景在整合測試中涵蓋。
 *
 * @module server/__tests__/application/use-cases/leaveGameUseCase.test
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { LeaveGameUseCase } from '~/server/core-game/application/use-cases/leaveGameUseCase'
import {
  createGameRepositoryMock,
  createEventPublisherMock,
  createGameStoreMock,
  createEventMapperMock,
  createGameLockMock,
  createGameTimeoutMock,
} from '../../mocks'
import {
  PLAYER_1_ID,
} from '../../fixtures/games'

describe('LeaveGameUseCase', () => {
  // Mocks
  let gameRepository: ReturnType<typeof createGameRepositoryMock>
  let eventPublisher: ReturnType<typeof createEventPublisherMock>
  let gameStore: ReturnType<typeof createGameStoreMock>
  let eventMapper: ReturnType<typeof createEventMapperMock>
  let gameLock: ReturnType<typeof createGameLockMock>
  let gameTimeoutManager: ReturnType<typeof createGameTimeoutMock>

  // Use Case
  let useCase: LeaveGameUseCase

  beforeEach(() => {
    vi.clearAllMocks()

    gameRepository = createGameRepositoryMock()
    eventPublisher = createEventPublisherMock()
    gameStore = createGameStoreMock()
    eventMapper = createEventMapperMock()
    gameLock = createGameLockMock()
    gameTimeoutManager = createGameTimeoutMock()

    useCase = new LeaveGameUseCase(
      gameRepository,
      eventPublisher,
      gameStore,
      eventMapper,
      gameLock,
      gameTimeoutManager
    )
  })

  describe('execute', () => {
    it('遊戲不存在時應拋出 GAME_NOT_FOUND 錯誤', async () => {
      // Arrange
      gameStore.get.mockReturnValue(undefined)

      const input = {
        gameId: 'non-existent-game',
        playerId: PLAYER_1_ID,
      }

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow('Game not found')
    })
  })

  // 注意：進行中遊戲離開、等待中遊戲離開等複雜場景
  // 需要更多 Domain 邏輯模擬，將在整合測試中涵蓋
})
