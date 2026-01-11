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
 * await client.playHandCard('0111')
 * ```
 */

import type { SendCommandPort } from '~/game-client/application/ports/output'

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
   * Mock leaveGame
   */
  async leaveGame(_gameId: string): Promise<void> {
    await delay(50)


    // Mock 不執行任何操作,只記錄日誌
  }

  /**
   * Mock playHandCard
   */
  async playHandCard(_cardId: string, _matchTargetId?: string): Promise<void> {
    await delay(50)


    // Mock 不執行任何操作,事件由 MockEventEmitter 推送
  }

  /**
   * Mock selectTarget
   */
  async selectTarget(_sourceCardId: string, _targetCardId: string): Promise<void> {
    await delay(50)


    // Mock 不執行任何操作,事件由 MockEventEmitter 推送
  }

  /**
   * Mock makeDecision
   */
  async makeDecision(_decision: 'KOI_KOI' | 'END_ROUND'): Promise<void> {
    await delay(50)


    // Mock 不執行任何操作,事件由 MockEventEmitter 推送
  }

  /**
   * Mock confirmContinue
   */
  async confirmContinue(_decision: 'CONTINUE' | 'LEAVE'): Promise<void> {
    await delay(50)


    // Mock 不執行任何操作,事件由 MockEventEmitter 推送
  }
}
