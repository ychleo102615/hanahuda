/**
 * POST /api/v1/auth/telegram/verify
 *
 * @description
 * Telegram Mini App initData 驗證端點。
 * 驗證 initData 簽名後執行登入/建立帳號流程。
 *
 * 流程：
 * 1. 接收 initData 字串
 * 2. 透過 TelegramInitDataValidator 驗證簽名
 * 3. 將驗證結果轉換為 ExternalUserInfo
 * 4. 呼叫 ExternalAuthLoginUseCase 處理登入邏輯
 * 5. 設定 Session Cookie 並回傳結果
 */

import { defineEventHandler, readBody, setCookie, createError } from 'h3'
import { getIdentityContainer } from '~~/server/identity/adapters/di/container'
import { COOKIE_NAMES, SESSION_CONFIG } from '#shared/contracts/identity-types'

// =============================================================================
// Types
// =============================================================================

interface TelegramVerifyRequest {
  /** Telegram initData 原始字串 */
  initData: string
}

interface TelegramVerifyResponse {
  /** 登入類型 */
  type: 'LOGGED_IN' | 'NEW_ACCOUNT' | 'AUTO_LINKED'
  /** 玩家資訊 */
  player: {
    id: string
    displayName: string
    isGuest: boolean
    isAuthenticated: boolean
  }
}

// =============================================================================
// Handler
// =============================================================================

export default defineEventHandler(async (event): Promise<TelegramVerifyResponse> => {
  // 1. 讀取 request body
  const body = await readBody<TelegramVerifyRequest>(event)

  if (!body?.initData) {
    throw createError({
      statusCode: 400,
      message: 'Missing initData parameter',
    })
  }

  // 2. 取得 Container 和 Validator
  const container = getIdentityContainer()
  const { telegramValidator, externalAuthLoginUseCase } = container

  if (!telegramValidator) {
    throw createError({
      statusCode: 503,
      message: 'Telegram authentication is not configured. Please set TELEGRAM_BOT_TOKEN environment variable.',
    })
  }

  // 3. 驗證 initData
  const validationResult = telegramValidator.validate(body.initData)

  if (!validationResult.valid) {
    throw createError({
      statusCode: 401,
      message: validationResult.error,
    })
  }

  // 4. 執行登入流程
  const loginResult = await externalAuthLoginUseCase.execute({
    userInfo: validationResult.userInfo,
  })

  if (!loginResult.success) {
    throw createError({
      statusCode: 500,
      message: loginResult.message || 'Telegram login failed',
    })
  }

  // 5. 設定 Session Cookie
  // 注意：Telegram WebView 需要 SameSite: 'none' + Secure: true
  setCookie(event, COOKIE_NAMES.SESSION, loginResult.data.sessionId, {
    httpOnly: true,
    secure: true, // Telegram Mini App 必須使用 HTTPS
    sameSite: 'none', // 跨站請求需要
    maxAge: SESSION_CONFIG.MAX_AGE,
    path: '/',
  })

  // 6. 回傳結果
  return {
    type: loginResult.data.type,
    player: loginResult.data.player,
  }
})
