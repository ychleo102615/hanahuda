/**
 * 遊戲公告樣式常數
 *
 * @description
 * 定義 Koi-Koi 和役種公告的漸層色樣式。
 * 每種役種分類有獨特的漸層配色。
 */

/** 役種分類 */
export type YakuCategory = 'hikari' | 'tanzaku' | 'tane' | 'kasu'

/**
 * 役種分類漸層色對應
 *
 * - hikari (光牌): 金色系
 * - tanzaku (短冊): 粉紅系
 * - tane (種牌): 綠色系
 * - kasu (かす): 銀灰系
 */
export const YAKU_GRADIENTS: Record<YakuCategory, string> = {
  hikari: 'from-amber-300 via-yellow-200 to-amber-100',
  tanzaku: 'from-rose-400 via-pink-300 to-red-200',
  tane: 'from-emerald-400 via-green-300 to-teal-200',
  kasu: 'from-slate-400 via-gray-300 to-zinc-200',
}

/** Koi-Koi 專用漸層色（琥珀金色） */
export const KOIKOI_GRADIENT = 'from-amber-300 via-yellow-100 to-white'
