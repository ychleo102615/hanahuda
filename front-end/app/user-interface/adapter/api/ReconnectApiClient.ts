/**
 * ReconnectApiClient - 重連 API 客戶端
 *
 * @description
 * 實作 ReconnectionPort 介面，負責重連相關的 API 呼叫。
 * 仿照 GameApiClient 設計風格。
 *
 * 功能:
 * - fetchSnapshot (獲取遊戲快照或狀態)
 * - clearPendingEvents (清空事件隊列)
 *
 * 特性:
 * - 超時處理 (預設 5 秒)
 * - 錯誤分類 (NetworkError, ServerError, TimeoutError, ValidationError)
 * - session_token 由 HttpOnly Cookie 自動傳送
 *
 * @example
 * ```typescript
 * const client = new ReconnectApiClient('', eventRouter)
 * const result = await client.fetchSnapshot('game-123')
 *
 * if (result.success) {
 *   switch (result.data.response_type) {
 *     case 'snapshot':
 *       // 恢復遊戲狀態
 *       break
 *     case 'game_finished':
 *       // 顯示遊戲結果
 *       break
 *     case 'game_expired':
 *       // 顯示過期訊息
 *       break
 *   }
 * } else {
 *   // 處理錯誤
 *   console.error('Fetch failed:', result.error)
 * }
 * ```
 *
 * @module user-interface/adapter/api/ReconnectApiClient
 */

import type { SnapshotApiResponse } from '#shared/contracts'
import { ReconnectionPort, type SnapshotResult, type SnapshotError } from '../../application/ports/output'
import type { EventRouter } from '../sse/EventRouter'
import {
  NetworkError,
  ServerError,
  TimeoutError,
  ValidationError,
} from './errors'

/**
 * ReconnectApiClient 建構選項
 */
export interface ReconnectApiClientOptions {
  /**
   * 超時時間（毫秒）
   * @default 5000
   */
  timeout?: number
}

/**
 * ReconnectApiClient 類別
 *
 * @description
 * 實作 ReconnectionPort，提供重連相關的 API 操作。
 * session_token 由 HttpOnly Cookie 自動傳送，無需手動處理。
 */
export class ReconnectApiClient extends ReconnectionPort {
  private readonly baseURL: string
  private readonly timeout: number
  private readonly eventRouter: EventRouter

  /**
   * 建立 ReconnectApiClient 實例
   *
   * @param baseURL - API 基底 URL
   * @param eventRouter - 事件路由器（用於清空事件隊列）
   * @param options - 選項（超時時間等）
   */
  constructor(
    baseURL: string,
    eventRouter: EventRouter,
    options?: ReconnectApiClientOptions
  ) {
    super()
    this.baseURL = baseURL
    this.eventRouter = eventRouter
    this.timeout = options?.timeout ?? 5000
  }

  /**
   * 獲取遊戲快照或遊戲狀態
   *
   * @param gameId - 遊戲 ID
   * @returns Snapshot API 結果，包含三種回應類型：
   *   - `success: true, data.response_type: 'snapshot'` - 正常遊戲快照
   *   - `success: true, data.response_type: 'game_finished'` - 遊戲已結束
   *   - `success: true, data.response_type: 'game_expired'` - 遊戲已過期
   *   - `success: false, error: 'network_error'` - 網路連線失敗
   *   - `success: false, error: 'not_found'` - 遊戲不存在或會話過期
   *   - `success: false, error: 'server_error'` - 伺服器錯誤
   *   - `success: false, error: 'timeout'` - 請求超時
   *
   * @description
   * 呼叫 `/api/v1/games/{gameId}/snapshot` GET API。
   * 自動在 HttpOnly Cookie 中傳送 session_token。
   * 回應類型由後端決定，前端根據 response_type 決定行為。
   *
   * @example
   * ```typescript
   * const result = await client.fetchSnapshot('game-123')
   * if (result.success) {
   *   switch (result.data.response_type) {
   *     case 'snapshot':
   *       handleReconnection.execute(result.data.data)
   *       break
   *     case 'game_finished':
   *       showGameResult(result.data.data)
   *       break
   *     case 'game_expired':
   *       navigateToLobby()
   *       break
   *   }
   * }
   * ```
   */
  async fetchSnapshot(gameId: string): Promise<SnapshotResult> {
    // 1. 驗證輸入
    if (!gameId) {
      console.error('[ReconnectApiClient] Invalid gameId:', gameId)
      return { success: false, error: 'not_found' }
    }

    console.info('[ReconnectApiClient] Fetching game snapshot', { gameId })

    // 2. 發送請求
    try {
      const response = await this.get(`/api/v1/games/${gameId}/snapshot`)

      // 3. 解析回應
      const data = response.data as SnapshotApiResponse
      console.info('[ReconnectApiClient] Snapshot API response received', {
        gameId,
        responseType: data.response_type,
      })

      return { success: true, data }
    } catch (error) {
      // 4. 處理錯誤
      return { success: false, error: this.mapErrorToSnapshotError(error) }
    }
  }

