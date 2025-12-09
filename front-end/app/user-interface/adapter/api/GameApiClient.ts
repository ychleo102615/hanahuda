/**
 * GameApiClient - REST API 客戶端
 *
 * @description
 * 實作 SendCommandPort 介面,負責發送命令到後端伺服器。
 *
 * 功能:
 * - joinGame (加入遊戲,支援重連)
 * - leaveGame (離開遊戲)
 * - playHandCard (打出手牌)
 * - selectTarget (選擇配對目標)
 * - makeDecision (做出 Koi-Koi 決策)
 *
 * 特性:
 * - 自動重試機制 (指數退避,最多 3 次)
 * - 超時處理 (預設 5 秒)
 * - 錯誤分類 (NetworkError, ServerError, TimeoutError, ValidationError)
 * - 友善錯誤訊息 (繁體中文)
 * - session_token 由 HttpOnly Cookie 自動傳送，無需手動處理
 *
 * @module user-interface/adapter/api/GameApiClient
 */

import type { SendCommandPort } from '../../application/ports/output/send-command.port'
import type { SessionContextPort } from '../../application/ports/output/session-context.port'
import {
  NetworkError,
  ServerError,
  TimeoutError,
  ValidationError,
} from './errors'

/**
 * JoinGameResponse 介面（後端回傳格式）
 *
 * @note session_token 不再包含在回應中，改為透過 HttpOnly Cookie 傳送
 */
export interface JoinGameResponse {
  game_id: string
  player_id: string
  sse_endpoint: string
}

/**
 * JoinGameRequest 介面
 */
export interface JoinGameRequest {
  player_id: string
  player_name: string
  session_token?: string
}

/**
 * GameApiClient 建構選項
 */
export interface GameApiClientOptions {
  timeout?: number  // 超時時間 (毫秒),預設 5000ms
}

/**
 * HTTP 錯誤訊息映射表
 */
const ERROR_MESSAGE_MAPPING: Record<number, string> = {
  400: '請求格式錯誤,請稍後再試',
  404: '遊戲不存在或已結束',
  422: '此操作不合法,請檢查遊戲狀態',
  500: '伺服器暫時無法使用,請稍後再試',
  503: '伺服器維護中,請稍後再試',
}

/**
 * 延遲函數
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * GameApiClient 類別
 *
 * @description
 * 透過 DI 注入 SessionContextPort，用於取得 gameId, playerId。
 * session_token 由 HttpOnly Cookie 自動傳送，無需手動處理。
 */
export class GameApiClient implements SendCommandPort {
  private baseURL: string
  private timeout: number
  private sessionContext: SessionContextPort

  constructor(baseURL: string, sessionContext: SessionContextPort, options?: GameApiClientOptions) {
    this.baseURL = baseURL
    this.sessionContext = sessionContext
    this.timeout = options?.timeout || 5000
  }

  /**
   * 加入遊戲
   *
   * @param request - 加入遊戲請求（包含 player_id, player_name, 可選 session_token）
   * @returns JoinGameResponse 物件
   * @throws {NetworkError} 網路連線失敗
   * @throws {ServerError} 伺服器錯誤
   * @throws {TimeoutError} 請求超時
   * @throws {ValidationError} 請求格式錯誤或遊戲不存在
   */
  async joinGame(request: JoinGameRequest): Promise<JoinGameResponse> {
    const url = `${this.baseURL}/api/v1/games/join`
    const body: Record<string, string> = {
      player_id: request.player_id,
      player_name: request.player_name,
    }
    if (request.session_token) {
      body.session_token = request.session_token
    }

    // joinGame 不進行重試 (避免重複加入遊戲)
    const response = await this.post(url, body)
    // 後端包裝在 data 中
    return response.data
  }

