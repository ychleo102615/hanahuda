/**
 * User Interface BC - Domain Layer 卡片資料庫
 *
 * 此檔案定義標準花札牌組的完整 48 張卡片,使用語義化常數命名。
 *
 * 命名規則: {月份羅馬拼音}_{特徵描述}
 * - 光牌: {MONTH}_HIKARI
 * - 種牌: {MONTH}_{動物名}
 * - 短冊: {MONTH}_{AKATAN/AOTAN/TAN}
 * - かす: {MONTH}_KASU_{序號}
 *
 * @module user-interface/domain/card-database
 * @version 1.0.0
 * @since 2025-11-13
 */

import type { Card } from './types'

// ============================================================================
// 1月 - 松 (MATSU)
// ============================================================================

export const MATSU_HIKARI: Readonly<Card> = Object.freeze({
  card_id: '0111',
  month: 1,
  type: 'BRIGHT',
  display_name: '松鶴',
})

export const MATSU_AKATAN: Readonly<Card> = Object.freeze({
  card_id: '0131',
  month: 1,
  type: 'RIBBON',
  display_name: '松赤短',
})

export const MATSU_KASU_1: Readonly<Card> = Object.freeze({
  card_id: '0141',
  month: 1,
  type: 'PLAIN',
  display_name: '松かす1',
})

export const MATSU_KASU_2: Readonly<Card> = Object.freeze({
  card_id: '0142',
  month: 1,
  type: 'PLAIN',
  display_name: '松かす2',
})

// ============================================================================
// 2月 - 梅 (UME)
// ============================================================================

export const UME_UGUISU: Readonly<Card> = Object.freeze({
  card_id: '0221',
  month: 2,
  type: 'ANIMAL',
  display_name: '梅鶯',
})

export const UME_AKATAN: Readonly<Card> = Object.freeze({
  card_id: '0231',
  month: 2,
  type: 'RIBBON',
  display_name: '梅赤短',
})

export const UME_KASU_1: Readonly<Card> = Object.freeze({
  card_id: '0241',
  month: 2,
  type: 'PLAIN',
  display_name: '梅かす1',
})

export const UME_KASU_2: Readonly<Card> = Object.freeze({
  card_id: '0242',
  month: 2,
  type: 'PLAIN',
  display_name: '梅かす2',
})

// ============================================================================
// 3月 - 櫻 (SAKURA)
// ============================================================================

export const SAKURA_HIKARI: Readonly<Card> = Object.freeze({
  card_id: '0311',
  month: 3,
  type: 'BRIGHT',
  display_name: '櫻幕',
})

export const SAKURA_AKATAN: Readonly<Card> = Object.freeze({
  card_id: '0331',
  month: 3,
  type: 'RIBBON',
  display_name: '櫻赤短',
})

export const SAKURA_KASU_1: Readonly<Card> = Object.freeze({
  card_id: '0341',
  month: 3,
  type: 'PLAIN',
  display_name: '櫻かす1',
})

export const SAKURA_KASU_2: Readonly<Card> = Object.freeze({
  card_id: '0342',
  month: 3,
  type: 'PLAIN',
  display_name: '櫻かす2',
})

// ============================================================================
// 4月 - 藤 (FUJI)
// ============================================================================

export const FUJI_HOTOTOGISU: Readonly<Card> = Object.freeze({
  card_id: '0421',
  month: 4,
  type: 'ANIMAL',
  display_name: '藤不如歸',
})

export const FUJI_TAN: Readonly<Card> = Object.freeze({
  card_id: '0431',
  month: 4,
  type: 'RIBBON',
  display_name: '藤短冊',
})

export const FUJI_KASU_1: Readonly<Card> = Object.freeze({
  card_id: '0441',
  month: 4,
  type: 'PLAIN',
  display_name: '藤かす1',
})

export const FUJI_KASU_2: Readonly<Card> = Object.freeze({
  card_id: '0442',
  month: 4,
  type: 'PLAIN',
  display_name: '藤かす2',
})

// ============================================================================
// 5月 - 菖蒲 (AYAME)
// ============================================================================

export const AYAME_KAKITSUBATA: Readonly<Card> = Object.freeze({
  card_id: '0521',
  month: 5,
  type: 'ANIMAL',
  display_name: '菖蒲燕子花',
})

export const AYAME_TAN: Readonly<Card> = Object.freeze({
  card_id: '0531',
  month: 5,
  type: 'RIBBON',
  display_name: '菖蒲短冊',
})

