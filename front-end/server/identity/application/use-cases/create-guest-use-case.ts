/**
 * CreateGuestUseCase
 *
 * @description
 * 建立訪客玩家的 Use Case。
 * 自動生成 Guest_XXXX 格式的顯示名稱並建立 Session。
 *
 * 參考: specs/010-player-account/spec.md US1 - 訪客遊玩
 */

import { createGuestPlayer, type Player } from '../../domain/player/player'
import { createSession } from '../../domain/types/session'
import type { PlayerRepositoryPort } from '../ports/output/player-repository-port'
import type { SessionStorePort } from '../ports/output/session-store-port'
import type { CommandResult, AuthError } from '#shared/contracts/auth-commands'

// =============================================================================
// Types
// =============================================================================

/**
 * CreateGuest 執行結果
 */
export interface CreateGuestResult {
  player: Player
  sessionId: string
}

// =============================================================================
// Use Case
// =============================================================================

/**
 * 建立訪客玩家 Use Case
 */
export class CreateGuestUseCase {
  constructor(
    private readonly playerRepository: PlayerRepositoryPort,
    private readonly sessionStore: SessionStorePort,
  ) {}

  /**
   * 執行建立訪客流程
   *
   * 1. 建立訪客 Player（自動生成 UUID 與 Guest_XXXX 名稱）
   * 2. 儲存 Player 到 Repository
   * 3. 建立 Session
   * 4. 儲存 Session 到 Store
   * 5. 回傳 Player 資訊與 Session ID
   */
  async execute(): Promise<CommandResult<CreateGuestResult, AuthError>> {
    try {
      // 1. 建立訪客 Player
      const guestPlayer = createGuestPlayer()

      // 2. 儲存 Player
      const savedPlayer = await this.playerRepository.save(guestPlayer)

      // 3. 建立 Session
      const session = createSession(savedPlayer.id)

      // 4. 儲存 Session
      await this.sessionStore.save(session)

      // 5. 回傳結果
      return {
        success: true,
        data: {
          player: savedPlayer,
          sessionId: session.id,
        },
      }
    } catch (error) {
      return {
        success: false,
        error: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to create guest player',
      }
    }
  }
}
