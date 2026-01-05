/**
 * DELETE /api/v1/auth/delete-account
 *
 * @description
 * 刪除帳號（含所有相關資料）。
 * - 訪客帳號：直接刪除
 * - 已註冊帳號：需密碼確認
 */

import { defineEventHandler, readBody, getCookie, deleteCookie } from 'h3'
import { getIdentityContainer } from '~~/server/identity/adapters/di/container'
import { COOKIE_NAMES } from '#shared/contracts/identity-types'
import { createAuthError } from '~~/server/identity/adapters/http/auth-error-mapper'
import type { DeleteAccountRequest, DeleteAccountResponse } from '#shared/contracts/identity-types'

export default defineEventHandler(async (event): Promise<DeleteAccountResponse> => {
  // 取得 Session ID
  const sessionId = getCookie(event, COOKIE_NAMES.SESSION)

  if (!sessionId) {
    throw createAuthError('UNAUTHORIZED', 'Not authenticated')
  }

  // 讀取請求 Body（可能包含密碼）
  const body = await readBody<DeleteAccountRequest>(event).catch(() => null)

  const { deleteAccountUseCase } = getIdentityContainer()

  const result = await deleteAccountUseCase.execute({
    sessionId,
    password: body?.password,
  })

  if (!result.success) {
    throw createAuthError(result.error, result.message)
  }

  // 清除 Session Cookie（帳號已刪除，Session 也已在 Use Case 中刪除）
  deleteCookie(event, COOKIE_NAMES.SESSION, {
    path: '/',
  })

  // 清除 Guest Cookie（如果有的話）
  deleteCookie(event, COOKIE_NAMES.GUEST, {
    path: '/',
  })

  return {
    success: true,
    message: result.data.message,
  }
})
