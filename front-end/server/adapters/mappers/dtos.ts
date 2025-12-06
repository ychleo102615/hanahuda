/**
 * DTO Conversion Functions - Adapter Layer
 *
 * @description
 * Domain types → Shared contracts 轉換函數。
 * 用於將 Domain Layer 的型別轉換為 SSE 事件可用的格式。
 *
 * @module server/adapters/mappers/dtos
 */

import type { FlowState, ScoreMultipliers, NextState, PlayerInfo } from '#shared/contracts'
import type { KoiStatus } from '~~/server/domain/round/koiStatus'
import type { Player } from '~~/server/domain/game/player'

/**
 * 將 KoiStatus 陣列轉換為 ScoreMultipliers
 *
 * @param koiStatuses - 各玩家的 Koi-Koi 狀態
 * @returns 玩家倍率映射
 */
export function toScoreMultipliers(koiStatuses: readonly KoiStatus[]): ScoreMultipliers {
  const playerMultipliers: Record<string, number> = {}

  for (const status of koiStatuses) {
    playerMultipliers[status.player_id] = status.koi_multiplier
  }

  return {
    player_multipliers: playerMultipliers,
  }
}

/**
 * 建立 NextState 物件
 *
 * @param stateType - 流程狀態
 * @param activePlayerId - 目前行動玩家 ID
 * @returns NextState 物件
 */
export function createNextState(stateType: FlowState, activePlayerId: string): NextState {
  return {
    state_type: stateType,
    active_player_id: activePlayerId,
  }
}

/**
 * 將 Player 轉換為 PlayerInfo
 *
 * @param player - Domain Player 實體
 * @returns PlayerInfo DTO
 */
export function toPlayerInfo(player: Player): PlayerInfo {
  return {
    player_id: player.id,
    player_name: player.name,
    is_ai: player.isAi,
  }
}

/**
 * 將 Player 陣列轉換為 PlayerInfo 陣列
 *
 * @param players - Domain Player 實體陣列
 * @returns PlayerInfo DTO 陣列
 */
export function toPlayerInfoList(players: readonly Player[]): PlayerInfo[] {
  return players.map(toPlayerInfo)
}
