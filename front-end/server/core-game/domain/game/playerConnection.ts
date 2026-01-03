/**
 * Player Connection State Management - Domain Layer
 *
 * @description
 * 管理玩家連線狀態的純函數。
 * 用於處理斷線、離開、重連等情境。
 *
 * @module server/domain/game/playerConnection
 */

import type { PlayerConnectionStatus, PlayerConnectionInfo } from '#shared/contracts'
import type { Game } from './game'

/**
 * 標記玩家為斷線狀態
 *
 * @param game - 遊戲
 * @param playerId - 玩家 ID
 * @returns 更新後的遊戲
 */
export function markPlayerDisconnected(game: Game, playerId: string): Game {
  return updatePlayerConnectionStatus(game, playerId, 'DISCONNECTED')
}

/**
 * 標記玩家為已離開狀態
 *
 * @param game - 遊戲
 * @param playerId - 玩家 ID
 * @returns 更新後的遊戲
 */
export function markPlayerLeft(game: Game, playerId: string): Game {
  return updatePlayerConnectionStatus(game, playerId, 'LEFT')
}

/**
 * 標記玩家為已連線狀態（重連）
 *
 * @param game - 遊戲
 * @param playerId - 玩家 ID
 * @returns 更新後的遊戲
 */
export function markPlayerReconnected(game: Game, playerId: string): Game {
  return updatePlayerConnectionStatus(game, playerId, 'CONNECTED')
}

/**
 * 檢查玩家是否斷線或已離開
 *
 * @param game - 遊戲
 * @param playerId - 玩家 ID
 * @returns 是否斷線或已離開
 */
export function isPlayerDisconnectedOrLeft(game: Game, playerId: string): boolean {
  const status = getPlayerConnectionStatus(game, playerId)
  return status === 'DISCONNECTED' || status === 'LEFT'
}

/**
 * 取得玩家連線狀態
 *
 * @param game - 遊戲
 * @param playerId - 玩家 ID
 * @returns 玩家連線狀態（若找不到則回傳 'CONNECTED'）
 */
export function getPlayerConnectionStatus(game: Game, playerId: string): PlayerConnectionStatus {
  const info = game.playerConnectionStatuses.find(s => s.player_id === playerId)
  return info?.status ?? 'CONNECTED'
}

/**
 * 檢查是否有任何玩家斷線或已離開
 *
 * @param game - 遊戲
 * @returns 是否有玩家斷線或已離開
 */
export function hasDisconnectedOrLeftPlayers(game: Game): boolean {
  return game.playerConnectionStatuses.some(
    s => s.status === 'DISCONNECTED' || s.status === 'LEFT'
  )
}

/**
 * 設定玩家需要確認繼續遊戲
 *
 * @param game - 遊戲
 * @param playerId - 玩家 ID
 * @returns 更新後的遊戲
 */
export function setRequireContinueConfirmation(game: Game, playerId: string): Game {
  if (game.pendingContinueConfirmations.includes(playerId)) {
    return game
  }

  return Object.freeze({
    ...game,
    pendingContinueConfirmations: Object.freeze([...game.pendingContinueConfirmations, playerId]),
    updatedAt: new Date(),
  })
}

/**
 * 清除玩家的確認繼續遊戲需求
 *
 * @param game - 遊戲
 * @param playerId - 玩家 ID
 * @returns 更新後的遊戲
 */
export function clearRequireContinueConfirmation(game: Game, playerId: string): Game {
  if (!game.pendingContinueConfirmations.includes(playerId)) {
    return game
  }

  return Object.freeze({
    ...game,
    pendingContinueConfirmations: Object.freeze(
      game.pendingContinueConfirmations.filter(id => id !== playerId)
    ),
    updatedAt: new Date(),
  })
}

/**
 * 檢查玩家是否需要確認繼續遊戲
 *
 * @param game - 遊戲
 * @param playerId - 玩家 ID
 * @returns 是否需要確認
 */
export function isConfirmationRequired(game: Game, playerId: string): boolean {
  return game.pendingContinueConfirmations.includes(playerId)
}

/**
 * 更新玩家連線狀態
 *
 * @param game - 遊戲
 * @param playerId - 玩家 ID
 * @param status - 新狀態
 * @returns 更新後的遊戲
 */
function updatePlayerConnectionStatus(
  game: Game,
  playerId: string,
  status: PlayerConnectionStatus
): Game {
  const updatedStatuses: readonly PlayerConnectionInfo[] = game.playerConnectionStatuses.map(s =>
    s.player_id === playerId
      ? Object.freeze({ ...s, status })
      : s
  )

  return Object.freeze({
    ...game,
    playerConnectionStatuses: Object.freeze(updatedStatuses),
    updatedAt: new Date(),
  })
}