  /**
   * 清空事件處理鏈
   *
   * @description
   * 丟棄所有累積的未處理事件。
   * 用於頁面恢復可見或 SSE 重連成功時，
   * 確保不會處理過時的累積事件。
   *
   * @example
   * ```typescript
   * // 重連前先清空舊事件
   * client.clearPendingEvents()
   * const result = await client.fetchSnapshot(gameId)
   * ```
   */
  clearPendingEvents(): void {
    console.info('[ReconnectApiClient] Clearing pending events')
    this.eventRouter.clearEventChain()
  }

  /**
   * 發送 GET 請求（帶超時處理）
   *
   * @param url - 請求 URL
   * @returns 回應 JSON
   * @throws {NetworkError} 網路連線失敗
   * @throws {ServerError} 伺服器錯誤 (5xx)
   * @throws {TimeoutError} 請求超時
   * @throws {ValidationError} 客戶端錯誤 (4xx)
   *
   * @internal
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async get(url: string): Promise<any> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout)

    try {
      const fullURL = `${this.baseURL}${url}`
      const response = await fetch(fullURL, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: controller.signal,
        credentials: 'same-origin', // 讓瀏覽器自動附上 Cookie（包含 session_token）
      })

      clearTimeout(timeoutId)

      // 處理 HTTP 錯誤
      if (!response.ok) {
        const status = response.status

        // 4xx 錯誤 -> ValidationError
        if (status >= 400 && status < 500) {
          if (status === 401 || status === 404) {
            throw new ValidationError('遊戲不存在或已過期')
          }
          throw new ValidationError('請求失敗')
        }

        // 5xx 錯誤 -> ServerError
        if (status >= 500) {
          throw new ServerError(status, `伺服器錯誤 (${status})`)
        }

        throw new Error(`HTTP ${status}`)
      }

      // 解析 JSON
      return await response.json()
    } catch (error: unknown) {
      clearTimeout(timeoutId)

      // AbortError -> TimeoutError
      if (error instanceof Error && error.name === 'AbortError') {
        console.warn('[ReconnectApiClient] Request timeout', { url })
        throw new TimeoutError()
      }

      // TypeError -> NetworkError
      if (error instanceof TypeError) {
        console.error('[ReconnectApiClient] Network error', { url, error })
        throw new NetworkError()
      }

      // 其他錯誤直接拋出
      throw error
    }
  }

  /**
   * 將錯誤映射為 SnapshotError 類型
   *
   * @param error - 錯誤物件
   * @returns SnapshotError 類型
   *
   * @internal
   */
  private mapErrorToSnapshotError(error: unknown): SnapshotError {
    if (error instanceof TimeoutError) {
      console.warn('[ReconnectApiClient] Timeout error')
      return 'timeout'
    }

    if (error instanceof NetworkError) {
      console.warn('[ReconnectApiClient] Network error')
      return 'network_error'
    }

    if (error instanceof ServerError) {
      console.error('[ReconnectApiClient] Server error', { status: error.status })
      return 'server_error'
    }

    if (error instanceof ValidationError) {
      console.warn('[ReconnectApiClient] Validation error (not found)')
      return 'not_found'
    }

    // 未知錯誤視為網路錯誤
    console.error('[ReconnectApiClient] Unknown error', error)
    return 'network_error'
  }
}
