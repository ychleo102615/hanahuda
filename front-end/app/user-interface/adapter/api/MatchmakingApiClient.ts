/**
 * Matchmaking API Client
 *
 * @description
 * 與配對 API 互動的客戶端。
 *
 * @module app/user-interface/adapter/api/MatchmakingApiClient
 */

import type { RoomTypeId } from '~~/shared/constants/roomTypes'

/**
 * Enter Matchmaking Response
 */
export interface EnterMatchmakingResponse {
  readonly success: boolean
  readonly entry_id?: string
  readonly message: string
  readonly error_code?: string
}

/**
 * Cancel Matchmaking Response
 */
export interface CancelMatchmakingResponse {
  readonly success: boolean
  readonly message: string
  readonly error_code?: string
}

/**
 * Matchmaking API Client
 */
export class MatchmakingApiClient {
  /**
   * 進入配對佇列
   *
   * @param roomType - 房間類型
   * @returns 配對條目 ID
   * @throws 配對失敗時拋出錯誤
   */
  async enterMatchmaking(roomType: RoomTypeId): Promise<string> {
    const response = await $fetch<EnterMatchmakingResponse>('/api/v1/matchmaking/enter', {
      method: 'POST',
      body: { room_type: roomType },
    })

    if (!response.success || !response.entry_id) {
      throw new Error(response.message || 'Failed to enter matchmaking')
    }

    return response.entry_id
  }

  /**
   * 取消配對
   *
   * @param entryId - 配對條目 ID
   * @throws 取消失敗時拋出錯誤
   */
  async cancelMatchmaking(entryId: string): Promise<void> {
    const response = await $fetch<CancelMatchmakingResponse>('/api/v1/matchmaking/cancel', {
      method: 'POST',
      body: { entry_id: entryId },
    })

    if (!response.success) {
      throw new Error(response.message || 'Failed to cancel matchmaking')
    }
  }

  /**
   * 建立配對狀態 SSE 連線
   *
   * @param entryId - 配對條目 ID
   * @returns EventSource 實例
   */
  createStatusConnection(entryId: string): EventSource {
    const url = `/api/v1/matchmaking/status?entry_id=${encodeURIComponent(entryId)}`
    return new EventSource(url)
  }
}

/**
 * 單例實例
 */
let instance: MatchmakingApiClient | null = null

/**
 * 取得 MatchmakingApiClient 單例
 */
export function getMatchmakingApiClient(): MatchmakingApiClient {
  if (!instance) {
    instance = new MatchmakingApiClient()
  }
  return instance
}
