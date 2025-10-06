import type { Card } from '@/features/game-engine/domain/entities/Card'

/**
 * 將花牌 ID 對應到 SVG 檔案名稱
 * 支援多種渲染器使用（DOM/PIXI）
 */

/**
 * Card ID 到 SVG 檔案名稱的映射表
 * ID 範圍: 1-48
 */
const CARD_ID_TO_SVG_MAP: Record<number, string> = {
  // January (1月)
  1: 'Hanafuda_January_Hikari',
  2: 'Hanafuda_January_Tanzaku',
  3: 'Hanafuda_January_Kasu_1',
  4: 'Hanafuda_January_Kasu_2',

  // February (2月)
  5: 'Hanafuda_February_Tane',
  6: 'Hanafuda_February_Tanzaku',
  7: 'Hanafuda_February_Kasu_1',
  8: 'Hanafuda_February_Kasu_2',

  // March (3月)
  9: 'Hanafuda_March_Hikari',
  10: 'Hanafuda_March_Tanzaku',
  11: 'Hanafuda_March_Kasu_1',
  12: 'Hanafuda_March_Kasu_2',

  // April (4月)
  13: 'Hanafuda_April_Tane',
  14: 'Hanafuda_April_Tanzaku',
  15: 'Hanafuda_April_Kasu_1',
  16: 'Hanafuda_April_Kasu_2',

  // May (5月)
  17: 'Hanafuda_May_Tane',
  18: 'Hanafuda_May_Tanzaku',
  19: 'Hanafuda_May_Kasu_1',
  20: 'Hanafuda_May_Kasu_2',

  // June (6月)
  21: 'Hanafuda_June_Tane',
  22: 'Hanafuda_June_Tanzaku',
  23: 'Hanafuda_June_Kasu_1',
  24: 'Hanafuda_June_Kasu_2',

  // July (7月)
  25: 'Hanafuda_July_Tane',
  26: 'Hanafuda_July_Tanzaku',
  27: 'Hanafuda_July_Kasu_1',
  28: 'Hanafuda_July_Kasu_2',

  // August (8月)
  29: 'Hanafuda_August_Hikari',
  30: 'Hanafuda_August_Tane',
  31: 'Hanafuda_August_Kasu_1',
  32: 'Hanafuda_August_Kasu_2',

  // September (9月)
  33: 'Hanafuda_September_Tane',
  34: 'Hanafuda_September_Tanzaku',
  35: 'Hanafuda_September_Kasu_1',
  36: 'Hanafuda_September_Kasu_2',

  // October (10月)
  37: 'Hanafuda_October_Tane',
  38: 'Hanafuda_October_Tanzaku',
  39: 'Hanafuda_October_Kasu_1',
  40: 'Hanafuda_October_Kasu_2',

  // November (11月) - 只有一張 Kasu，不帶數字
  41: 'Hanafuda_November_Hikari',
  42: 'Hanafuda_November_Tane',
  43: 'Hanafuda_November_Tanzaku',
  44: 'Hanafuda_November_Kasu',

  // December (12月)
  45: 'Hanafuda_December_Hikari',
  46: 'Hanafuda_December_Kasu_1',
  47: 'Hanafuda_December_Kasu_2',
  48: 'Hanafuda_December_Kasu_3'
} as const

/**
 * 從 Card 實體獲取對應的 SVG 檔案名稱
 * @param card 花牌實體
 * @returns SVG 檔案名稱（不含副檔名）
 */
export function getCardSvgName(card: Card): string {
  const svgName = CARD_ID_TO_SVG_MAP[card.id]

  if (!svgName) {
    throw new Error(`Invalid card ID: ${card.id}. Valid range is 1-48.`)
  }

  return svgName
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
