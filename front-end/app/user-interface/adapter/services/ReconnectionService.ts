/**
 * ReconnectionService - 重連服務
 *
 * @description
 * 實作 ReconnectionPort，提供重連相關的基礎設施操作。
 * 封裝 EventRouter 的事件清理和 Snapshot API 呼叫。
 *
 * 職責:
 * - 呼叫 `/api/v1/games/{gameId}/snapshot` API 獲取遊戲快照
 * - 呼叫 EventRouter.clearEventChain() 清空累積事件
 *
 * 使用方式:
 * ```typescript
 * const reconnectionService = new ReconnectionService(eventRouter)
 * await reconnectionService.fetchSnapshot(gameId)
 * reconnectionService.clearPendingEvents()
 * ```
 */

import type { GameSnapshotRestore } from '#shared/contracts'
import { ReconnectionPort } from '../../application/ports/output'
import type { EventRouter } from '../sse/EventRouter'

export class ReconnectionService extends ReconnectionPort {
  constructor(private readonly eventRouter: EventRouter) {
    super()
  }

  /**
   * 獲取遊戲快照
   *
   * @param gameId - 遊戲 ID
   * @returns 遊戲快照，若獲取失敗則返回 null
   */
  async fetchSnapshot(gameId: string): Promise<GameSnapshotRestore | null> {
    try {
      console.info('[ReconnectionService] Fetching game snapshot', { gameId })

      const response = await $fetch<{ data: GameSnapshotRestore }>(
        `/api/v1/games/${gameId}/snapshot`,
        {
          method: 'GET',
          credentials: 'include', // Include HttpOnly Cookie
        }
      )

      console.info('[ReconnectionService] Snapshot fetched successfully', {
        gameId: response.data.game_id,
        flowStage: response.data.current_flow_stage,
      })

      return response.data
    } catch (error) {
      // Handle various error states
      if (error instanceof Error) {
        const fetchError = error as { statusCode?: number }

        if (fetchError.statusCode === 401) {
          console.warn('[ReconnectionService] Session expired')
        } else if (fetchError.statusCode === 404) {
          console.warn('[ReconnectionService] Game not found')
        } else if (fetchError.statusCode === 410) {
          console.warn('[ReconnectionService] Game already finished')
        } else {
          console.error('[ReconnectionService] Failed to fetch snapshot', error)
        }
      } else {
        console.error('[ReconnectionService] Failed to fetch snapshot (unknown error)', error)
      }

      return null
    }
  }

  /**
   * Clear pending events in the event chain
   */
  clearPendingEvents(): void {
    console.info('[ReconnectionService] Clearing pending events')
    this.eventRouter.clearEventChain()
  }
}