export const AYAME_KASU_1: Readonly<Card> = Object.freeze({
  card_id: '0541',
  month: 5,
  type: 'PLAIN',
  display_name: '菖蒲かす1',
})

export const AYAME_KASU_2: Readonly<Card> = Object.freeze({
  card_id: '0542',
  month: 5,
  type: 'PLAIN',
  display_name: '菖蒲かす2',
})

// ============================================================================
// 6月 - 牡丹 (BOTAN)
// ============================================================================

export const BOTAN_CHOU: Readonly<Card> = Object.freeze({
  card_id: '0621',
  month: 6,
  type: 'ANIMAL',
  display_name: '牡丹蝶',
})

export const BOTAN_AOTAN: Readonly<Card> = Object.freeze({
  card_id: '0631',
  month: 6,
  type: 'RIBBON',
  display_name: '牡丹青短',
})

export const BOTAN_KASU_1: Readonly<Card> = Object.freeze({
  card_id: '0641',
  month: 6,
  type: 'PLAIN',
  display_name: '牡丹かす1',
})

export const BOTAN_KASU_2: Readonly<Card> = Object.freeze({
  card_id: '0642',
  month: 6,
  type: 'PLAIN',
  display_name: '牡丹かす2',
})

// ============================================================================
// 7月 - 萩 (HAGI)
// ============================================================================

export const HAGI_INO: Readonly<Card> = Object.freeze({
  card_id: '0721',
  month: 7,
  type: 'ANIMAL',
  display_name: '萩豬',
})

export const HAGI_TAN: Readonly<Card> = Object.freeze({
  card_id: '0731',
  month: 7,
  type: 'RIBBON',
  display_name: '萩短冊',
})

export const HAGI_KASU_1: Readonly<Card> = Object.freeze({
  card_id: '0741',
  month: 7,
  type: 'PLAIN',
  display_name: '萩かす1',
})

export const HAGI_KASU_2: Readonly<Card> = Object.freeze({
  card_id: '0742',
  month: 7,
  type: 'PLAIN',
  display_name: '萩かす2',
})

// ============================================================================
// 8月 - 芒 (SUSUKI)
// ============================================================================

export const SUSUKI_HIKARI: Readonly<Card> = Object.freeze({
  card_id: '0811',
  month: 8,
  type: 'BRIGHT',
  display_name: '芒月',
})

export const SUSUKI_KARI: Readonly<Card> = Object.freeze({
  card_id: '0821',
  month: 8,
  type: 'ANIMAL',
  display_name: '芒雁',
})

export const SUSUKI_KASU_1: Readonly<Card> = Object.freeze({
  card_id: '0841',
  month: 8,
  type: 'PLAIN',
  display_name: '芒かす1',
})

export const SUSUKI_KASU_2: Readonly<Card> = Object.freeze({
  card_id: '0842',
  month: 8,
  type: 'PLAIN',
  display_name: '芒かす2',
})

// ============================================================================
// 9月 - 菊 (KIKU)
// ============================================================================

export const KIKU_SAKAZUKI: Readonly<Card> = Object.freeze({
  card_id: '0921',
  month: 9,
  type: 'ANIMAL',
  display_name: '菊盃',
})

export const KIKU_AOTAN: Readonly<Card> = Object.freeze({
  card_id: '0931',
  month: 9,
  type: 'RIBBON',
  display_name: '菊青短',
})

export const KIKU_KASU_1: Readonly<Card> = Object.freeze({
  card_id: '0941',
  month: 9,
  type: 'PLAIN',
  display_name: '菊かす1',
})

export const KIKU_KASU_2: Readonly<Card> = Object.freeze({
  card_id: '0942',
  month: 9,
  type: 'PLAIN',
  display_name: '菊かす2',
})

// ============================================================================
// 10月 - 紅葉 (MOMIJI)
// ============================================================================

export const MOMIJI_SHIKA: Readonly<Card> = Object.freeze({
  card_id: '1021',
  month: 10,
  type: 'ANIMAL',
  display_name: '紅葉鹿',
})

export const MOMIJI_AOTAN: Readonly<Card> = Object.freeze({
  card_id: '1031',
  month: 10,
  type: 'RIBBON',
  display_name: '紅葉青短',
})

export const MOMIJI_KASU_1: Readonly<Card> = Object.freeze({
  card_id: '1041',
  month: 10,
  type: 'PLAIN',
  display_name: '紅葉かす1',
})

