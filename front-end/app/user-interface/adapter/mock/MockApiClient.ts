/**
 * MockApiClient - Mock API 客戶端
 *
 * @description
 * 實作 SendCommandPort 介面,模擬後端 API 行為。
 * 用於開發測試,無需真實後端伺服器。
 *
 * @example
 * ```typescript
 * const client = new MockApiClient()
 * await client.joinGame() // 立即返回模擬資料
 * await client.playHandCard('0111')
 * ```
 */

import type { SendCommandPort } from '~/user-interface/application/ports/output'
import type { JoinGameRequest, JoinGameResponse } from '../api/types'

/**
 * 延遲函數 (模擬網路延遲)
 */
function delay(ms: number = 100): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * MockApiClient 類別
 *
 * @implements {SendCommandPort}
 */
export class MockApiClient implements SendCommandPort {
  /**
   * Mock joinGame
   *
   * @param request - 加入遊戲請求
   * @returns 模擬的 JoinGameResponse
   */
  async joinGame(request: JoinGameRequest): Promise<JoinGameResponse> {
    await delay(50)

    console.info('[Mock API] joinGame', { request })

    return {
      game_id: 'mock-game-123',
      session_token: request.session_token || 'mock-token-456',
      player_id: request.player_id,
      sse_endpoint: `/api/v1/games/mock-game-123/events`,
    }
  }

  /**
   * Mock leaveGame
   */
  async leaveGame(gameId: string): Promise<void> {
    await delay(50)

    console.info('[Mock API] leaveGame', { gameId })

    // Mock 不執行任何操作,只記錄日誌
  }

  /**
   * Mock playHandCard
   */
  async playHandCard(cardId: string, matchTargetId?: string): Promise<void> {
    await delay(50)

    console.info('[Mock API] playHandCard', { cardId, matchTargetId })

    // Mock 不執行任何操作,事件由 MockEventEmitter 推送
  }

  /**
   * Mock selectTarget
   */
  async selectTarget(sourceCardId: string, targetCardId: string): Promise<void> {
    await delay(50)

    console.info('[Mock API] selectTarget', { sourceCardId, targetCardId })

    // Mock 不執行任何操作,事件由 MockEventEmitter 推送
  }

  /**
   * Mock makeDecision
   */
  async makeDecision(decision: 'KOI_KOI' | 'END_ROUND'): Promise<void> {
    await delay(50)

    console.info('[Mock API] makeDecision', { decision })

    // Mock 不執行任何操作,事件由 MockEventEmitter 推送
  }
}
