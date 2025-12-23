/**
 * JoinGameUseCase Tests
 *
 * @description
 * 加入遊戲用例的單元測試。
 * 專注於錯誤處理驗證，成功案例在整合測試中涵蓋。
 *
 * @module server/__tests__/application/use-cases/joinGameUseCase.test
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { JoinGameUseCase } from '~/server/application/use-cases/joinGameUseCase'
import {
  createGameRepositoryMock,
  createEventPublisherMock,
  createGameStoreMock,
  createEventMapperMock,
  createInternalEventPublisherMock,
  createGameTimeoutMock,
} from '../../mocks'
import {
  createTestInProgressGame,
  PLAYER_1_ID,
  GAME_ID,
  SESSION_TOKEN,
} from '../../fixtures/games'

describe('JoinGameUseCase', () => {
  // Mocks
  let gameRepository: ReturnType<typeof createGameRepositoryMock>
  let eventPublisher: ReturnType<typeof createEventPublisherMock>
  let gameStore: ReturnType<typeof createGameStoreMock>
  let eventMapper: ReturnType<typeof createEventMapperMock>
  let internalEventPublisher: ReturnType<typeof createInternalEventPublisherMock>
  let gameTimeoutManager: ReturnType<typeof createGameTimeoutMock>

  // Use Case
  let useCase: JoinGameUseCase

  beforeEach(() => {
    vi.clearAllMocks()

    gameRepository = createGameRepositoryMock()
    eventPublisher = createEventPublisherMock()
    gameStore = createGameStoreMock()
    eventMapper = createEventMapperMock()
    internalEventPublisher = createInternalEventPublisherMock()
    gameTimeoutManager = createGameTimeoutMock()

    useCase = new JoinGameUseCase(
      gameRepository,
      eventPublisher,
      gameStore,
      eventMapper,
      internalEventPublisher,
      gameTimeoutManager
    )
  })

  describe('重連模式錯誤處理', () => {
    it('重連時 gameId 不存在應返回 game_expired 狀態', async () => {
      // Arrange
      gameRepository.findById.mockResolvedValue(null)

      const input = {
        playerId: PLAYER_1_ID,
        playerName: 'Player 1',
        sessionToken: SESSION_TOKEN,
        gameId: 'non-existent-game',
      }

      // Act
      const result = await useCase.execute(input)

      // Assert
      expect(result.status).toBe('game_expired')
      if (result.status === 'game_expired') {
        expect(result.gameId).toBe('non-existent-game')
      }
    })

    it('重連時玩家不在遊戲中應返回 game_expired 狀態', async () => {
      // Arrange
      const inProgressGame = createTestInProgressGame()
      // 遊戲在記憶體中，玩家嘗試重連但不是遊戲中的玩家
      gameStore.get.mockReturnValue(inProgressGame)

      const input = {
        playerId: 'unknown-player',
        playerName: 'Unknown',
        sessionToken: SESSION_TOKEN,
        gameId: GAME_ID,
      }

      // Act
      const result = await useCase.execute(input)

      // Assert
      expect(result.status).toBe('game_expired')
      if (result.status === 'game_expired') {
        expect(result.gameId).toBe(GAME_ID)
      }
    })
  })

  // 注意：新遊戲建立和加入等待中遊戲的成功案例需要更複雜的 Domain 邏輯模擬，
  // 這些場景將在整合測試中涵蓋
})
