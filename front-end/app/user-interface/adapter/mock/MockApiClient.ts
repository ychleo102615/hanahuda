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
   *
   * @note session_token 不再包含在回應中，改為透過 HttpOnly Cookie 傳送
   *       在 Mock 模式下，直接模擬 Cookie 已設定
   */
  async joinGame(request: JoinGameRequest): Promise<JoinGameResponse> {
    await delay(50)


    // Mock 模式：session_token 由 Cookie 管理，回應不包含 token
    return {
      game_id: 'mock-game-123',
      player_id: request.player_id,
      sse_endpoint: `/api/v1/games/mock-game-123/events`,
    }
  }

  /**
   * Mock leaveGame
   */
  async leaveGame(gameId: string): Promise<void> {
    await delay(50)


    // Mock 不執行任何操作,只記錄日誌
  }

  /**
   * Mock playHandCard
   */
  async playHandCard(cardId: string, matchTargetId?: string): Promise<void> {
    await delay(50)


    // Mock 不執行任何操作,事件由 MockEventEmitter 推送
  }

  /**
   * Mock selectTarget
   */
  async selectTarget(sourceCardId: string, targetCardId: string): Promise<void> {
    await delay(50)


    // Mock 不執行任何操作,事件由 MockEventEmitter 推送
  }

  /**
   * Mock makeDecision
   */
  async makeDecision(decision: 'KOI_KOI' | 'END_ROUND'): Promise<void> {
    await delay(50)


    // Mock 不執行任何操作,事件由 MockEventEmitter 推送
  }

  /**
   * Mock confirmContinue
   */
  async confirmContinue(decision: 'CONTINUE' | 'LEAVE'): Promise<void> {
    await delay(50)


    // Mock 不執行任何操作,事件由 MockEventEmitter 推送
  }
}
