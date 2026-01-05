/**
 * Account Entity
 *
 * @description
 * 已註冊的帳號資訊，與 Player 為 1:1 關係。
 *
 * 參考: specs/010-player-account/data-model.md#1.2-Account
 */

import type { PasswordHash } from './password-hash'
import { VALIDATION_RULES } from '#shared/contracts/identity-types'

// Re-export PlayerId
export type { PlayerId } from '../player/player'
import type { PlayerId } from '../player/player'

// =============================================================================
// Value Objects
// =============================================================================

/**
 * Account ID - UUID v4 branded type
 */
export type AccountId = string & { readonly _brand: unique symbol }

// UUID v4 validation regex
const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/**
 * 驗證 Account ID 是否為有效的 UUID v4
 */
export function isValidAccountId(id: string): id is AccountId {
  return UUID_V4_REGEX.test(id)
}

/**
 * 驗證 Username 是否有效
 *
 * 規則：3-20 字元，僅允許英文字母、數字、底線
 */
export function isValidUsername(username: string): boolean {
  const { minLength, maxLength, pattern } = VALIDATION_RULES.username
  return (
    username.length >= minLength &&
    username.length <= maxLength &&
    pattern.test(username)
  )
}

/**
 * 驗證 Email 是否有效（允許 null）
 */
export function isValidEmail(email: string | null): boolean {
  if (email === null) {
    return true
  }
  return VALIDATION_RULES.email.pattern.test(email)
}

// =============================================================================
// Account Entity
// =============================================================================

/**
 * Account 資料結構
 */
export interface Account {
  readonly id: AccountId
  readonly playerId: PlayerId
  readonly username: string
  readonly email: string | null
  readonly passwordHash: PasswordHash
  readonly createdAt: Date
  readonly updatedAt: Date
}

/**
 * 建立 Account 的參數
 */
export interface CreateAccountParams {
  id: AccountId
  playerId: PlayerId
  username: string
  email: string | null
  passwordHash: PasswordHash
  createdAt: Date
  updatedAt: Date
}

/**
 * 建立 Account
 *
 * @throws Error 如果任何欄位無效
 */
export function createAccount(params: CreateAccountParams): Account {
  if (!isValidAccountId(params.id)) {
    throw new Error(`Invalid account ID: ${params.id}`)
  }

  if (!isValidUsername(params.username)) {
    throw new Error(`Invalid username: must be 3-20 characters, alphanumeric and underscore only`)
  }

  if (!isValidEmail(params.email)) {
    throw new Error(`Invalid email format`)
  }

  return Object.freeze({
    id: params.id,
    playerId: params.playerId,
    username: params.username,
    email: params.email,
    passwordHash: params.passwordHash,
    createdAt: params.createdAt,
    updatedAt: params.updatedAt,
  })
}
