/**
 * 役種資訊查詢服務
 *
 * @description
 * 提供根據役種類型 ID 查詢完整役種資訊的功能。
 * 用於對手役種公告顯示。
 */

import yakuData from '~/data/yaku.json'

/**
 * 役種資訊
 */
export interface YakuInfo {
  name: string
  nameJa: string
  category: string
}

/**
 * 後端/事件役種 ID 到前端 JSON ID 的映射
 *
 * @description
 * 後端使用大寫底線格式（如 'GOKOU', 'AME_SHIKOU'），
 * 前端 yaku.json 使用小寫格式（如 'goko', 'ameshiko'）。
 */
const YAKU_TYPE_MAP: Record<string, string> = {
  // 光牌系
  'GOKOU': 'goko',
  'GOKO': 'goko',
  'SHIKOU': 'shiko',
  'SHIKO': 'shiko',
  'AME_SHIKOU': 'ameshiko',
  'AMESHIKO': 'ameshiko',
  'SANKOU': 'sanko',
  'SANKO': 'sanko',
  // 短冊系
  'AKATAN': 'akatan',
  'AOTAN': 'aotan',
  'TANZAKU': 'tanzaku',
  'TAN': 'tanzaku',
  // 種牌系
  'INOSHIKACHO': 'inoshikacho',
  'HANAMI_ZAKE': 'hanamizake',
  'HANAMI': 'hanamizake',
  'TSUKIMI_ZAKE': 'tsukimizake',
  'TSUKIMI': 'tsukimizake',
  'TANE': 'tane',
  // かす系
  'KASU': 'kasu',
}

/**
 * 根據役種類型 ID 查詢役種資訊
 *
 * @param yakuType - 役種類型 ID（如 'GOKO', 'AKATAN'）
 * @returns 役種資訊，若找不到則返回 null
 *
 * @example
 * ```typescript
 * const info = getYakuInfo('GOKO')
 * // { name: 'Five Brights', nameJa: '五光', category: 'hikari' }
 * ```
 */
export function getYakuInfo(yakuType: string): YakuInfo | null {
  const mappedId = YAKU_TYPE_MAP[yakuType] || yakuType.toLowerCase()
  const yaku = yakuData.yakuList.find(y => y.id === mappedId)
  if (!yaku) {
    return null
  }
  return {
    name: yaku.name,
    nameJa: yaku.nameJa,
    category: yaku.category,
  }
}
