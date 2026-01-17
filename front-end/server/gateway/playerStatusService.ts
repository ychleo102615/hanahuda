/**
 * Player Status Service - 玩家狀態查詢服務
 *
 * @description
 * 查詢玩家目前的狀態（閒置、配對中、遊戲中）。
 * 用於 Gateway WebSocket 連線建立時，決定要發送什麼初始事件。
 *
 * @module server/gateway/playerStatusService
 */

import { getInMemoryMatchmakingPool } from '../matchmaking/adapters/persistence/inMemoryMatchmakingPool'
import { inMemoryGameStore } from '../core-game/adapters/persistence/inMemoryGameStore'
import type { RoomTypeId } from '~~/shared/constants/roomTypes'
import type { GameStatus } from '../core-game/domain/game/game'

/**
 * 玩家狀態：閒置
 */
export interface PlayerStatusIdle {
  readonly status: 'IDLE'
}

/**
 * 玩家狀態：配對中
 */
export interface PlayerStatusMatchmaking {
  readonly status: 'MATCHMAKING'
  readonly entryId: string
  readonly roomType: RoomTypeId
  readonly elapsedSeconds: number
}

/**
 * 玩家狀態：遊戲中
 */
export interface PlayerStatusInGame {
  readonly status: 'IN_GAME'
  readonly gameId: string
  readonly gameStatus: GameStatus
  readonly roomTypeId: RoomTypeId
}

/**
 * 玩家狀態聯合類型
 */
export type PlayerStatus =
  | PlayerStatusIdle
  | PlayerStatusMatchmaking
  | PlayerStatusInGame

/**
 * PlayerStatusService 介面
 */
export interface IPlayerStatusService {
  /**
   * 查詢玩家目前狀態
   *
   * @param playerId - 玩家 ID
   * @returns 玩家狀態
   */
  getPlayerStatus(playerId: string): Promise<PlayerStatus>
}

/**
 * PlayerStatusService 實作
 */
class PlayerStatusService implements IPlayerStatusService {
  async getPlayerStatus(playerId: string): Promise<PlayerStatus> {
    // 1. 檢查是否在配對中
    const pool = getInMemoryMatchmakingPool()
    const entry = await pool.findByPlayerId(playerId)
    if (entry && entry.isMatchable()) {
      return {
        status: 'MATCHMAKING',
        entryId: entry.id,
        roomType: entry.roomType,
        elapsedSeconds: Math.floor((Date.now() - entry.enteredAt.getTime()) / 1000),
      }
    }

    // 2. 檢查是否在遊戲中（優先 in-memory store）
    const game = inMemoryGameStore.getByPlayerId(playerId)
    if (game && (game.status === 'WAITING' || game.status === 'STARTING' || game.status === 'IN_PROGRESS')) {
      return {
        status: 'IN_GAME',
        gameId: game.id,
        gameStatus: game.status,
        roomTypeId: game.roomTypeId,
      }
    }

    // 3. 閒置狀態
    return { status: 'IDLE' }
  }
}

/**
 * PlayerStatusService 單例
 */
export const playerStatusService: IPlayerStatusService = new PlayerStatusService()
