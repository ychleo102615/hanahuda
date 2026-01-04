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
  createRoundAwaitingSelectionWithYaku,
  createTestPlayerState,
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

  describe('Bug 修復驗證：手牌階段形成役種 + 翻牌雙配對', () => {
    /**
     * 此測試驗證修復：
     * - 修復前：selectTargetUseCase 計算 previousYaku 時使用「選擇配對前」的 depository，
     *   導致手牌階段形成的役種被包含在 previousYaku 中，不會被視為「新形成」。
     * - 修復後：使用 pendingSelection.previousYaku（手牌操作前的役種）作為基準，
     *   確保手牌階段形成的役種能正確觸發 DecisionRequired。
     */
    it('手牌階段形成花見酒後，選擇配對目標應觸發 DecisionRequired', async () => {
      // Arrange
      // 建立場景：玩家獲得區已有花見酒（櫻幕 + 菊盃），現在在選擇翻牌配對目標
      const round = createRoundAwaitingSelectionWithYaku()
      const game = createTestInProgressGame({ currentRound: round })
      gameStore.get.mockReturnValue(game)

      const input = {
        gameId: GAME_ID,
        playerId: PLAYER_1_ID,
        sourceCardId: '0431', // 翻出的 4 月短冊
        targetCardId: '0441', // 選擇場上的 4 月かす1
      }

      // Act
      await useCase.execute(input)

      // Assert
      // 驗證 toDecisionRequiredEvent 被調用（而非 toTurnProgressAfterSelectionEvent）
      expect(eventMapper.toDecisionRequiredEvent).toHaveBeenCalled()

      // 驗證事件被發佈
      expect(eventPublisher.publishToGame).toHaveBeenCalledWith(
        GAME_ID,
        expect.objectContaining({
          event_type: 'DecisionRequired',
        })
      )
    })

    it('previousYaku 應使用 pendingSelection 中的值，而非重新計算', async () => {
      // Arrange
      // 建立場景：pendingSelection.previousYaku 為空（手牌操作前無役種）
      // 但 depository 已包含花見酒（手牌配對後形成）
      const round = createRoundAwaitingSelectionWithYaku()
      const game = createTestInProgressGame({ currentRound: round })
      gameStore.get.mockReturnValue(game)

      const input = {
        gameId: GAME_ID,
        playerId: PLAYER_1_ID,
        sourceCardId: '0431',
        targetCardId: '0441',
      }

      // Act
      await useCase.execute(input)

      // Assert
      // 如果使用正確的 previousYaku（空陣列），花見酒會被視為新形成的役種
      // 驗證 toDecisionRequiredEvent 的 yaku_update 參數包含花見酒
      expect(eventMapper.toDecisionRequiredEvent).toHaveBeenCalledWith(
        expect.anything(), // game
        PLAYER_1_ID,
        null, // hand_card_play（SelectionRequired 已傳遞過）
        expect.objectContaining({
          played_card: '0431',
          matched_cards: ['0441'],
        }),
        expect.objectContaining({
          newly_formed_yaku: expect.arrayContaining([
            expect.objectContaining({
              yaku_type: 'HANAMI_ZAKE',
            }),
          ]),
        })
      )
    })
  })
})
