/**
 * User Interface BC - Domain Layer 役種進度計算
 *
 * 此檔案提供役種進度計算功能,用於 UI 提示用戶距離達成特定役種還差多少張牌。
 *
 * 主要功能:
 * - 固定役種進度計算 (赤短、青短、豬鹿蝶、月見酒、花見酒、五光、四光、雨四光)
 * - 動態役種進度計算 (短冊、種、かす)
 * - 特殊役種處理 (三光 - 排除雨光)
 *
 * @module game-client/domain/yaku-progress
 * @version 1.0.0
 * @since 2025-11-14
 */

import type { Card, YakuType, YakuProgress } from './types'
import { areCardsEqual } from './card-logic'
import {
  // 赤短 (AKATAN)
  MATSU_AKATAN,
  UME_AKATAN,
  SAKURA_AKATAN,
  // 青短 (AOTAN)
  BOTAN_AOTAN,
  KIKU_AOTAN,
  MOMIJI_AOTAN,
  // 光牌 (BRIGHT)
  MATSU_HIKARI,
  SAKURA_HIKARI,
  SUSUKI_HIKARI,
  YANAGI_HIKARI,
  KIRI_HIKARI,
  // 豬鹿蝶 (INOSHIKACHO)
  HAGI_INO,
  MOMIJI_SHIKA,
  BOTAN_CHOU,
  // 月見酒 (TSUKIMI)
  KIKU_SAKAZUKI,
  // ALL_CARDS
  ALL_CARDS,
} from './card-database'

// ============================================================================
// 役種需求映射
// ============================================================================

/**
 * 役種需求映射
 *
 * 定義每種固定役種所需的卡片列表。
 * 動態役種 (TAN, KASU, TANE) 使用專門的函數計算。
 */
export const YAKU_REQUIREMENTS: Readonly<
  Partial<Record<YakuType, readonly Card[]>>
> = Object.freeze({
  // === 短冊系 ===
  AKATAN: [MATSU_AKATAN, UME_AKATAN, SAKURA_AKATAN],
  AOTAN: [BOTAN_AOTAN, KIKU_AOTAN, MOMIJI_AOTAN],

  // === 光牌系 ===
  GOKO: [
    MATSU_HIKARI, // 松上鶴
    SAKURA_HIKARI, // 櫻上幕
    SUSUKI_HIKARI, // 芒上月
    YANAGI_HIKARI, // 柳上小野道風 (雨光)
    KIRI_HIKARI, // 桐上鳳凰
  ],

  SHIKO: [
    MATSU_HIKARI, // 四光：不含雨光
    SAKURA_HIKARI,
    SUSUKI_HIKARI,
    KIRI_HIKARI,
  ],

  AMESHIKO: [
    MATSU_HIKARI, // 雨四光：包含雨光,任選 4 張
    SAKURA_HIKARI,
    SUSUKI_HIKARI,
    YANAGI_HIKARI,
  ],

  // SANKO 使用專門的 calculateSankoProgress() 函數

  // === 種牌系 ===
  INOSHIKACHO: [HAGI_INO, MOMIJI_SHIKA, BOTAN_CHOU],
  TSUKIMI: [SUSUKI_HIKARI, KIKU_SAKAZUKI], // 芒月 (光牌) + 菊盃
  HANAMI: [SAKURA_HIKARI, KIKU_SAKAZUKI], // 櫻幕 (光牌) + 菊盃

  // === 動態役種 ===
  // TAN, KASU, TANE 使用專門的 calculateDynamicYakuProgress() 函數
})

// ============================================================================
// 固定役種進度計算
// ============================================================================

/**
 * 計算固定役種進度
 *
 * 適用於需要特定卡片組合的役種 (如赤短、豬鹿蝶、五光等)。
 *
 * @param yakuType - 役種類型
 * @param depositoryCards - 用戶已獲得的卡片列表
 * @returns 役種進度資訊
 *
 * @example
 * ```typescript
 * const progress = calculateYakuProgress("AKATAN", [MATSU_AKATAN, UME_AKATAN]);
 * // { required: [3張], obtained: [2張], missing: [1張], progress: 66.67 }
 * ```
 */
export function calculateYakuProgress(
  yakuType: Exclude<YakuType, 'SANKO' | 'TAN' | 'KASU' | 'TANE'>,
  depositoryCards: readonly Card[]
): YakuProgress {
  const required = YAKU_REQUIREMENTS[yakuType]

  if (!required) {
    throw new Error(
      `Invalid yakuType: ${yakuType}. Use calculateDynamicYakuProgress() for TAN/KASU/TANE or calculateSankoProgress() for SANKO.`
    )
  }

  // 計算已獲得的卡片 (集合交集)
  const obtained = required.filter((reqCard) =>
    depositoryCards.some((depCard) => areCardsEqual(reqCard, depCard))
  )

  // 計算缺少的卡片 (集合差集)
  const missing = required.filter(
    (reqCard) => !obtained.some((obtCard) => areCardsEqual(reqCard, obtCard))
  )

  // 計算完成百分比
  const progress = (obtained.length / required.length) * 100

  return {
    required,
    obtained,
    missing,
    progress,
  }
}

