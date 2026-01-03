/**
 * CheckAuthStatusUseCase
 *
 * @description
 * 檢查當前認證狀態的 Use Case。
 * 若無有效 Session，自動建立訪客身份。
 *
 * 參考: specs/010-player-account/spec.md FR-018
 */

import type { AuthApiPort } from '../ports/auth-api-port'
import type { CurrentPlayer } from '../../domain/current-player'
import { ANONYMOUS_PLAYER } from '../../domain/current-player'

/**
 * 檢查認證狀態 Use Case
 */
export class CheckAuthStatusUseCase {
  constructor(private readonly authApi: AuthApiPort) {}

  /**
   * 執行檢查認證狀態
   *
   * 1. 嘗試取得當前玩家資訊
   * 2. 若 401 錯誤，自動建立訪客
   * 3. 回傳 CurrentPlayer
   */
  async execute(): Promise<CurrentPlayer> {
    try {
      // 1. 嘗試取得當前玩家
      const response = await this.authApi.getCurrentPlayer()
      return response.player
    } catch (error) {
      // 2. 若未認證，自動建立訪客
      if (this.isUnauthorizedError(error)) {
        return this.createGuestFallback()
      }

      // 其他錯誤，返回匿名狀態
      console.error('Failed to check auth status:', error)
      return ANONYMOUS_PLAYER
    }
  }

  /**
   * 建立訪客作為 fallback
   */
  private async createGuestFallback(): Promise<CurrentPlayer> {
    try {
      const response = await this.authApi.createGuest()
      return response.player
    } catch (error) {
      console.error('Failed to create guest:', error)
      return ANONYMOUS_PLAYER
    }
  }

  /**
   * 檢查是否為 401 錯誤
   */
  private isUnauthorizedError(error: unknown): boolean {
    if (error && typeof error === 'object') {
      // Nuxt/H3 錯誤格式
      if ('statusCode' in error && error.statusCode === 401) {
        return true
      }
      // Fetch 錯誤格式
      if ('status' in error && error.status === 401) {
        return true
      }
    }
    return false
  }
}
