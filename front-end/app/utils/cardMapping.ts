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

/**
 * 卡片日文名稱映射表
 *
 * 參考來源：花札 Wikipedia (https://ja.wikipedia.org/wiki/花札)
 */
const CARD_JAPANESE_NAMES: Record<string, string> = {
  // 1月 - 松 (Pine)
  '0111': '松に鶴\n(Pine with Crane)',
  '0131': '松に赤短\n(Pine with Red Poetry Ribbon)',
  '0141': '松のカス\n(Pine Plain)',
  '0142': '松のカス\n(Pine Plain)',
  // 2月 - 梅 (Plum)
  '0221': '梅に鶯\n(Plum with Warbler)',
  '0231': '梅に赤短\n(Plum with Red Poetry Ribbon)',
  '0241': '梅のカス\n(Plum Plain)',
  '0242': '梅のカス\n(Plum Plain)',
  // 3月 - 桜 (Cherry)
  '0311': '桜に幕\n(Cherry with Curtain)',
  '0331': '桜に赤短\n(Cherry with Red Poetry Ribbon)',
  '0341': '桜のカス\n(Cherry Plain)',
  '0342': '桜のカス\n(Cherry Plain)',
  // 4月 - 藤 (Wisteria)
  '0421': '藤にほととぎす\n(Wisteria with Cuckoo)',
  '0431': '藤に短冊\n(Wisteria with Ribbon)',
  '0441': '藤のカス\n(Wisteria Plain)',
  '0442': '藤のカス\n(Wisteria Plain)',
  // 5月 - 菖蒲 (Iris)
  '0521': '菖蒲に八ツ橋\n(Iris with Eight-Plank Bridge)',
  '0531': '菖蒲に短冊\n(Iris with Ribbon)',
  '0541': '菖蒲のカス\n(Iris Plain)',
  '0542': '菖蒲のカス\n(Iris Plain)',
  // 6月 - 牡丹 (Peony)
  '0621': '牡丹に蝶\n(Peony with Butterflies)',
  '0631': '牡丹に青短\n(Peony with Blue Ribbon)',
  '0641': '牡丹のカス\n(Peony Plain)',
  '0642': '牡丹のカス\n(Peony Plain)',
  // 7月 - 萩 (Bush Clover)
  '0721': '萩に猪\n(Bush Clover with Boar)',
  '0731': '萩に短冊\n(Bush Clover with Ribbon)',
  '0741': '萩のカス\n(Bush Clover Plain)',
  '0742': '萩のカス\n(Bush Clover Plain)',
  // 8月 - 芒 (Susuki Grass)
  '0811': '芒に月\n(Susuki with Moon)',
  '0821': '芒に雁\n(Susuki with Geese)',
  '0841': '芒のカス\n(Susuki Plain)',
  '0842': '芒のカス\n(Susuki Plain)',
  // 9月 - 菊 (Chrysanthemum)
  '0921': '菊に盃\n(Chrysanthemum with Sake Cup)',
  '0931': '菊に青短\n(Chrysanthemum with Blue Ribbon)',
  '0941': '菊のカス\n(Chrysanthemum Plain)',
  '0942': '菊のカス\n(Chrysanthemum Plain)',
  // 10月 - 紅葉 (Maple)
  '1021': '紅葉に鹿\n(Maple with Deer)',
  '1031': '紅葉に青短\n(Maple with Blue Ribbon)',
  '1041': '紅葉のカス\n(Maple Plain)',
  '1042': '紅葉のカス\n(Maple Plain)',
  // 11月 - 柳 (Willow)
  '1111': '柳に小野道風\n(Willow with Ono no Michikaze)',
  '1121': '柳に燕\n(Willow with Swallow)',
  '1131': '柳に短冊\n(Willow with Ribbon)',
  '1141': '柳のカス\n(Willow Plain)',
  // 12月 - 桐 (Paulownia)
  '1211': '桐に鳳凰\n(Paulownia with Phoenix)',
  '1241': '桐のカス\n(Paulownia Plain)',
  '1242': '桐のカス\n(Paulownia Plain)',
  '1243': '桐のカス\n(Paulownia Plain)',
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

/**
 * 取得卡片的日文名稱
 *
 * @param mmti - MMTI 格式的卡片 ID
 * @returns 日文名稱，若無對應則返回 undefined
 *
 * @example
 * getCardJapaneseName("0111") // "松に鶴"
 * getCardJapaneseName("0621") // "牡丹に蝶"
 */
export function getCardJapaneseName(mmti: string): string | undefined {
  return CARD_JAPANESE_NAMES[mmti]
}
