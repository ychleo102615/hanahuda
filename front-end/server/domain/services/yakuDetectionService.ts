/**
 * YakuDetectionService - Domain Service
 *
 * @description
 * 役種檢測引擎：根據獲得區卡片判斷成立的役種。
 * 純函數，無外部依賴。
 *
 * 參考: doc/shared/game-rules.md
 *
 * @module server/domain/services/yakuDetectionService
 */

import type { Yaku, YakuSetting } from '#shared/contracts'

// ============================================================
// 卡片分類常數
// ============================================================

/**
 * 光牌（5 張）
 * - 0111: 松鶴
 * - 0311: 櫻幕
 * - 0811: 芒月
 * - 1111: 柳小野道風（雨）
 * - 1211: 桐鳳凰
 */
export const HIKARI_CARDS = Object.freeze([
  '0111', // 松鶴
  '0311', // 櫻幕
  '0811', // 芒月
  '1111', // 柳小野道風（雨）
  '1211', // 桐鳳凰
])

/**
 * 非雨光牌（4 張，不含 1111 柳小野道風）
 */
export const HIKARI_WITHOUT_RAIN = Object.freeze([
  '0111', // 松鶴
  '0311', // 櫻幕
  '0811', // 芒月
  '1211', // 桐鳳凰
])

/**
 * 雨牌（柳小野道風）
 */
export const RAIN_CARD = '1111'

/**
 * 種牌（10 張）
 */
export const TANE_CARDS = Object.freeze([
  '0221', // 梅鶯
  '0421', // 藤不如歸
  '0521', // 菖蒲燕子花
  '0621', // 牡丹蝶
  '0721', // 萩豬
  '0821', // 芒雁
  '0921', // 菊盃
  '1021', // 紅葉鹿
  '1121', // 柳燕
])

/**
 * 豬鹿蝶所需卡片
 */
export const INOSHIKACHO_CARDS = Object.freeze([
  '0721', // 萩豬
  '1021', // 紅葉鹿
  '0621', // 牡丹蝶
])

/**
 * 花見酒所需卡片
 */
export const HANAMI_CARDS = Object.freeze([
  '0311', // 櫻幕
  '0921', // 菊盃
])

/**
 * 月見酒所需卡片
 */
export const TSUKIMI_CARDS = Object.freeze([
  '0811', // 芒月
  '0921', // 菊盃
])

/**
 * 短冊牌（10 張）
 */
export const TANZAKU_CARDS = Object.freeze([
  '0131', // 松赤短
  '0231', // 梅赤短
  '0331', // 櫻赤短（みよしの）
  '0431', // 藤短冊
  '0531', // 菖蒲短冊
  '0631', // 牡丹青短
  '0731', // 萩短冊
  '0931', // 菊青短
  '1031', // 紅葉青短
  '1131', // 柳短冊
])

/**
 * 赤短（3 張，有字的紅色短冊）
 */
export const AKATAN_CARDS = Object.freeze([
  '0131', // 松赤短（あかよろし）
  '0231', // 梅赤短（あかよろし）
  '0331', // 櫻赤短（みよしの）
])

/**
 * 青短（3 張，有字的藍色短冊）
 */
export const AOTAN_CARDS = Object.freeze([
  '0631', // 牡丹青短
  '0931', // 菊青短
  '1031', // 紅葉青短
])

/**
 * かす牌（24 張）
 */
export const KASU_CARDS = Object.freeze([
  '0141', '0142', // 松かす
  '0241', '0242', // 梅かす
  '0341', '0342', // 櫻かす
  '0441', '0442', // 藤かす
  '0541', '0542', // 菖蒲かす
  '0641', '0642', // 牡丹かす
  '0741', '0742', // 萩かす
  '0841', '0842', // 芒かす
  '0941', '0942', // 菊かす
  '1041', '1042', // 紅葉かす
  '1141',         // 柳かす（只有 1 張）
  '1241', '1242', '1243', // 桐かす（3 張）
])

// ============================================================
// 役種類型定義
// ============================================================

/**
 * 役種類型名稱
 */
