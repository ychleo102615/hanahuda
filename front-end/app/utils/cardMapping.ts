/**
 * 卡片 MMTI 格式轉 SVG 檔名的映射工具
 *
 * MMTI 格式說明：
 * - MM: 月份 (01-12)
 * - T:  牌型 (1=Hikari, 2=Tane, 3=Tanzaku, 4=Kasu)
 * - I:  該月該類型的第幾張 (1-4)
 *
 * SVG 檔名格式：
 * Hanafuda_{Month}_{Type}[_{Index}].svg
 *
 * 注意：Kasu 卡需要索引，其他牌型通常省略索引
 */

// 月份映射表
const MONTH_MAP: Record<string, string> = {
  '01': 'January',
  '02': 'February',
  '03': 'March',
  '04': 'April',
  '05': 'May',
  '06': 'June',
  '07': 'July',
  '08': 'August',
  '09': 'September',
  '10': 'October',
  '11': 'November',
  '12': 'December',
}

// 牌型映射表
const TYPE_MAP: Record<string, string> = {
  '1': 'Hikari',
  '2': 'Tane',
  '3': 'Tanzaku',
  '4': 'Kasu',
}

// 預設 fallback 圖示名稱
export const DEFAULT_CARD_ICON_NAME = 'Hanafuda_Default'

// 牌背圖示名稱
export const CARD_BACK_ICON_NAME = 'Hanafuda_Back'

/**
 * 將 MMTI 格式的卡片 ID 轉換為 SVG 檔名（不含 .svg 副檔名）
 *
 * @param mmti - 4 位字串的 MMTI 格式卡片 ID（如 "0111", "0842"）
 * @returns SVG 檔名（不含副檔名），若格式無效則返回 null
 *
 * @example
 * mmtiToSvgName("0111") // "Hanafuda_January_Hikari"
 * mmtiToSvgName("0842") // "Hanafuda_August_Kasu_2"
 * mmtiToSvgName("invalid") // null
 */
export function mmtiToSvgName(mmti: string): string | null {
  // 驗證格式：必須是 4 位字串
  if (!mmti || mmti.length !== 4) {
    return null
  }

  // 解析 MMTI
  const month = mmti.substring(0, 2)
  const type = mmti.substring(2, 3)
  const index = mmti.substring(3, 4)

  // 驗證月份
  const monthName = MONTH_MAP[month]
  if (!monthName) {
    return null
  }

  // 驗證牌型
  const typeName = TYPE_MAP[type]
  if (!typeName) {
    return null
  }

  // 驗證索引（1-4）
  const indexNum = parseInt(index, 10)
  if (isNaN(indexNum) || indexNum < 1 || indexNum > 4) {
    return null
  }

  // 組合 SVG 檔名
  // Kasu (牌型=4) 需要索引，其他牌型省略索引
  if (type === '4') {
    // Kasu: Hanafuda_{Month}_Kasu_{Index}
    return `Hanafuda_${monthName}_${typeName}_${index}`
  } else {
    // Hikari/Tane/Tanzaku: Hanafuda_{Month}_{Type}
    // 注意：這些牌型通常每月只有 1 張，所以檔名不包含索引
    return `Hanafuda_${monthName}_${typeName}`
  }
}

/**
 * 取得卡片圖示名稱，若 MMTI 無效則返回預設圖示
 *
 * @param mmti - MMTI 格式的卡片 ID
 * @returns SVG 檔名（保證返回有效值）
 */
export function getCardIconName(mmti: string): string {
  return mmtiToSvgName(mmti) || DEFAULT_CARD_ICON_NAME
}
