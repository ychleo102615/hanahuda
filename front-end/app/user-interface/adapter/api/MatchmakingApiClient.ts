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
 * Matchmaking Error
 *
 * @description
 * 配對失敗時拋出的錯誤，包含伺服器回傳的錯誤代碼與訊息。
 */
export class MatchmakingError extends Error {
  constructor(
    public readonly errorCode: string,
    message: string
  ) {
    super(message)
    this.name = 'MatchmakingError'
  }
}

/**
 * Extract error from $fetch FetchError
 */
function extractServerError(error: unknown): { errorCode: string; message: string } | null {
  if (
    error &&
    typeof error === 'object' &&
    'data' in error &&
    error.data &&
    typeof error.data === 'object'
  ) {
    const data = error.data as { error_code?: string; message?: string }
    if (data.error_code && data.message) {
      return { errorCode: data.error_code, message: data.message }
    }
  }
  return null
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
   * @throws {MatchmakingError} 配對失敗時拋出錯誤（包含伺服器錯誤代碼與訊息）
   */
  async enterMatchmaking(roomType: RoomTypeId): Promise<string> {
    try {
      const response = await $fetch<EnterMatchmakingResponse>('/api/v1/matchmaking/enter', {
        method: 'POST',
        body: { room_type: roomType },
      })

      if (!response.success || !response.entry_id) {
        throw new MatchmakingError(
          response.error_code || 'UNKNOWN_ERROR',
          response.message || 'Failed to enter matchmaking'
        )
      }

      return response.entry_id
    } catch (error) {
      // Already a MatchmakingError, re-throw
      if (error instanceof MatchmakingError) {
        throw error
      }

      // Extract server error from FetchError (400/4xx responses)
      const serverError = extractServerError(error)
      if (serverError) {
        throw new MatchmakingError(serverError.errorCode, serverError.message)
      }

      // Network or unknown error
      throw new MatchmakingError('NETWORK_ERROR', 'Unable to connect to server')
    }
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
