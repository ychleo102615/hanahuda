/**
 * Auth API Client
 *
 * @description
 * 認證 API 的 HTTP Client 實作。
 *
 * 參考: specs/010-player-account/plan.md - Frontend Adapter Layer
 */

import { AuthApiPort } from '../../application/ports/auth-api-port'
import type { PlayerInfo, AuthResponse, DeleteAccountResponse } from '#shared/contracts/identity-types'

/**
 * Auth API Client
 *
 * 使用 $fetch (Nuxt) 與後端 API 通訊
 */
export class AuthApiClient extends AuthApiPort {
  private readonly baseUrl = '/api/v1/auth'

  async createGuest(): Promise<AuthResponse> {
    return await $fetch<AuthResponse>(`${this.baseUrl}/guest`, {
      method: 'POST',
    })
  }

  async getCurrentPlayer(): Promise<{ player: PlayerInfo }> {
    return await $fetch<{ player: PlayerInfo }>(`${this.baseUrl}/me`, {
      method: 'GET',
    })
  }

  async logout(): Promise<void> {
    await $fetch(`${this.baseUrl}/logout`, {
      method: 'POST',
    })
  }

  async deleteAccount(password?: string): Promise<DeleteAccountResponse> {
    return await $fetch<DeleteAccountResponse>(`${this.baseUrl}/delete-account`, {
      method: 'DELETE',
      body: password ? { password } : undefined,
    })
  }
}

/**
 * 取得 AuthApiClient 實例
 */
export function useAuthApiClient(): AuthApiClient {
  return new AuthApiClient()
}