export type YakuType =
  | 'GOKOU'         // 五光
  | 'SHIKOU'        // 四光（不含雨）
  | 'AME_SHIKOU'    // 雨四光
  | 'SANKOU'        // 三光（不含雨）
  | 'INOSHIKACHO'   // 豬鹿蝶
  | 'AKATAN'        // 赤短
  | 'AOTAN'         // 青短
  | 'TANZAKU'       // 短冊（5+）
  | 'TANE'          // 種（5+）
  | 'KASU'          // かす（10+）
  | 'HANAMI_ZAKE'   // 花見酒
  | 'TSUKIMI_ZAKE'  // 月見酒

/**
 * 役種基礎分數（預設值）
 */
export const DEFAULT_YAKU_POINTS: Record<YakuType, number> = {
  GOKOU: 15,
  SHIKOU: 10,
  AME_SHIKOU: 8,
  SANKOU: 6,
  INOSHIKACHO: 5,
  AKATAN: 5,
  AOTAN: 5,
  TANZAKU: 1,    // 基礎 1 點，每多 1 張 +1 點
  TANE: 1,       // 基礎 1 點，每多 1 張 +1 點
  KASU: 1,       // 基礎 1 點，每多 1 張 +1 點
  HANAMI_ZAKE: 3,
  TSUKIMI_ZAKE: 3,
}

// ============================================================
// 內部輔助函數
// ============================================================

/**
 * 計算卡片集合中屬於指定類別的數量
 */
function countCardsIn(
  depositoryCards: readonly string[],
  categoryCards: readonly string[]
): number {
  const categorySet = new Set(categoryCards)
  return depositoryCards.filter((card) => categorySet.has(card)).length
}

/**
 * 取得卡片集合中屬於指定類別的卡片
 */
function getCardsIn(
  depositoryCards: readonly string[],
  categoryCards: readonly string[]
): readonly string[] {
  const categorySet = new Set(categoryCards)
  return Object.freeze(depositoryCards.filter((card) => categorySet.has(card)))
}

/**
 * 檢查是否包含所有指定卡片
 */
function hasAllCards(
  depositoryCards: readonly string[],
  requiredCards: readonly string[]
): boolean {
  const depositorySet = new Set(depositoryCards)
  return requiredCards.every((card) => depositorySet.has(card))
}

/**
 * 取得役種分數（從設定或使用預設值）
 */
function getYakuPoints(
  yakuType: YakuType,
  yakuSettings: readonly YakuSetting[]
): number {
  const setting = yakuSettings.find((s) => s.yaku_type === yakuType)
  if (setting) {
    return setting.base_points
  }
  return DEFAULT_YAKU_POINTS[yakuType]
}

/**
 * 檢查役種是否啟用
 */
function isYakuEnabled(
  yakuType: YakuType,
  yakuSettings: readonly YakuSetting[]
): boolean {
  const setting = yakuSettings.find((s) => s.yaku_type === yakuType)
  // 如果沒有設定，預設啟用
  return setting?.enabled ?? true
}

// ============================================================
// 役種檢測函數
// ============================================================

/**
 * 檢測光牌系役種（互斥，只取最高分）
 */
function detectHikariYaku(
  depositoryCards: readonly string[],
  yakuSettings: readonly YakuSetting[]
): Yaku | null {
  const hikariCards = getCardsIn(depositoryCards, HIKARI_CARDS)
  const hikariCount = hikariCards.length
  const hasRain = depositoryCards.includes(RAIN_CARD)

  // 五光：5 張光牌
  if (hikariCount === 5 && isYakuEnabled('GOKOU', yakuSettings)) {
    return Object.freeze({
      yaku_type: 'GOKOU',
      base_points: getYakuPoints('GOKOU', yakuSettings),
      contributing_cards: hikariCards,
    })
  }

  // 四光（不含雨）：4 張光牌，不含雨
  if (hikariCount === 4 && !hasRain && isYakuEnabled('SHIKOU', yakuSettings)) {
    return Object.freeze({
      yaku_type: 'SHIKOU',
      base_points: getYakuPoints('SHIKOU', yakuSettings),
      contributing_cards: hikariCards,
    })
  }

  // 雨四光：4 張光牌，包含雨
  if (hikariCount === 4 && hasRain && isYakuEnabled('AME_SHIKOU', yakuSettings)) {
    return Object.freeze({
      yaku_type: 'AME_SHIKOU',
      base_points: getYakuPoints('AME_SHIKOU', yakuSettings),
      contributing_cards: hikariCards,
    })
  }

  // 三光（不含雨）：3 張光牌，不含雨
  if (hikariCount >= 3 && isYakuEnabled('SANKOU', yakuSettings)) {
    const nonRainHikari = getCardsIn(depositoryCards, HIKARI_WITHOUT_RAIN)
    if (nonRainHikari.length >= 3) {
      return Object.freeze({
        yaku_type: 'SANKOU',
        base_points: getYakuPoints('SANKOU', yakuSettings),
        contributing_cards: nonRainHikari.slice(0, 3),
      })
    }
  }

  return null
}

