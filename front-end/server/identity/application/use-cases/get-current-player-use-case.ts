/**
 * GetCurrentPlayerUseCase
 *
 * @description
 * 取得當前玩家資訊的 Use Case。
 * 包含 Session 驗證與滑動過期處理 (FR-012)。
 *
 * 參考: specs/010-player-account/spec.md FR-012, FR-018
 */

import { isSessionExpired, type SessionId } from '../../domain/types/session'
import type { PlayerRepositoryPort } from '../ports/output/player-repository-port'
import type { SessionStorePort } from '../ports/output/session-store-port'
import type { CommandResult, AuthError } from '#shared/contracts/auth-commands'
import type { PlayerInfo } from '#shared/contracts/identity-types'

// =============================================================================
// Types
// =============================================================================

/**
 * GetCurrentPlayer 輸入參數
 */
export interface GetCurrentPlayerInput {
  sessionId: string
}

// =============================================================================
// Use Case
// =============================================================================

/**
 * 取得當前玩家資訊 Use Case
 */
export class GetCurrentPlayerUseCase {
  constructor(
    private readonly playerRepository: PlayerRepositoryPort,
    private readonly sessionStore: SessionStorePort,
  ) {}

  /**
   * 執行取得當前玩家流程
   *
   * 1. 驗證 Session ID 存在
   * 2. 從 Session Store 取得 Session
   * 3. 檢查 Session 是否過期
   * 4. 刷新 Session（滑動過期）
   * 5. 從 Repository 取得 Player
   * 6. 回傳 PlayerInfo
   */
  async execute(input: GetCurrentPlayerInput): Promise<CommandResult<PlayerInfo, AuthError>> {
    try {
      // 1. 驗證 Session ID
      if (!input.sessionId) {
        return {
          success: false,
          error: 'UNAUTHORIZED',
          message: 'Session ID is required',
        }
      }

      // 2. 取得 Session
      const session = await this.sessionStore.findById(input.sessionId as SessionId)
      if (!session) {
        return {
          success: false,
          error: 'UNAUTHORIZED',
          message: 'Session not found',
        }
      }

      // 3. 檢查過期
      if (isSessionExpired(session)) {
        // 刪除過期 Session
        await this.sessionStore.delete(session.id)
        return {
          success: false,
          error: 'UNAUTHORIZED',
          message: 'Session expired',
        }
      }

      // 4. 刷新 Session（滑動過期 FR-012）
      await this.sessionStore.refresh(session)

      // 5. 取得 Player
      const player = await this.playerRepository.findById(session.playerId)
      if (!player) {
        return {
          success: false,
          error: 'NOT_FOUND',
          message: 'Player not found',
        }
      }

      // 6. 回傳 PlayerInfo
      return {
        success: true,
        data: {
          id: player.id,
          displayName: player.displayName,
          isGuest: player.isGuest,
          isAuthenticated: true,
        },
      }
    } catch (error) {
      return {
        success: false,
        error: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get current player',
      }
    }
  }
}
