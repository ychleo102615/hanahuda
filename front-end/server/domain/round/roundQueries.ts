/**
 * Round Queries - Domain Layer
 *
 * @description
 * Round 實體的查詢函數。
 * 純 TypeScript，無框架依賴。
 *
 * @module server/domain/round/roundQueries
 */

import type { Round } from './round'
import type { KoiStatus } from './koiStatus'

/**
 * 取得玩家手牌
 *
 * @param round - 局狀態
 * @param playerId - 玩家 ID
 * @returns 玩家手牌（若找不到則回傳空陣列）
 */
export function getPlayerHand(round: Round, playerId: string): readonly string[] {
  const playerState = round.playerStates.find((ps) => ps.playerId === playerId)
  return playerState?.hand ?? []
}

/**
 * 取得玩家獲得區
 *
 * @param round - 局狀態
 * @param playerId - 玩家 ID
 * @returns 玩家獲得區（若找不到則回傳空陣列）
 */
export function getPlayerDepository(round: Round, playerId: string): readonly string[] {
  const playerState = round.playerStates.find((ps) => ps.playerId === playerId)
  return playerState?.depository ?? []
}

/**
 * 取得對手 ID
 *
 * @param round - 局狀態
 * @param playerId - 目前玩家 ID
 * @returns 對手 ID（若找不到則回傳 null）
 */
export function getOpponentId(round: Round, playerId: string): string | null {
  const opponent = round.playerStates.find((ps) => ps.playerId !== playerId)
  return opponent?.playerId ?? null
}

/**
 * 檢查玩家是否為目前行動玩家
 *
 * @param round - 局狀態
 * @param playerId - 玩家 ID
 * @returns 是否為目前行動玩家
 */
export function isActivePlayer(round: Round, playerId: string): boolean {
  return round.activePlayerId === playerId
}

/**
 * 取得玩家的 KoiStatus
 *
 * @param round - 局狀態
 * @param playerId - 玩家 ID
 * @returns KoiStatus（若找不到則回傳 null）
 */
export function getPlayerKoiStatus(round: Round, playerId: string): KoiStatus | null {
  return round.koiStatuses.find((ks) => ks.player_id === playerId) ?? null
}