/**
 * 檢測短冊系役種
 */
function detectTanzakuYaku(
  depositoryCards: readonly string[],
  yakuSettings: readonly YakuSetting[]
): readonly Yaku[] {
  const result: Yaku[] = []

  // 赤短
  if (isYakuEnabled('AKATAN', yakuSettings)) {
    const akatanCards = getCardsIn(depositoryCards, AKATAN_CARDS)
    if (akatanCards.length === 3) {
      result.push(Object.freeze({
        yaku_type: 'AKATAN',
        base_points: getYakuPoints('AKATAN', yakuSettings),
        contributing_cards: akatanCards,
      }))
    }
  }

  // 青短
  if (isYakuEnabled('AOTAN', yakuSettings)) {
    const aotanCards = getCardsIn(depositoryCards, AOTAN_CARDS)
    if (aotanCards.length === 3) {
      result.push(Object.freeze({
        yaku_type: 'AOTAN',
        base_points: getYakuPoints('AOTAN', yakuSettings),
        contributing_cards: aotanCards,
      }))
    }
  }

  // 短冊（5 張以上）
  if (isYakuEnabled('TANZAKU', yakuSettings)) {
    const tanzakuCards = getCardsIn(depositoryCards, TANZAKU_CARDS)
    if (tanzakuCards.length >= 5) {
      // 基礎 1 點，每多 1 張 +1 點
      const extraPoints = tanzakuCards.length - 5
      result.push(Object.freeze({
        yaku_type: 'TANZAKU',
        base_points: getYakuPoints('TANZAKU', yakuSettings) + extraPoints,
        contributing_cards: tanzakuCards,
      }))
    }
  }

  return Object.freeze(result)
}

/**
 * 檢測種牌系役種
 */
function detectTaneYaku(
  depositoryCards: readonly string[],
  yakuSettings: readonly YakuSetting[]
): readonly Yaku[] {
  const result: Yaku[] = []

  // 豬鹿蝶
  if (isYakuEnabled('INOSHIKACHO', yakuSettings)) {
    if (hasAllCards(depositoryCards, INOSHIKACHO_CARDS)) {
      result.push(Object.freeze({
        yaku_type: 'INOSHIKACHO',
        base_points: getYakuPoints('INOSHIKACHO', yakuSettings),
        contributing_cards: [...INOSHIKACHO_CARDS],
      }))
    }
  }

  // 花見酒
  if (isYakuEnabled('HANAMI_ZAKE', yakuSettings)) {
    if (hasAllCards(depositoryCards, HANAMI_CARDS)) {
      result.push(Object.freeze({
        yaku_type: 'HANAMI_ZAKE',
        base_points: getYakuPoints('HANAMI_ZAKE', yakuSettings),
        contributing_cards: [...HANAMI_CARDS],
      }))
    }
  }

  // 月見酒
  if (isYakuEnabled('TSUKIMI_ZAKE', yakuSettings)) {
    if (hasAllCards(depositoryCards, TSUKIMI_CARDS)) {
      result.push(Object.freeze({
        yaku_type: 'TSUKIMI_ZAKE',
        base_points: getYakuPoints('TSUKIMI_ZAKE', yakuSettings),
        contributing_cards: [...TSUKIMI_CARDS],
      }))
    }
  }

  // 種（5 張以上）
  // 注意：種牌定義需要包含 0921 菊盃
  const allTaneCards = [...TANE_CARDS]
  if (isYakuEnabled('TANE', yakuSettings)) {
    const taneCards = getCardsIn(depositoryCards, allTaneCards)
    if (taneCards.length >= 5) {
      // 基礎 1 點，每多 1 張 +1 點
      const extraPoints = taneCards.length - 5
      result.push(Object.freeze({
        yaku_type: 'TANE',
        base_points: getYakuPoints('TANE', yakuSettings) + extraPoints,
        contributing_cards: taneCards,
      }))
    }
  }

  return Object.freeze(result)
}

