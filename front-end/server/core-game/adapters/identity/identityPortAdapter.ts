/**
 * IdentityPortAdapter - PlayerIdentityPort 實作
 *
 * @description
 * Core Game BC 透過此 Adapter 呼叫 Identity BC 取得玩家身份。
 * 這是跨 Bounded Context 通訊的橋樑。
 *
 * 依賴：
 * - Identity BC 的 SessionStore（透過 getIdentityContainer）
 *
 * @module server/core-game/adapters/identity/identityPortAdapter
 */

import { getCookie } from 'h3'
import type { H3Event } from 'h3'
import { PlayerIdentityPort } from '../../application/ports/output/playerIdentityPort'
import { getIdentityContainer } from '~~/server/identity/adapters/di/container'
import { COOKIE_NAMES } from '~~/shared/contracts/identity-types'
import type { SessionId } from '~~/server/identity/domain/types/session'

/**
 * Identity Port Adapter
 *
 * @description
 * 實作 PlayerIdentityPort，透過 Identity BC 的 SessionStore 取得玩家身份。
 */
export class IdentityPortAdapter extends PlayerIdentityPort {
  /**
   * 從 HTTP 請求中取得玩家 ID
   *
   * @param event - H3 事件物件
   * @returns playerId 或 null
   *
   * @description
   * 1. 讀取 session_id cookie
   * 2. 查詢 Identity BC 的 SessionStore
   * 3. 檢查 Session 是否過期
   * 4. 回傳 playerId
   */
  async getPlayerIdFromRequest(event: H3Event): Promise<string | null> {
    // 1. 讀取 session cookie
    const sessionId = getCookie(event, COOKIE_NAMES.SESSION)
    if (!sessionId) {
      return null
    }

    // 2. 透過 Identity BC 查詢 Session
    const container = getIdentityContainer()
    const session = await container.sessionStore.findById(sessionId as SessionId)

    if (!session) {
      return null
    }

    // 3. 檢查 Session 是否過期
    if (session.expiresAt <= new Date()) {
      // Session 已過期
      return null
    }

    // 4. 回傳 playerId
    return session.playerId
  }
}

/**
 * 全域 IdentityPortAdapter 實例
 *
 * 使用單例以避免重複建立
 */
let globalAdapter: IdentityPortAdapter | null = null

/**
 * 取得 IdentityPortAdapter 單例
 */
export function getIdentityPortAdapter(): IdentityPortAdapter {
  if (!globalAdapter) {
    globalAdapter = new IdentityPortAdapter()
  }
  return globalAdapter
}
