/**
 * lobbyPageGuard 單元測試
 *
 * @description
 * 測試大廳頁面守衛的重連邏輯：
 * - 無遊戲會話時允許進入大廳
 * - 有遊戲會話時重定向至遊戲頁面（斷線重連情境）
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { NavigationGuardNext, RouteLocationNormalized } from 'vue-router'
import { lobbyPageGuard } from '@/user-interface/adapter/router/guards'
import { setActivePinia, createPinia } from 'pinia'
import { useGameStateStore } from '@/user-interface/adapter/stores/gameState'

describe('lobbyPageGuard - Reconnection Logic', () => {
  let mockTo: RouteLocationNormalized
  let mockFrom: RouteLocationNormalized
  let mockNext: NavigationGuardNext

  beforeEach(() => {
    // 建立新的 Pinia 實例，確保測試隔離
    setActivePinia(createPinia())

    // 模擬路由參數
    mockTo = {
      path: '/lobby',
      name: 'lobby',
      params: {},
      query: {},
      hash: '',
      fullPath: '/lobby',
      matched: [],
      meta: {},
      redirectedFrom: undefined,
    } as RouteLocationNormalized

    mockFrom = {
      path: '/',
      name: 'home',
      params: {},
      query: {},
      hash: '',
      fullPath: '/',
      matched: [],
      meta: {},
      redirectedFrom: undefined,
    } as RouteLocationNormalized

    // 模擬 next 函數
    mockNext = vi.fn()
  })

  it('should allow entering lobby when no game session exists', () => {
    // Arrange
    const gameState = useGameStateStore()
    gameState.gameId = null

    // Act
    lobbyPageGuard(mockTo, mockFrom, mockNext)

    // Assert
    expect(mockNext).toHaveBeenCalledWith()
    expect(mockNext).toHaveBeenCalledTimes(1)
  })

  it('should redirect to /game when game session exists (reconnection scenario)', () => {
    // Arrange
    const gameState = useGameStateStore()
    gameState.gameId = 'game-123'

    // Act
    lobbyPageGuard(mockTo, mockFrom, mockNext)

    // Assert
    expect(mockNext).toHaveBeenCalledWith({ name: 'game' })
    expect(mockNext).toHaveBeenCalledTimes(1)
  })

  it('should redirect to /game when game session exists with query parameter mode=backend', () => {
    // Arrange
    const gameState = useGameStateStore()
    gameState.gameId = 'game-456'

    mockTo.query = { mode: 'backend' }

    // Act
    lobbyPageGuard(mockTo, mockFrom, mockNext)

    // Assert
    expect(mockNext).toHaveBeenCalledWith({ name: 'game' })
    expect(mockNext).toHaveBeenCalledTimes(1)
  })

  it('should handle navigation from different routes', () => {
    // Arrange
    const gameState = useGameStateStore()
    gameState.gameId = null

    mockFrom.path = '/game'
    mockFrom.name = 'game'

    // Act
    lobbyPageGuard(mockTo, mockFrom, mockNext)

    // Assert
    expect(mockNext).toHaveBeenCalledWith()
    expect(mockNext).toHaveBeenCalledTimes(1)
  })

  it('should prevent entering lobby after reconnection (game session restored)', () => {
    // Arrange - 模擬斷線重連後的情境
    const gameState = useGameStateStore()

    // 模擬 HandleReconnectionUseCase 恢復遊戲狀態
    gameState.gameId = 'restored-game-789'
    gameState.myPlayerId = 'player-1'
    gameState.opponentPlayerId = 'player-2'

    // Act - 使用者嘗試進入大廳（例如手動輸入 URL 或誤觸返回鍵）
    lobbyPageGuard(mockTo, mockFrom, mockNext)

    // Assert - 守衛應重定向至遊戲頁面
    expect(mockNext).toHaveBeenCalledWith({ name: 'game' })
    expect(mockNext).toHaveBeenCalledTimes(1)
  })

  it('should allow entering lobby when game session is cleared', () => {
    // Arrange - 模擬使用者主動離開遊戲後的情境
    const gameState = useGameStateStore()

    // 初始有遊戲會話
    gameState.gameId = 'game-999'

    // 使用者離開遊戲，清除會話
    gameState.$reset()

    // Act - 使用者重新進入大廳
    lobbyPageGuard(mockTo, mockFrom, mockNext)

    // Assert - 守衛應允許進入大廳
    expect(mockNext).toHaveBeenCalledWith()
    expect(mockNext).toHaveBeenCalledTimes(1)
  })
})
