/**
 * useGameReconnection Composable
 *
 * @description
 * 處理頁面重新整理後的遊戲重連邏輯。
 *
 * 當頁面重新載入時：
 * 1. SessionContext 中仍保有 gameId 和 playerId（sessionStorage 跨頁面刷新保留）
 * 2. session_token 仍在 HttpOnly Cookie 中
 * 3. 但 SSE 連線已斷開，需要重新建立
 *
 * 流程：
 * 1. 偵測是否需要重連（hasActiveSession 但 SSE 未連線）
 * 2. 呼叫 /join API（session_token 由 Cookie 自動帶上）
 * 3. 後端偵測到重連，排程推送 GameSnapshotRestore 事件
 * 4. 建立 SSE 連線
 * 5. 狀態透過 SSE 事件恢復
 *
 * @module user-interface/adapter/composables/useGameReconnection
 */

import { useDependency, useOptionalDependency } from './useDependency'
import { useSSEConnection } from './useSSEConnection'
import { useGameMode } from './useGameMode'
import { TOKENS } from '../di/tokens'
import type { SessionContextPort } from '../../application/ports/output/session-context.port'
import type { SendCommandPort } from '../../application/ports/output'
import type { MockEventEmitter } from '../mock/MockEventEmitter'

/**
 * 重連結果
 */
export interface ReconnectionResult {
  /** 是否成功重連 */
  success: boolean
  /** 錯誤訊息（若失敗） */
  error?: string
}

/**
 * useGameReconnection Composable
 *
 * @description
 * 提供頁面重新整理後的遊戲重連功能。
 *
 * @returns reconnectIfNeeded - 檢查並執行重連的函數
 *
 * @example
 * ```typescript
 * const { reconnectIfNeeded } = useGameReconnection()
 *
 * onMounted(async () => {
 *   const result = await reconnectIfNeeded()
 *   if (result.success) {
 *     console.log('遊戲重連成功')
 *   }
 * })
 * ```
 */
export function useGameReconnection() {
  const sessionContext = useDependency<SessionContextPort>(TOKENS.SessionContextPort)
  const sendCommand = useDependency<SendCommandPort>(TOKENS.SendCommandPort)
  const { connect: connectSSE, isConnected } = useSSEConnection()
  const gameMode = useGameMode()

  // Mock 模式下的 MockEventEmitter
  const mockEventEmitter = gameMode === 'mock'
    ? useOptionalDependency<MockEventEmitter>(TOKENS.MockEventEmitter)
    : null

  /**
   * 檢查是否需要重連
   *
   * @returns true 如果有活躍 session 但 SSE 未連線
   */
  function needsReconnection(): boolean {
    return sessionContext.hasActiveSession() && !isConnected.value
  }

  /**
   * 檢查並執行重連（如果需要）
   *
   * @returns 重連結果
   */
  async function reconnectIfNeeded(): Promise<ReconnectionResult> {
    // 不需要重連
    if (!needsReconnection()) {
      return { success: true }
    }

    const gameId = sessionContext.getGameId()
    const playerId = sessionContext.getPlayerId()

    if (!gameId || !playerId) {
      return {
        success: false,
        error: 'Missing game identity information',
      }
    }

    console.info('[useGameReconnection] Reconnection needed', { gameId, playerId })

    try {
      // 1. 呼叫 /join API（提供 game_id 表示重連模式，session_token 由 Cookie 自動帶上）
      // 後端會偵測到這是重連，並排程推送 GameSnapshotRestore 事件
      const response = await sendCommand.joinGame({
        player_id: playerId,
        player_name: 'Player', // 重連時名稱不重要，後端會使用原有名稱
        game_id: gameId, // 提供 game_id 表示重連模式
      })

      console.info('[useGameReconnection] /join API success', {
        gameId: response.game_id,
        playerId: response.player_id,
      })

      // 2. 更新 SessionContext（確保 gameId 與後端一致）
      // 這很重要：如果後端回傳的 game_id 與本地不同，需要更新
      sessionContext.setIdentity({
        gameId: response.game_id,
        playerId: response.player_id,
      })

      // 3. 建立連線（根據遊戲模式）
      if (gameMode === 'backend') {
        // Backend 模式：建立 SSE 連線
        // 後端會在 SSE 連線建立後推送 GameSnapshotRestore 事件
        connectSSE(response.game_id)
        console.info('[useGameReconnection] SSE connection established')
      } else if (gameMode === 'mock' && mockEventEmitter) {
        // Mock 模式：啟動事件腳本
        console.info('[useGameReconnection] Starting mock event emitter')
        mockEventEmitter.start()
      }

      return { success: true }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Reconnection failed'
      console.error('[useGameReconnection] Reconnection failed', error)

      // 清除 session（可能是 session 已過期）
      sessionContext.clearIdentity()

      return {
        success: false,
        error: errorMessage,
      }
    }
  }

  return {
    needsReconnection,
    reconnectIfNeeded,
  }
}