export const MOMIJI_KASU_2: Readonly<Card> = Object.freeze({
  card_id: '1042',
  month: 10,
  type: 'PLAIN',
  display_name: '紅葉かす2',
})

// ============================================================================
// 11月 - 柳 (YANAGI)
// ============================================================================

export const YANAGI_HIKARI: Readonly<Card> = Object.freeze({
  card_id: '1111',
  month: 11,
  type: 'BRIGHT',
  display_name: '柳小野道風(雨)',
})

export const YANAGI_TSUBAME: Readonly<Card> = Object.freeze({
  card_id: '1121',
  month: 11,
  type: 'ANIMAL',
  display_name: '柳燕',
})

export const YANAGI_TAN: Readonly<Card> = Object.freeze({
  card_id: '1131',
  month: 11,
  type: 'RIBBON',
  display_name: '柳短冊',
})

export const YANAGI_KASU: Readonly<Card> = Object.freeze({
  card_id: '1141',
  month: 11,
  type: 'PLAIN',
  display_name: '柳かす',
})

// ============================================================================
// 12月 - 桐 (KIRI)
// ============================================================================

export const KIRI_HIKARI: Readonly<Card> = Object.freeze({
  card_id: '1211',
  month: 12,
  type: 'BRIGHT',
  display_name: '桐鳳凰',
})

export const KIRI_KASU_1: Readonly<Card> = Object.freeze({
  card_id: '1241',
  month: 12,
  type: 'PLAIN',
  display_name: '桐かす1',
})

export const KIRI_KASU_2: Readonly<Card> = Object.freeze({
  card_id: '1242',
  month: 12,
  type: 'PLAIN',
  display_name: '桐かす2',
})

export const KIRI_KASU_3: Readonly<Card> = Object.freeze({
  card_id: '1243',
  month: 12,
  type: 'PLAIN',
  display_name: '桐かす3',
})

// ============================================================================
// ALL_CARDS - 全部 48 張卡片陣列
// ============================================================================

/**
 * 標準花札牌組的完整定義(48 張卡片)
 *
 * 按月份排序,每月 4 張(除了 11 月和 12 月有特殊配置)
 *
 * 統計資訊:
 * - 光牌 (BRIGHT): 5 張
 * - 種牌 (ANIMAL): 9 張
 * - 短冊 (RIBBON): 10 張
 * - かす (PLAIN): 24 張
 */
export const ALL_CARDS: readonly Readonly<Card>[] = Object.freeze([
  // 1月 - 松 (4張)
  MATSU_HIKARI,
  MATSU_AKATAN,
  MATSU_KASU_1,
  MATSU_KASU_2,

  // 2月 - 梅 (4張)
  UME_UGUISU,
  UME_AKATAN,
  UME_KASU_1,
  UME_KASU_2,

  // 3月 - 櫻 (4張)
  SAKURA_HIKARI,
  SAKURA_AKATAN,
  SAKURA_KASU_1,
  SAKURA_KASU_2,

  // 4月 - 藤 (4張)
  FUJI_HOTOTOGISU,
  FUJI_TAN,
  FUJI_KASU_1,
  FUJI_KASU_2,

  // 5月 - 菖蒲 (4張)
  AYAME_KAKITSUBATA,
  AYAME_TAN,
  AYAME_KASU_1,
  AYAME_KASU_2,

  // 6月 - 牡丹 (4張)
  BOTAN_CHOU,
  BOTAN_AOTAN,
  BOTAN_KASU_1,
  BOTAN_KASU_2,

  // 7月 - 萩 (4張)
  HAGI_INO,
  HAGI_TAN,
  HAGI_KASU_1,
  HAGI_KASU_2,

  // 8月 - 芒 (4張)
  SUSUKI_HIKARI,
  SUSUKI_KARI,
  SUSUKI_KASU_1,
  SUSUKI_KASU_2,

  // 9月 - 菊 (4張)
  KIKU_SAKAZUKI,
  KIKU_AOTAN,
  KIKU_KASU_1,
  KIKU_KASU_2,

  // 10月 - 紅葉 (4張)
  MOMIJI_SHIKA,
  MOMIJI_AOTAN,
  MOMIJI_KASU_1,
  MOMIJI_KASU_2,

  // 11月 - 柳 (4張)
  YANAGI_HIKARI,
  YANAGI_TSUBAME,
  YANAGI_TAN,
  YANAGI_KASU,

  // 12月 - 桐 (4張)
  KIRI_HIKARI,
  KIRI_KASU_1,
  KIRI_KASU_2,
  KIRI_KASU_3,
])
