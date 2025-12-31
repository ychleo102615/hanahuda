/**
 * GameConnectionPortAdapter
 *
 * @description
 * 實作 GameConnectionPort 介面，包裝 SSEConnectionManager 處理遊戲連線。
 *
 * 職責：
 * - 建立/斷開 SSE 連線
 * - 查詢連線狀態
 *
 * @example
 * ```typescript
 * const adapter = createGameConnectionPortAdapter(sseConnectionManager)
 * adapter.connect({ playerId: 'p1', playerName: 'Alice' })
 * ```
 */

import type { GameConnectionPort, GameConnectionParams } from '../../application/ports/output'
import type { SSEConnectionManager } from '../sse/SSEConnectionManager'

/**
 * 建立 GameConnectionPort Adapter
 *
 * @param sseConnectionManager - SSE 連線管理器
 * @returns GameConnectionPort 實作
 */
export function createGameConnectionPortAdapter(
  sseConnectionManager: SSEConnectionManager
): GameConnectionPort {
  return {
    connect(params: GameConnectionParams): void {
      sseConnectionManager.connect(params)
    },

    disconnect(): void {
      sseConnectionManager.disconnect()
    },

    isConnected(): boolean {
      return sseConnectionManager.isConnected()
    },
  }
}
