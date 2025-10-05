import type { Card } from '@/features/game-engine/domain/entities/Card'
import { HANAFUDA_CARDS } from '@/shared/constants/gameConstants'

/**
 * 將花牌資料對應到 SVG 檔案名稱
 * 支援多種渲染器使用（DOM/PIXI）
 */

// 月份英文對應
const MONTH_NAMES = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
] as const

// 花牌類型對應到 SVG 檔名
const CARD_TYPE_MAPPING: Record<string, string> = {
  'bright': 'Hikari',
  'animal': 'Tane',
  'ribbon': 'Tanzaku',
  'plain': 'Kasu'
} as const

/**
 * 從 Card 實體獲取對應的 SVG 檔案名稱
 * @param card 花牌實體
 * @returns SVG 檔案名稱（不含副檔名）
 */
export function getCardSvgName(card: Card): string {
  const monthName = MONTH_NAMES[card.month]
  const typeName = CARD_TYPE_MAPPING[card.type]

  if (!monthName || !typeName) {
    throw new Error(`Invalid card data: month=${card.month}, type=${card.type}`)
  }

  // 基本檔名格式: Hanafuda_[Month]_[Type]
  let svgName = `Hanafuda_${monthName}_${typeName}`

  // 處理有多張相同類型卡片的情況（主要是 Kasu）
  if (card.type === 'plain') {
    const cardIndex = extractCardIndexFromId(card.id)

    // 特殊處理：11月（November）只有一張 Kasu，沒有數字後綴
    if (card.month === 11) {
      // November_Kasu 不加數字
    } else {
      // 根據月份限制最大索引數
      const maxKasuCount = getMaxKasuCountForMonth(card.month)
      const actualIndex = Math.min(cardIndex, maxKasuCount)

      if (actualIndex > 1) {
        svgName += `_${actualIndex}`
      }
    }
  }

  return svgName
}

/**
 * 從 Card ID 提取卡片索引
 * Card ID 格式: "suit-type-index"
 * @param cardId 卡片 ID
 * @returns 卡片索引（從 1 開始）
 */
function extractCardIndexFromId(cardId: string): number {
  const parts = cardId.split('-')
  if (parts.length >= 3) {
    const index = parseInt(parts[2], 10)
    return isNaN(index) ? 1 : index + 1 // SVG 檔名從 1 開始
  }
  return 1
}

/**
 * 獲取每個月份的最大 Kasu 卡片數量
 * @param month 月份 (1-12)
 * @returns 該月份的最大 Kasu 數量
 */
function getMaxKasuCountForMonth(month: number): number {
  // 從 gameConstants 中動態計算每個月份的 plain 類型卡片數量
  const monthNames = ['', 'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
                      'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'] as const

  const monthKey = monthNames[month] as keyof typeof HANAFUDA_CARDS

  if (!monthKey || !HANAFUDA_CARDS[monthKey]) {
    return 2 // 預設值
  }

  // 計算該月份 plain 類型卡片的數量
  const plainCards = HANAFUDA_CARDS[monthKey].CARDS.filter(card => card.type === 'plain')
  return plainCards.length
}

/**
 * 獲取完整的 SVG 檔案路徑（用於 PIXI 等需要完整路徑的場景）
 * @param card 花牌實體
 * @param basePath 基礎路徑，預設為 '/src/assets/icon/'
 * @returns 完整的 SVG 檔案路徑
 */
export function getCardSvgPath(card: Card, basePath: string = '/src/assets/icon/'): string {
  const svgName = getCardSvgName(card)
  return `${basePath}${svgName}.svg`
}

/**
 * 獲取用於 vite-plugin-svg-icons 的 symbol ID
 * @param card 花牌實體
 * @param prefix 前綴，預設為 'icon'
 * @returns symbol ID
 */
export function getCardSvgSymbolId(card: Card, prefix: string = 'icon'): string {
  const svgName = getCardSvgName(card)
  return `${prefix}-${svgName}`
}