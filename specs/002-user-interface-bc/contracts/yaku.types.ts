/**
 * Yaku Type Definitions
 *
 * 役種相關型別定義
 * 來源: doc/shared/game-rules.md, doc/shared/data-contracts.md
 */

/**
 * 役種類型（12 種常用役種，MVP 範圍）
 */
export type YakuType =
  // 光牌系
  | 'GOKO' // 五光（15點）
  | 'SHIKO' // 四光（10點）
  | 'AMESHIKO' // 雨四光（8點）
  | 'SANKO' // 三光（6點）
  // 短冊系
  | 'AKATAN' // 赤短（5點）
  | 'AOTAN' // 青短（5點）
  | 'TAN' // 短冊（5張起算）
  // 種牌系
  | 'INOSHIKACHO' // 豬鹿蝶（5點）
  | 'HANAMIZAKE' // 花見酒（3點）
  | 'TSUKIMIZAKE' // 月見酒（3點）
  | 'TANE' // 種（5張起算）
  // かす系
  | 'KASU' // かす（10張起算）

/**
 * 役種分數 Value Object
 *
 * 不可變物件，代表一個役種與其分數
 */
export interface YakuScore {
  /** 役種類型 */
  readonly yakuType: YakuType
  /** 基礎得分 */
  readonly basePoints: number
}

/**
 * 役種進度 Value Object
 *
 * 用於顯示役種進度提示（如「距離赤短還差 1 張」）
 */
export interface YakuProgress {
  /** 役種類型 */
  readonly yakuType: YakuType
  /** 需要的卡片列表 */
  readonly required: readonly string[]
  /** 已獲得的卡片列表 */
  readonly obtained: readonly string[]
  /** 缺少的卡片列表 */
  readonly missing: readonly string[]
  /** 完成百分比（0-100） */
  readonly progress: number
}

/**
 * 役種基礎分數定義
 */
export const YAKU_BASE_POINTS: Record<YakuType, number> = {
  // 光牌系
  GOKO: 15,
  SHIKO: 10,
  AMESHIKO: 8,
  SANKO: 6,
  // 短冊系
  AKATAN: 5,
  AOTAN: 5,
  TAN: 1, // 5張起算，每多1張加1點
  // 種牌系
  INOSHIKACHO: 5,
  HANAMIZAKE: 3,
  TSUKIMIZAKE: 3,
  TANE: 1, // 5張起算，每多1張加1點
  // かす系
  KASU: 1, // 10張起算，每多1張加1點
} as const

/**
 * 役種顯示名稱（繁體中文）
 */
export const YAKU_DISPLAY_NAMES: Record<YakuType, string> = {
  GOKO: '五光',
  SHIKO: '四光',
  AMESHIKO: '雨四光',
  SANKO: '三光',
  AKATAN: '赤短',
  AOTAN: '青短',
  TAN: '短冊',
  INOSHIKACHO: '豬鹿蝶',
  HANAMIZAKE: '花見酒',
  TSUKIMIZAKE: '月見酒',
  TANE: '種',
  KASU: 'かす',
} as const
