/**
 * AccountLinkingService
 *
 * @description
 * 處理 OAuth 帳號連結邏輯的 Domain Service。
 *
 * 參考: specs/010-player-account/spec.md FR-006a, FR-006b
 */

import type { Account, AccountId } from '../account/account'

// =============================================================================
// Types
// =============================================================================

/**
 * 連結動作類型
 */
export type LinkAction =
  | { action: 'AUTO_LINK'; account: Account }
  | { action: 'ALREADY_LINKED'; accountId: AccountId }
  | { action: 'CREATE_NEW' }
  | { action: 'PROMPT_LINK'; existingUsername: string }

/**
 * 決定連結動作的輸入
 */
export interface DetermineLinkActionInput {
  oauthEmail: string | null
  existingAccountByEmail: Account | null
  existingOAuthLink: { accountId: AccountId } | null
}

// =============================================================================
// Pure Functions
// =============================================================================

/**
 * 判斷是否可以自動連結 (FR-006a)
 *
 * 當 OAuth Email 與現有帳號 Email 相同時，返回 true
 */
export function canAutoLink(oauthEmail: string | null, account: Account): boolean {
  if (!oauthEmail || !account.email) {
    return false
  }

  return oauthEmail.toLowerCase() === account.email.toLowerCase()
}

// =============================================================================
// Service Class
// =============================================================================

/**
 * 帳號連結服務
 */
export class AccountLinkingService {
  /**
   * 根據 Email 查找帳號
   */
  findAccountByEmail(email: string, accounts: Account[]): Account | null {
    const normalizedEmail = email.toLowerCase()
    return accounts.find(
      (account) => account.email?.toLowerCase() === normalizedEmail
    ) ?? null
  }

  /**
   * 決定連結動作
   *
   * @param input - 連結決策輸入
   * @returns 應執行的連結動作
   */
  determineLinkAction(input: DetermineLinkActionInput): LinkAction {
    const { oauthEmail, existingAccountByEmail, existingOAuthLink } = input

    // 1. 已經連結過
    if (existingOAuthLink) {
      return {
        action: 'ALREADY_LINKED',
        accountId: existingOAuthLink.accountId,
      }
    }

    // 2. Email 匹配現有帳號 - 自動連結 (FR-006a)
    if (existingAccountByEmail && oauthEmail) {
      if (canAutoLink(oauthEmail, existingAccountByEmail)) {
        return {
          action: 'AUTO_LINK',
          account: existingAccountByEmail,
        }
      }
    }

    // 3. 無匹配 - 建立新帳號
    return {
      action: 'CREATE_NEW',
    }
  }
}
