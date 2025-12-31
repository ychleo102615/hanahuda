/**
 * Deal Configuration - Domain Layer
 *
 * @description
 * 發牌相關的配置常數。
 *
 * @module server/domain/card/dealConfig
 */

/**
 * 發牌配置常數
 */
export const DEAL_CONFIG = {
  /** 每位玩家的手牌數量 */
  CARDS_PER_PLAYER: 8,
  /** 場牌數量 */
  FIELD_CARDS: 8,
} as const