/**
 * 檢測かす系役種
 */
function detectKasuYaku(
  depositoryCards: readonly string[],
  yakuSettings: readonly YakuSetting[]
): Yaku | null {
  if (!isYakuEnabled('KASU', yakuSettings)) {
    return null
  }

  const kasuCards = getCardsIn(depositoryCards, KASU_CARDS)
  if (kasuCards.length >= 10) {
    // 基礎 1 點，每多 1 張 +1 點
    const extraPoints = kasuCards.length - 10
    return Object.freeze({
      yaku_type: 'KASU',
      base_points: getYakuPoints('KASU', yakuSettings) + extraPoints,
      contributing_cards: kasuCards,
    })
  }

  return null
}

// ============================================================
// 公開 API
// ============================================================

/**
 * 檢測獲得區中所有成立的役種
 *
 * @param depositoryCards - 獲得區卡片列表
 * @param yakuSettings - 役種設定（啟用/停用、分數）
 * @returns 成立的役種列表
 */
export function detectYaku(
  depositoryCards: readonly string[],
  yakuSettings: readonly YakuSetting[]
): readonly Yaku[] {
  const result: Yaku[] = []

  // 光牌系（互斥，只取最高分）
  const hikariYaku = detectHikariYaku(depositoryCards, yakuSettings)
  if (hikariYaku) {
    result.push(hikariYaku)
  }

  // 短冊系
  const tanzakuYaku = detectTanzakuYaku(depositoryCards, yakuSettings)
  result.push(...tanzakuYaku)

  // 種牌系
  const taneYaku = detectTaneYaku(depositoryCards, yakuSettings)
  result.push(...taneYaku)

  // かす系
  const kasuYaku = detectKasuYaku(depositoryCards, yakuSettings)
  if (kasuYaku) {
    result.push(kasuYaku)
  }

  return Object.freeze(result)
}

/**
 * 檢測新形成的役種
 *
 * @param previousYaku - 之前成立的役種
 * @param currentYaku - 當前成立的役種
 * @returns 新形成的役種（currentYaku 中存在但 previousYaku 中不存在的）
 */
export function detectNewYaku(
  previousYaku: readonly Yaku[],
  currentYaku: readonly Yaku[]
): readonly Yaku[] {
  const previousTypes = new Set(previousYaku.map((y) => y.yaku_type))

  // 找出新形成的役種
  const newlyFormed = currentYaku.filter((y) => !previousTypes.has(y.yaku_type))

  // 也要檢測役種「升級」的情況（如 TANE 從 5 張變 6 張）
  const upgraded = currentYaku.filter((y) => {
    if (!previousTypes.has(y.yaku_type)) return false
    const prev = previousYaku.find((p) => p.yaku_type === y.yaku_type)
    // 如果分數提高，視為新形成
    return prev && y.base_points > prev.base_points
  })

  return Object.freeze([...newlyFormed, ...upgraded])
}

/**
 * 計算役種總分
 *
 * @param yakuList - 役種列表
 * @returns 總分
 */
export function calculateYakuTotalPoints(yakuList: readonly Yaku[]): number {
  return yakuList.reduce((sum, yaku) => sum + yaku.base_points, 0)
}

/**
 * 建立預設役種設定
 *
 * @returns 預設役種設定（全部啟用，使用預設分數）
 */
export function createDefaultYakuSettings(): readonly YakuSetting[] {
  const yakuTypes: YakuType[] = [
    'GOKOU',
    'SHIKOU',
    'AME_SHIKOU',
    'SANKOU',
    'INOSHIKACHO',
    'AKATAN',
    'AOTAN',
    'TANZAKU',
    'TANE',
    'KASU',
    'HANAMI_ZAKE',
    'TSUKIMI_ZAKE',
  ]

  return Object.freeze(
    yakuTypes.map((yakuType) =>
      Object.freeze({
        yaku_type: yakuType,
        base_points: DEFAULT_YAKU_POINTS[yakuType],
        enabled: true,
      })
    )
  )
}