// ============================================================================
// 動態役種進度計算 (TAN, KASU, TANE)
// ============================================================================

/**
 * 計算動態役種進度
 *
 * 適用於需要達到一定數量即可的役種:
 * - TAN (短冊): 5 張以上短冊
 * - KASU (かす): 10 張以上かす
 * - TANE (種): 5 張以上種牌
 *
 * @param yakuType - 動態役種類型 ("TAN" | "KASU" | "TANE")
 * @param depositoryCards - 用戶已獲得的卡片列表
 * @returns 役種進度資訊
 *
 * @example
 * ```typescript
 * const progress = calculateDynamicYakuProgress("TAN", [MATSU_AKATAN, UME_AKATAN, SAKURA_AKATAN]);
 * // { required: [5張], obtained: [3張], missing: [2張], progress: 60 }
 * ```
 */
export function calculateDynamicYakuProgress(
  yakuType: 'TAN' | 'KASU' | 'TANE',
  depositoryCards: readonly Card[]
): YakuProgress {
  // 定義最小需求數量和卡片類型
  const config = {
    TAN: { minRequired: 5, cardType: 'RIBBON' as const },
    KASU: { minRequired: 10, cardType: 'PLAIN' as const },
    TANE: { minRequired: 5, cardType: 'ANIMAL' as const },
  }

  const { minRequired, cardType } = config[yakuType]

  // 過濾出已獲得的該類型卡片
  const obtained = depositoryCards.filter((card) => card.type === cardType)

  // 計算完成百分比 (最多 100%)
  const progress = Math.min((obtained.length / minRequired) * 100, 100)

  // 從 ALL_CARDS 中獲取該類型的所有卡片
  const allCardsOfType = ALL_CARDS.filter((card) => card.type === cardType)

  // required 為達成基礎要求的任意卡片 (取前 minRequired 張)
  const required = allCardsOfType.slice(0, minRequired)

  // 計算缺少的卡片數量
  const missingCount = Math.max(0, minRequired - obtained.length)
  const missing =
    missingCount > 0
      ? allCardsOfType
          .filter(
            (card) => !obtained.some((obtCard) => areCardsEqual(card, obtCard))
          )
          .slice(0, missingCount)
      : []

  return {
    required,
    obtained,
    missing,
    progress,
  }
}

// ============================================================================
// 特殊役種: 三光 (SANKO)
// ============================================================================

/**
 * 計算三光 (SANKO) 進度
 *
 * 三光有特殊規則:
 * - 需要 3 張光牌
 * - **排除雨光** (柳上小野道風 YANAGI_HIKARI)
 * - 從 4 張非雨光牌中任選 3 張
 *
 * @param depositoryCards - 用戶已獲得的卡片列表
 * @returns 役種進度資訊
 *
 * @example
 * ```typescript
 * const progress = calculateSankoProgress([MATSU_HIKARI, SAKURA_HIKARI]);
 * // { required: [3張非雨光], obtained: [2張], missing: [1張], progress: 66.67 }
 * ```
 */
export function calculateSankoProgress(
  depositoryCards: readonly Card[]
): YakuProgress {
  // 可用於三光的光牌 (排除雨光)
  const eligibleBrights: readonly Card[] = [
    MATSU_HIKARI, // 松上鶴
    SAKURA_HIKARI, // 櫻上幕
    SUSUKI_HIKARI, // 芒上月
    KIRI_HIKARI, // 桐上鳳凰
  ]

  // 計算已獲得的合法光牌
  const obtained = eligibleBrights.filter((reqCard) =>
    depositoryCards.some((depCard) => areCardsEqual(reqCard, depCard))
  )

  // 需要任意 3 張非雨光牌
  const requiredCount = 3
  const required = eligibleBrights.slice(0, requiredCount)

  // 計算缺少的卡片
  const missingCount = Math.max(0, requiredCount - obtained.length)
  const missing =
    missingCount > 0
      ? eligibleBrights
          .filter(
            (card) => !obtained.some((obtCard) => areCardsEqual(card, obtCard))
          )
          .slice(0, missingCount)
      : []

  // 計算完成百分比 (最多 100%)
  const progress = Math.min((obtained.length / requiredCount) * 100, 100)

  return {
    required,
    obtained,
    missing,
    progress,
  }
}
