/**
 * OAuthLoginUseCase
 *
 * @description
 * OAuth 登入的 Use Case。
 * 負責 OAuth code exchange 流程，然後委派給 ExternalAuthLoginUseCase 處理登入邏輯。
 *
 * 職責：
 * 1. 交換授權碼取得 Token（透過 OAuthProviderPort）
 * 2. 取得使用者資訊
 * 3. 轉換為 ExternalUserInfo
 * 4. 委派給 ExternalAuthLoginUseCase 處理登入/建立帳號
 *
 * 參考: specs/010-player-account/spec.md US3 - OAuth 社群登入
 */

import type { OAuthProviderPort } from '../ports/output/oauth-provider-port'
import type { ExternalUserInfo } from '../ports/input/external-user-info'
import { ExternalAuthLoginUseCase } from './external-auth-login-use-case'
import type { CommandResult, AuthError } from '#shared/contracts/auth-commands'
import type { PlayerInfo } from '#shared/contracts/identity-types'

// =============================================================================
// Types
// =============================================================================

/**
 * OAuthLogin 輸入參數
 */
export interface OAuthLoginInput {
  /** OAuth Provider */
  provider: OAuthProviderPort
  /** 授權碼 */
  code: string
  /** 重定向 URI（某些 Provider 需要） */
  redirectUri?: string
  /** PKCE Code Verifier（Google 需要） */
  codeVerifier?: string
}

/**
 * OAuthLogin 輸出結果
 *
 * 注意：此類型與 ExternalAuthLoginResult 對應，但保留 LINK_PROMPT 類型以維持向後相容
 */
export type OAuthLoginResult =
  | { type: 'LOGGED_IN'; player: PlayerInfo; sessionId: string }
  | { type: 'NEW_ACCOUNT'; player: PlayerInfo; sessionId: string }
  | { type: 'AUTO_LINKED'; player: PlayerInfo; sessionId: string }
  | { type: 'LINK_PROMPT'; existingUsername: string; oauthToken: string; sessionId: string }

// =============================================================================
// Use Case
// =============================================================================

/**
 * OAuth 登入 Use Case
 *
 * 此 Use Case 專門處理 OAuth code exchange 流程，
 * 核心登入邏輯委派給 ExternalAuthLoginUseCase。
 */
export class OAuthLoginUseCase {
  constructor(
    private readonly externalAuthLoginUseCase: ExternalAuthLoginUseCase,
  ) {}

  /**
   * 執行 OAuth 登入流程
   *
   * @param input OAuth 登入參數
   * @returns 登入結果
   */
  async execute(input: OAuthLoginInput): Promise<CommandResult<OAuthLoginResult, AuthError>> {
    try {
      const { provider, code, redirectUri, codeVerifier } = input

      // 1. 交換授權碼取得 Token
      const tokenResult = await provider.exchangeCode({
        code,
        redirectUri,
        codeVerifier,
      })

      // 2. 取得使用者資訊
      const oauthUserInfo = await provider.getUserInfo(tokenResult.accessToken)

      // 驗證必要資訊
      if (!oauthUserInfo.providerUserId) {
        return {
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Failed to get user info from OAuth provider',
        }
      }

      // 3. 轉換為 ExternalUserInfo（Application Layer 的抽象 DTO）
      const externalUserInfo: ExternalUserInfo = {
        provider: provider.provider,
        providerUserId: oauthUserInfo.providerUserId,
        email: oauthUserInfo.email,
        displayName: oauthUserInfo.displayName,
      }

      // 4. 委派給 ExternalAuthLoginUseCase 處理登入邏輯
      const result = await this.externalAuthLoginUseCase.execute({
        userInfo: externalUserInfo,
      })

      // 直接回傳結果（類型相容）
      return result as CommandResult<OAuthLoginResult, AuthError>

    } catch (error) {
      return {
        success: false,
        error: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to complete OAuth login',
      }
    }
  }
}