  /**
   * 離開遊戲
   *
   * @param gameId - 遊戲 ID
   * @throws {ValidationError} gameId 無效
   * @throws {NetworkError} 網路連線失敗
   * @throws {ServerError} 伺服器錯誤
   * @throws {TimeoutError} 請求超時
   *
   * @description
   * 通知伺服器玩家主動離開遊戲。
   * 客戶端發送後無需等待確認，立即執行後續清理與導航。
   * 不進行重試（離開遊戲是終結性操作）。
   */
  async leaveGame(gameId: string): Promise<void> {
    if (!gameId) {
      throw new ValidationError('遊戲 ID 不可為空')
    }

    const url = `${this.baseURL}/api/v1/games/${gameId}/leave`
    const body = {}

    // leaveGame 不進行重試（終結性操作）
    await this.post(url, body)
  }

  /**
   * 打出手牌
   *
   * @param cardId - 手牌 ID (4 位數字字串)
   * @param matchTargetId - 配對目標 ID (可選)
   * @throws {ValidationError} 無效的卡片 ID 或 gameId 未初始化
   * @throws {NetworkError} 網路連線失敗
   * @throws {ServerError} 伺服器錯誤
   * @throws {TimeoutError} 請求超時
   */
  async playHandCard(cardId: string, matchTargetId?: string): Promise<void> {
    // 驗證輸入
    this.validateCardId(cardId)
    if (matchTargetId) {
      this.validateCardId(matchTargetId)
    }

    // 取得 gameId
    const { gameId } = this.getGameContext()

    // 發送請求 (帶重試)
    const url = `${this.baseURL}/api/v1/games/${gameId}/turns/play-card`
    const body = {
      card_id: cardId,
      ...(matchTargetId && { target_card_id: matchTargetId }),
    }

    await this.postWithRetry(url, body)
  }

  /**
   * 選擇配對目標
   *
   * @param sourceCardId - 來源卡片 ID
   * @param targetCardId - 目標卡片 ID
   * @throws {ValidationError} 無效的卡片 ID 或 gameId 未初始化
   * @throws {NetworkError} 網路連線失敗
   * @throws {ServerError} 伺服器錯誤
   * @throws {TimeoutError} 請求超時
   */
  async selectTarget(sourceCardId: string, targetCardId: string): Promise<void> {
    // 驗證輸入
    this.validateCardId(sourceCardId)
    this.validateCardId(targetCardId)

    // 取得 gameId
    const { gameId } = this.getGameContext()

    // 發送請求 (帶重試)
    const url = `${this.baseURL}/api/v1/games/${gameId}/turns/select-target`
    const body = {
      source_card_id: sourceCardId,
      target_card_id: targetCardId,
    }

    await this.postWithRetry(url, body)
  }

  /**
   * 做出 Koi-Koi 決策
   *
   * @param decision - 決策 ('KOI_KOI' 或 'END_ROUND')
   * @throws {ValidationError} 無效的決策值或 gameId 未初始化
   * @throws {NetworkError} 網路連線失敗
   * @throws {ServerError} 伺服器錯誤
   * @throws {TimeoutError} 請求超時
   */
  async makeDecision(decision: 'KOI_KOI' | 'END_ROUND'): Promise<void> {
    // 驗證輸入
    if (decision !== 'KOI_KOI' && decision !== 'END_ROUND') {
      throw new ValidationError(`無效的決策值: ${decision}`)
    }

    // 取得 gameId
    const { gameId } = this.getGameContext()

    // 發送請求 (帶重試)
    const url = `${this.baseURL}/api/v1/games/${gameId}/rounds/decision`
    const body = { decision }

    await this.postWithRetry(url, body)
  }

