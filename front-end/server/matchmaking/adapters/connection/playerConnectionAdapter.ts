/**
 * PlayerConnection Adapter
 *
 * @description
 * PlayerConnectionPort 的實作。
 * 委派給 Gateway 層的 playerConnectionManager。
 *
 * @module server/matchmaking/adapters/connection/playerConnectionAdapter
 */

import { PlayerConnectionPort } from '../../application/ports/output/playerConnectionPort'
import { playerConnectionManager } from '~~/server/gateway/playerConnectionManager'

/**
 * PlayerConnectionAdapter
 */
export class PlayerConnectionAdapter extends PlayerConnectionPort {
  isConnected(playerId: string): boolean {
    return playerConnectionManager.isConnected(playerId)
  }
}

// =============================================================================
// Singleton
// =============================================================================

let instance: PlayerConnectionAdapter | null = null

export function getPlayerConnectionAdapter(): PlayerConnectionAdapter {
  if (!instance) {
    instance = new PlayerConnectionAdapter()
  }
  return instance
}

export function resetPlayerConnectionAdapter(): void {
  instance = null
}
