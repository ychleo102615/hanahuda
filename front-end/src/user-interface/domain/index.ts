/**
 * User Interface BC - Domain Layer 公開 API
 *
 * 此檔案匯出 Domain Layer 的所有公開介面,包括型別、常數和函數。
 *
 * 使用方式:
 * ```typescript
 * import {
 *   type Card,
 *   type YakuProgress,
 *   MATSU_HIKARI,
 *   isValidCard,
 *   calculateYakuProgress,
 * } from '@/user-interface/domain'
 * ```
 *
 * @module user-interface/domain
 * @version 1.0.0
 * @since 2025-11-14
 */

// ============================================================================
// 型別定義
// ============================================================================

export type { Card, CardType, YakuType, YakuProgress, ValidationResult } from './types'

// ============================================================================
// 卡片資料庫 - 語義化常數
// ============================================================================

export {
  // 1月 - 松 (MATSU)
  MATSU_HIKARI,
  MATSU_AKATAN,
  MATSU_KASU_1,
  MATSU_KASU_2,
  // 2月 - 梅 (UME)
  UME_UGUISU,
  UME_AKATAN,
  UME_KASU_1,
  UME_KASU_2,
  // 3月 - 櫻 (SAKURA)
  SAKURA_HIKARI,
  SAKURA_AKATAN,
  SAKURA_KASU_1,
  SAKURA_KASU_2,
  // 4月 - 藤 (FUJI)
  FUJI_HOTOTOGISU,
  FUJI_TAN,
  FUJI_KASU_1,
  FUJI_KASU_2,
  // 5月 - 菖蒲 (AYAME)
  AYAME_KAKITSUBATA,
  AYAME_TAN,
  AYAME_KASU_1,
  AYAME_KASU_2,
  // 6月 - 牡丹 (BOTAN)
  BOTAN_CHOU,
  BOTAN_AOTAN,
  BOTAN_KASU_1,
  BOTAN_KASU_2,
  // 7月 - 萩 (HAGI)
  HAGI_INO,
  HAGI_TAN,
  HAGI_KASU_1,
  HAGI_KASU_2,
  // 8月 - 芒 (SUSUKI)
  SUSUKI_HIKARI,
  SUSUKI_KARI,
  SUSUKI_KASU_1,
  SUSUKI_KASU_2,
  // 9月 - 菊 (KIKU)
  KIKU_SAKAZUKI,
  KIKU_AOTAN,
  KIKU_KASU_1,
  KIKU_KASU_2,
  // 10月 - 紅葉 (MOMIJI)
  MOMIJI_SHIKA,
  MOMIJI_AOTAN,
  MOMIJI_KASU_1,
  MOMIJI_KASU_2,
  // 11月 - 柳 (YANAGI)
  YANAGI_HIKARI,
  YANAGI_TSUBAME,
  YANAGI_TAN,
  YANAGI_KASU,
  // 12月 - 桐 (KIRI)
  KIRI_HIKARI,
  KIRI_KASU_1,
  KIRI_KASU_2,
  KIRI_KASU_3,
  // 全部卡片陣列
  ALL_CARDS,
} from './card-database'

// ============================================================================
// 卡片邏輯函數
// ============================================================================

export { isValidCard, getCardById, areCardsEqual, getCardTypeFromId } from './card-logic'

// ============================================================================
// 配對驗證函數
// ============================================================================

export { canMatch, findMatchableCards } from './matching'

// ============================================================================
// 客戶端預驗證函數
// ============================================================================

export { validateCardExists, validateTargetInList } from './validation'

// ============================================================================
// 役種進度計算
// ============================================================================

export {
  YAKU_REQUIREMENTS,
  calculateYakuProgress,
  calculateDynamicYakuProgress,
  calculateSankoProgress,
} from './yaku-progress'
