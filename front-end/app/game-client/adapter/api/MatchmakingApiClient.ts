/**
 * Matchmaking API Client
 *
 * @description
 * 配對功能客戶端。使用 REST API 進行配對操作。
 *
 * @module app/game-client/adapter/api/MatchmakingApiClient
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
 * Player Status - IDLE
 */
export interface PlayerStatusIdle {
  readonly status: 'IDLE'
}

/**
 * Player Status - MATCHMAKING
 */
export interface PlayerStatusMatchmaking {
  readonly status: 'MATCHMAKING'
  readonly entryId: string
  readonly roomType: RoomTypeId
  readonly elapsedSeconds: number
}

/**
 * Player Status - IN_GAME
 */
export interface PlayerStatusInGame {
  readonly status: 'IN_GAME'
  readonly gameId: string
  readonly gameStatus: 'WAITING' | 'IN_PROGRESS'
  readonly roomTypeId: RoomTypeId
}

/**
 * Player Status - IN_PRIVATE_ROOM
 */
export interface PlayerStatusInPrivateRoom {
  readonly status: 'IN_PRIVATE_ROOM'
  readonly roomId: string
  readonly roomType: RoomTypeId
}

/**
 * Player Status Union
 */
export type PlayerStatus = PlayerStatusIdle | PlayerStatusMatchmaking | PlayerStatusInGame | PlayerStatusInPrivateRoom

/**
 * Get Player Status Response
 */
export interface GetPlayerStatusResponse {
  readonly success: boolean
  readonly status?: PlayerStatus
  readonly error_code?: string
  readonly message?: string
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
 *
 * @description
 * 使用 REST API 進行配對操作。
 */
export class MatchmakingApiClient {
  /**
   * 進入配對佇列（透過 REST API）
   *
   * @param roomType - 房間類型
   * @throws {MatchmakingError} 配對失敗時拋出錯誤
   */
  async enterMatchmaking(roomType: RoomTypeId): Promise<void> {
    try {
      await $fetch('/api/v1/matchmaking/enter', {
        method: 'POST',
        body: { room_type: roomType },
      })
    } catch (error) {
      // Already a MatchmakingError, re-throw
      if (error instanceof MatchmakingError) {
        throw error
      }

      // Extract server error from FetchError
      const serverError = extractServerError(error)
      if (serverError) {
        throw new MatchmakingError(serverError.errorCode, serverError.message)
      }

      // Network or unknown error
      throw new MatchmakingError('NETWORK_ERROR', 'Failed to send matchmaking request')
    }
  }

  /**
   * 取得玩家狀態
   *
   * @description
   * 查詢玩家目前的狀態（閒置、配對中、遊戲中）。
   * 主要用於 ALREADY_IN_GAME 錯誤處理，取得 roomTypeId 後導向遊戲頁面。
   *
   * @returns 玩家狀態
   * @throws {MatchmakingError} 查詢失敗時拋出錯誤
   */
  async getPlayerStatus(): Promise<PlayerStatus> {
    try {
      const response = await $fetch<GetPlayerStatusResponse>('/api/v1/matchmaking/status', {
        method: 'GET',
      })

      if (!response.success || !response.status) {
        throw new MatchmakingError(
          response.error_code || 'UNKNOWN_ERROR',
          response.message || 'Failed to get player status'
        )
      }

      return response.status
    } catch (error) {
      // Already a MatchmakingError, re-throw
      if (error instanceof MatchmakingError) {
        throw error
      }

      // Extract server error from FetchError
      const serverError = extractServerError(error)
      if (serverError) {
        throw new MatchmakingError(serverError.errorCode, serverError.message)
      }

      // Network or unknown error
      throw new MatchmakingError('NETWORK_ERROR', 'Unable to connect to server')
    }
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
