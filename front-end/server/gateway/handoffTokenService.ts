/**
 * Handoff Token Service
 *
 * @description
 * 為多實例部署架構（方案 C）提供連線切換 Token 服務。
 * 當配對服務（單實例）配對成功後，發放短期 Token 給玩家，
 * 玩家持此 Token 連接到遊戲伺服器（多實例）。
 *
 * Token 格式：Base64 編碼的 JSON，包含 HMAC-SHA256 簽名。
 * Token 有效期：30 秒（足夠完成連線切換）
 *
 * @example
 * ```typescript
 * // 配對成功後，建立 Token
 * const token = handoffTokenService.createToken(playerId, gameId)
 *
 * // 遊戲伺服器驗證 Token
 * const payload = handoffTokenService.verifyToken(token)
 * if (payload) {
 *   // 驗證成功，payload 包含 playerId 和 gameId
 * }
 * ```
 *
 * @module server/gateway/handoffTokenService
 */

import { createHmac } from 'crypto'
import { logger } from '../utils/logger'

// ============================================================================
// Types
// ============================================================================

/**
 * Handoff Token Payload
 */
export interface HandoffPayload {
  /** 玩家 ID */
  readonly playerId: string
  /** 遊戲 ID */
  readonly gameId: string
}

/**
 * Token 內部結構（包含過期時間和簽名）
 */
interface TokenData {
  /** Payload */
  readonly payload: HandoffPayload
  /** 過期時間戳（毫秒） */
  readonly exp: number
  /** HMAC 簽名 */
  readonly sig: string
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Token 有效期（毫秒）
 * 30 秒對於連線切換已經非常充裕
 */
const TOKEN_EXPIRY_MS = 30_000

/**
 * Token 簽名金鑰
 *
 * @description
 * 從環境變數讀取，若未設定則使用開發用預設值。
 * 生產環境必須設定 HANDOFF_SECRET 環境變數。
 */
function getSecret(): string {
  const secret = process.env.HANDOFF_SECRET
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      logger.error('HANDOFF_SECRET is not set in production environment')
    }
    return 'dev-handoff-secret-change-in-production'
  }
  return secret
}

// ============================================================================
// Handoff Token Service
// ============================================================================

/**
 * IHandoffTokenService 介面
 */
export interface IHandoffTokenService {
  /**
   * 建立 Handoff Token
   *
   * @param playerId - 玩家 ID
   * @param gameId - 遊戲 ID
   * @returns Token 字串
   */
  createToken(playerId: string, gameId: string): string

  /**
   * 驗證 Handoff Token
   *
   * @param token - Token 字串
   * @returns 驗證成功返回 payload，失敗返回 null
   */
  verifyToken(token: string): HandoffPayload | null
}

/**
 * Handoff Token Service 實作
 */
class HandoffTokenService implements IHandoffTokenService {
  /**
   * 建立 HMAC 簽名
   *
   * @param data - 要簽名的資料
   * @returns 簽名字串
   */
  private sign(data: string): string {
    return createHmac('sha256', getSecret()).update(data).digest('base64url')
  }

  createToken(playerId: string, gameId: string): string {
    const payload: HandoffPayload = { playerId, gameId }
    const exp = Date.now() + TOKEN_EXPIRY_MS

    // 建立簽名（不包含 sig 欄位本身）
    const dataToSign = JSON.stringify({ payload, exp })
    const sig = this.sign(dataToSign)

    // 組合完整 Token
    const tokenData: TokenData = { payload, exp, sig }
    const token = Buffer.from(JSON.stringify(tokenData)).toString('base64url')

    logger.info('Handoff token created', { playerId, gameId, expiresIn: TOKEN_EXPIRY_MS / 1000 })
    return token
  }

  verifyToken(token: string): HandoffPayload | null {
    try {
      // 解碼 Token
      const decoded = Buffer.from(token, 'base64url').toString('utf-8')
      const tokenData: TokenData = JSON.parse(decoded)

      // 檢查過期時間
      if (Date.now() > tokenData.exp) {
        logger.warn('Handoff token expired', { playerId: tokenData.payload.playerId })
        return null
      }

      // 驗證簽名
      const dataToVerify = JSON.stringify({ payload: tokenData.payload, exp: tokenData.exp })
      const expectedSig = this.sign(dataToVerify)

      if (tokenData.sig !== expectedSig) {
        logger.warn('Handoff token signature invalid')
        return null
      }

      logger.info('Handoff token verified', { playerId: tokenData.payload.playerId })
      return tokenData.payload
    } catch (error) {
      logger.warn('Handoff token parse error', { error })
      return null
    }
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

/**
 * 全域 Handoff Token Service 實例
 */
export const handoffTokenService: IHandoffTokenService = new HandoffTokenService()
