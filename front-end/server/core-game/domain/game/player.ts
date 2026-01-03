/**
 * Player Entity - Domain Layer
 *
 * @description
 * 代表遊戲中的玩家（人類或 AI）。
 * 純 TypeScript，無框架依賴。
 *
 * @module server/domain/game/player
 */

/**
 * Player Entity
 *
 * 不可變物件，代表遊戲參與者。
 */
export interface Player {
  /** 玩家 ID (UUID v4) */
  readonly id: string
  /** 玩家名稱 (1-50 字元) */
  readonly name: string
  /** 是否為 AI 對手 */
  readonly isAi: boolean
}

/**
 * 建立玩家參數
 */
export interface CreatePlayerParams {
  readonly id: string
  readonly name: string
  readonly isAi: boolean
}

/**
 * 建立玩家實體
 *
 * @param params - 玩家參數
 * @returns 不可變的 Player 物件
 * @throws Error 如果名稱長度不在 1-50 字元範圍內
 */
export function createPlayer(params: CreatePlayerParams): Player {
  const { id, name, isAi } = params

  // 驗證名稱長度
  if (name.length < 1 || name.length > 50) {
    throw new Error(`Player name must be between 1 and 50 characters, got ${name.length}`)
  }

  return Object.freeze({
    id,
    name,
    isAi,
  })
}

/**
 * AI 對手的預設名稱
 */
export const AI_PLAYER_DEFAULT_NAME = 'AI Opponent'

/**
 * 建立 AI 對手玩家
 *
 * @param id - AI 玩家的 UUID
 * @returns 不可變的 AI Player 物件
 */
export function createAiPlayer(id: string): Player {
  return createPlayer({
    id,
    name: AI_PLAYER_DEFAULT_NAME,
    isAi: true,
  })
}

/**
 * 檢查玩家是否為 AI
 *
 * @param player - 玩家物件
 * @returns 是否為 AI
 */
export function isAiPlayer(player: Player): boolean {
  return player.isAi
}
