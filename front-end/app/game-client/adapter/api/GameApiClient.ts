/**
 * GameApiClient - REST API 命令發送客戶端
 *
 * @description
 * 實作 SendCommandPort 介面，透過 REST API 發送遊戲命令到後端伺服器。
 *
 * 功能:
 * - leaveGame (離開遊戲)
 * - playHandCard (打出手牌)
 * - selectTarget (選擇配對目標)
 * - makeDecision (做出 Koi-Koi 決策)
 * - confirmContinue (確認繼續遊戲)
 *
 * @module app/game-client/adapter/api/GameApiClient
 */

import type { SendCommandPort } from '../../application/ports/output/send-command.port'
import type { GameStatePort } from '../../application/ports/output/game-state.port'
import { ValidationError, ApiError } from './errors'

/**
 * 命令超時時間（毫秒）
 */
const COMMAND_TIMEOUT_MS = 5000

/**
 * 最大重試次數
 */
const MAX_RETRIES = 3

/**
 * 重試延遲（指數退避）
 */
const RETRY_DELAYS = [500, 1000, 2000]

/**
 * 判斷錯誤是否可重試
 */
function isRetryable(status: number): boolean {
  // 5xx 伺服器錯誤和 408 超時可以重試
  return status >= 500 || status === 408
}

/**
 * GameApiClient 類別
 */
export class GameApiClient implements SendCommandPort {
  constructor(
    private readonly gameState: GameStatePort
  ) {}

  async leaveGame(gameId: string): Promise<void> {
    if (!gameId) {
      throw new ValidationError('Game ID cannot be empty')
    }
    await this.post(`/api/v1/games/${gameId}/leave`, {})
  }

  async playHandCard(cardId: string, matchTargetId?: string): Promise<void> {
    this.validateCardId(cardId)
    if (matchTargetId) {
      this.validateCardId(matchTargetId)
    }

    const gameId = this.getGameId()

    await this.post(`/api/v1/games/${gameId}/turns/play-card`, {
      card_id: cardId,
      target_card_id: matchTargetId,
    })
  }

  async selectTarget(sourceCardId: string, targetCardId: string): Promise<void> {
    this.validateCardId(sourceCardId)
    this.validateCardId(targetCardId)

    const gameId = this.getGameId()

    await this.post(`/api/v1/games/${gameId}/turns/select-target`, {
      source_card_id: sourceCardId,
      target_card_id: targetCardId,
    })
  }

  async makeDecision(decision: 'KOI_KOI' | 'END_ROUND'): Promise<void> {
    if (decision !== 'KOI_KOI' && decision !== 'END_ROUND') {
      throw new ValidationError(`Invalid decision: ${decision}`)
    }

    const gameId = this.getGameId()

    await this.post(`/api/v1/games/${gameId}/rounds/decision`, {
      decision,
    })
  }

  async confirmContinue(decision: 'CONTINUE' | 'LEAVE'): Promise<void> {
    const gameId = this.getGameId()

    await this.post(`/api/v1/games/${gameId}/confirm-continue`, {
      decision,
    })
  }

  /**
   * 發送 POST 請求（含重試）
   * @private
   */
  private async post(url: string, body: Record<string, unknown>): Promise<void> {
    let lastError: Error | null = null

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), COMMAND_TIMEOUT_MS)

        try {
          const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            credentials: 'same-origin',
            signal: controller.signal,
          })

          clearTimeout(timeoutId)

          if (response.ok) {
            return
          }

          // 解析錯誤回應
          const errorBody = await response.json().catch(() => null) as {
            error?: { code?: string; message?: string }
          } | null

          const errorCode = errorBody?.error?.code ?? 'UNKNOWN_ERROR'
          const errorMessage = errorBody?.error?.message ?? `HTTP ${response.status}`

          // 不可重試的錯誤立即拋出
          if (!isRetryable(response.status)) {
            const status = errorCode.startsWith('VALIDATION') ? 400 : response.status
            throw new ApiError(status, errorCode as never, errorMessage)
          }

          lastError = new ApiError(response.status, errorCode as never, errorMessage)
        } finally {
          clearTimeout(timeoutId)
        }
      } catch (error) {
        if (error instanceof ValidationError || error instanceof ApiError) {
          throw error
        }

        // AbortError = 超時
        if (error instanceof DOMException && error.name === 'AbortError') {
          lastError = new ApiError(408, null, 'Request timeout')
        } else {
          lastError = new ApiError(0, null, 'Network error')
        }
      }

      // 重試延遲
      if (attempt < MAX_RETRIES) {
        const delay = RETRY_DELAYS[attempt] ?? 2000
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }

    // 所有重試都失敗
    throw lastError ?? new ApiError(500, null, 'Request failed after retries')
  }

  private validateCardId(cardId: string): void {
    if (!/^\d{4}$/.test(cardId)) {
      throw new ValidationError(`Invalid card ID: ${cardId}`)
    }
  }

  private getGameId(): string {
    const gameId = this.gameState.getCurrentGameId()
    if (!gameId) {
      throw new ValidationError('Game not initialized')
    }
    return gameId
  }
}