  /**
   * 發送 POST 請求 (帶超時處理)
   *
   * @param url - 請求 URL
   * @param body - 請求 Body
   * @returns 回應 JSON
   * @throws {NetworkError} 網路連線失敗
   * @throws {ServerError} 伺服器錯誤
   * @throws {TimeoutError} 請求超時
   * @throws {ValidationError} 4xx 錯誤
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async post(url: string, body: unknown): Promise<any> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout)

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
        // 讓瀏覽器自動附上 Cookie（包含 session_token）
        credentials: 'same-origin',
      })

      clearTimeout(timeoutId)

      // 處理 HTTP 錯誤
      if (!response.ok) {
        const errorText = await response.text()
        const status = response.status

        // 4xx 錯誤 -> ValidationError (不重試)
        if (status >= 400 && status < 500) {
          const message = ERROR_MESSAGE_MAPPING[status] || '請求失敗'
          throw new ValidationError(message)
        }

        // 5xx 錯誤 -> ServerError (可重試)
        if (status >= 500) {
          const message = ERROR_MESSAGE_MAPPING[status] || `伺服器錯誤 (${status})`
          throw new ServerError(status, message)
        }

        // 其他錯誤
        throw new Error(`HTTP ${status}: ${errorText}`)
      }

      // 204 No Content 回應
      if (response.status === 204) {
        return undefined
      }

      // 解析 JSON
      return await response.json()
    } catch (error: unknown) {
      clearTimeout(timeoutId)

      // AbortError -> TimeoutError
      if (error instanceof Error && error.name === 'AbortError') {
        throw new TimeoutError()
      }

      // TypeError -> NetworkError
      if (error instanceof TypeError) {
        throw new NetworkError()
      }

      // 其他錯誤直接拋出
      throw error
    }
  }

  /**
   * 發送 POST 請求 (帶重試機制)
   *
   * @param url - 請求 URL
   * @param body - 請求 Body
   * @param retries - 剩餘重試次數 (預設 3)
   * @returns 回應 JSON
   * @throws 最後一次嘗試的錯誤
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async postWithRetry(url: string, body: unknown, retries = 3): Promise<any> {
    try {
      return await this.post(url, body)
    } catch (error) {
      // 判斷是否可重試
      const isRetryable = this.isRetryableError(error)

      if (retries > 0 && isRetryable) {
        const delay = (4 - retries) * 1000 // 1s, 2s, 3s
        console.warn(
          `[API] 請求失敗,${delay}ms 後重試... (剩餘 ${retries} 次)`,
          error
        )

        await sleep(delay)
        return this.postWithRetry(url, body, retries - 1)
      }

      // 無法重試或達到最大次數
      throw error
    }
  }

  /**
   * 判斷錯誤是否可重試
   *
   * @param error - 錯誤物件
   * @returns 是否可重試
   */
  private isRetryableError(error: unknown): boolean {
    // NetworkError 可重試
    if (error instanceof NetworkError) {
      return true
    }

    // ServerError (5xx) 可重試
    if (error instanceof ServerError) {
      return true
    }

    // ValidationError (4xx) 不重試
    // TimeoutError 不重試
    return false
  }

  /**
   * 驗證卡片 ID 格式
   *
   * @param cardId - 卡片 ID
   * @throws {ValidationError} 格式錯誤
   */
  private validateCardId(cardId: string): void {
    if (!/^\d{4}$/.test(cardId)) {
      throw new ValidationError(`無效的卡片 ID: ${cardId}`)
    }
  }

  /**
   * 取得遊戲上下文 (gameId, playerId)
   *
   * @description
   * 從 SessionContext 取得 session 識別資訊。
   * session_token 由 HttpOnly Cookie 自動傳送，無需在此處理。
   *
   * @returns 遊戲上下文
   * @throws {ValidationError} gameId 或 playerId 未初始化
   */
  private getGameContext(): { gameId: string; playerId: string } {
    const gameId = this.sessionContext.getGameId()
    const playerId = this.sessionContext.getPlayerId()

    if (!gameId) {
      throw new ValidationError('遊戲尚未初始化')
    }
    if (!playerId) {
      throw new ValidationError('玩家 ID 未設定')
    }

    return { gameId, playerId }
  }
}
