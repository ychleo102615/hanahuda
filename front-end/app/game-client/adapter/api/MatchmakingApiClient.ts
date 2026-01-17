/**
 * Matchmaking API Client
 *
 * @description
 * 配對功能客戶端。使用 WebSocket 命令進行配對操作。
 *
 * @module app/game-client/adapter/api/MatchmakingApiClient
 */

import type { RoomTypeId } from '~~/shared/constants/roomTypes'
import { createJoinMatchmakingCommand } from '#shared/contracts'
import type { GatewayWebSocketClient } from '../ws/GatewayWebSocketClient'

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
 * Player Status Union
 */
export type PlayerStatus = PlayerStatusIdle | PlayerStatusMatchmaking | PlayerStatusInGame

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
 * 產生唯一命令 ID
 */
function generateCommandId(): string {
  return `cmd-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Matchmaking API Client
 *
 * @description
 * 使用 WebSocket 命令進行配對操作。
 * 確保 WebSocket 連線建立後才能發送配對命令，避免 Race Condition。
 */
export class MatchmakingApiClient {
  private wsClient: GatewayWebSocketClient | null = null

  /**
   * 設定 WebSocket 客戶端
   *
   * @description
   * 由 DI 容器在 WebSocket 連線建立後注入。
   */
  setWebSocketClient(client: GatewayWebSocketClient): void {
    this.wsClient = client
  }

  /**
   * 進入配對佇列（透過 WebSocket）
   *
   * @param roomType - 房間類型
   * @throws {MatchmakingError} 配對失敗時拋出錯誤
   *
   * @description
   * 透過 WebSocket 發送 JOIN_MATCHMAKING 命令。
   * 必須先建立 WebSocket 連線並呼叫 setWebSocketClient。
   */
  async enterMatchmaking(roomType: RoomTypeId): Promise<void> {
    if (!this.wsClient) {
      throw new MatchmakingError('NOT_CONNECTED', 'WebSocket not connected. Please wait for connection.')
    }

    if (!this.wsClient.isConnected()) {
      throw new MatchmakingError('NOT_CONNECTED', 'WebSocket connection lost. Please try again.')
    }

    try {
      const command = createJoinMatchmakingCommand(generateCommandId(), roomType)
      const response = await this.wsClient.sendCommand(command)

      if (!response.success) {
        const error = response.error
        throw new MatchmakingError(
          error?.code || 'UNKNOWN_ERROR',
          error?.message || 'Failed to enter matchmaking'
        )
      }
    } catch (error) {
      // Already a MatchmakingError, re-throw
      if (error instanceof MatchmakingError) {
        throw error
      }

      // WebSocket error
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
