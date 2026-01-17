/**
 * WsSendCommandAdapter - WebSocket 命令發送 Adapter
 *
 * @description
 * 實作 SendCommandPort 介面，透過 WebSocket 發送命令到後端伺服器。
 * 取代原本的 REST API 客戶端 (GameApiClient)。
 *
 * 功能:
 * - leaveGame (離開遊戲)
 * - playHandCard (打出手牌)
 * - selectTarget (選擇配對目標)
 * - makeDecision (做出 Koi-Koi 決策)
 * - confirmContinue (確認繼續遊戲)
 *
 * 特性:
 * - 透過 WebSocket 雙向通訊
 * - 命令回應等待機制（Promise-based）
 * - 錯誤處理與轉換
 *
 * @module app/game-client/adapter/ws/WsSendCommandAdapter
 */

import type { SendCommandPort } from '../../application/ports/output/send-command.port'
import type { GameStatePort } from '../../application/ports/output/game-state.port'
import type { GatewayWebSocketClient } from './GatewayWebSocketClient'
import {
  createPlayCardCommand,
  createSelectTargetCommand,
  createMakeDecisionCommand,
  createConfirmContinueCommand,
  createLeaveGameCommand,
} from '#shared/contracts'
import { ValidationError, ApiError } from '../api/errors'

/**
 * 產生唯一命令 ID
 */
function generateCommandId(): string {
  return `cmd-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

/**
 * WsSendCommandAdapter 類別
 *
 * @description
 * 透過 DI 注入 GatewayWebSocketClient 和 GameStatePort。
 * GameStatePort 用於取得 currentGameId。
 */
export class WsSendCommandAdapter implements SendCommandPort {
  /**
   * @param wsClient - WebSocket 客戶端實例
   * @param gameState - 遊戲狀態 Port（取得 currentGameId）
   */
  constructor(
    private readonly wsClient: GatewayWebSocketClient,
    private readonly gameState: GameStatePort
  ) {}

  /**
   * 離開遊戲
   *
   * @param gameId - 遊戲 ID
   * @throws {ValidationError} gameId 無效
   * @throws {ApiError} 伺服器拒絕
   *
   * @description
   * 通知伺服器玩家主動離開遊戲。
   */
  async leaveGame(gameId: string): Promise<void> {
    if (!gameId) {
      throw new ValidationError('Game ID cannot be empty')
    }

    const command = createLeaveGameCommand(generateCommandId(), gameId)
    const response = await this.wsClient.sendCommand(command)

    if (!response.success) {
      throw this.createErrorFromResponse(response.error)
    }
  }

  /**
   * 打出手牌
   *
   * @param cardId - 手牌 ID (4 位數字字串)
   * @param matchTargetId - 配對目標 ID (可選)
   * @throws {ValidationError} 無效的卡片 ID 或 gameId 未初始化
   * @throws {ApiError} 伺服器拒絕
   */
  async playHandCard(cardId: string, matchTargetId?: string): Promise<void> {
    // 驗證輸入
    this.validateCardId(cardId)
    if (matchTargetId) {
      this.validateCardId(matchTargetId)
    }

    // 取得 gameId
    const gameId = this.getGameId()

    // 發送命令
    const command = createPlayCardCommand(generateCommandId(), gameId, cardId, matchTargetId)
    const response = await this.wsClient.sendCommand(command)

    if (!response.success) {
      throw this.createErrorFromResponse(response.error)
    }
  }

  /**
   * 選擇配對目標
   *
   * @param sourceCardId - 來源卡片 ID
   * @param targetCardId - 目標卡片 ID
   * @throws {ValidationError} 無效的卡片 ID 或 gameId 未初始化
   * @throws {ApiError} 伺服器拒絕
   */
  async selectTarget(sourceCardId: string, targetCardId: string): Promise<void> {
    // 驗證輸入
    this.validateCardId(sourceCardId)
    this.validateCardId(targetCardId)

    // 取得 gameId
    const gameId = this.getGameId()

    // 發送命令
    const command = createSelectTargetCommand(generateCommandId(), gameId, sourceCardId, targetCardId)
    const response = await this.wsClient.sendCommand(command)

    if (!response.success) {
      throw this.createErrorFromResponse(response.error)
    }
  }

  /**
   * 做出 Koi-Koi 決策
   *
   * @param decision - 決策 ('KOI_KOI' 或 'END_ROUND')
   * @throws {ValidationError} 無效的決策值或 gameId 未初始化
   * @throws {ApiError} 伺服器拒絕
   */
  async makeDecision(decision: 'KOI_KOI' | 'END_ROUND'): Promise<void> {
    // 驗證輸入
    if (decision !== 'KOI_KOI' && decision !== 'END_ROUND') {
      throw new ValidationError(`Invalid decision: ${decision}`)
    }

    // 取得 gameId
    const gameId = this.getGameId()

    // 發送命令
    const command = createMakeDecisionCommand(generateCommandId(), gameId, decision)
    const response = await this.wsClient.sendCommand(command)

    if (!response.success) {
      throw this.createErrorFromResponse(response.error)
    }
  }

  /**
   * 確認繼續遊戲
   *
   * @description
   * 當玩家因閒置而需要確認繼續遊戲時，調用此方法。
   * 若超時未確認，遊戲將自動結束。
   *
   * @param decision - 玩家決策：繼續遊戲或離開
   * @throws {ValidationError} gameId 未初始化
   * @throws {ApiError} 伺服器拒絕
   */
  async confirmContinue(decision: 'CONTINUE' | 'LEAVE'): Promise<void> {
    // 取得 gameId
    const gameId = this.getGameId()

    // 發送命令
    const command = createConfirmContinueCommand(generateCommandId(), gameId, decision)
    const response = await this.wsClient.sendCommand(command)

    if (!response.success) {
      throw this.createErrorFromResponse(response.error)
    }
  }

  /**
   * 驗證卡片 ID 格式
   *
   * @param cardId - 卡片 ID
   * @throws {ValidationError} 格式錯誤
   * @private
   */
  private validateCardId(cardId: string): void {
    if (!/^\d{4}$/.test(cardId)) {
      throw new ValidationError(`Invalid card ID: ${cardId}`)
    }
  }

  /**
   * 取得遊戲 ID
   *
   * @returns 遊戲 ID
   * @throws {ValidationError} gameId 未初始化
   * @private
   */
  private getGameId(): string {
    const gameId = this.gameState.getCurrentGameId()

    if (!gameId) {
      throw new ValidationError('Game not initialized')
    }

    return gameId
  }

  /**
   * 從回應錯誤建立 ApiError
   *
   * @param error - 回應中的錯誤資訊
   * @returns ApiError 實例
   * @private
   */
  private createErrorFromResponse(error?: { code: string; message: string }): ApiError {
    if (!error) {
      return new ApiError(500, null, 'Unknown error')
    }

    // 將錯誤碼轉換為 HTTP 狀態碼（簡化處理）
    // 實際狀態碼可能需要根據錯誤類型調整
    const status = error.code.startsWith('VALIDATION') ? 400 : 500

    return new ApiError(status, error.code as never, error.message)
  }
}
